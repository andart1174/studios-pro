/**
 * Studios-Pro Admin Command Center API (v2.0)
 * ===========================================
 * Authenticated server-side endpoint for Admin operations & safe user VIP migration:
 *  - User actions (any authenticated user): `migrate_vip`, `consume_export_credit`
 *  - Admin actions (verified owner/admin only):
 *      `health`, `list_users`, `grant_premium`, `revoke_premium`, `set_export_credit`,
 *      `preregister_vip`, `toggle_ban`, `delete_user`, `list_newsletter`,
 *      `delete_newsletter`, `set_maintenance`, `list_audit_logs`
 */

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const {
  getCorsHeaders,
  verifyFirebaseIdToken,
  requireAdmin,
  parseServiceAccount,
  fsGetDoc,
  fsPatchDoc,
  fsCreateDoc,
  fsDeleteDoc,
  fsListCollection,
  authDeleteUser,
  authSetDisabled,
  writeAuditLog,
  isUserCurrentlyPremium,
} = require('./_firebase-admin');

function sanitizeEmailId(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const action = String(body.action || '').trim();
  const hasServiceAccount = !!parseServiceAccount();

  // ── USER-SCOPED SAFE SERVER ACTIONS (Authenticated Regular Users) ─────────
  if (action === 'migrate_vip' || action === 'consume_export_credit') {
    const auth = await verifyFirebaseIdToken(event);
    if (!auth.ok) return { statusCode: auth.status || 401, headers, body: JSON.stringify({ error: auth.error }) };
    if (!hasServiceAccount) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, skipped: 'no_service_account' }) };
    }

    try {
      if (action === 'consume_export_credit') {
        const userDoc = await fsGetDoc('users', auth.uid);
        if (userDoc && userDoc.hasExportCredit) {
          await fsPatchDoc('users', auth.uid, { hasExportCredit: false, updatedAt: new Date().toISOString() });
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, consumed: true }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, consumed: false }) };
      }

      if (action === 'migrate_vip') {
        if (!auth.emailVerified || !auth.email) {
          return { statusCode: 200, headers, body: JSON.stringify({ ok: false, reason: 'email_not_verified' }) };
        }
        const safeId = sanitizeEmailId(auth.email);
        if (!safeId || safeId === auth.uid) {
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, migrated: false }) };
        }
        const vipDoc = await fsGetDoc('users', safeId);
        if (!vipDoc || !vipDoc.preRegistered) {
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, migrated: false }) };
        }

        const isActive = isUserCurrentlyPremium(vipDoc);
        await fsPatchDoc('users', auth.uid, {
          email: auth.email,
          isPremium: isActive,
          premiumUntil: vipDoc.premiumUntil || null,
          planType: vipDoc.planType || (vipDoc.premiumUntil ? 'vip_timed' : 'vip_lifetime'),
          hasExportCredit: !!vipDoc.hasExportCredit,
          migratedFromVip: true,
          updatedAt: new Date().toISOString(),
        });
        await fsDeleteDoc('users', safeId);
        await writeAuditLog('vip_migrated', auth.email, { uid: auth.uid, premiumUntil: vipDoc.premiumUntil || 'lifetime' });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            migrated: true,
            isPremium: isActive,
            premiumUntil: vipDoc.premiumUntil || null,
          }),
        };
      }
    } catch (err) {
      console.error(`[AdminAPI:${action}] error:`, err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server operation failed' }) };
    }
  }

  // ── ADMIN-ONLY ACTIONS ────────────────────────────────────────────────────
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    return { statusCode: admin.status || 403, headers, body: JSON.stringify({ error: admin.error }) };
  }

  try {
    if (action === 'health') {
      let firestoreOk = false;
      if (hasServiceAccount) {
        try {
          await fsGetDoc('site_config', 'maintenance');
          firestoreOk = true;
        } catch (_) {}
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          adminEmail: admin.email,
          serviceAccountConfigured: hasServiceAccount,
          firestoreAdminOk: firestoreOk,
          stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
          stripeWebhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
          bingApiConfigured: !!process.env.BING_WEBMASTER_API_KEY,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (!hasServiceAccount) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'FIREBASE_SERVICE_ACCOUNT is not configured in Netlify environment variables.',
          code: 'MISSING_SERVICE_ACCOUNT',
        }),
      };
    }

    if (action === 'list_users') {
      const rawUsers = await fsListCollection('users', 500);
      const now = Date.now();
      const sevenDaysMs = 7 * 86400 * 1000;
      const thirtyDaysMs = 30 * 86400 * 1000;

      const users = rawUsers.map((u) => {
        const activePremium = isUserCurrentlyPremium(u, now);
        const isExpiredPro = !!(u.isPremium && u.premiumUntil && new Date(u.premiumUntil).getTime() <= now);
        return { ...u, activePremium, isExpiredPro };
      });

      const activePro = users.filter((u) => u.activePremium).length;
      const expiredPro = users.filter((u) => u.isExpiredPro).length;
      const stripeActive = users.filter((u) => u.activePremium && u.stripeSubscriptionId).length;
      const new7d = users.filter((u) => u.createdAt && (now - new Date(u.createdAt).getTime()) <= sevenDaysMs).length;
      const new30d = users.filter((u) => u.createdAt && (now - new Date(u.createdAt).getTime()) <= thirtyDaysMs).length;
      const expiring7d = users.filter((u) => {
        if (!u.activePremium || !u.premiumUntil) return false;
        const diff = new Date(u.premiumUntil).getTime() - now;
        return diff > 0 && diff <= sevenDaysMs;
      }).length;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          users,
          stats: {
            total: users.length,
            activePro,
            expiredPro,
            free: users.length - activePro,
            stripeActive,
            mrrUsd: stripeActive * 10,
            new7d,
            new30d,
            expiring7d,
          },
        }),
      };
    }

    if (action === 'grant_premium') {
      const { userId, days } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
      const d = Number(days) || 0;
      let premiumUntil = null;
      if (d > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + d);
        premiumUntil = exp.toISOString();
      }
      await fsPatchDoc('users', userId, {
        isPremium: true,
        premiumUntil,
        planType: d > 0 ? `admin_${d}d` : 'admin_lifetime',
        updatedAt: new Date().toISOString(),
      });
      await writeAuditLog('admin_grant_premium', admin.email, { userId, days: d, premiumUntil: premiumUntil || 'lifetime' });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, premiumUntil }) };
    }

    if (action === 'revoke_premium') {
      const { userId, cancelStripe } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
      const existing = await fsGetDoc('users', userId);
      let stripeCanceled = false;
      if (cancelStripe && stripe && existing && existing.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
          stripeCanceled = true;
        } catch (e) {
          console.warn('[AdminAPI] Stripe cancel warning:', e.message);
        }
      }
      await fsPatchDoc('users', userId, {
        isPremium: false,
        premiumUntil: null,
        subscriptionStatus: stripeCanceled ? 'canceled_by_admin' : 'revoked_by_admin',
        updatedAt: new Date().toISOString(),
      });
      await writeAuditLog('admin_revoke_premium', admin.email, { userId, stripeCanceled });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, stripeCanceled }) };
    }

    if (action === 'set_export_credit') {
      const { userId, grant } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
      await fsPatchDoc('users', userId, { hasExportCredit: !!grant, updatedAt: new Date().toISOString() });
      await writeAuditLog('admin_set_export_credit', admin.email, { userId, grant: !!grant });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'preregister_vip') {
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email address' }) };
      }
      const d = Number(body.days) || 0;
      let premiumUntil = null;
      if (d > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + d);
        premiumUntil = exp.toISOString();
      }
      // Avoid creating duplicate docs if user already registered!
      const allUsers = await fsListCollection('users', 500);
      const existing = allUsers.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);
      const targetId = existing ? existing.id : sanitizeEmailId(cleanEmail);
      const payload = {
        email: cleanEmail,
        isPremium: true,
        premiumUntil,
        planType: d > 0 ? `vip_${d}d` : 'vip_lifetime',
        preRegistered: !existing,
        updatedAt: new Date().toISOString(),
      };
      if (!existing) payload.createdAt = new Date().toISOString();

      await fsPatchDoc('users', targetId, payload);
      await writeAuditLog('admin_preregister_vip', admin.email, { email: cleanEmail, targetId, updatedExisting: !!existing, days: d });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, targetId, updatedExisting: !!existing, premiumUntil }) };
    }

    if (action === 'toggle_ban') {
      const { userId, banned } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
      await fsPatchDoc('users', userId, { banned: !!banned, updatedAt: new Date().toISOString() });
      const authRes = await authSetDisabled(userId, !!banned);
      await writeAuditLog(banned ? 'admin_ban_user' : 'admin_unban_user', admin.email, { userId, authUpdated: authRes.ok });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, authUpdated: authRes.ok }) };
    }

    if (action === 'delete_user') {
      const { userId, cancelStripe } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
      const existing = await fsGetDoc('users', userId);
      let stripeCanceled = false;
      if (cancelStripe !== false && stripe && existing && existing.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
          stripeCanceled = true;
        } catch (_) {}
      }
      const authDel = await authDeleteUser(userId);
      await fsDeleteDoc('users', userId);
      await writeAuditLog('admin_delete_user', admin.email, {
        userId,
        email: existing ? existing.email : '',
        authDeleted: authDel.ok,
        stripeCanceled,
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, authDeleted: authDel.ok, stripeCanceled }) };
    }

    if (action === 'list_newsletter') {
      const subs = await fsListCollection('newsletter', 500);
      subs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, subscribers: subs }) };
    }

    if (action === 'delete_newsletter') {
      const { subId } = body;
      if (!subId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing subId' }) };
      await fsDeleteDoc('newsletter', subId);
      await writeAuditLog('admin_delete_newsletter', admin.email, { subId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'set_maintenance') {
      const payload = {
        enabled: !!body.enabled,
        messageEn: String(body.messageEn || 'Scheduled maintenance in progress. We will be right back!').slice(0, 400),
        messageFr: String(body.messageFr || 'Maintenance planifiée en cours. Nous revenons très vite !').slice(0, 400),
        updatedAt: new Date().toISOString(),
        updatedBy: admin.email,
      };
      await fsPatchDoc('site_config', 'maintenance', payload);
      await writeAuditLog('admin_set_maintenance', admin.email, { enabled: payload.enabled });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, maintenance: payload }) };
    }

    if (action === 'list_audit_logs') {
      const logs = await fsListCollection('audit_logs', 150);
      logs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, logs: logs.slice(0, 100) }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  } catch (err) {
    console.error(`[AdminAPI:${action}] Fatal:`, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin action failed on server' }) };
  }
};
