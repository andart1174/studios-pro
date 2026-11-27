/**
 * Shared Zero-Dependency Firebase Admin & Security Helper for Netlify Functions
 * =============================================================================
 * - Strict CORS origin resolution (no wildcard '*')
 * - Firebase Auth ID Token verification via Identity Toolkit REST API
 * - Google OAuth2 Service Account JWT signing (Node built-in crypto, zero extra deps)
 * - Firestore Admin REST CRUD helpers (bypasses client security rules cleanly)
 * - Firebase Auth Admin helpers (delete user, disable/enable account, lookup by email)
 * - Immutable audit log writer (`audit_logs`)
 */

const crypto = require('crypto');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'andart1174@gmail.com').toLowerCase().trim();
const DEFAULT_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'studios-pro';
const FIREBASE_WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';

function getAllowedOrigins() {
  const list = ['https://studios-pro.com', 'https://www.studios-pro.com'];
  for (const envUrl of [process.env.SITE_URL, process.env.URL, process.env.DEPLOY_PRIME_URL]) {
    if (envUrl && typeof envUrl === 'string') {
      try {
        const u = new URL(envUrl);
        list.push(`${u.protocol}//${u.host}`);
      } catch (_) {}
    }
  }
  return Array.from(new Set(list));
}

function resolveTrustedOrigin(originHeader) {
  const fallback = 'https://studios-pro.com';
  if (!originHeader || typeof originHeader !== 'string') return fallback;
  try {
    const u = new URL(originHeader);
    const norm = `${u.protocol}//${u.host}`;
    const host = u.hostname.toLowerCase();
    if (getAllowedOrigins().includes(norm)) return norm;
    if (process.env.NETLIFY_DEV === 'true' && (host === 'localhost' || host === '127.0.0.1')) {
      return norm;
    }
  } catch (_) {}
  return fallback;
}

function getCorsHeaders(event) {
  const reqOrigin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const allowedOrigin = resolveTrustedOrigin(reqOrigin);
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (sa && sa.client_email && sa.private_key) {
      if (sa.private_key.includes('\\n')) {
        sa.private_key = sa.private_key.replace(/\\n/g, '\n');
      }
      return sa;
    }
  } catch (e) {
    console.error('[FirebaseAdmin] Invalid FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
  }
  return null;
}

function getProjectId() {
  const sa = parseServiceAccount();
  return (sa && sa.project_id) || DEFAULT_PROJECT_ID;
}

const tokenCache = {};
async function getServiceAccountAccessToken(scopeStr = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform') {
  const sa = parseServiceAccount();
  if (!sa) return null;

  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache[scopeStr];
  if (cached && cached.exp > now + 60) return cached.token;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: scopeStr,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${b64(header)}.${b64(claim)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = signer.sign(sa.private_key, 'base64url');
  const assertion = `${signingInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OAuth token error (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('Missing access_token in OAuth response');
  tokenCache[scopeStr] = { token: data.access_token, exp: now + (data.expires_in || 3500) };
  return data.access_token;
}

/**
 * Verifies a Firebase client ID Token (`Authorization: Bearer <idToken>`).
 * Uses Firebase Identity Toolkit `accounts:lookup` (official Google signature & expiry validation).
 */
async function verifyFirebaseIdToken(event) {
  const authHeader = (event && event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing Authorization Bearer token' };
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length < 40) {
    return { ok: false, status: 401, error: 'Invalid Bearer token' };
  }

  let lookupUrl = '';
  const headers = { 'Content-Type': 'application/json' };
  const sa = parseServiceAccount();

  if (FIREBASE_WEB_API_KEY) {
    lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`;
  } else if (sa) {
    const accessToken = await getServiceAccountAccessToken();
    lookupUrl = `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(getProjectId())}/accounts:lookup`;
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    return { ok: false, status: 500, error: 'Server auth verification is not configured' };
  }

  try {
    const res = await fetch(lookupUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      return { ok: false, status: 401, error: 'Invalid or expired authentication token' };
    }
    const data = await res.json();
    const u = data && Array.isArray(data.users) && data.users[0];
    if (!u || !u.localId) {
      return { ok: false, status: 401, error: 'User account not found' };
    }
    if (u.disabled) {
      return { ok: false, status: 403, error: 'Account has been disabled' };
    }

    let claims = {};
    if (u.customAttributes) {
      try { claims = JSON.parse(u.customAttributes); } catch (_) {}
    }

    const email = (u.email || '').toLowerCase().trim();
    const emailVerified = !!u.emailVerified;
    const isAdmin = emailVerified && (claims.admin === true || email === ADMIN_EMAIL);

    return {
      ok: true,
      uid: u.localId,
      email,
      emailVerified,
      isAdmin,
      claims,
    };
  } catch (err) {
    console.error('[FirebaseAdmin] Token verification failed:', err.message);
    return { ok: false, status: 401, error: 'Authentication verification failed' };
  }
}

async function requireAdmin(event) {
  const auth = await verifyFirebaseIdToken(event);
  if (!auth.ok) return auth;
  if (!auth.isAdmin) {
    return { ok: false, status: 403, error: 'Admin privileges required (verified owner account)' };
  }
  return auth;
}

