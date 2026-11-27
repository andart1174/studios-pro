/**
 * Studios-Pro SEO & Search Engine Indexing Center API (Admin-Only)
 * ================================================================
 * Powers the Admin Panel -> "SEO & Indexing (Bing + Google)" tab:
 *  - `health`: Live probes of sitemap.xml, robots.txt, BingSiteAuth.xml,
 *              IndexNow key file, Google verification file & llms.txt + URL extraction
 *  - `push_indexnow`: Instant URL push to api.indexnow.org (Bing, Yandex, Seznam, Naver, Yep)
 *  - `bing_quota`: Queries Bing Webmaster API daily & monthly submission quota
 *  - `push_bing_api`: Direct batch push to Bing Webmaster URL Submission API (up to 10k/day)
 *  - `list_logs`: Recent indexing history from Firestore `seo_logs`
 */

const {
  getCorsHeaders,
  requireAdmin,
  parseServiceAccount,
  fsCreateDoc,
  fsListCollection,
  writeAuditLog,
} = require('./_firebase-admin');

const SITE_HOST = 'studios-pro.com';
const SITE_ORIGIN = `https://${SITE_HOST}`;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'f89ae7b4f1094014a700fcd8d747035b';
const INDEXNOW_KEY_URL = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;

function sanitizeSiteUrls(rawList) {
  if (!Array.isArray(rawList)) return [];
  const out = new Set();
  for (const raw of rawList) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const u = trimmed.startsWith('/') ? new URL(trimmed, SITE_ORIGIN) : new URL(trimmed);
      if (u.hostname.toLowerCase() === SITE_HOST && (u.protocol === 'https:' || u.protocol === 'http:')) {
        out.add(`https://${SITE_HOST}${u.pathname}${u.search}`);
      }
    } catch (_) {}
  }
  return Array.from(out);
}

async function fetchLiveSitemapUrls() {
  const res = await fetch(`${SITE_ORIGIN}/sitemap.xml`, { headers: { 'User-Agent': 'StudiosPro-SEO-Center/2.0' } });
  if (!res.ok) throw new Error(`Could not fetch live sitemap.xml (HTTP ${res.status})`);
  const xml = await res.text();
  const locs = [];
  const re = /<loc>\s*(https:\/\/studios-pro\.com[^<\s]*)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    locs.push(m[1].trim());
  }
  return Array.from(new Set(locs));
}

async function probeUrl(path) {
  const full = `${SITE_ORIGIN}${path}`;
  try {
    const res = await fetch(full, { method: 'GET', headers: { 'User-Agent': 'StudiosPro-SEO-Center/2.0' } });
    const txt = await res.text();
    return { path, url: full, status: res.status, ok: res.ok, bytes: txt.length };
  } catch (err) {
    return { path, url: full, status: 0, ok: false, error: err.message };
  }
}

