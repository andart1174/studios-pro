import { getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const MAX_UPLOAD_BYTES = 5.5 * 1024 * 1024; // ~5.5 MB Netlify Edge CDN body limit
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getScopedStore(context) {
  const isProd = context?.deploy?.context === "production";
  const storeName = isProd ? "studios-ar-models" : "studios-ar-models-preview";
  return getStore({ name: storeName, consistency: "strong" });
}

function sanitizeFileName(rawName, fallbackExt = "glb") {
  const cleaned = String(rawName || `model.${fallbackExt}`)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "");
  const hasExt = /\.(glb|gltf|usdz)$/i.test(cleaned);
  return hasExt ? cleaned : `${cleaned}.${fallbackExt}`;
}

function inferContentType(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".usdz")) return "model/vnd.usdz+zip";
  if (lower.endsWith(".gltf")) return "model/gltf+json";
  return "model/gltf-binary";
}

function looksLikeHtmlError(bytes) {
  if (!bytes || bytes.byteLength < 8) return false;
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(96, bytes.byteLength))).trimStart().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head") || head.startsWith("<body");
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function handleShareUpload(request, context) {
  let store;
  try {
    store = getScopedStore(context);
  } catch (err) {
    return jsonResponse({ status: "unavailable", error: "Blobs unavailable: " + err.message }, 503);
  }

  const reqUrl = new URL(request.url);
  const rawHash = (reqUrl.searchParams.get("hash") || "").trim().toLowerCase();
  const safeHash = /^[a-f0-9]{16,64}$/.test(rawHash) ? rawHash.slice(0, 16) : "";
  let fileName = sanitizeFileName(reqUrl.searchParams.get("name"), "glb");

  // Fast cache check BEFORE reading body if hash matches & caller sent HEAD/check header,
  // or check existing blob before writing
  if (safeHash) {
    try {
      const existing = await store.getMetadata(safeHash);
      if (existing && existing.metadata) {
        const exp = Number(existing.metadata.expiresAt || 0);
        if (!exp || exp > Date.now()) {
          const cachedName = sanitizeFileName(existing.metadata.filename || fileName, "glb");
          const url = `${reqUrl.origin}/api/ar-share/${safeHash}/${encodeURIComponent(cachedName)}`;
          // Still drain request body cleanly if sent
          try { if (request.body) await request.body.cancel(); } catch (_) {}
          return jsonResponse({
            status: "success",
            id: safeHash,
            url,
            cached: true,
            provider: "netlify-blobs",
          });
        }
      }
    } catch (_) {
      // Proceed with fresh upload if metadata check fails
    }
  }

  let rawBuffer = null;
  try {
    const cType = (request.headers.get("content-type") || "").toLowerCase();
    if (cType.includes("multipart/form-data")) {
      const fd = await request.formData();
      const f = fd.get("file") || fd.get("fileToUpload");
      if (f && typeof f.arrayBuffer === "function") {
        if (f.name) fileName = sanitizeFileName(f.name, "glb");
        rawBuffer = await f.arrayBuffer();
      }
    } else {
      rawBuffer = await request.arrayBuffer();
    }
  } catch (err) {
    return jsonResponse({ status: "error", error: "Invalid payload: " + err.message }, 400);
  }

  if (!rawBuffer || rawBuffer.byteLength < 16) {
    return jsonResponse({ status: "error", error: "Empty or invalid 3D payload" }, 400);
  }
  if (rawBuffer.byteLength > MAX_UPLOAD_BYTES) {
    return jsonResponse({ status: "too_large", error: "File exceeds 45 MB Edge Blobs limit" }, 413);
  }

  const headBytes = new Uint8Array(rawBuffer, 0, Math.min(96, rawBuffer.byteLength));
  if (looksLikeHtmlError(headBytes)) {
    return jsonResponse({ status: "error", error: "Rejected HTML error payload" }, 400);
  }

  const key = safeHash || crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const contentType = inferContentType(fileName);

  try {
    await store.set(key, rawBuffer, {
      metadata: {
        filename: fileName,
        contentType,
        size: rawBuffer.byteLength,
        expiresAt: Date.now() + TTL_MS,
      },
    });
    const url = `${reqUrl.origin}/api/ar-share/${key}/${encodeURIComponent(fileName)}`;
    return jsonResponse({
      status: "success",
      id: key,
      url,
      cached: false,
      provider: "netlify-blobs",
    });
  } catch (err) {
    return jsonResponse({ status: "unavailable", error: "Blobs write failed: " + err.message }, 503);
  }
}

async function handleShareDownload(request, context) {
  const reqUrl = new URL(request.url);
  const checkHash = (reqUrl.searchParams.get("exists") || "").trim().toLowerCase();

  let store;
  try {
    store = getScopedStore(context);
  } catch (err) {
    return jsonResponse({ status: "unavailable", error: "Blobs unavailable: " + err.message }, 503);
  }

  // Optional zero-byte deduplication probe: GET /api/ar-share?exists=<sha256>&name=...
  if (checkHash && /^[a-f0-9]{16,64}$/.test(checkHash)) {
    try {
      const meta = await store.getMetadata(checkHash);
      if (meta && meta.metadata) {
        const exp = Number(meta.metadata.expiresAt || 0);
        if (!exp || exp > Date.now()) {
          const cachedName = sanitizeFileName(meta.metadata.filename || reqUrl.searchParams.get("name"), "glb");
          return jsonResponse({
            status: "success",
            exists: true,
            id: checkHash,
            url: `${reqUrl.origin}/api/ar-share/${checkHash}/${encodeURIComponent(cachedName)}`,
            provider: "netlify-blobs",
          });
        }
      }
      return jsonResponse({ status: "miss", exists: false }, 200);
    } catch (_) {
      return jsonResponse({ status: "miss", exists: false }, 200);
    }
  }

  const rest = reqUrl.pathname.replace(/^\/api\/ar-share\/?/, "");
  const parts = rest.split("/").filter(Boolean);
  const key = parts[0] || "";
  if (!key || !/^[a-zA-Z0-9._-]+$/.test(key)) {
    return new Response("Missing or invalid share id", { status: 400, headers: CORS_HEADERS });
  }

  try {
    const metaInfo = await store.getMetadata(key);
    if (!metaInfo) {
      return new Response("Shared 3D model not found or expired", { status: 404, headers: CORS_HEADERS });
    }

    const meta = metaInfo.metadata || {};
    const exp = Number(meta.expiresAt || 0);
    if (exp && exp < Date.now()) {
      context?.waitUntil?.(store.delete(key).catch(() => {}));
      return new Response("Shared 3D model link expired", { status: 410, headers: CORS_HEADERS });
    }

    const fileName = sanitizeFileName(parts[1] ? decodeURIComponent(parts[1]) : meta.filename, "glb");
    const contentType = meta.contentType || inferContentType(fileName);
    const headers = new Headers(CORS_HEADERS);
    headers.set("Content-Type", contentType);
    if (meta.size) headers.set("Content-Length", String(meta.size));
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=86400, immutable");

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    const stream = await store.get(key, { type: "stream" });
    if (!stream) {
      return new Response("Shared 3D model unavailable", { status: 404, headers: CORS_HEADERS });
    }
    return new Response(stream, { status: 200, headers });
  } catch (err) {
    return jsonResponse({ status: "error", error: err.message }, 502);
  }
}

export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method === "POST") {
    return handleShareUpload(request, context);
  }
  if (request.method === "GET" || request.method === "HEAD") {
    return handleShareDownload(request, context);
  }
  return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
};