// ─── Firestore REST Value Converters ─────────────────────────────────────────
function toFsValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFsValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFsValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFsValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  if ('mapValue' in v) {
    const out = {};
    const fields = v.mapValue.fields || {};
    for (const [k, fv] of Object.entries(fields)) out[k] = fromFsValue(fv);
    return out;
  }
  return null;
}

function decodeFsDoc(doc) {
  if (!doc || !doc.name) return null;
  const parts = doc.name.split('/');
  const id = parts[parts.length - 1];
  const out = { id };
  const fields = doc.fields || {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromFsValue(v);
  return out;
}

function encodeFsFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFsValue(v);
  }
  return { fields };
}

function fsBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(getProjectId())}/databases/(default)/documents`;
}

async function fsGetDoc(col, docId) {
  const token = await getServiceAccountAccessToken();
  if (!token) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  const res = await fetch(`${fsBaseUrl()}/${encodeURIComponent(col)}/${encodeURIComponent(docId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${col}/${docId} failed (${res.status})`);
  return decodeFsDoc(await res.json());
}

async function fsPatchDoc(col, docId, data) {
  const token = await getServiceAccountAccessToken();
  if (!token) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${fsBaseUrl()}/${encodeURIComponent(col)}/${encodeURIComponent(docId)}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(encodeFsFields(data)),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Firestore PATCH ${col}/${docId} failed (${res.status}): ${txt.slice(0, 180)}`);
  }
  return decodeFsDoc(await res.json());
}

async function fsCreateDoc(col, docId, data) {
  const token = await getServiceAccountAccessToken();
  if (!token) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  const url = docId
    ? `${fsBaseUrl()}/${encodeURIComponent(col)}?documentId=${encodeURIComponent(docId)}`
    : `${fsBaseUrl()}/${encodeURIComponent(col)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(encodeFsFields(data)),
  });
  if (res.status === 409) return { alreadyExists: true };
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Firestore CREATE ${col} failed (${res.status}): ${txt.slice(0, 180)}`);
  }
  return decodeFsDoc(await res.json());
}

async function fsDeleteDoc(col, docId) {
  const token = await getServiceAccountAccessToken();
  if (!token) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  const res = await fetch(`${fsBaseUrl()}/${encodeURIComponent(col)}/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore DELETE ${col}/${docId} failed (${res.status})`);
  return true;
}

async function fsListCollection(col, pageSize = 300) {
  const token = await getServiceAccountAccessToken();
  if (!token) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  const all = [];
  let pageToken = '';
  for (let i = 0; i < 6; i++) {
    const q = `pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(`${fsBaseUrl()}/${encodeURIComponent(col)}?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Firestore LIST ${col} failed (${res.status})`);
    const json = await res.json();
    if (Array.isArray(json.documents)) {
      for (const d of json.documents) all.push(decodeFsDoc(d));
    }
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return all;
}

// ─── Firebase Auth Admin REST Helpers ────────────────────────────────────────
async function authDeleteUser(uid) {
  const token = await getServiceAccountAccessToken();
  if (!token) return { ok: false, reason: 'no_service_account' };
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(getProjectId())}/accounts:delete`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { ok: false, reason: txt.slice(0, 150) };
  }
  return { ok: true };
}

async function authSetDisabled(uid, disabled) {
  const token = await getServiceAccountAccessToken();
  if (!token) return { ok: false, reason: 'no_service_account' };
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(getProjectId())}/accounts:update`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid, disableUser: !!disabled }),
    }
  );
  return { ok: res.ok };
}

async function writeAuditLog(action, actor, details = {}) {
  try {
    if (!parseServiceAccount()) return;
    await fsCreateDoc('audit_logs', null, {
      action: String(action || 'unknown'),
      actor: String(actor || 'system'),
      details: typeof details === 'string' ? details : JSON.stringify(details).slice(0, 1500),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[AuditLog] write failed:', e.message);
  }
}

/**
 * Shared Single-Source-of-Truth Premium Check (fixes the never-expire bug everywhere!)
 * - Lifetime: isPremium === true && !premiumUntil
 * - Timed / Subscription: isPremium === true && premiumUntil && new Date(premiumUntil) > now
 */
function isUserCurrentlyPremium(u, nowMs = Date.now()) {
  if (!u || u.banned) return false;
  if (!u.isPremium) return false;
  if (!u.premiumUntil) return true; // Explicit Lifetime
  const exp = new Date(u.premiumUntil).getTime();
  return Number.isFinite(exp) && exp > nowMs;
}

module.exports = {
  ADMIN_EMAIL,
  getProjectId,
  parseServiceAccount,
  resolveTrustedOrigin,
  getCorsHeaders,
  getServiceAccountAccessToken,
  verifyFirebaseIdToken,
  requireAdmin,
  fsGetDoc,
  fsPatchDoc,
  fsCreateDoc,
  fsDeleteDoc,
  fsListCollection,
  authDeleteUser,
  authSetDisabled,
  writeAuditLog,
  isUserCurrentlyPremium,
};