async function recordSeoLog(engine, count, status, summary, actor, sampleUrls = []) {
  try {
    if (!parseServiceAccount()) return;
    await fsCreateDoc('seo_logs', null, {
      engine,
      urlCount: count,
      httpStatus: status,
      summary: String(summary || '').slice(0, 400),
      actor,
      sampleUrls: sampleUrls.slice(0, 8),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[SEO-Log] write failed:', e.message);
  }
}

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const admin = await requireAdmin(event);
  if (!admin.ok) {
    return { statusCode: admin.status || 403, headers, body: JSON.stringify({ error: admin.error }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const action = String(body.action || '').trim();

  try {
    if (action === 'health') {
      const [sitemap, robots, bingAuth, indexNowKey, googleVerify, llms] = await Promise.all([
        probeUrl('/sitemap.xml'),
        probeUrl('/robots.txt'),
        probeUrl('/BingSiteAuth.xml'),
        probeUrl(`/${INDEXNOW_KEY}.txt`),
        probeUrl('/googlefb2bcd50466119a3.html'),
        probeUrl('/llms.txt'),
      ]);
      let sitemapUrls = [];
      try {
        sitemapUrls = await fetchLiveSitemapUrls();
      } catch (_) {}

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          checks: { sitemap, robots, bingAuth, indexNowKey, googleVerify, llms },
          sitemapCount: sitemapUrls.length,
          sitemapUrls,
          bingApiConfigured: !!process.env.BING_WEBMASTER_API_KEY,
          indexNowKey: INDEXNOW_KEY,
          checkedAt: new Date().toISOString(),
        }),
      };
    }

    if (action === 'push_indexnow') {
      let urlList = body.allFromSitemap ? await fetchLiveSitemapUrls() : sanitizeSiteUrls(body.urls);
      if (urlList.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No valid studios-pro.com URLs provided' }) };
      }
      // IndexNow allows up to 10,000 URLs per POST; syndicates automatically to Bing, Yandex, Seznam, Naver, Yep
      urlList = urlList.slice(0, 10000);
      const payload = {
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_URL,
        urlList,
      };
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const respText = await res.text().catch(() => '');
      const ok = res.status === 200 || res.status === 202;
      const summary = ok
        ? `Accepted (${res.status}) — Bing, Yandex, Seznam & Naver notified for ${urlList.length} URL(s).`
        : `HTTP ${res.status}: ${respText.slice(0, 200)}`;

      await recordSeoLog('IndexNow', urlList.length, res.status, summary, admin.email, urlList);
      await writeAuditLog('seo_push_indexnow', admin.email, { count: urlList.length, status: res.status });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok, httpStatus: res.status, submitted: urlList.length, summary, responseBody: respText.slice(0, 300) }),
      };
    }

    if (action === 'bing_quota') {
      const apiKey = process.env.BING_WEBMASTER_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: false, configured: false, error: 'BING_WEBMASTER_API_KEY not set in Netlify environment variables.' }),
        };
      }
      const res = await fetch(
        `https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(SITE_ORIGIN)}&apikey=${encodeURIComponent(apiKey)}`
      );
      const json = await res.json().catch(() => ({}));
      const d = json.d || json;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: res.ok,
          configured: true,
          httpStatus: res.status,
          dailyQuota: d.DailyQuota ?? null,
          monthlyQuota: d.MonthlyQuota ?? null,
        }),
      };
    }

    if (action === 'push_bing_api') {
      const apiKey = process.env.BING_WEBMASTER_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'BING_WEBMASTER_API_KEY is not configured in Netlify. Use IndexNow (already active!) or add your Bing Webmaster API key.',
          }),
        };
      }
      let urlList = body.allFromSitemap ? await fetchLiveSitemapUrls() : sanitizeSiteUrls(body.urls);
      if (urlList.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No valid studios-pro.com URLs provided' }) };
      }

      // Bing SubmitUrlbatch supports up to 500 URLs per batch
      const batches = [];
      for (let i = 0; i < urlList.length; i += 500) batches.push(urlList.slice(i, i + 500));

      let lastStatus = 200;
      let lastBody = '';
      let totalSubmitted = 0;
      for (const batch of batches) {
        const res = await fetch(
          `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ siteUrl: SITE_ORIGIN, urlList: batch }),
          }
        );
        lastStatus = res.status;
        lastBody = await res.text().catch(() => '');
        if (!res.ok) break;
        totalSubmitted += batch.length;
      }

      const ok = lastStatus >= 200 && lastStatus < 300;
      const summary = ok
        ? `Bing Webmaster API accepted ${totalSubmitted} URL(s) (HTTP ${lastStatus}).`
        : `Bing API HTTP ${lastStatus}: ${lastBody.slice(0, 200)}`;

      await recordSeoLog('Bing Webmaster API', totalSubmitted, lastStatus, summary, admin.email, urlList);
      await writeAuditLog('seo_push_bing_api', admin.email, { count: totalSubmitted, status: lastStatus });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok, httpStatus: lastStatus, submitted: totalSubmitted, summary, responseBody: lastBody.slice(0, 300) }),
      };
    }

    if (action === 'list_logs') {
      if (!parseServiceAccount()) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, logs: [] }) };
      }
      const logs = await fsListCollection('seo_logs', 100);
      logs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, logs: logs.slice(0, 50) }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown SEO action: ${action}` }) };
  } catch (err) {
    console.error(`[SEO-Index:${action}] Error:`, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'SEO indexing request failed' }) };
  }
};
