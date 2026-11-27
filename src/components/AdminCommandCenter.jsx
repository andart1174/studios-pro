import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Users, MessageSquare, Mail, Shield, ShieldCheck, Globe, Send,
  RefreshCw, Download, Trash2, CheckCircle, AlertTriangle, Ban,
  Search, ExternalLink, Activity, Megaphone, Sparkles, Clock, Copy, Check
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, orderBy
} from 'firebase/firestore';

/**
 * Single-Source-of-Truth Premium Expiry Evaluator
 * Fixes the legacy never-expire bug where `isPremium: true` bypassed `premiumUntil`.
 */
export function isUserCurrentlyPremium(u, nowMs = Date.now()) {
  if (!u || u.banned) return false;
  if (!u.isPremium) return false;
  if (!u.premiumUntil) return true; // Explicit Lifetime
  const exp = new Date(u.premiumUntil).getTime();
  return Number.isFinite(exp) && exp > nowMs;
}

export function isUserExpiredPremium(u, nowMs = Date.now()) {
  if (!u || !u.isPremium || !u.premiumUntil) return false;
  const exp = new Date(u.premiumUntil).getTime();
  return Number.isFinite(exp) && exp <= nowMs;
}

function safeCopy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (_) {}
}

function downloadCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function AdminCommandCenter({
  isOpen,
  onClose,
  lang,
  user,
  isAdmin,
  onAnnouncementSaved,
  onMaintenanceSaved,
}) {
  const isFr = lang === 'fr';
  const [activeTab, setActiveTab] = useState('users');
  const [notice, setNotice] = useState(null); // { type: 'ok' | 'err' | 'warn', text }
  const [loading, setLoading] = useState(false);

  // Data state
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, activePro: 0, expiredPro: 0, free: 0, mrrUsd: 0, new7d: 0, new30d: 0, expiring7d: 0 });
  const [messages, setMessages] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filters & forms
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | premium | expired | free | banned
  const [msgFilter, setMsgFilter] = useState('all'); // all | unread
  const [preRegEmail, setPreRegEmail] = useState('');
  const [preRegDays, setPreRegDays] = useState(30);
  const [preRegBusy, setPreRegBusy] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Announcements & Maintenance
  const [announcement, setAnnouncement] = useState({ textFr: '', textEn: '', active: false });
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    messageEn: 'Scheduled maintenance in progress. We will be right back!',
    messageFr: 'Maintenance planifiée en cours. Nous revenons très vite !',
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // SEO & Indexing Center
  const [seoHealth, setSeoHealth] = useState(null);
  const [seoBusy, setSeoBusy] = useState(false);
  const [bingQuota, setBingQuota] = useState(null);
  const [customUrls, setCustomUrls] = useState('https://studios-pro.com/\nhttps://studios-pro.com/faq.html\nhttps://studios-pro.com/blog/');
  const [seoLogs, setSeoLogs] = useState([]);
  const [seoLastResult, setSeoLastResult] = useState(null);

  const flash = useCallback((type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice((prev) => (prev && prev.text === text ? null : prev)), 5000);
  }, []);

  const callBackend = useCallback(async (endpoint, payload) => {
    if (!user || typeof user.getIdToken !== 'function') {
      throw new Error(isFr ? 'Session admin invalide.' : 'Invalid admin session.');
    }
    const token = await user.getIdToken();
    const res = await fetch(`/.netlify/functions/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }, [user, isFr]);

  const computeClientStats = useCallback((list) => {
    const now = Date.now();
    const sevenD = 7 * 86400 * 1000;
    const thirtyD = 30 * 86400 * 1000;
    const activePro = list.filter((u) => isUserCurrentlyPremium(u, now)).length;
    const expiredPro = list.filter((u) => isUserExpiredPremium(u, now)).length;
    const stripeActive = list.filter((u) => isUserCurrentlyPremium(u, now) && u.stripeSubscriptionId).length;
    const new7d = list.filter((u) => u.createdAt && (now - new Date(u.createdAt).getTime()) <= sevenD).length;
    const new30d = list.filter((u) => u.createdAt && (now - new Date(u.createdAt).getTime()) <= thirtyD).length;
    const expiring7d = list.filter((u) => {
      if (!isUserCurrentlyPremium(u, now) || !u.premiumUntil) return false;
      const diff = new Date(u.premiumUntil).getTime() - now;
      return diff > 0 && diff <= sevenD;
    }).length;
    return {
      total: list.length,
      activePro,
      expiredPro,
      free: list.length - activePro,
      mrrUsd: stripeActive * 10,
      new7d,
      new30d,
      expiring7d,
    };
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!isOpen || !isAdmin || !user) return;
    setLoading(true);
    try {
      // 1. Live Server Health
      try {
        const h = await callBackend('admin-api', { action: 'health' });
        setHealth(h);
      } catch (e) {
        setHealth({ ok: false, error: e.message });
      }

      // 2. Users (prefer server admin-api, fallback to direct Firestore)
      let loadedUsers = [];
      try {
        const res = await callBackend('admin-api', { action: 'list_users' });
        loadedUsers = res.users || [];
        setUsers(loadedUsers);
        setStats(res.stats || computeClientStats(loadedUsers));
      } catch (_) {
        if (db) {
          const snap = await getDocs(collection(db, 'users'));
          loadedUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setUsers(loadedUsers);
          setStats(computeClientStats(loadedUsers));
        }
      }

      // 3. Messages (Firestore)
      if (db) {
        try {
          const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
          const snap = await getDocs(q);
          setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (_) {
          const snap = await getDocs(collection(db, 'messages'));
          setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }

        // 4. Announcements & Maintenance
        try {
          const annSnap = await getDoc(doc(db, 'announcements', 'current'));
          if (annSnap.exists()) {
            const d = annSnap.data();
            setAnnouncement({ textFr: d.textFr || '', textEn: d.textEn || '', active: !!d.active });
          }
        } catch (_) {}
        try {
          const mSnap = await getDoc(doc(db, 'site_config', 'maintenance'));
          if (mSnap.exists()) {
            const m = mSnap.data();
            setMaintenance({
              enabled: !!m.enabled,
              messageEn: m.messageEn || 'Scheduled maintenance in progress. We will be right back!',
              messageFr: m.messageFr || 'Maintenance planifiée en cours. Nous revenons très vite !',
            });
          }
        } catch (_) {}
      }

      // 5. Newsletter
      try {
        const nRes = await callBackend('admin-api', { action: 'list_newsletter' });
        setSubscribers(nRes.subscribers || []);
      } catch (_) {
        if (db) {
          try {
            const snap = await getDocs(collection(db, 'newsletter'));
            setSubscribers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          } catch (__) {}
        }
      }

      // 6. Audit logs
      try {
        const aRes = await callBackend('admin-api', { action: 'list_audit_logs' });
        setAuditLogs(aRes.logs || []);
      } catch (_) {}

      // 7. SEO logs
      try {
        const sRes = await callBackend('seo-index', { action: 'list_logs' });
        setSeoLogs(sRes.logs || []);
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, [isOpen, isAdmin, user, callBackend, computeClientStats]);

  useEffect(() => {
    if (isOpen && isAdmin) fetchAllData();
  }, [isOpen, isAdmin, fetchAllData]);

  // Escape key closes modal cleanly
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !isAdmin) return null;

  // Clickjacking defense: refuse to render Admin inside third-party frames
  if (typeof window !== 'undefined' && window.self !== window.top) return null;

  // ── User Actions ───────────────────────────────────────────────────────────
  const handleGrantPremium = async (userId, days) => {
    try {
      const res = await callBackend('admin-api', { action: 'grant_premium', userId, days });
      const updated = users.map((u) => (u.id === userId ? { ...u, isPremium: true, premiumUntil: res.premiumUntil } : u));
      setUsers(updated);
      setStats(computeClientStats(updated));
      flash('ok', isFr ? `Accès Pro accordé (${days > 0 ? `${days}j` : 'À vie'}).` : `Pro granted (${days > 0 ? `${days}d` : 'Lifetime'}).`);
    } catch (_) {
      // Fallback to direct Firestore Admin rules if service account is not yet configured
      try {
        let premiumUntil = null;
        if (days > 0) { const d = new Date(); d.setDate(d.getDate() + days); premiumUntil = d.toISOString(); }
        await updateDoc(doc(db, 'users', userId), { isPremium: true, premiumUntil });
        const updated = users.map((u) => (u.id === userId ? { ...u, isPremium: true, premiumUntil } : u));
        setUsers(updated);
        setStats(computeClientStats(updated));
        flash('ok', isFr ? 'Accès Pro mis à jour via Firestore.' : 'Pro updated via Firestore.');
      } catch (err) {
        flash('err', err.message);
      }
    }
  };

  const handleRevokePremium = async (u) => {
    const hasStripe = !!u.stripeSubscriptionId;
    const cancelStripe = hasStripe
      ? window.confirm(
          isFr
            ? `Cet utilisateur a un abonnement Stripe actif (${u.stripeSubscriptionId}). Voulez-vous aussi ANNULER son prélèvement Stripe ?`
            : `This user has an active Stripe subscription (${u.stripeSubscriptionId}). Also CANCEL their Stripe billing?`
        )
      : false;
    try {
      const res = await callBackend('admin-api', { action: 'revoke_premium', userId: u.id, cancelStripe });
      const updated = users.map((x) => (x.id === u.id ? { ...x, isPremium: false, premiumUntil: null } : x));
      setUsers(updated);
      setStats(computeClientStats(updated));
      flash('ok', res.stripeCanceled
        ? (isFr ? 'Pro révoqué + abonnement Stripe annulé.' : 'Pro revoked + Stripe subscription canceled.')
        : (isFr ? 'Accès Pro révoqué.' : 'Pro access revoked.'));
    } catch (_) {
      try {
        await updateDoc(doc(db, 'users', u.id), { isPremium: false, premiumUntil: null });
        const updated = users.map((x) => (x.id === u.id ? { ...x, isPremium: false, premiumUntil: null } : x));
        setUsers(updated);
        setStats(computeClientStats(updated));
        flash('ok', isFr ? 'Accès Pro révoqué.' : 'Pro access revoked.');
      } catch (err) {
        flash('err', err.message);
      }
    }
  };

  const handleExportCredit = async (userId, grant) => {
    try {
      await callBackend('admin-api', { action: 'set_export_credit', userId, grant });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, hasExportCredit: grant } : u)));
      flash('ok', grant ? (isFr ? '1 crédit export accordé.' : '1 export credit granted.') : (isFr ? 'Crédit export retiré.' : 'Export credit removed.'));
    } catch (_) {
      try {
        await updateDoc(doc(db, 'users', userId), { hasExportCredit: grant });
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, hasExportCredit: grant } : u)));
        flash('ok', isFr ? 'Crédit export mis à jour.' : 'Export credit updated.');
      } catch (err) {
        flash('err', err.message);
      }
    }
  };

  const handleToggleBan = async (u) => {
    const nextBan = !u.banned;
    if (!window.confirm(
      isFr
        ? `${nextBan ? 'Suspendre' : 'Réactiver'} le compte ${u.email || u.id} ?`
        : `${nextBan ? 'Suspend' : 'Unsuspend'} account ${u.email || u.id}?`
    )) return;
    try {
      await callBackend('admin-api', { action: 'toggle_ban', userId: u.id, banned: nextBan });
      const updated = users.map((x) => (x.id === u.id ? { ...x, banned: nextBan } : x));
      setUsers(updated);
      setStats(computeClientStats(updated));
      flash('ok', nextBan ? (isFr ? 'Compte suspendu (Auth + DB).' : 'Account suspended (Auth + DB).') : (isFr ? 'Compte réactivé.' : 'Account reactivated.'));
    } catch (err) {
      flash('err', err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(
      isFr
        ? `Supprimer DÉFINITIVEMENT ${u.email || u.id} (Firebase Auth + Firestore + Stripe) ?`
        : `PERMANENTLY delete ${u.email || u.id} (Firebase Auth + Firestore + Stripe)?`
    )) return;
    try {
      const res = await callBackend('admin-api', { action: 'delete_user', userId: u.id, cancelStripe: true });
      const updated = users.filter((x) => x.id !== u.id);
      setUsers(updated);
      setStats(computeClientStats(updated));
      flash('ok', isFr
        ? `Utilisateur supprimé (Auth: ${res.authDeleted ? 'Oui' : 'Doc uniquement'}).`
        : `User deleted (Auth: ${res.authDeleted ? 'Yes' : 'Doc only'}).`);
    } catch (_) {
      try {
        await deleteDoc(doc(db, 'users', u.id));
        const updated = users.filter((x) => x.id !== u.id);
        setUsers(updated);
        setStats(computeClientStats(updated));
        flash('warn', isFr
          ? 'Profil Firestore supprimé (configurez FIREBASE_SERVICE_ACCOUNT pour supprimer aussi Firebase Auth).'
          : 'Firestore profile deleted (set FIREBASE_SERVICE_ACCOUNT to also delete Firebase Auth).');
      } catch (err) {
        flash('err', err.message);
      }
    }
  };

  const handlePreRegister = async (e) => {
    e.preventDefault();
    const clean = preRegEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    setPreRegBusy(true);
    try {
      const res = await callBackend('admin-api', { action: 'preregister_vip', email: clean, days: preRegDays });
      flash('ok', res.updatedExisting
        ? (isFr ? `Compte existant ${clean} promu Pro !` : `Existing account ${clean} upgraded to Pro!`)
        : (isFr ? `VIP ${clean} pré-enregistré sans doublon !` : `VIP ${clean} pre-registered cleanly!`));
      setPreRegEmail('');
      fetchAllData();
    } catch (_) {
      try {
        const existing = users.find((u) => (u.email || '').toLowerCase().trim() === clean);
        const targetId = existing ? existing.id : clean.replace(/[^a-z0-9]/g, '_');
        let premiumUntil = null;
        if (preRegDays > 0) { const d = new Date(); d.setDate(d.getDate() + preRegDays); premiumUntil = d.toISOString(); }
        await setDoc(doc(db, 'users', targetId), {
          email: clean,
          isPremium: true,
          premiumUntil,
          preRegistered: !existing,
          createdAt: existing?.createdAt || new Date().toISOString(),
        }, { merge: true });
        setPreRegEmail('');
        fetchAllData();
        flash('ok', isFr ? `Accès VIP enregistré pour ${clean}.` : `VIP access saved for ${clean}.`);
      } catch (err) {
        flash('err', err.message);
      }
    } finally {
      setPreRegBusy(false);
    }
  };

  // ── Messages & Newsletter Actions ──────────────────────────────────────────
  const handleToggleRead = async (m) => {
    try {
      await updateDoc(doc(db, 'messages', m.id), { read: !m.read });
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read: !m.read } : x)));
    } catch (err) {
      flash('err', err.message);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm(isFr ? 'Supprimer ce message ?' : 'Delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'messages', id));
      setMessages((prev) => prev.filter((x) => x.id !== id));
      flash('ok', isFr ? 'Message supprimé.' : 'Message deleted.');
    } catch (err) {
      flash('err', err.message);
    }
  };

  const handleDeleteSubscriber = async (subId) => {
    if (!window.confirm(isFr ? 'Supprimer cet abonné newsletter ?' : 'Remove this newsletter subscriber?')) return;
    try {
      await callBackend('admin-api', { action: 'delete_newsletter', subId });
      setSubscribers((prev) => prev.filter((s) => s.id !== subId));
      flash('ok', isFr ? 'Abonné retiré.' : 'Subscriber removed.');
    } catch (_) {
      try {
        await deleteDoc(doc(db, 'newsletter', subId));
        setSubscribers((prev) => prev.filter((s) => s.id !== subId));
      } catch (err) { flash('err', err.message); }
    }
  };

  // ── Announcements & Maintenance Actions ────────────────────────────────────
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (announcement.active && !announcement.textFr.trim() && !announcement.textEn.trim()) {
      flash('err', isFr ? 'Saisissez au moins un texte avant d’activer la bannière.' : 'Enter at least one banner text before enabling.');
      return;
    }
    setSavingBanner(true);
    try {
      const payload = {
        textFr: announcement.textFr.trim(),
        textEn: announcement.textEn.trim(),
        active: !!announcement.active,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'announcements', 'current'), payload);
      if (onAnnouncementSaved) onAnnouncementSaved(payload);
      flash('ok', isFr ? 'Bannière globale mise à jour en direct !' : 'Global banner updated live!');
    } catch (err) {
      flash('err', err.message);
    } finally {
      setSavingBanner(false);
    }
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    setSavingBanner(true);
    try {
      const payload = {
        enabled: !!maintenance.enabled,
        messageEn: maintenance.messageEn.trim(),
        messageFr: maintenance.messageFr.trim(),
        updatedAt: new Date().toISOString(),
      };
      try {
        await callBackend('admin-api', { action: 'set_maintenance', ...payload });
      } catch (_) {
        await setDoc(doc(db, 'site_config', 'maintenance'), payload);
      }
      if (onMaintenanceSaved) onMaintenanceSaved(payload);
      flash('ok', payload.enabled
        ? (isFr ? 'Mode Maintenance ACTIVÉ (Admin exempté).' : 'Maintenance Mode ENABLED (Admin exempt).')
        : (isFr ? 'Mode Maintenance désactivé.' : 'Maintenance Mode disabled.'));
    } catch (err) {
      flash('err', err.message);
    } finally {
      setSavingBanner(false);
    }
  };

  // ── SEO & Indexing Center Actions (Bing API + IndexNow + Health) ──────────
  const runSeoHealth = async () => {
    setSeoBusy(true);
    try {
      const res = await callBackend('seo-index', { action: 'health' });
      setSeoHealth(res);
      if (res.bingApiConfigured) {
        const q = await callBackend('seo-index', { action: 'bing_quota' }).catch(() => null);
        if (q) setBingQuota(q);
      }
      flash('ok', isFr ? `Santé SEO vérifiée (${res.sitemapCount} URLs dans sitemap.xml).` : `SEO Health checked (${res.sitemapCount} URLs in sitemap.xml).`);
    } catch (err) {
      flash('err', err.message);
    } finally {
      setSeoBusy(false);
    }
  };

  const parseCustomUrlList = () => customUrls.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  const pushIndexNow = async (allFromSitemap) => {
    setSeoBusy(true);
    try {
      const res = await callBackend('seo-index', {
        action: 'push_indexnow',
        allFromSitemap,
        urls: allFromSitemap ? undefined : parseCustomUrlList(),
      });
      setSeoLastResult({ engine: 'IndexNow (Bing + Yandex + Seznam + Naver)', ...res });
      flash(res.ok ? 'ok' : 'err', res.summary);
      const lRes = await callBackend('seo-index', { action: 'list_logs' }).catch(() => null);
      if (lRes && lRes.logs) setSeoLogs(lRes.logs);
    } catch (err) {
      flash('err', err.message);
    } finally {
      setSeoBusy(false);
    }
  };

  const pushBingApi = async (allFromSitemap) => {
    setSeoBusy(true);
    try {
      const res = await callBackend('seo-index', {
        action: 'push_bing_api',
        allFromSitemap,
        urls: allFromSitemap ? undefined : parseCustomUrlList(),
      });
      setSeoLastResult({ engine: 'Bing Webmaster URL Submission API', ...res });
      flash(res.ok ? 'ok' : 'err', res.summary);
      const q = await callBackend('seo-index', { action: 'bing_quota' }).catch(() => null);
      if (q) setBingQuota(q);
      const lRes = await callBackend('seo-index', { action: 'list_logs' }).catch(() => null);
      if (lRes && lRes.logs) setSeoLogs(lRes.logs);
    } catch (err) {
      flash('err', err.message);
    } finally {
      setSeoBusy(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQ = !q || (u.email || '').toLowerCase().includes(q) || (u.id || '').toLowerCase().includes(q);
    if (!matchesQ) return false;
    const active = isUserCurrentlyPremium(u);
    const expired = isUserExpiredPremium(u);
    if (statusFilter === 'premium') return active;
    if (statusFilter === 'expired') return expired;
    if (statusFilter === 'free') return !active && !u.banned;
    if (statusFilter === 'banned') return !!u.banned;
    return true;
  });

  const unreadMessagesCount = messages.filter((m) => !m.read).length;
  const filteredMessages = msgFilter === 'unread' ? messages.filter((m) => !m.read) : messages;

  const safeMailto = (m) => {
    const to = encodeURIComponent(String(m.email || '').replace(/[\r\n]/g, ''));
    const subj = encodeURIComponent(`Studios-Pro — Re: ${String(m.name || 'Support').slice(0, 80)}`);
    return `mailto:${to}?subject=${subj}`;
  };

  return (
    <div
      className="modal-overlay admin-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Admin Command Center"
    >
      <div className="modal-content admin-modal admin-v2">
        <button type="button" className="modal-close" aria-label={isFr ? 'Fermer' : 'Close'} onClick={onClose}>
          <X size={22} />
        </button>

        {/* Header */}
        <div className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingRight: '34px' }}>
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <ShieldCheck size={24} style={{ color: '#38bdf8' }} />
                {isFr ? 'Centre de Commande Admin v2.0' : 'Admin Command Center v2.0'}
              </h2>
              <p className="admin-subtitle">
                {isFr
                  ? 'Sécurité serveur, Utilisateurs Pro, Indexation Bing / Google, Newsletter & Audit'
                  : 'Server-verified Security, Pro Users, Bing / Google Indexing, Newsletter & Audit'}
              </p>
            </div>
            <button type="button" className="admin-refresh-btn" onClick={fetchAllData} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
              {isFr ? 'Actualiser' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Inline Notice Banner */}
        {notice && (
          <div className={`admin-notice admin-notice-${notice.type}`} role="status">
            {notice.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{notice.text}</span>
          </div>
        )}

        {/* KPI Bar */}
        <div className="admin-stats-grid admin-stats-v2">
          <div className="admin-stat-card">
            <span className="stat-label">{isFr ? 'Utilisateurs' : 'Total Users'}</span>
            <span className="stat-val">{stats.total}</span>
            <span className="stat-sub">+{stats.new7d} (7d)</span>
          </div>
          <div className="admin-stat-card highlight-pro">
            <span className="stat-label">{isFr ? 'Pro Actifs' : 'Active Pro'}</span>
            <span className="stat-val">{stats.activePro}</span>
            <span className="stat-sub">{stats.expiredPro} {isFr ? 'expirés' : 'expired'}</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-label">MRR (Stripe)</span>
            <span className="stat-val">${stats.mrrUsd}</span>
            <span className="stat-sub">{stats.expiring7d} {isFr ? 'expire ≤7j' : 'expiring ≤7d'}</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-label">{isFr ? 'Messages' : 'Messages'}</span>
            <span className="stat-val">{messages.length}</span>
            <span className="stat-sub">{unreadMessagesCount} {isFr ? 'non lus' : 'unread'}</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-label">Newsletter</span>
            <span className="stat-val">{subscribers.length}</span>
            <span className="stat-sub">{isFr ? 'abonnés' : 'subscribers'}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button type="button" className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={15} /> {isFr ? 'Utilisateurs' : 'Users'} ({users.length})
          </button>
          <button type="button" className={`admin-tab-btn ${activeTab === 'seo' ? 'active' : ''}`} onClick={() => setActiveTab('seo')}>
            <Globe size={15} /> {isFr ? 'SEO & Indexation (Bing / Google)' : 'SEO & Indexing (Bing / Google)'}
          </button>
          <button type="button" className={`admin-tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <MessageSquare size={15} /> {isFr ? 'Messages' : 'Messages'} {unreadMessagesCount > 0 ? `(${unreadMessagesCount})` : ''}
          </button>
          <button type="button" className={`admin-tab-btn ${activeTab === 'newsletter' ? 'active' : ''}`} onClick={() => setActiveTab('newsletter')}>
            <Mail size={15} /> Newsletter ({subscribers.length})
          </button>
          <button type="button" className={`admin-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
            <Megaphone size={15} /> {isFr ? 'Bannière & Maintenance' : 'Banner & Maintenance'}
          </button>
          <button type="button" className={`admin-tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={15} /> {isFr ? 'Sécurité & Audit' : 'Security & Audit'}
          </button>
        </div>

        <div className="admin-body-scroll">
          {/* ─── TAB 1: USERS & PRO ─────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="admin-panel-section">
              <form className="admin-prereg-form" onSubmit={handlePreRegister}>
                <input
                  type="email"
                  value={preRegEmail}
                  onChange={(e) => setPreRegEmail(e.target.value)}
                  placeholder={isFr ? 'Email VIP à promouvoir / pré-enregistrer...' : 'VIP email to upgrade / pre-register...'}
                  required
                />
                <select value={preRegDays} onChange={(e) => setPreRegDays(Number(e.target.value))}>
                  <option value={30}>{isFr ? '30 jours' : '30 Days'}</option>
                  <option value={60}>{isFr ? '60 jours' : '60 Days'}</option>
                  <option value={365}>{isFr ? '1 an' : '1 Year'}</option>
                  <option value={0}>{isFr ? 'À vie (Lifetime)' : 'Lifetime'}</option>
                </select>
                <button type="submit" className="admin-primary-btn" disabled={preRegBusy}>
                  <Sparkles size={14} /> {preRegBusy ? '...' : (isFr ? 'Accorder VIP' : 'Grant VIP')}
                </button>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => downloadCsv(
                    `studios-pro-users-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['UID', 'Email', 'Status', 'PremiumUntil', 'FreeExportsUsed', 'ExportCredit', 'Banned', 'CreatedAt'],
                    users.map((u) => [
                      u.id,
                      u.email || '',
                      isUserCurrentlyPremium(u) ? 'PRO' : (isUserExpiredPremium(u) ? 'EXPIRED' : 'FREE'),
                      u.premiumUntil || (u.isPremium ? 'LIFETIME' : ''),
                      u.freeExportsUsed || 0,
                      u.hasExportCredit ? 'YES' : 'NO',
                      u.banned ? 'YES' : 'NO',
                      u.createdAt || '',
                    ])
                  )}
                >
                  <Download size={14} /> CSV
                </button>
              </form>

              <div className="admin-filter-row">
                <div className="admin-search-wrap">
                  <Search size={15} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isFr ? 'Rechercher email ou UID...' : 'Search email or UID...'}
                  />
                </div>
                <div className="admin-filter-pills">
                  {[
                    { id: 'all', label: isFr ? 'Tous' : 'All' },
                    { id: 'premium', label: isFr ? 'Pro Actifs' : 'Active Pro' },
                    { id: 'expired', label: isFr ? 'Expirés' : 'Expired' },
                    { id: 'free', label: isFr ? 'Gratuits' : 'Free' },
                    { id: 'banned', label: isFr ? 'Suspendus' : 'Banned' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`admin-pill ${statusFilter === f.id ? 'active' : ''}`}
                      onClick={() => setStatusFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{isFr ? 'Utilisateur' : 'User'}</th>
                      <th>{isFr ? 'Statut' : 'Status'}</th>
                      <th>{isFr ? 'Exports / Crédits' : 'Exports / Credits'}</th>
                      <th>{isFr ? 'Actions Pro & Sécurité' : 'Pro & Security Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        {isFr ? 'Aucun utilisateur trouvé.' : 'No matching users.'}
                      </td></tr>
                    ) : filteredUsers.map((u) => {
                      const activePro = isUserCurrentlyPremium(u);
                      const expiredPro = isUserExpiredPremium(u);
                      const daysLeft = u.premiumUntil
                        ? Math.ceil((new Date(u.premiumUntil).getTime() - Date.now()) / 86400000)
                        : null;
                      return (
                        <tr key={u.id} className={u.banned ? 'row-banned' : ''}>
                          <td>
                            <div className="admin-user-cell">
                              <strong>{u.email || <em style={{ color: '#94a3b8' }}>(no email)</em>}</strong>
                              <span className="admin-uid">
                                {u.id.slice(0, 14)}{u.preRegistered ? ' • VIP PRE-REG' : ''}
                                {u.email && (
                                  <button
                                    type="button"
                                    className="mini-icon-btn"
                                    title={isFr ? 'Copier email' : 'Copy email'}
                                    onClick={() => { safeCopy(u.email); setCopiedId(u.id); setTimeout(() => setCopiedId(null), 1500); }}
                                  >
                                    {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            {u.banned ? (
                              <span className="badge-status badge-banned">{isFr ? 'SUSPENDU' : 'BANNED'}</span>
                            ) : activePro ? (
                              <span className="badge-status badge-pro">
                                PRO {daysLeft === null ? (isFr ? '• À VIE' : '• LIFETIME') : `• ${daysLeft}d`}
                              </span>
                            ) : expiredPro ? (
                              <span className="badge-status badge-expired">{isFr ? 'EXPIRÉ' : 'EXPIRED'}</span>
                            ) : (
                              <span className="badge-status badge-free">{isFr ? 'GRATUIT' : 'FREE'}</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <div>{u.freeExportsUsed || 0} / 5 {isFr ? 'gratuits' : 'free'}</div>
                            {u.hasExportCredit && <span className="badge-credit">+1 Credit</span>}
                          </td>
                          <td>
                            <div className="admin-actions-row">
                              <button type="button" className="btn-xs btn-pro" onClick={() => handleGrantPremium(u.id, 30)}>+30d</button>
                              <button type="button" className="btn-xs btn-pro" onClick={() => handleGrantPremium(u.id, 365)}>+1y</button>
                              <button type="button" className="btn-xs btn-life" onClick={() => handleGrantPremium(u.id, 0)}>∞</button>
                              {(activePro || expiredPro) && (
                                <button type="button" className="btn-xs btn-warn" onClick={() => handleRevokePremium(u)}>
                                  {isFr ? 'Révoquer' : 'Revoke'}
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-xs btn-neutral"
                                onClick={() => handleExportCredit(u.id, !u.hasExportCredit)}
                                title={isFr ? 'Crédit 1 export' : 'Toggle 1 export credit'}
                              >
                                {u.hasExportCredit ? '-1 Cr' : '+1 Cr'}
                              </button>
                              <button
                                type="button"
                                className="btn-xs btn-neutral"
                                onClick={() => handleToggleBan(u)}
                                title={u.banned ? 'Unban' : 'Ban'}
                              >
                                <Ban size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn-xs btn-danger"
                                onClick={() => handleDeleteUser(u)}
                                title={isFr ? 'Supprimer (Auth + DB)' : 'Delete (Auth + DB)'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TAB 2: SEO & INDEXING CENTER (BING + INDEXNOW + GOOGLE) ──── */}
          {activeTab === 'seo' && (
            <div className="admin-panel-section seo-center">
              <div className="seo-card-grid">
                {/* Live Health Card */}
                <div className="seo-box">
                  <div className="seo-box-hdr">
                    <h3><Activity size={17} /> {isFr ? 'Santé SEO Live (studios-pro.com)' : 'Live SEO Health (studios-pro.com)'}</h3>
                    <button type="button" className="admin-primary-btn" onClick={runSeoHealth} disabled={seoBusy}>
                      <RefreshCw size={14} className={seoBusy ? 'spin-icon' : ''} />
                      {isFr ? 'Tester en direct' : 'Run Live Check'}
                    </button>
                  </div>
                  {seoHealth ? (
                    <div className="seo-checks-grid">
                      {Object.entries(seoHealth.checks || {}).map(([k, item]) => (
                        <div key={k} className={`seo-check-pill ${item.ok ? 'ok' : 'fail'}`}>
                          <span>{item.ok ? '✅' : '❌'} <strong>{item.path}</strong></span>
                          <span>HTTP {item.status || 'ERR'}</span>
                        </div>
                      ))}
                      <div className="seo-meta-row">
                        <span>🗺️ Sitemap URLs: <strong>{seoHealth.sitemapCount}</strong></span>
                        <span>🔑 Bing Webmaster API: <strong>{seoHealth.bingApiConfigured ? '✅ Connected' : '⚠️ Set BING_WEBMASTER_API_KEY'}</strong></span>
                        {bingQuota && bingQuota.ok && (
                          <span>📊 Bing Daily Quota: <strong>{bingQuota.dailyQuota}</strong></span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
                      {isFr
                        ? 'Cliquez sur « Tester en direct » pour vérifier sitemap.xml, robots.txt, BingSiteAuth.xml, la clé IndexNow, Google et llms.txt.'
                        : 'Click "Run Live Check" to probe sitemap.xml, robots.txt, BingSiteAuth.xml, IndexNow key, Google verification & llms.txt.'}
                    </p>
                  )}
                </div>

                {/* Quick External Consoles */}
                <div className="seo-box">
                  <h3><ExternalLink size={17} /> {isFr ? 'Consoles Google & Bing' : 'Google & Bing Webmaster Consoles'}</h3>
                  <div className="seo-ext-links">
                    <a href="https://www.bing.com/webmasters/" target="_blank" rel="noopener noreferrer" className="admin-secondary-btn">
                      🔷 Bing Webmaster Tools
                    </a>
                    <a href="https://search.google.com/search-console?resource_id=sc-domain:studios-pro.com" target="_blank" rel="noopener noreferrer" className="admin-secondary-btn">
                      🔍 Google Search Console
                    </a>
                    <a href="https://search.google.com/test/rich-results?url=https%3A%2F%2Fstudios-pro.com%2Ffaq.html" target="_blank" rel="noopener noreferrer" className="admin-secondary-btn">
                      ✨ Rich Results Test
                    </a>
                    <a href="https://studios-pro.com/sitemap.xml" target="_blank" rel="noopener noreferrer" className="admin-secondary-btn">
                      🗺️ sitemap.xml
                    </a>
                  </div>
                </div>
              </div>

              {/* Direct Submission Console */}
              <div className="seo-box">
                <h3><Send size={17} /> {isFr ? 'Envoyer des pages à l’indexation (IndexNow & Bing API)' : 'Submit Pages for Instant Indexing (IndexNow & Bing API)'}</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '8px' }}>
                  {isFr
                    ? 'IndexNow notifie instantanément Bing, Yandex, Seznam et Naver sans configuration supplémentaire. L’API Bing Webmaster permet en plus jusqu’à 10 000 URL/jour.'
                    : 'IndexNow instantly notifies Bing, Yandex, Seznam & Naver with zero extra setup. Bing Webmaster API adds up to 10,000 direct URL submissions/day.'}
                </p>
                <textarea
                  className="seo-url-textarea"
                  rows={4}
                  value={customUrls}
                  onChange={(e) => setCustomUrls(e.target.value)}
                  placeholder="https://studios-pro.com/..."
                />
                <div className="seo-push-actions">
                  <button type="button" className="admin-primary-btn" disabled={seoBusy} onClick={() => pushIndexNow(false)}>
                    <Send size={14} /> {isFr ? 'Envoyer ces URL → IndexNow' : 'Push Listed URLs → IndexNow'}
                  </button>
                  <button type="button" className="admin-accent-btn" disabled={seoBusy} onClick={() => pushIndexNow(true)}>
                    <Globe size={14} /> {isFr ? 'Envoyer TOUT le Sitemap → IndexNow (Bing+)' : 'Push FULL Sitemap → IndexNow (Bing+)'}
                  </button>
                  <button type="button" className="admin-secondary-btn" disabled={seoBusy} onClick={() => pushBingApi(false)}>
                    🔷 {isFr ? 'Envoyer ces URL → Bing API' : 'Push Listed → Bing Webmaster API'}
                  </button>
                  <button type="button" className="admin-secondary-btn" disabled={seoBusy} onClick={() => pushBingApi(true)}>
                    🔷 {isFr ? 'Tout le Sitemap → Bing API' : 'Full Sitemap → Bing API'}
                  </button>
                </div>

                {seoLastResult && (
                  <div className={`admin-notice ${seoLastResult.ok ? 'admin-notice-ok' : 'admin-notice-err'}`} style={{ marginTop: '12px' }}>
                    <span><strong>{seoLastResult.engine}:</strong> {seoLastResult.summary}</span>
                  </div>
                )}
              </div>

              {/* Indexing Logs */}
              <div className="seo-box">
                <h3><Clock size={17} /> {isFr ? 'Historique des soumissions SEO' : 'Recent Indexing Submissions'}</h3>
                {seoLogs.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {isFr ? 'Aucune soumission enregistrée pour le moment.' : 'No indexing submissions logged yet.'}
                  </p>
                ) : (
                  <div className="audit-list">
                    {seoLogs.map((l) => (
                      <div key={l.id} className="audit-row">
                        <span className={`badge-status ${l.httpStatus >= 200 && l.httpStatus < 300 ? 'badge-pro' : 'badge-expired'}`}>
                          {l.engine} • {l.httpStatus}
                        </span>
                        <span className="audit-msg">{l.summary}</span>
                        <span className="audit-time">{String(l.timestamp || '').slice(0, 19).replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 3: MESSAGES ────────────────────────────────────────────── */}
          {activeTab === 'messages' && (
            <div className="admin-panel-section">
              <div className="admin-filter-pills" style={{ marginBottom: '12px' }}>
                <button type="button" className={`admin-pill ${msgFilter === 'all' ? 'active' : ''}`} onClick={() => setMsgFilter('all')}>
                  {isFr ? 'Tous' : 'All'} ({messages.length})
                </button>
                <button type="button" className={`admin-pill ${msgFilter === 'unread' ? 'active' : ''}`} onClick={() => setMsgFilter('unread')}>
                  {isFr ? 'Non lus' : 'Unread'} ({unreadMessagesCount})
                </button>
              </div>
              {filteredMessages.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                  {isFr ? 'Aucun message.' : 'No messages.'}
                </p>
              ) : filteredMessages.map((m) => (
                <div key={m.id} className={`admin-msg-card ${m.read ? 'read' : 'unread'}`}>
                  <div className="admin-msg-hdr">
                    <div>
                      <strong>{m.name}</strong> <span style={{ color: '#38bdf8' }}>&lt;{m.email}&gt;</span>
                      {!m.read && <span className="badge-status badge-pro" style={{ marginLeft: '8px' }}>NEW</span>}
                    </div>
                    <span className="audit-time">{String(m.timestamp || '').slice(0, 19).replace('T', ' ')}</span>
                  </div>
                  <p className="admin-msg-body">{m.message}</p>
                  <div className="admin-actions-row">
                    <button type="button" className="btn-xs btn-neutral" onClick={() => handleToggleRead(m)}>
                      {m.read ? (isFr ? 'Marquer non lu' : 'Mark Unread') : (isFr ? 'Marquer lu' : 'Mark Read')}
                    </button>
                    <a href={safeMailto(m)} className="btn-xs btn-pro" style={{ textDecoration: 'none' }}>
                      {isFr ? 'Répondre' : 'Reply'}
                    </a>
                    <button type="button" className="btn-xs btn-danger" onClick={() => handleDeleteMessage(m.id)}>
                      <Trash2 size={12} /> {isFr ? 'Supprimer' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── TAB 4: NEWSLETTER ──────────────────────────────────────────── */}
          {activeTab === 'newsletter' && (
            <div className="admin-panel-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                  {isFr ? `Abonnés Newsletter (${subscribers.length})` : `Newsletter Subscribers (${subscribers.length})`}
                </h3>
                <button
                  type="button"
                  className="admin-primary-btn"
                  disabled={subscribers.length === 0}
                  onClick={() => downloadCsv(
                    `studios-pro-newsletter-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Email', 'Language', 'SubscribedAt'],
                    subscribers.map((s) => [s.email || '', s.lang || '', s.timestamp || ''])
                  )}
                >
                  <Download size={14} /> {isFr ? 'Exporter CSV' : 'Export CSV'}
                </button>
              </div>
              {subscribers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                  {isFr ? 'Aucun abonné newsletter pour l’instant.' : 'No newsletter subscribers yet.'}
                </p>
              ) : (
                <div className="audit-list">
                  {subscribers.map((s) => (
                    <div key={s.id} className="audit-row">
                      <strong>{s.email}</strong>
                      <span className="audit-time">{s.lang ? s.lang.toUpperCase() : ''} • {String(s.timestamp || '').slice(0, 19).replace('T', ' ')}</span>
                      <button type="button" className="btn-xs btn-danger" onClick={() => handleDeleteSubscriber(s.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 5: ANNOUNCEMENTS & MAINTENANCE ─────────────────────────── */}
          {activeTab === 'announcements' && (
            <div className="admin-panel-section" style={{ display: 'grid', gap: '18px' }}>
              <form className="seo-box" onSubmit={handleSaveAnnouncement}>
                <h3><Megaphone size={17} /> {isFr ? 'Bannière d’annonce globale' : 'Global Announcement Banner'}</h3>
                <label className="admin-chk-label">
                  <input
                    type="checkbox"
                    checked={announcement.active}
                    onChange={(e) => setAnnouncement((p) => ({ ...p, active: e.target.checked }))}
                  />
                  <span>{isFr ? 'Afficher la bannière sur le site' : 'Show announcement banner on site'}</span>
                </label>
                <textarea
                  className="seo-url-textarea"
                  rows={2}
                  value={announcement.textEn}
                  onChange={(e) => setAnnouncement((p) => ({ ...p, textEn: e.target.value }))}
                  placeholder="English banner message..."
                />
                <textarea
                  className="seo-url-textarea"
                  rows={2}
                  value={announcement.textFr}
                  onChange={(e) => setAnnouncement((p) => ({ ...p, textFr: e.target.value }))}
                  placeholder="Message de la bannière en français..."
                />
                <button type="submit" className="admin-primary-btn" disabled={savingBanner}>
                  {savingBanner ? '...' : (isFr ? 'Enregistrer la bannière' : 'Save Banner')}
                </button>
              </form>

              <form className="seo-box" onSubmit={handleSaveMaintenance}>
                <h3><AlertTriangle size={17} style={{ color: '#f59e0b' }} /> {isFr ? 'Mode Maintenance' : 'Maintenance Mode'}</h3>
                <label className="admin-chk-label">
                  <input
                    type="checkbox"
                    checked={maintenance.enabled}
                    onChange={(e) => setMaintenance((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  <span>{isFr ? 'Activer le bandeau de maintenance (Admin exempté)' : 'Enable maintenance notice (Admin exempt)'}</span>
                </label>
                <input
                  className="admin-input"
                  value={maintenance.messageEn}
                  onChange={(e) => setMaintenance((p) => ({ ...p, messageEn: e.target.value }))}
                  placeholder="English maintenance message"
                />
                <input
                  className="admin-input"
                  value={maintenance.messageFr}
                  onChange={(e) => setMaintenance((p) => ({ ...p, messageFr: e.target.value }))}
                  placeholder="Message de maintenance en français"
                />
                <button type="submit" className="admin-secondary-btn" disabled={savingBanner}>
                  {savingBanner ? '...' : (isFr ? 'Appliquer Maintenance' : 'Save Maintenance Settings')}
                </button>
              </form>
            </div>
          )}

          {/* ─── TAB 6: SECURITY, REVENUE & AUDIT LOG ───────────────────────── */}
          {activeTab === 'security' && (
            <div className="admin-panel-section" style={{ display: 'grid', gap: '16px' }}>
              <div className="seo-box">
                <h3><ShieldCheck size={17} /> {isFr ? 'État Sécurité Serveur' : 'Live Server Security Status'}</h3>
                <div className="seo-checks-grid">
                  <div className={`seo-check-pill ${health?.serviceAccountConfigured ? 'ok' : 'fail'}`}>
                    <span>Firebase Admin SDK</span>
                    <strong>{health?.serviceAccountConfigured ? '✅ Active' : '⚠️ Missing FIREBASE_SERVICE_ACCOUNT'}</strong>
                  </div>
                  <div className={`seo-check-pill ${health?.stripeConfigured ? 'ok' : 'fail'}`}>
                    <span>Stripe Checkout</span>
                    <strong>{health?.stripeConfigured ? '✅ Configured' : '❌ Missing Key'}</strong>
                  </div>
                  <div className={`seo-check-pill ${health?.stripeWebhookConfigured ? 'ok' : 'fail'}`}>
                    <span>Stripe Webhook Secret</span>
                    <strong>{health?.stripeWebhookConfigured ? '✅ Verified' : '⚠️ Set STRIPE_WEBHOOK_SECRET'}</strong>
                  </div>
                  <div className={`seo-check-pill ${health?.bingApiConfigured ? 'ok' : 'fail'}`}>
                    <span>Bing Webmaster API</span>
                    <strong>{health?.bingApiConfigured ? '✅ Connected' : '⚠️ Optional Key Not Set'}</strong>
                  </div>
                </div>
              </div>

              <div className="seo-box">
                <h3><Clock size={17} /> {isFr ? 'Journal d’Audit Sécurité (Immuable)' : 'Immutable Security Audit Log'}</h3>
                {auditLogs.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {isFr ? 'Aucune entrée d’audit enregistrée.' : 'No audit log entries recorded yet.'}
                  </p>
                ) : (
                  <div className="audit-list">
                    {auditLogs.map((l) => (
                      <div key={l.id} className="audit-row">
                        <span className="badge-status badge-free">{l.action}</span>
                        <span className="audit-msg"><strong>{l.actor}</strong> — {l.details}</span>
                        <span className="audit-time">{String(l.timestamp || '').slice(0, 19).replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
