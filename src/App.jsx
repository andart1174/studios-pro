import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
const ContactModal = ({ isOpen, onClose, lang }) => {
  const [loading, setLoading] = useState(false);
  const t = {
    fr: {
      title: "Contactez-nous",
      name: "Nom",
      email: "Email",
      message: "Message",
      send: "Envoyer",
      sending: "Envoi...",
      success: "Message envoyé ! Nous vous répondrons bientôt.",
    },
    en: {
      title: "Contact Us",
      name: "Name",
      email: "Email",
      message: "Message",
      send: "Send",
      sending: "Sending...",
      success: "Message sent! We will get back to you soon.",
    }
  }[lang];

  if (!isOpen) return null;

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="auth-modal contact-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2>{t.title}</h2>
        <form name="contact" method="POST" className="auth-form" onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          const formData = new FormData(e.target);
          fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString(),
          })
            .then(async (response) => {
              // Netlify Forms should handle it, we alert success immediately
              alert(t.success);
              setLoading(false);
              onClose();

              // Also save to Firebase in background if available
              if (db) {
                try {
                  await addDoc(collection(db, "messages"), {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    message: formData.get('message'),
                    timestamp: new Date().toISOString(),
                    read: false
                  });
                } catch (err) {
                  console.error("Firebase background sync error:", err);
                }
              }
            })
            .catch((error) => {
              console.error("Form submission error:", error);
              alert(lang === 'fr' ? "Erreur de connexion: " + error.message : "Connection Error: " + error.message);
              setLoading(false);
            });
        }}>
          <input type="hidden" name="form-name" value="contact" />
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input type="text" name="name" placeholder={t.name} required />
          </div>
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input type="email" name="email" placeholder={t.email} required />
          </div>
          <div className="input-group">
            <MessageSquare size={18} className="input-icon" style={{ top: '15px' }} />
            <textarea name="message" placeholder={t.message} required className="contact-textarea"></textarea>
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t.sending : t.send}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

import {
  Box, Circle, Hexagon, User, LogOut, CreditCard, X, Mail, Lock,
  ShieldCheck, MessageSquare, Settings, Users, Star, Trash2,
  Layers, Component, Cpu, Reply, Boxes, BookOpen, Code, UserPlus, Search,
  Megaphone, Copy, Palette, Sparkles, Check
} from 'lucide-react';
import './App.css';

const ADMIN_EMAIL = 'andart1174@gmail.com';

const AdminModal = ({ isOpen, onClose, lang }) => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'messages', or 'announcements'
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'premium', 'free'

  // Pre-registration Form
  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState(30); // 30, 60, 365, 0 (Lifetime)

  // Announcement Form
  const [annTextFr, setAnnTextFr] = useState('');
  const [annTextEn, setAnnTextEn] = useState('');
  const [annActive, setAnnActive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      if (!db) {
        console.warn("Database not initialized.");
        return;
      }
      setLoading(true);

      // 1. Fetch Users
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        alert(lang === 'fr' ? "Erreur Admin (Firestore Users): " + error.message : "Admin Error (Firestore Users): " + error.message);
      }

      // 2. Fetch Messages
      try {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const messagesSnapshot = await getDocs(q);
        const messagesList = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messagesList);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
      }

      // 3. Fetch Announcement
      try {
        const annDoc = await getDoc(doc(db, "announcements", "current"));
        if (annDoc.exists()) {
          const data = annDoc.data();
          setAnnTextFr(data.textFr || '');
          setAnnTextEn(data.textEn || '');
          setAnnActive(data.active || false);
        }
      } catch (error) {
        console.error("Error fetching announcement:", error);
      }

      setLoading(false);
    };
    fetchData();
  }, [isOpen]);

  const setPremiumStatus = async (userId, status, days) => {
    try {
      let expirationString = null;
      if (status && days > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        expirationString = expDate.toISOString();
      }
      
      const updateData = {
        isPremium: status,
        premiumUntil: expirationString
      };
      
      await setDoc(doc(db, "users", userId), updateData, { merge: true });
      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
    } catch (error) {
      alert("Error updating user: " + error.message);
    }
  };

  const setExportCreditStatus = async (userId, status) => {
    try {
      const updateData = {
        hasExportCredit: status
      };
      await setDoc(doc(db, "users", userId), updateData, { merge: true });
      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
    } catch (error) {
      alert("Error updating user export credit: " + error.message);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(lang === 'fr' ? `Supprimer définitivement le profil de ${email} ?` : `Permanently delete profile for ${email}?`)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(u => u.id !== userId));
      alert(lang === 'fr' ? "Utilisateur supprimé avec succès !" : "User deleted successfully!");
    } catch (error) {
      alert("Error deleting user: " + error.message);
    }
  };

  const toggleMessageRead = async (msgId, currentReadStatus) => {
    try {
      const newStatus = !currentReadStatus;
      await setDoc(doc(db, "messages", msgId), { read: newStatus }, { merge: true });
      setMessages(messages.map(m => m.id === msgId ? { ...m, read: newStatus } : m));
    } catch (error) {
      alert("Error updating message: " + error.message);
    }
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    try {
      await deleteDoc(doc(db, "messages", msgId));
      setMessages(messages.filter(m => m.id !== msgId));
    } catch (error) {
      alert("Error deleting message: " + error.message);
    }
  };

  const handlePreRegister = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      let expirationString = null;
      if (newDuration > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + newDuration);
        expirationString = expDate.toISOString();
      }
      
      const cleanEmail = newEmail.trim().toLowerCase();
      // Use cleanEmail as document ID to match login fallback
      const docId = cleanEmail.replace(/[^a-z0-9@.]/g, '_');
      const docRef = doc(db, "users", docId);
      
      const newUserData = {
        email: cleanEmail,
        isPremium: true,
        premiumUntil: expirationString,
        createdAt: new Date().toISOString()
      };

      await setDoc(docRef, newUserData, { merge: true });
      alert(lang === 'fr' ? "Utilisateur Premium pré-enregistré avec succès !" : "Premium user pre-registered successfully!");
      setNewEmail('');
      
      // Refresh list
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      alert("Error pre-registering user: " + error.message);
    }
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const updatedAtStr = new Date().toISOString();
      const annData = {
        textFr: annTextFr,
        textEn: annTextEn,
        active: annActive,
        updatedAt: updatedAtStr
      };
      await setDoc(doc(db, "announcements", "current"), annData);
      alert(lang === 'fr' ? "Annonce enregistrée !" : "Announcement saved!");
    } catch (error) {
      alert("Error saving announcement: " + error.message);
    }
  };

  // Stats calculations
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.isPremium || (u.premiumUntil && new Date(u.premiumUntil) > new Date())).length;
  const freeUsers = totalUsers - premiumUsers;
  const totalMessages = messages.length;

  // Filtering users
  const filteredUsers = users.filter(u => {
    const emailMatches = u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const isPremiumUser = u.isPremium || (u.premiumUntil && new Date(u.premiumUntil) > new Date());
    if (filterStatus === 'premium') return emailMatches && isPremiumUser;
    if (filterStatus === 'free') return emailMatches && !isPremiumUser;
    return emailMatches;
  });

  const t = {
    fr: {
      title: "Panneau d'administration",
      loading: "Chargement...",
      email: "Email",
      status: "Statut",
      action: "Action",
      revoke: "Révoquer",
      makePremium: "Rendre Premium",
      reply: "Répondre",
      preRegTitle: "Pré-enregistrer un client Premium (par Email)",
      preRegEmailPlace: "Email du client...",
      preRegBtn: "Activer Premium",
      statsTotal: "Utilisateurs",
      statsPremium: "Premium",
      statsFree: "Gratuit",
      statsMsg: "Messages Contact",
      searchPlace: "Rechercher par email...",
      filterAll: "Tous",
      filterPremium: "Premium",
      filterFree: "Gratuit",
      expLabel: "Jusqu'au",
      durationLifetime: "À vie",
      durationDays: "jours"
    },
    en: {
      title: "Admin Dashboard",
      loading: "Loading...",
      email: "Email",
      status: "Status",
      action: "Action",
      revoke: "Revoke",
      makePremium: "Make Premium",
      reply: "Reply",
      preRegTitle: "Pre-register Premium Client (by Email)",
      preRegEmailPlace: "Client email...",
      preRegBtn: "Activate Premium",
      statsTotal: "Total Users",
      statsPremium: "Premium",
      statsFree: "Free",
      statsMsg: "Contact Messages",
      searchPlace: "Search by email...",
      filterAll: "All",
      filterPremium: "Premium",
      filterFree: "Free",
      expLabel: "Expires",
      durationLifetime: "Lifetime",
      durationDays: "days"
    }
  }[lang];

  if (!isOpen) return null;

  return (
    <motion.div className="modal-overlay admin-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="auth-modal admin-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <div className="admin-header">
          <Settings size={24} />
          <h2>{t.title}</h2>
        </div>

        {/* Dashboard Statistics Row */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <h4>{t.statsTotal}</h4>
            <div className="stat-val">{totalUsers}</div>
          </div>
          <div className="admin-stat-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
            <h4>{t.statsPremium}</h4>
            <div className="stat-val" style={{ color: '#a78bfa' }}>{premiumUsers}</div>
          </div>
          <div className="admin-stat-card">
            <h4>{t.statsFree}</h4>
            <div className="stat-val" style={{ color: '#94a3b8' }}>{freeUsers}</div>
          </div>
          <div className="admin-stat-card">
            <h4>{t.statsMsg}</h4>
            <div className="stat-val" style={{ color: '#14b8a6' }}>{totalMessages}</div>
          </div>
        </div>

        <div className="admin-tabs">
          <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={18} />
            <span>{lang === 'fr' ? 'Utilisateurs' : 'Users'}</span>
          </button>
          <button className={`admin-tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <MessageSquare size={18} />
            <span>{lang === 'fr' ? 'Messages' : 'Messages'}</span>
          </button>
          <button className={`admin-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
            <Megaphone size={18} />
            <span>{lang === 'fr' ? 'Annonces' : 'Announcements'}</span>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', fontSize: '12px', alignItems: 'center' }}>
            <span title="Firebase Status">DB: {db ? '✅' : '❌'}</span>
            <span title="Auth Status">Auth: {auth ? '✅' : '❌'}</span>
          </div>
        </div>

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">{t.loading}</div>
          ) : activeTab === 'users' ? (
            <div>
              {/* Pre-registration Form */}
              <div className="admin-pre-reg-section">
                <h3><UserPlus size={18} color="#8b5cf6" /> <span>{t.preRegTitle}</span></h3>
                <form onSubmit={handlePreRegister} className="admin-pre-reg-form">
                  <input 
                    type="email" 
                    placeholder={t.preRegEmailPlace} 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="admin-input-txt"
                    required
                  />
                  <select 
                    value={newDuration} 
                    onChange={(e) => setNewDuration(parseInt(e.target.value))}
                    className="admin-select"
                  >
                    <option value="30">30 {lang === 'fr' ? 'Jours' : 'Days'}</option>
                    <option value="60">60 {lang === 'fr' ? 'Jours' : 'Days'}</option>
                    <option value="365">1 {lang === 'fr' ? 'An' : 'Year'}</option>
                    <option value="0">{t.durationLifetime}</option>
                  </select>
                  <button type="submit" className="admin-action-btn">{t.preRegBtn}</button>
                </form>
              </div>

              {/* Users Search and Filtering */}
              <div className="admin-search-bar">
                <Search size={18} color="#64748b" />
                <input 
                  type="text" 
                  placeholder={t.searchPlace} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
                <div className="lang-switch" style={{ marginLeft: 'auto' }}>
                  <button className={`lang-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>{t.filterAll}</button>
                  <button className={`lang-btn ${filterStatus === 'premium' ? 'active' : ''}`} onClick={() => setFilterStatus('premium')}>{t.filterPremium}</button>
                  <button className={`lang-btn ${filterStatus === 'free' ? 'active' : ''}`} onClick={() => setFilterStatus('free')}>{t.filterFree}</button>
                </div>
              </div>

              {/* Users Table */}
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t.email}</th>
                    <th>{t.status}</th>
                    <th>{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const isUserPremium = u.isPremium || (u.premiumUntil && new Date(u.premiumUntil) > new Date());
                    const remainingDays = u.premiumUntil 
                      ? Math.ceil((new Date(u.premiumUntil) - new Date()) / (1000 * 60 * 60 * 24)) 
                      : null;
                    const hasExportCreditVal = u.hasExportCredit || false;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{u.email}</span>
                              <button 
                                className="admin-icon-btn" 
                                title={lang === 'fr' ? "Copier l'email" : "Copy Email"}
                                onClick={() => {
                                  navigator.clipboard.writeText(u.email);
                                  alert(lang === 'fr' ? "Email copié !" : "Email copied!");
                                }}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            {isUserPremium && u.premiumUntil && (
                              <span style={{ fontSize: '0.65rem', color: '#10b981', marginTop: '2px' }}>
                                {t.expLabel}: {new Date(u.premiumUntil).toLocaleDateString()} ({remainingDays} {t.durationDays})
                              </span>
                            )}
                            {isUserPremium && !u.premiumUntil && (
                              <span style={{ fontSize: '0.65rem', color: '#c084fc', marginTop: '2px', fontWeight: 'bold' }}>
                                {t.durationLifetime}
                              </span>
                            )}
                            {hasExportCreditVal && (
                              <span style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '1px' }}>
                                🪙 {lang === 'fr' ? "Crédit d'export actif" : "Export credit active"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${isUserPremium ? 'premium' : 'free'}`}>
                            {isUserPremium ? 'PREMIUM' : 'FREE'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <select
                              className="admin-duration-select"
                              defaultValue=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'revoke') {
                                  setPremiumStatus(u.id, false, 0);
                                } else if (val === 'grant_credit') {
                                  setExportCreditStatus(u.id, true);
                                } else if (val === 'revoke_credit') {
                                  setExportCreditStatus(u.id, false);
                                } else if (val) {
                                  setPremiumStatus(u.id, true, parseInt(val));
                                }
                                e.target.value = ""; // Reset dropdown
                              }}
                            >
                              <option value="" disabled>{lang === 'fr' ? 'Gérer...' : 'Manage...'}</option>
                              {isUserPremium && (
                                <option value="revoke">{lang === 'fr' ? 'Révoquer Premium' : 'Revoke Premium'}</option>
                              )}
                              <option value="30">{lang === 'fr' ? 'Premium 30 Jours' : 'Premium 30 Days'}</option>
                              <option value="60">{lang === 'fr' ? 'Premium 60 Jours' : 'Premium 60 Days'}</option>
                              <option value="365">{lang === 'fr' ? 'Premium 1 An' : 'Premium 1 Year'}</option>
                              <option value="0">{lang === 'fr' ? 'Premium À vie' : 'Premium Lifetime'}</option>
                              <option value="divider" disabled>────────────────</option>
                              {hasExportCreditVal ? (
                                <option value="revoke_credit">{lang === 'fr' ? "Révoquer crédit" : "Revoke credit"}</option>
                              ) : (
                                <option value="grant_credit">{lang === 'fr' ? "Accorder 1 crédit" : "Grant 1 credit"}</option>
                              )}
                            </select>
                            <button 
                              className="delete-user-btn" 
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              title={lang === 'fr' ? "Supprimer l'utilisateur" : "Delete User"}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'messages' ? (
            <div className="admin-messages-list">
              {messages.length === 0 ? (
                <p className="no-messages">{lang === 'fr' ? 'Aucun message.' : 'No messages.'}</p>
              ) : messages.map(m => (
                <div key={m.id} className={`admin-message-card ${m.read ? 'read' : 'unread'}`}>
                  <div className="message-header">
                    <strong>{m.name}</strong>
                    <span className="message-email">{m.email}</span>
                    <div className="message-actions">
                      <button 
                        className={`read-toggle-btn ${m.read ? 'is-read' : 'is-unread'}`} 
                        onClick={() => toggleMessageRead(m.id, m.read)}
                        title={m.read ? (lang === 'fr' ? "Marquer comme non lu" : "Mark as unread") : (lang === 'fr' ? "Marquer comme lu" : "Mark as read")}
                      >
                        <ShieldCheck size={16} />
                      </button>
                      <a 
                        href={`mailto:${m.email}?subject=Studios-Pro: Re: ${m.name}`} 
                        className="reply-btn"
                        title={t.reply}
                      >
                        <Reply size={16} />
                      </a>
                      <button className="delete-msg-btn" onClick={() => deleteMessage(m.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="message-text">{m.message}</p>
                  <div className="message-footer">
                    <span className="message-badge">{m.read ? (lang === 'fr' ? 'Lu' : 'Read') : (lang === 'fr' ? 'Nouveau' : 'New')}</span>
                    <small className="message-date">{new Date(m.timestamp).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-announcement-section">
              <h3>{lang === 'fr' ? "Gérer l'annonce système" : "Manage System Announcement"}</h3>
              <form onSubmit={handleSaveAnnouncement} className="admin-announcement-form">
                <div className="form-group-admin">
                  <label>{lang === 'fr' ? "Texte en Français" : "French Text"}</label>
                  <textarea
                    value={annTextFr}
                    onChange={(e) => setAnnTextFr(e.target.value)}
                    placeholder="Message à afficher..."
                    className="admin-textarea"
                    required
                  ></textarea>
                </div>
                <div className="form-group-admin">
                  <label>{lang === 'fr' ? "Texte en Anglais" : "English Text"}</label>
                  <textarea
                    value={annTextEn}
                    onChange={(e) => setAnnTextEn(e.target.value)}
                    placeholder="Message to display..."
                    className="admin-textarea"
                    required
                  ></textarea>
                </div>
                <div className="form-group-admin checkbox-group-admin">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={annActive}
                      onChange={(e) => setAnnActive(e.target.checked)}
                    />
                    <span>{lang === 'fr' ? "Activer l'annonce" : "Activate Announcement"}</span>
                  </label>
                </div>
                <button type="submit" className="admin-action-btn" style={{ marginTop: '10px' }}>
                  {lang === 'fr' ? "Enregistrer l'annonce" : "Save Announcement"}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const AuthModal = ({ isOpen, onClose, lang }) => {
  const [isLogin, setIsLogin] = useState(true);
  const t = {
    fr: {
      login: "Se connecter",
      register: "S'inscrire",
      email: "Email",
      password: "Mot de passe",
      submit: isLogin ? "Connexion" : "Créer un compte",
      switch: isLogin ? "Pas de compte ? Inscrivez-vous" : "Déjà un compte ? Connectez-vous",
      googleBtn: "Continuer avec Google",
      orDivider: "ou avec email"
    },
    en: {
      login: "Login",
      register: "Register",
      email: "Email",
      password: "Password",
      submit: isLogin ? "Login" : "Register",
      switch: isLogin ? "No account? Register" : "Have an account? Login",
      googleBtn: "Continue with Google",
      orDivider: "or with email"
    }
  }[lang];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError(lang === 'fr' ? "Le système d'authentification n'est pas configuré." : "Authentication system not configured.");
      return;
    }
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'login', { method: 'Google' });
      }

      const userRef = doc(db, "users", googleUser.uid);
      const existingDoc = await getDoc(userRef);
      if (!existingDoc.exists()) {
        await setDoc(userRef, {
          email: googleUser.email,
          displayName: googleUser.displayName || '',
          isPremium: false,
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!auth) {
      setError(lang === 'fr' ? "Le système d'authentification n'est pas configuré." : "Authentication system not configured.");
      return;
    }
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'login', { method: 'Email' });
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'sign_up', { method: 'Email' });
          window.gtag('event', 'conversion', { 'send_to': 'AW-18273639003' });
        }
        // Initialize user profile in Firestore if it doesn't already exist to avoid overwriting premium status
        const userRef = doc(db, "users", userCredential.user.uid);
        const existingDoc = await getDoc(userRef);
        if (!existingDoc.exists()) {
          await setDoc(userRef, {
            email: userCredential.user.email,
            isPremium: false,
            createdAt: new Date().toISOString()
          });
        }
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="auth-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2>{isLogin ? t.login : t.register}</h2>
        {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', marginBottom: '10px' }}>{error}</p>}
        
        {/* 1-Click Google Sign-In */}
        <button 
          type="button" 
          className="google-auth-btn" 
          onClick={handleGoogleSignIn} 
          disabled={googleLoading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{googleLoading ? (lang === 'fr' ? 'Connexion en cours...' : 'Connecting...') : t.googleBtn}</span>
        </button>

        <div className="auth-divider">
          <span>{t.orDivider}</span>
        </div>

        <div className="auth-form">
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="auth-submit" onClick={handleAuth}>{t.submit}</button>
          <p className="auth-switch" onClick={() => setIsLogin(!isLogin)}>{t.switch}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const SeoFooter = ({ lang, onOpenPricing, onOpenContact }) => {
  const isFr = lang === 'fr';
  return (
    <footer className="seo-footer">
      <div className="seo-footer-container">
        {/* Trust & Performance Highlights */}
        <div className="seo-footer-trust-banner">
          <div className="seo-trust-item">
            <span className="seo-trust-icon">⚡</span>
            <div>
              <strong>{isFr ? 'Rendu WebGL Haute Performance' : 'High-Performance WebGL Engine'}</strong>
              <p>{isFr ? 'Visualisation 3D temps réel sans aucun téléchargement' : 'Real-time 3D viewing with zero downloads'}</p>
            </div>
          </div>
          <div className="seo-trust-item">
            <span className="seo-trust-icon">🔒</span>
            <div>
              <strong>{isFr ? 'Confidentialité Client-Side 100%' : '100% Client-Side Privacy'}</strong>
              <p>{isFr ? 'Vos fichiers 3D et images restent sur votre machine' : 'Your 3D files & images stay in your browser'}</p>
            </div>
          </div>
          <div className="seo-trust-item">
            <span className="seo-trust-icon">🎁</span>
            <div>
              <strong>{isFr ? '5 Exports Gratuits Inclus' : '5 Free Exports Included'}</strong>
              <p>{isFr ? 'STL, OBJ, DXF, G-Code sans carte bancaire' : 'STL, OBJ, DXF, G-Code with no credit card'}</p>
            </div>
          </div>
          <div className="seo-trust-item">
            <span className="seo-trust-icon">💎</span>
            <div>
              <strong>{isFr ? 'Formule Pro à 10$/mois' : 'Unlimited Pro at $10/mo'}</strong>
              <p>{isFr ? 'Reliefs CNC HD, WebAR et licence commerciale' : 'HD CNC reliefs, WebAR & commercial license'}</p>
            </div>
          </div>
        </div>

        {/* 5-Column Categorized Directory */}
        <div className="seo-footer-grid">
          {/* Column 1: 3D & CNC Tools */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#f59e0b' }}></span>
              {isFr ? 'Outils 3D & CNC' : '3D & CNC Tools'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/tools/image-to-cnc-relief">{isFr ? 'Image vers Relief 3D CNC' : 'Image to 3D CNC Relief & STL'}</a></li>
              <li><a href="/tools/lithophane-maker-online">{isFr ? 'Générateur de Lithophanies 3D' : 'Online Lithophane Maker'}</a></li>
              <li><a href="/tools/cookie-cutter-stl-generator">{isFr ? 'Générateur Emporte-Pièce STL' : 'Cookie Cutter STL Generator'}</a></li>
              <li><a href="/tools/3d-keychain-name-generator">{isFr ? 'Porte-Clés 3D Personnalisé' : '3D Keychain Name Maker'}</a></li>
              <li><a href="/tools/laser-cut-box-generator">{isFr ? 'Boîte Découpe Laser DXF/SVG' : 'Parametric Laser Cut Box Maker'}</a></li>
              <li><a href="/tools/gcode-previewer-online">{isFr ? 'Visualiseur G-Code CNC & Laser' : 'Online G-Code CNC Previewer'}</a></li>
              <li><a href="/tools/voronoi-parametric-lamp-vase-generator">{isFr ? 'Lampe & Vase Voronoï 3D' : 'Voronoi Lamp & Vase Generator'}</a></li>
              <li><a href="/tools/pepakura-papercraft-3d-unfolder">{isFr ? 'Déplieur Papercraft Pepakura 3D' : 'Pepakura Papercraft 3D Unfolder'}</a></li>
              <li><a href="/tools/ambiguous-cylinder-illusion-maker">{isFr ? 'Illusion Cylindre Ambigu 3D' : 'Ambiguous Cylinder Illusion Maker'}</a></li>
              <li><a href="/tools/cryptex-puzzle-box-stl-generator">{isFr ? 'Boîte Puzzle Cryptex STL' : 'Cryptex Puzzle Box STL Generator'}</a></li>
              <li><a href="/tools/gear-sprocket-generator-dxf">{isFr ? 'Générateur d\'Engrenages DXF' : 'Parametric Gear & Sprocket DXF'}</a></li>
              <li><a href="/tools/custom-3d-ring-designer">{isFr ? 'Concepteur de Bagues 3D' : 'Custom 3D Ring Designer'}</a></li>
            </ul>
          </div>

          {/* Column 2: 3D Viewers & AR */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#3b82f6' }}></span>
              {isFr ? 'Visualiseurs 3D & AR' : '3D Viewers & WebAR'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/viewer/stl">{isFr ? 'Visualiseur STL Gratuit en Ligne' : 'Free Online STL Viewer & Slicer'}</a></li>
              <li><a href="/viewer/obj">{isFr ? 'Visualiseur OBJ 3D en Ligne' : 'Free Online OBJ 3D Viewer'}</a></li>
              <li><a href="/viewer/glb">{isFr ? 'Visualiseur GLB 3D Binaire' : 'Online GLB Binary 3D Viewer'}</a></li>
              <li><a href="/viewer/gltf">{isFr ? 'Inspecteur GLTF WebGL' : 'Free Online GLTF Inspector'}</a></li>
              <li><a href="/viewer/3mf">{isFr ? 'Visualiseur 3MF Impression 3D' : '3MF 3D Manufacturing Inspector'}</a></li>
              <li><a href="/viewer/ply">{isFr ? 'Visualiseur Nuages de Points PLY' : 'PLY Point Cloud & Polygon Viewer'}</a></li>
              <li><a href="/viewer/dxf">{isFr ? 'Visualiseur DXF AutoCAD en Ligne' : 'AutoCAD DXF Blueprint CAD Viewer'}</a></li>
              <li><a href="/viewer/svg">{isFr ? 'Visualiseur & Inspecteur SVG' : 'Online SVG Vector Path Viewer'}</a></li>
              <li><a href="/apps/ar-viewer/index.html">{isFr ? 'Visualiseur Réalité Augmentée (AR)' : 'Augmented Reality (AR) WebXR'}</a></li>
              <li><a href="/ar-viewer/stl">{isFr ? 'Projeter Modèle STL en AR' : 'Project STL in AR Phone Viewer'}</a></li>
              <li><a href="/ar-viewer/glb">{isFr ? 'Projeter Modèle GLB en AR' : 'Project GLB in AR Mobile Viewer'}</a></li>
            </ul>
          </div>

          {/* Column 3: Converters & CAD */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#10b981' }}></span>
              {isFr ? 'Convertisseurs & CAD' : 'Converters & CAD'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/convert/2d-image-to-3d-stl">{isFr ? 'Convertir Image 2D en STL 3D' : '2D Image to 3D STL Converter'}</a></li>
              <li><a href="/convert/photo-to-3d-relief-stl">{isFr ? 'Photo vers Bas-Relief STL' : 'Photo to 3D Relief STL Converter'}</a></li>
              <li><a href="/convert/png-to-svg">{isFr ? 'Convertisseur PNG en SVG Vectoriel' : 'PNG to SVG Vector Converter'}</a></li>
              <li><a href="/convert/jpg-to-svg">{isFr ? 'Convertisseur JPG en SVG Vectoriel' : 'JPG to SVG Vector Converter'}</a></li>
              <li><a href="/convert/dxf-to-svg">{isFr ? 'Convertisseur DXF vers SVG' : 'AutoCAD DXF to SVG Converter'}</a></li>
              <li><a href="/tools/svg-to-gcode-laser-engraver">{isFr ? 'SVG vers G-Code Laser CNC' : 'SVG to Laser Engraver G-Code'}</a></li>
              <li><a href="/convert/obj-to-stl">{isFr ? 'Convertisseur OBJ vers STL' : 'OBJ to STL 3D Mesh Converter'}</a></li>
              <li><a href="/convert/stl-to-obj">{isFr ? 'Convertisseur STL vers OBJ' : 'STL to OBJ 3D Mesh Converter'}</a></li>
              <li><a href="/convert/glb-to-html">{isFr ? 'Convertir GLB en HTML Autonome' : 'GLB to Standalone HTML Exporter'}</a></li>
              <li><a href="/apps/depth-maps/">{isFr ? 'Générateur Depth Maps IA' : 'AI Monocular Depth Map Generator'}</a></li>
              <li><a href="/apps/vector-cnc/">{isFr ? 'Studio Vector CNC (SVG / DXF)' : 'Vector CNC Toolpath Studio'}</a></li>
            </ul>
          </div>

          {/* Column 4: Free Software Alternatives */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#8b5cf6' }}></span>
              {isFr ? 'Alternatives Logicielles' : 'Free Alternatives'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/compare/free-alternative-to-meshmixer">{isFr ? 'Alternative Gratuite à Meshmixer' : 'Free Alternative to Meshmixer'}</a></li>
              <li><a href="/compare/vectric-aspire-free-alternative-browser">{isFr ? 'Alternative Gratuite à Vectric Aspire' : 'Vectric Aspire Free CNC Alternative'}</a></li>
              <li><a href="/compare/free-online-tinkercad-alternative">{isFr ? 'Alternative Gratuite à Tinkercad' : 'Free Online Tinkercad Alternative'}</a></li>
              <li><a href="/compare/lightburn-free-dxf-alternative">{isFr ? 'Alternative Gratuite à LightBurn' : 'Free LightBurn Alternative for Laser'}</a></li>
              <li><a href="/compare/sketchfab-free-alternative-ar-viewer">{isFr ? 'Alternative Gratuite à Sketchfab AR' : 'Sketchfab Free Alternative AR Viewer'}</a></li>
              <li><a href="/compare/photoshop-3d-relief-alternative">{isFr ? 'Alternative à Photoshop 3D Relief' : 'Photoshop 3D Relief Alternative'}</a></li>
              <li><a href="/compare/blender-for-3d-printing-simple-alternative">{isFr ? 'Alternative Simple à Blender 3D' : 'Simple Blender Alternative for 3D Print'}</a></li>
            </ul>
          </div>

          {/* Column 5: Studios & Ecosystem */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#ec4899' }}></span>
              {isFr ? 'Studios & Communauté' : 'Studios & Community'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/apps/polymorph-3d/index.html">{isFr ? 'PolyMorph 3D Studio' : 'PolyMorph 3D Studio'}</a></li>
              <li><a href="/community/">{isFr ? 'Communauté SP Nexus 3D' : 'SP Nexus 3D Creator Community'}</a></li>
              <li><a href="/community/explore.html">{isFr ? 'Explorer Cartes 3D Nexus' : 'Explore Nexus 3D Cards'}</a></li>
              <li><a href="/blog/">{isFr ? 'Blog & Tutoriels 3D / CNC' : '3D Design Blog & Tutorials'}</a></li>
              <li><a href="/faq.html">{isFr ? 'Questions Fréquentes (FAQ)' : 'Frequently Asked Questions (FAQ)'}</a></li>
              <li><a href="/cards/pokemon-card-maker.html">{isFr ? 'Créateur de Cartes 3D Holo' : 'Custom 3D Card Generator'}</a></li>
              <li>
                <button type="button" onClick={onOpenPricing} className="seo-footer-btn-link">
                  💎 {isFr ? 'Tarifs & Formule Pro (10$/mois)' : 'Pricing & Pro Plan ($10/mo)'}
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenContact} className="seo-footer-btn-link">
                  ✉️ {isFr ? 'Support & Contact' : 'Support & Contact'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Language, Meta */}
        <div className="seo-footer-bottom">
          <div className="seo-footer-brand">
            <img src="/logo_studios_pro.png" alt="Studios-Pro" width="24" height="24" className="seo-footer-logo" />
            <span className="seo-footer-brand-name">Studios-Pro</span>
            <span className="seo-footer-tagline">
              {isFr ? 'Suite Créative 3D, Réalité Augmentée & Reliefs CNC dans votre navigateur.' : 'All-in-one 3D Design, WebAR & CNC Relief browser suite.'}
            </span>
          </div>

          <div className="seo-footer-meta-links">
            <span>© {new Date().getFullYear()} Studios-Pro. {isFr ? 'Tous droits réservés.' : 'All rights reserved.'}</span>
            <a href="/faq.html">{isFr ? 'Aide & FAQ' : 'Help & FAQ'}</a>
            <a href="/blog/">{isFr ? 'Guides' : 'Guides'}</a>
            <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              ↑ {isFr ? 'Haut de page' : 'Back to top'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const StudiosPro = () => {
  const [lang, setLang] = useState('fr');
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [hasExportCredit, setHasExportCredit] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [pendingExport, setPendingExport] = useState(null);
  const [is3DOpen, setIs3DOpen] = useState(false);
  const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);
  const [isARViewerOpen, setIsARViewerOpen] = useState(false);
  const [arViewerUrl, setArViewerUrl] = useState('');
  const [isDFXOpen, setIsDFXOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isDepthOpen, setIsDepthOpen] = useState(false);
  const [isNew3DOpen, setIsNew3DOpen] = useState(false);
  const [isVectorOpen, setIsVectorOpen] = useState(false);
  const [isStudioProOpen, setIsStudioProOpen] = useState(false);
  const [isMaker7Open, setIsMaker7Open] = useState(false);
  const [isJewelryOpen, setIsJewelryOpen] = useState(false);

  const [isArchPro1Open, setIsArchPro1Open] = useState(false);
  const [isArchPro2Open, setIsArchPro2Open] = useState(false);
  const [isFigureBuilderOpen, setIsFigureBuilderOpen] = useState(false);
  const [isMusicComposerOpen, setIsMusicComposerOpen] = useState(false);
  const [isDesignProOpen, setIsDesignProOpen] = useState(false);

  const [isStudioPro2Open, setIsStudioPro2Open] = useState(false);
  const [isMechGenProOpen, setIsMechGenProOpen] = useState(false);
  const [isScriptingOpen, setIsScriptingOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isArtGenOpen, setIsArtGenOpen] = useState(false);
  const [isPolyMorphOpen, setIsPolyMorphOpen] = useState(false);
  const [paymentReason, setPaymentReason] = useState('free_limit');
  const [collabRoomId, setCollabRoomId] = useState(null);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);
  const scriptingIframeRef = useRef(null);
  const isIframeReadyRef = useRef(false);
  const collabMessagesRef = useRef([]);

  const [announcement, setAnnouncement] = useState(null);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);

  // Newsletter popup state
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterDismissed, setNewsletterDismissed] = useState(() => !!localStorage.getItem('nl_dismissed'));

  // Social share copy feedback
  const [linkCopied, setLinkCopied] = useState(false);
  const [communityCount, setCommunityCount] = useState(null);

  // Live community post count
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'studios_community_posts'));
    const unsub = onSnapshot(q, (snap) => {
      setCommunityCount(snap.size);
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db) return;
    const fetchAnnouncement = async () => {
      try {
        const annDoc = await getDoc(doc(db, "announcements", "current"));
        if (annDoc.exists()) {
          const data = annDoc.data();
          setAnnouncement(data);
          if (data.active) {
            const dismissedTime = localStorage.getItem('dismissedAnnouncementTime');
            if (dismissedTime !== data.updatedAt) {
              setIsAnnouncementVisible(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
      }
    };
    fetchAnnouncement();
  }, [user]);

  // Newsletter exit-intent trigger
  useEffect(() => {
    if (newsletterDismissed || user || isEmbed) return;
    let triggered = false;
    const handleMouseLeave = (e) => {
      if (e.clientY < 10 && !triggered) {
        triggered = true;
        setTimeout(() => setShowNewsletter(true), 300);
      }
    };
    // Also show after 45 seconds if still on page
    const timer = setTimeout(() => {
      if (!triggered) {
        triggered = true;
        setShowNewsletter(true);
      }
    }, 45000);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [newsletterDismissed, user, isEmbed]);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    // Save to Firebase if available
    if (db) {
      try {
        await addDoc(collection(db, 'newsletter'), {
          email: newsletterEmail,
          lang,
          subscribedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Newsletter save error:', err);
      }
    }
    setNewsletterSubmitted(true);
    localStorage.setItem('nl_dismissed', '1');
    setTimeout(() => {
      setShowNewsletter(false);
      setNewsletterDismissed(true);
    }, 2500);
  };

  const handleNewsletterDismiss = () => {
    setShowNewsletter(false);
    setNewsletterDismissed(true);
    localStorage.setItem('nl_dismissed', '1');
  };

  const handleShareCopy = () => {
    navigator.clipboard.writeText('https://studios-pro.com').catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const isAdmin = user && user.email === ADMIN_EMAIL;

  const redirectToStripe = async (type, refStudio = null) => {
    try {
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceType: type,
          email: user?.email || 'customer@example.com',
          origin: window.location.origin,
          refStudio: refStudio
        }),
      });

      const data = await response.json();
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        alert(lang === 'fr' 
          ? "Erreur lors de la redirection vers le paiement. Veuillez réessayer." 
          : "Error starting checkout. Please try again.");
      }
    } catch (error) {
      console.error("Stripe Redirect Error:", error);
      alert(lang === 'fr' 
        ? "Erreur de connexion avec le service de paiement. Veuillez réessayer." 
        : "Error starting checkout. Please try again.");
    }
  };

  const [freeExportsUsed, setFreeExportsUsed] = useState(() => {
    return parseInt(localStorage.getItem('freeExportsUsed')) || 0;
  });

  // Refs for stable monitoring in BroadcastChannel without re-triggering effect
  const premiumRef = useRef(isPremium);
  const adminRef = useRef(isAdmin);
  const creditRef = useRef(hasExportCredit);
  const freeUsedRef = useRef(freeExportsUsed);
  const langRef = useRef(lang);
  const collabRoomIdRef = useRef(collabRoomId);

  useEffect(() => {
    premiumRef.current = isPremium;
    adminRef.current = isAdmin;
    creditRef.current = hasExportCredit;
    freeUsedRef.current = freeExportsUsed;
    langRef.current = lang;
    collabRoomIdRef.current = collabRoomId;
    isIframeReadyRef.current = isIframeReady;
  }, [isPremium, isAdmin, hasExportCredit, freeExportsUsed, lang, collabRoomId, isIframeReady]);

  useEffect(() => {
    if (!auth) {
      console.warn("Auth not initialized.");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Check premium status and sync free exports in Firestore
        try {
          const userDocRef = doc(db, "users", authUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          let userData = {
            email: authUser.email,
            isPremium: false,
            freeExportsUsed: freeExportsUsed,
            createdAt: new Date().toISOString()
          };

          let isUserPremium = false;
          let premiumUntilVal = null;
          let hasExportCreditVal = false;
          let cloudFreeExportsUsed = undefined;

          if (userDoc.exists()) {
            const data = userDoc.data();
            userData = { ...userData, ...data };
            
            if (data.isPremium === true) {
              isUserPremium = true;
              premiumUntilVal = data.premiumUntil || null;
            } else if (data.premiumUntil) {
              const now = new Date();
              const expires = new Date(data.premiumUntil);
              if (expires > now) {
                isUserPremium = true;
                premiumUntilVal = data.premiumUntil;
              }
            }
            hasExportCreditVal = data.hasExportCredit || false;
            cloudFreeExportsUsed = data.freeExportsUsed;
          }

          // Fallback: If not premium on their main UID document, check if there's an existing document with the same email
          if (!isUserPremium) {
            try {
              const q = query(collection(db, "users"), where("email", "==", authUser.email));
              const querySnapshot = await getDocs(q);
              let fallbackDoc = null;
              
              querySnapshot.forEach(docSnap => {
                if (docSnap.id !== authUser.uid) {
                  const fData = docSnap.data();
                  if (fData.isPremium === true || (fData.premiumUntil && new Date(fData.premiumUntil) > new Date())) {
                    fallbackDoc = docSnap;
                  }
                }
              });

              if (fallbackDoc) {
                console.log("Migrating premium status from document:", fallbackDoc.id);
                const fData = fallbackDoc.data();
                isUserPremium = true;
                premiumUntilVal = fData.premiumUntil || null;
                hasExportCreditVal = hasExportCreditVal || fData.hasExportCredit || false;
                
                // Merge this info back into the main user data
                userData.isPremium = true;
                if (fData.premiumUntil) userData.premiumUntil = fData.premiumUntil;
                if (fData.hasExportCredit) userData.hasExportCredit = fData.hasExportCredit;

                // Write it to the UID document
                await setDoc(userDocRef, {
                  isPremium: true,
                  premiumUntil: fData.premiumUntil || null,
                  hasExportCredit: userData.hasExportCredit || false
                }, { merge: true });

                // Delete the old duplicate document to keep Firestore clean
                try {
                  await deleteDoc(doc(db, "users", fallbackDoc.id));
                } catch (delErr) {
                  console.error("Error deleting fallback user document:", delErr);
                }
              }
            } catch (fallbackErr) {
              console.error("Error running fallback email query:", fallbackErr);
            }
          }

          // Apply state variables
          setIsPremium(isUserPremium);
          setPremiumUntil(premiumUntilVal);
          setHasExportCredit(hasExportCreditVal);
          if (cloudFreeExportsUsed !== undefined) {
            setFreeExportsUsed(cloudFreeExportsUsed);
            localStorage.setItem('freeExportsUsed', cloudFreeExportsUsed);
          }

          // Check if there's a pending premium from localStorage (redirect happened while not logged in)
          const pendingPremium = localStorage.getItem('pendingPremiumActivation');
          if (pendingPremium) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const expirationString = thirtyDaysFromNow.toISOString();
            
            await setDoc(userDocRef, { 
              isPremium: true, 
              premiumUntil: expirationString,
              lastPaymentDate: new Date().toISOString()
            }, { merge: true });
            
            setIsPremium(true);
            setPremiumUntil(expirationString);
            localStorage.removeItem('pendingPremiumActivation');
          } else if (!userDoc.exists()) {
            // New user, sync local to cloud
            await setDoc(userDocRef, userData, { merge: true });
          }

          // Set user after resolving premium status
          setUser(authUser);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUser(authUser);
        }
      } else {
        setUser(null);
        setIsPremium(false);
        setPremiumUntil(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save free exports to localStorage and sync to Cloud when changed
  useEffect(() => {
    localStorage.setItem('freeExportsUsed', freeExportsUsed);
    if (user && db) {
      setDoc(doc(db, "users", user.uid), { freeExportsUsed }, { merge: true })
        .catch(err => console.error("Cloud sync error:", err));
    }
  }, [freeExportsUsed, user]);

  // Broadcast premium status updates to all active iframes/tabs
  useEffect(() => {
    const channel = new BroadcastChannel('studios_pro_channel');
    channel.postMessage({
      type: 'USER_STATUS_RESPONSE',
      payload: {
        isPremium: isPremium || isAdmin,
        userEmail: user ? user.email : 'Guest'
      }
    });
    return () => channel.close();
  }, [isPremium, isAdmin, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success')) {
      const type = params.get('type');
      if (type === 'premium') {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const expirationString = thirtyDaysFromNow.toISOString();

        setIsPremium(true);
        setPremiumUntil(expirationString);

        if (user) {
          setDoc(doc(db, "users", user.uid), { 
            isPremium: true, 
            premiumUntil: expirationString,
            lastPaymentDate: new Date().toISOString()
          }, { merge: true });
        } else {
          // Store in localStorage if user is not logged in yet
          localStorage.setItem('pendingPremiumActivation', 'true');
        }
        alert(lang === 'fr' ? "Paiement réussi ! Votre abonnement est actif pour 30 jours." : "Payment successful! Your subscription is active for 30 days.");
      } else if (type === 'single') {
        setHasExportCredit(true);
        if (user) {
          setDoc(doc(db, "users", user.uid), { hasExportCredit: true }, { merge: true });
        }
        alert(lang === 'fr' ? "Paiement réussi ! Vous pouvez maintenant exporter votre modèle." : "Payment successful! You can now export your model.");
      }

      // Notify other tabs (like the studio one) that the payment is done
      const channel = new BroadcastChannel('studios_pro_channel');
      channel.postMessage({ type: 'PAYMENT_SUCCESS_INTERNAL', payload: { type } });
      setTimeout(() => channel.close(), 1000);

      window.history.replaceState({}, document.title, window.location.pathname);

      // Auto-open studio if ref is present
      const ref = params.get('ref');
      if (ref === 'ap3d') setIs3DOpen(true);
      if (ref === 's3dviewer') setIs3DViewerOpen(true);
      if (ref === 'dfx') setIsDFXOpen(true);
      if (ref === 'depth') setIsDepthOpen(true);
      if (ref === 'n3d') setIsNew3DOpen(true);
      if (ref === 'vcnc') setIsVectorOpen(true);
      if (ref === 'spro') setIsStudioProOpen(true);
      if (ref === 'mkr7') setIsMaker7Open(true);
      if (ref === 'jwly') setIsJewelryOpen(true);

      if (ref === 'arp1') setIsArchPro1Open(true);
      if (ref === 'arp2') setIsArchPro2Open(true);
      if (ref === 'figb') setIsFigureBuilderOpen(true);
      if (ref === 'musc') setIsMusicComposerOpen(true);
      if (ref === 'desp') setIsDesignProOpen(true);
      if (ref === 'spro2') setIsStudioPro2Open(true);
      if (ref === 'mechgen') setIsMechGenProOpen(true);
      if (ref === 'sandbox') setIsSandboxOpen(true);
      if (ref === 'artgen') setIsArtGenOpen(true);
      if (ref === 'polymorph' || ref === 'poly3d') setIsPolyMorphOpen(true);
    }
  }, [lang, user]);

  useEffect(() => {
    const channel = new BroadcastChannel('studios_pro_channel');

    const handleMessage = (data) => {
      const { type, payload } = data;

      if (type === 'TRIGGER_PAYMENT_MODAL') {
        const isPrem = premiumRef.current;
        const isAdm = adminRef.current;
        const hasCred = creditRef.current;
        const used = freeUsedRef.current;

        if (isPrem || isAdm) {
          channel.postMessage({ type: 'EXPORT_ALLOWED', payload: { isPremium: true } });
        } else if (payload && payload.forcePremium) {
          setPaymentReason('premium_feature');
          setShowPaymentRequest(true);
        } else if (hasCred) {
          channel.postMessage({ type: 'EXPORT_ALLOWED', payload: { isPremium: false } });
        } else if (used < 5) {
          // Use one free export credit (5 free exports allowed)
          setFreeExportsUsed(prev => {
            const newVal = prev + 1;
            localStorage.setItem('freeExportsUsed', newVal);
            return newVal;
          });
          channel.postMessage({ type: 'EXPORT_ALLOWED', payload: { isPremium: false } });
          const remaining = 5 - (used + 1);
          alert(langRef.current === 'fr'
            ? `Export autorisé ! Il vous reste ${remaining} export(s) gratuit(s).`
            : `Export granted! You have ${remaining} free export(s) left.`);
        } else {
          setPaymentReason('free_limit');
          setShowPaymentRequest(true);
        }
      } else if (type === 'GET_USER_STATUS') {
        channel.postMessage({ 
          type: 'USER_STATUS_RESPONSE', 
          payload: { 
            isPremium: premiumRef.current || adminRef.current,
            userEmail: user ? user.email : 'Guest'
          } 
        });
      } else if (type === 'START_STRIPE_PAYMENT') {
        if (typeof payload === 'object') {
          redirectToStripe(payload.type, payload.ref);
        } else {
          redirectToStripe(payload);
        }
      } else if (type === 'EXPORT_COMPLETED') {
        if (creditRef.current && !premiumRef.current && !adminRef.current) {
          setHasExportCredit(false);
          if (user) {
            setDoc(doc(db, "users", user.uid), { hasExportCredit: false }, { merge: true });
          }
        }
      } else if (type === 'LOAD_EXTERNAL_FILE') {
        channel.postMessage({ type: 'LOAD_EXTERNAL_FILE', payload });
      } else if (type === 'LOAD_EXTERNAL_URL') {
        channel.postMessage({ type: 'LOAD_EXTERNAL_URL', payload });
      } else if (type === 'OPEN_AR_VIEWER') {
        setArViewerUrl(payload.url || '');
        if (payload && payload.modelData) {
          window.lastArModelData = payload.modelData;
        }
        setIsARViewerOpen(true);
      } else if (type === 'CLOSE_STUDIO') {
        setIs3DOpen(false);
        setIs3DViewerOpen(false);
        setIsARViewerOpen(false);
        setArViewerUrl('');
        setIsDFXOpen(false);
        setIsRulesOpen(false);
        setIsDepthOpen(false);
        setIsNew3DOpen(false);
        setIsVectorOpen(false);
        setIsStudioProOpen(false);
        setIsMaker7Open(false);
        setIsJewelryOpen(false);

        setIsArchPro1Open(false);
        setIsArchPro2Open(false);
        setIsFigureBuilderOpen(false);
        setIsMusicComposerOpen(false);
        setIsDesignProOpen(false);
        setIsStudioPro2Open(false);
        setIsMechGenProOpen(false);
        setIsScriptingOpen(false);
        setIsSandboxOpen(false);
        setIsArtGenOpen(false);
        setIsPolyMorphOpen(false);
        setCollabRoomId(null);
        setIsIframeReady(false);
        isIframeReadyRef.current = false;
        collabMessagesRef.current = [];
        // Reset URL parameters when closing
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (type === 'CREATE_COLLAB_ROOM') {
        const { roomId } = payload;
        setCollabRoomId(roomId);
        // Update URL query parameters without page reload
        window.history.replaceState({}, document.title, `?ref=scripting&room=${roomId}`);
      } else if (type === 'COLLAB_MSG') {
        if (db && collabRoomIdRef.current) {
          addDoc(collection(db, "scripting_rooms", collabRoomIdRef.current, "messages"), {
            ...payload,
            timestamp: new Date().toISOString()
          }).catch(e => console.error("Error writing collab msg to Firestore:", e));
        }
      } else if (type === 'COLLAB_IFRAME_READY') {
        setIsIframeReady(true);
        isIframeReadyRef.current = true;
        if (scriptingIframeRef.current && scriptingIframeRef.current.contentWindow) {
          collabMessagesRef.current.forEach(msgData => {
            scriptingIframeRef.current.contentWindow.postMessage({
              type: 'COLLAB_MSG',
              payload: msgData
            }, '*');
          });
        }
      } else if (type === 'PAYMENT_SUCCESS_INTERNAL') {
        let isPremSuccess = false;
        if (payload.type === 'premium') {
          setIsPremium(true);
          isPremSuccess = true;
        }
        if (payload.type === 'single') setHasExportCredit(true);
        channel.postMessage({ type: 'EXPORT_ALLOWED', payload: { isPremium: isPremSuccess } });
      }
    };

    channel.onmessage = (event) => handleMessage(event.data);

    const windowListener = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.type) {
        handleMessage(event.data);
      }
    };
    window.addEventListener('message', windowListener);

    return () => {
      channel.close();
      window.removeEventListener('message', windowListener);
    };
  }, [user]);

  // Handle startup url parameters to auto-open corresponding studio
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const room = params.get('room');
    const embed = params.get('embed') === 'true';
    
    if (embed) {
      setIsEmbed(true);
    }
    if (ref) {
      if (ref === 'ap3d') setIs3DOpen(true);
      if (ref === 's3dviewer') setIs3DViewerOpen(true);
      if (ref === 'dfx') setIsDFXOpen(true);
      if (ref === 'depth') setIsDepthOpen(true);
      if (ref === 'n3d') setIsNew3DOpen(true);
      if (ref === 'vcnc') setIsVectorOpen(true);
      if (ref === 'spro') setIsStudioProOpen(true);
      if (ref === 'mkr7') setIsMaker7Open(true);
      if (ref === 'jwly') setIsJewelryOpen(true);
      if (ref === 'arp1') setIsArchPro1Open(true);
      if (ref === 'arp2') setIsArchPro2Open(true);
      if (ref === 'figb') setIsFigureBuilderOpen(true);
      if (ref === 'musc') setIsMusicComposerOpen(true);
      if (ref === 'desp') setIsDesignProOpen(true);
      if (ref === 'spro2') setIsStudioPro2Open(true);
      if (ref === 'mechgen') setIsMechGenProOpen(true);
      if (ref === 'sandbox') setIsSandboxOpen(true);
      if (ref === 'artgen') setIsArtGenOpen(true);
      if (ref === 'scripting') setIsScriptingOpen(true);
      if (ref === 'arviewer') setIsARViewerOpen(true);
      if (ref === 'polymorph' || ref === 'poly3d') setIsPolyMorphOpen(true);
    }
    if (room) {
      setIsScriptingOpen(true);
      setCollabRoomId(room);
    }
  }, []);

  // Real-time Firestore collaboration sync
  useEffect(() => {
    if (!db || !collabRoomId) return;

    collabMessagesRef.current = []; // Clear any messages from previous room/session
    let isInitial = true;
    const collabCollectionRef = collection(db, "scripting_rooms", collabRoomId, "messages");
    const q = query(collabCollectionRef, orderBy("timestamp", "asc"));
    
    const unsubscribeCollab = onSnapshot(q, (snapshot) => {
      if (isInitial) {
        isInitial = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const msgData = change.doc.data();
          
          // Avoid storing duplicates in collabMessagesRef
          const exists = collabMessagesRef.current.some(m => m.timestamp === msgData.timestamp && m.userId === msgData.userId && m.type === msgData.type);
          if (!exists) {
            collabMessagesRef.current.push(msgData);
          }
          
          // Relay to iframe if ready
          if (isIframeReadyRef.current && scriptingIframeRef.current && scriptingIframeRef.current.contentWindow) {
            scriptingIframeRef.current.contentWindow.postMessage({
              type: 'COLLAB_MSG',
              payload: msgData
            }, '*');
          }
        }
      });
    });

    return () => unsubscribeCollab();
  }, [collabRoomId]);

  const handlePayForExport = () => {
    // Single export payment $2
    redirectToStripe('single');
  };

  const t = {
    fr: {
      // ... existing translations ...
      welcome: "Bienvenue sur Studios-Pro",
      subtitle: "Votre hub créatif professionnel",
      message: "Nous espérons que vous réaliserez votre modèle à la qualité souhaitée et que vous reviendrez sur notre site.",
      app3d: "Studio 3D",
      app3dViewer: "Studio 3D Viewer",
      appARViewer: "AR Viewer",
      appdfx: "Studio DFX",
      rules: "Règles du Site",
      login: "Connexion",
      logout: "Déconnexion",
      getPremium: "Devenir Premium",
      premiumActive: "Premium Actif",
      premiumDesc: "Accès illimité - 10$/mois",
      payRequest: "Paiement requis pour l'export",
      payMessage: "Vous n'avez pas de compte Premium. Voulez-vous devenir Premium ?",
      payBtn: "Devenir Premium",
      cancel: "Annuler",
      contact: "Contact",
      blogBtn: "Tutoriels",
      freeLimitTitle: "Vos 5 exports gratuits sont terminés",
      freeLimitMsg: "Vous avez profité de vos 5 exports gratuits ! Passez à la formule Pro pour continuer à exporter sans aucune limite.",
      loginNow: "Se connecter / S'inscrire",
      unlimitedTitle: "Illimité",
      unlimitedPrice: "10$ / mois",
      daysLeft: "jours restants",
      oneDayLeft: "jour restant",
      expired: "Expiré",
      manageSubscription: "Gérer",
      depthMaps: "Depth Maps",
      new3d4d: "New 3D 4D",
      vectorCnc: "Vector CNC",
      studioPro: "Studio Pro 4D",
      maker7: "Maker Studio 7",
      jewelry: "Jewelry Maker Pro",

      archPro1: "Architect Pro 1",
      archPro2: "Architect Pro 2",
      figureBuilder: "4D Figure Builder",
      musicComposer: "4D Music Composer",
      designPro: "Design Pro Studio",

      studioPro2: "Studio Pro 2",
      mechGenPro: "Mech Gen Pro",
      scriptingStudio: "Studio Scripting",
      sandbox: "Zen Sandscape",
      artGenStudio: "ArtGen Studio",
      polymorph3d: "PolyMorph 3D Studio",
      faqBtn: "FAQ",
      communityBtn: "Communauté"
    },
    en: {
      welcome: "Welcome to Studios-Pro",
      subtitle: "Your professional creative hub",
      message: "We hope you will create your model at the desired quality and return to our site.",
      app3d: "3D Studio",
      app3dViewer: "Studio 3D Viewer",
      appARViewer: "AR Viewer",
      appdfx: "DFX Studio",
      rules: "Site Rules",
      login: "Login",
      logout: "Logout",
      getPremium: "Go Premium",
      premiumActive: "Premium Active",
      premiumDesc: "Unlimited access - 10$/mo",
      payRequest: "Payment required for export",
      payMessage: "You don't have a Premium account. Would you like to go Premium?",
      payBtn: "Go Premium",
      cancel: "Cancel",
      contact: "Contact",
      blogBtn: "Tutorials",
      freeLimitTitle: "Your 5 free exports are completed",
      freeLimitMsg: "You have used your 5 free exports! Upgrade to Pro to continue unlimited exports without limits.",
      loginNow: "Login / Register",
      unlimitedTitle: "Unlimited",
      unlimitedPrice: "$10 / month",
      daysLeft: "days remaining",
      oneDayLeft: "day remaining",
      expired: "Expired",
      manageSubscription: "Manage",
      depthMaps: "Depth Maps",
      new3d4d: "New 3D 4D",
      vectorCnc: "Vector CNC",
      studioPro: "Studio Pro 4D",
      maker7: "Maker Studio 7",
      jewelry: "Jewelry Maker Pro",

      archPro1: "Architect Pro 1",
      archPro2: "Architect Pro 2",
      figureBuilder: "4D Figure Builder",
      musicComposer: "4D Music Composer",
      designPro: "Design Pro Studio",

      studioPro2: "Studio Pro 2",
      mechGenPro: "Mech Gen Pro",
      scriptingStudio: "Scripting Studio",
      sandbox: "Zen Sandscape",
      artGenStudio: "ArtGen Studio",
      polymorph3d: "PolyMorph 3D Studio",
      faqBtn: "FAQ",
      communityBtn: "Community"
    }
  };

  const currentT = t[lang];

  return (
    <div className={`main-container ${(is3DOpen || is3DViewerOpen || isARViewerOpen || isDFXOpen || isRulesOpen || isDepthOpen || isNew3DOpen || isVectorOpen || isStudioProOpen || isMaker7Open || isJewelryOpen || isArchPro1Open || isArchPro2Open || isFigureBuilderOpen || isMusicComposerOpen || isDesignProOpen || isStudioPro2Open || isMechGenProOpen || isScriptingOpen || isSandboxOpen || isArtGenOpen || isPolyMorphOpen) ? 'studio-active' : ''} ${isAnnouncementVisible ? 'has-announcement' : ''}`}>
      {!isEmbed && isAnnouncementVisible && announcement && (
        <div className="announcement-banner">
          <span className="announcement-text">
            {lang === 'fr' ? announcement.textFr : announcement.textEn}
          </span>
          <button 
            className="announcement-close-btn" 
            onClick={() => {
              setIsAnnouncementVisible(false);
              localStorage.setItem('dismissedAnnouncementTime', announcement.updatedAt || new Date().toISOString());
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {/* Payment Request Modal */}
      {/* Pricing / Freemium Modal */}
      <AnimatePresence>
        {showPaymentRequest && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="auth-modal pricing-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ maxWidth: '680px' }}>
              <button className="close-btn" onClick={() => setShowPaymentRequest(false)}><X size={20} /></button>

              <div className="pricing-icon">
                <Sparkles size={44} color="#f59e0b" />
              </div>

              <h2>
                {paymentReason === 'premium_feature' 
                  ? (lang === 'fr' ? "Abonnement Premium Requis" : "Premium Subscription Required") 
                  : paymentReason === 'pricing_overview'
                  ? (lang === 'fr' ? "Tarifs & Formules Studios-Pro" : "Studios-Pro Pricing & Plans")
                  : currentT.freeLimitTitle}
              </h2>
              <p className="payment-desc">
                {paymentReason === 'premium_feature' 
                  ? (lang === 'fr' ? "Cette fonctionnalité est exclusivement réservée aux utilisateurs Pro. Choisissez votre formule pour débloquer l'accès complet !" : "This feature is reserved for Pro users. Choose your plan to unlock full access!") 
                  : paymentReason === 'pricing_overview'
                  ? (lang === 'fr' ? "Exports haute résolution illimités, parcours d'outils CNC, et licence commerciale directe." : "Unlimited high-resolution exports, CNC toolpaths, and commercial license.")
                  : currentT.freeLimitMsg}
              </p>

              <div className="pricing-grid">
                {/* Free Plan Card */}
                <div className="pricing-card">
                  <h3>{lang === 'fr' ? "Formule Gratuite" : "Free Plan"}</h3>
                  <div className="pricing-price">$0</div>
                  <div className="pricing-desc">{lang === 'fr' ? "5 Exports inclus pour démarrer" : "5 Free exports included to start"}</div>
                  <ul className="pricing-features-list">
                    <li><Check size={16} /> <span>{lang === 'fr' ? "5 Exports complets offerts (STL, OBJ, DXF, G-Code)" : "5 Full free exports (STL, OBJ, DXF, G-Code)"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Accès direct aux 15+ studios 3D et CAD" : "Direct access to all 15+ 3D and CAD studios"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Visualisation 3D & projection AR sur mobile" : "3D viewing & mobile AR projection"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Sans carte bancaire ni engagement" : "No credit card, no commitment"}</span></li>
                  </ul>
                  <button className="pricing-select single" onClick={() => setShowPaymentRequest(false)}>
                    {lang === 'fr' ? "Commencer Gratuitement" : "Start for Free"}
                  </button>
                </div>

                {/* Unlimited Pro Card */}
                <div className="pricing-card featured">
                  <div className="best-value">{lang === 'fr' ? 'MEILLEUR CHOIX' : 'BEST VALUE'}</div>
                  <h3>{lang === 'fr' ? "Accès Pro Illimité" : "Unlimited Pro Access"}</h3>
                  <div className="pricing-price">$10 <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {lang === 'fr' ? 'mois' : 'mo'}</span></div>
                  <div className="pricing-desc">{lang === 'fr' ? "Exports illimités pour créateurs et makers" : "Unlimited exports for creators & makers"}</div>
                  <ul className="pricing-features-list">
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Exports 100% illimités (STL, OBJ, DXF, G-Code)" : "100% Unlimited exports (STL, OBJ, DXF, G-Code)"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Reliefs 3D IA & cartes de profondeur HD" : "AI 3D reliefs & HD depth maps"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Licence commerciale complète incluse" : "Full commercial license included"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Exports HTML autonomes sans filigrane" : "Standalone HTML exports without watermark"}</span></li>
                  </ul>
                  <button className="pricing-select premium" onClick={() => redirectToStripe('premium')}>
                    {lang === 'fr' ? "Passer à Pro (10$/mois)" : "Upgrade to Pro ($10/mo)"}
                  </button>
                </div>
              </div>

              {!user && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>{lang === 'fr' ? "Vous avez déjà un compte ?" : "Already have an account?"}</span>
                  <button
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      setShowPaymentRequest(false);
                      setIsAuthOpen(true);
                    }}
                  >
                    {currentT.login}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navigation Top Bar */}
      {!isEmbed && (
        <nav className="nav-bar">
          <div className="nav-left">
            <div className="lang-toggle">
              <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>FR</button>
              <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            </div>
            <button className="contact-btn-nav" onClick={() => setIsContactOpen(true)}>
              <MessageSquare size={18} />
              <span>{currentT.contact}</span>
            </button>
            <a href="/blog/" className="contact-btn-nav" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} />
              <span>{currentT.blogBtn}</span>
            </a>
            <a href="/faq.html" className="contact-btn-nav" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>?</span>
              <span>{currentT.faqBtn}</span>
            </a>
            <a href="/community/" className="sp-nexus-btn" style={{ textDecoration: 'none' }}>
              <span className="sp-nexus-orbit">
                <span className="sp-nexus-orbit-dot" style={{ '--d': '0deg' }}></span>
                <span className="sp-nexus-orbit-dot" style={{ '--d': '120deg' }}></span>
                <span className="sp-nexus-orbit-dot" style={{ '--d': '240deg' }}></span>
              </span>
              <span className="sp-nexus-inner">
                <span className="sp-nexus-icon">⊕</span>
                <span className="sp-nexus-label">SP NEXUS</span>
              </span>
              {communityCount !== null && (
                <span className="sp-nexus-badge">{communityCount > 999 ? '999+' : communityCount}</span>
              )}
            </a>
          </div>

          <div className="nav-right">
            {!isPremium && (
              <button
                className="nav-pricing-btn"
                onClick={() => {
                  setPaymentReason('pricing_overview');
                  setShowPaymentRequest(true);
                }}
              >
                <Sparkles size={16} />
                <span>{lang === 'fr' ? 'Tarifs & Pro' : 'Pricing & Pro'}</span>
              </button>
            )}

            {user ? (
              <div className="user-controls">
                {isPremium && (
                  <div className="premium-btn active-status" style={{ cursor: 'default' }}>
                    <CreditCard size={18} />
                    <span>{currentT.premiumActive}</span>
                  </div>
                )}
                {isPremium && premiumUntil && (
                  <div className="premium-status-info" style={{ display: 'flex', flexDirection: 'column', padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8, color: '#10b981', fontWeight: 'bold' }}>
                      {(() => {
                        const days = Math.ceil((new Date(premiumUntil) - new Date()) / (1000 * 60 * 60 * 24));
                        return days > 0 
                          ? `${days} ${days === 1 ? currentT.oneDayLeft : currentT.daysLeft}` 
                          : currentT.expired;
                      })()}
                    </span>
                  </div>
                )}
                <div className="user-profile">
                  {isAdmin && (
                    <button className="admin-nav-btn" onClick={() => setIsAdminOpen(true)} title="Admin">
                      <Settings size={18} />
                      <span>Admin</span>
                    </button>
                  )}
                  <div className="user-icon"><User size={20} /></div>
                  <span className="user-email">{user.email}</span>
                  <button className="logout-btn" onClick={() => signOut(auth)} title={currentT.logout}><LogOut size={18} /></button>
                </div>
              </div>
            ) : (
              <button className="login-btn-nav" onClick={() => setIsAuthOpen(true)}>
                <User size={18} />
                <span>{currentT.login}</span>
              </button>
            )}
          </div>
        </nav>
      )}

      {!isEmbed && (
        <header className="header">
          <motion.h1
            className="title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Studios-Pro <span style={{ fontSize: '0.8rem', opacity: 0.5, verticalAlign: 'middle' }}>(v2.0 - Single Page)</span>
          </motion.h1>

          {/* Semantic SEO Description (Hidden) */}
          <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
            <h3>AI Design & CNC Tools: 3D Modeling, Depth Map Generation, and Vector Conversion</h3>
            <p>Studios-Pro is a professional creative hub specializing in high-fidelity 3D rendering, AI monocular depth estimation, and technical vector exports. </p>
            <ul>
              <li><strong>3D Studio & New 3D 4D:</strong> Convert images to STL, OBJ, and GLB for 3D printing and animation.</li>
              <li><strong>AI Depth Maps:</strong> Generate accurate depth maps from single photos for lithophanes and CNC relief carving.</li>
              <li><strong>Vector CNC:</strong> Professional photo-to-vector conversion for SVG, DXF, and G-code, optimized for laser and router CNC machines.</li>
              <li><strong>DFX Studio:</strong> Specialized sequences and animations for high-end digital design.</li>
              <li><strong>Maker Studio 7:</strong> All-in-one generator for parametric boxes, spherical lithophanes, halftones, voronoi structures, and AI-powered PBR textures.</li>
              <li><strong>Jewelry Maker Pro:</strong> Design custom 3D printable jewelry, rings, and accessories directly in your browser with precise CAD parameters and photo-relief mapping.</li>
              <li><strong>Studio Pro 2:</strong> Advanced scale 4D rendering library providing real-time multifold topological mapping and physically-based material lighting for high-fidelity interactive browser experiences.</li>
              <li><strong>Mech Gen Pro:</strong> Professional browser-based procedural mechanical part and gear generator outputting DXF/SVG for laser cutters and STL for functional resin SLA 3D printed transmissions.</li>
            </ul>
          </div>

        <motion.div
          className="hero-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="subtitle">{currentT.subtitle}</h2>
          <p className="main-message">{currentT.message}</p>
          <motion.div 
            className={`premium-promo ${isPremium ? 'is-premium' : ''}`} 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => {
              if (!isPremium) {
                setPaymentReason('pricing_overview');
                setShowPaymentRequest(true);
              }
            }}
            style={{ cursor: isPremium ? 'default' : 'pointer' }}
          >
            <span className="promo-tag">PRO</span>
            <p>
              {isPremium 
                ? `${currentT.premiumActive} - ${currentT.unlimitedTitle}` 
                : (lang === 'fr' ? '5 Exports Gratuits Inclus — Puis 10$/mois en Illimité' : '5 Free Exports Included — Then $10/mo for Unlimited')}
            </p>
          </motion.div>
        </motion.div>

        {/* Social Share Section */}
        <motion.div
          className="social-share-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <span className="social-share-label">
            {lang === 'fr' ? '🌟 Partager avec des amis' : '🌟 Share with friends'}
          </span>
          <div className="social-share-buttons">
            <a
              id="share-twitter"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(lang === 'fr' ? 'Découvrez Studios-Pro – Hub 3D, DFX et IA dans votre navigateur !' : 'Check out Studios-Pro – Professional 3D, DFX & AI tools in your browser!')}&url=https%3A%2F%2Fstudios-pro.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-btn-twitter"
            >
              𝕏 Twitter
            </a>
            <a
              id="share-linkedin"
              href={`https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fstudios-pro.com&title=Studios-Pro&summary=${encodeURIComponent(lang === 'fr' ? 'Hub créatif professionnel 3D, IA et CNC' : 'Professional 3D, AI & CNC creative hub')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-btn-linkedin"
            >
              in LinkedIn
            </a>
            <button
              id="share-copy"
              className="share-btn share-btn-copy"
              onClick={handleShareCopy}
            >
              {linkCopied ? (lang === 'fr' ? '✓ Copié !' : '✓ Copied!') : (lang === 'fr' ? '🔗 Copier le lien' : '🔗 Copy Link')}
            </button>
          </div>
        </motion.div>
      </header>
      )}

      <div className="compartments-grid">
        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIs3DOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" />
            <Box size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="3D Modeling Icon" />
          </div>
          <div className="card-label">{currentT.app3d}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIs3DViewerOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
            <Box size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="3D Viewer Icon" />
          </div>
          <div className="card-label">{currentT.app3dViewer}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsARViewerOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }} />
            <Box size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="AR Viewer Icon" />
          </div>
          <div className="card-label">{currentT.appARViewer}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsDFXOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-2" />
            <Circle size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="DFX Animation Icon" />
          </div>
          <div className="card-label">{currentT.appdfx}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsRulesOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-3" />
            <Hexagon size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Rules Icon" />
          </div>
           <div className="card-label">{currentT.rules}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsDepthOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-4" />
            <Layers size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Depth Maps Icon" />
          </div>
          <div className="card-label">{currentT.depthMaps}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsNew3DOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-5" />
            <Component size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="New 3D Icon" />
          </div>
          <div className="card-label">{currentT.new3d4d}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsVectorOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-6" />
            <Cpu size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Vector CNC Icon" />
          </div>
          <div className="card-label">{currentT.vectorCnc}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsStudioProOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #0cebeb, #20e3b2, #29ffc6)' }} />
            <Boxes size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Studio Pro 4D Icon" />
          </div>
          <div className="card-label">{currentT.studioPro}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsMaker7Open(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }} />
            <Box size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Maker Studio 7 Icon" />
          </div>
          <div className="card-label">{currentT.maker7}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsJewelryOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-2" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }} />
            <Hexagon size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Jewelry Maker Pro Icon" />
          </div>
          <div className="card-label">{currentT.jewelry}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsArchPro1Open(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-4" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }} />
            <Hexagon size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Architect Pro 1 Icon" />
          </div>
          <div className="card-label">{currentT.archPro1}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsArchPro2Open(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-5" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }} />
            <Layers size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Architect Pro 2 Icon" />
          </div>
          <div className="card-label">{currentT.archPro2}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsFigureBuilderOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-6" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }} />
            <Component size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="4D Figure Builder Icon" />
          </div>
          <div className="card-label">{currentT.figureBuilder}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsMusicComposerOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }} />
            <Circle size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="4D Music Composer Icon" />
          </div>
          <div className="card-label">{currentT.musicComposer}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsDesignProOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-2" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }} />
            <Boxes size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Design Pro Studio Icon" />
          </div>
          <div className="card-label">{currentT.designPro}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsStudioPro2Open(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-4" style={{ background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)' }} />
            <Boxes size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Studio Pro 2 Icon" />
          </div>
          <div className="card-label">{currentT.studioPro2}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsMechGenProOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-5" style={{ background: 'linear-gradient(135deg, #14b8a6, #eab308)' }} />
            <Component size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Mech Gen Pro Icon" />
          </div>
          <div className="card-label">{currentT.mechGenPro}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsScriptingOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-3" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }} />
            <Code size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Scripting Studio Icon" />
          </div>
          <div className="card-label">{currentT.scriptingStudio}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsSandboxOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }} />
            <Boxes size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Zen Sandscape Icon" />
          </div>
          <div className="card-label">{currentT.sandbox}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsArtGenOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4, #f472b6)' }} />
            <Palette size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="ArtGen Studio Icon" />
          </div>
          <div className="card-label">{currentT.artGenStudio}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsPolyMorphOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4, #10b981)' }} />
            <Boxes size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="PolyMorph 3D Studio Icon" />
          </div>
          <div className="card-label">{currentT.polymorph3d}</div>
        </motion.div>
      </div>

      {/* Testimonials Section */}
      <motion.section
        className="testimonials-section"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        aria-label="User Testimonials"
      >
        <h2 className="testimonials-title">
          {lang === 'fr' ? '⭐ Ce que disent nos utilisateurs' : '⭐ What our users say'}
        </h2>
        <div className="testimonials-grid">
          {[
            {
              name: 'Marc D.',
              avatar: 'MD',
              color: '#3b82f6',
              en: 'Incredible tool for 3D printing prep! I designed a complete jewelry set in Jewelry Maker Pro and exported to STL in minutes.',
              fr: 'Outil incroyable pour la préparation d\'impression 3D ! J\'ai conçu un ensemble de bijoux complet dans Jewelry Maker Pro et exporté en STL en quelques minutes.'
            },
            {
              name: 'Sophie L.',
              avatar: 'SL',
              color: '#10b981',
              en: 'The Vector CNC converter is a game changer for my laser cutting business. Professional SVG and DXF output every time.',
              fr: 'Le convertisseur Vector CNC change la donne pour mon activité de découpe laser. Des sorties SVG et DXF professionnelles à chaque fois.'
            },
            {
              name: 'Alex K.',
              avatar: 'AK',
              color: '#f59e0b',
              en: 'Studio Pro 4D blew my mind. Real-time 4D animations directly in the browser? Nothing else comes close.',
              fr: 'Studio Pro 4D m\'a époustouflé. Des animations 4D en temps réel directement dans le navigateur ? Rien n\'y ressemble.'
            },
            {
              name: 'Camille R.',
              avatar: 'CR',
              color: '#8b5cf6',
              en: 'I use the Depth Maps tool to create stunning lithophane prints. The AI accuracy is remarkable. 100% recommended!',
              fr: 'J\'utilise l\'outil Depth Maps pour créer de magnifiques lithophanes. La précision de l\'IA est remarquable. 100% recommandé !'
            },
            {
              name: 'Thomas B.',
              avatar: 'TB',
              color: '#ec4899',
              en: 'Mech Gen Pro generated perfect DXF gears for my CNC router in seconds. The parametric controls are very intuitive.',
              fr: 'Mech Gen Pro a généré des engrenages DXF parfaits pour ma fraiseuse CNC en quelques secondes. Les contrôles paramétriques sont très intuitifs.'
            },
            {
              name: 'Isabelle M.',
              avatar: 'IM',
              color: '#06b6d4',
              en: 'Maker Studio 7 saved me hours on my woodworking projects. The parametric box designer is flawless — I exported G-code directly!',
              fr: 'Maker Studio 7 m\'a économisé des heures sur mes projets de menuiserie. Le designer de boîtes paramétriques est parfait — j\'ai exporté le G-code directement !'
            }
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              className="testimonial-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="testimonial-stars">
                {'★★★★★'}
              </div>
              <p className="testimonial-text">
                "{lang === 'fr' ? testimonial.fr : testimonial.en}"
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: testimonial.color }}>
                  {testimonial.avatar}
                </div>
                <span className="testimonial-name">{testimonial.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Visible SEO Footer */}
      {!isEmbed && (
        <SeoFooter 
          lang={lang} 
          onOpenPricing={() => { setPaymentReason('pricing_overview'); setShowPaymentRequest(true); }}
          onOpenContact={() => setIsContactOpen(true)}
        />
      )}

      {/* Newsletter Popup */}
      <AnimatePresence>
        {showNewsletter && !newsletterDismissed && !user && (
          <motion.div
            className="newsletter-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="newsletter-modal"
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 40 }}
            >
              <button className="close-btn" onClick={handleNewsletterDismiss}><X size={20} /></button>
              {newsletterSubmitted ? (
                <div className="newsletter-success">
                  <div className="newsletter-success-icon">🎉</div>
                  <h3>{lang === 'fr' ? 'Merci !' : 'Thank you!'}</h3>
                  <p>{lang === 'fr' ? 'Vous êtes inscrit(e) ! Surveillez votre boîte mail.' : 'You\'re subscribed! Check your inbox soon.'}</p>
                </div>
              ) : (
                <>
                  <div className="newsletter-icon">✉️</div>
                  <h3 className="newsletter-title">
                    {lang === 'fr' ? '1 export gratuit par semaine' : '1 free export per week'}
                  </h3>
                  <p className="newsletter-desc">
                    {lang === 'fr'
                      ? 'Inscrivez-vous à notre newsletter et recevez des astuces exclusives et des offres réservées aux abonnés.'
                      : 'Subscribe to our newsletter and get exclusive tips and subscriber-only offers.'}
                  </p>
                  <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
                    <input
                      id="newsletter-email-input"
                      type="email"
                      className="newsletter-input"
                      placeholder={lang === 'fr' ? 'Votre email...' : 'Your email...'}
                      value={newsletterEmail}
                      onChange={e => setNewsletterEmail(e.target.value)}
                      required
                    />
                    <button type="submit" className="newsletter-submit">
                      {lang === 'fr' ? 'S\'inscrire' : 'Subscribe'}
                    </button>
                  </form>
                  <p className="newsletter-privacy">
                    {lang === 'fr' ? '🔒 Pas de spam. Désinscription facile.' : '🔒 No spam. Unsubscribe anytime.'}
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            lang={lang}
          />
        )}
        {isContactOpen && (
          <ContactModal
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            lang={lang}
          />
        )}
        {isAdminOpen && (
          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Full-screen Studio Overlays */}
      <AnimatePresence>
        {is3DOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/ap3d/index.html" className="studio-iframe" title="Studio 3D" />
          </motion.div>
        )}
        {is3DViewerOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src={`/apps/studio-3d-viewer/index.html?lang=${lang}${new URLSearchParams(window.location.search).get('file_url') ? '&file_url=' + encodeURIComponent(new URLSearchParams(window.location.search).get('file_url')) : ''}`} className="studio-iframe" title="Studio 3D Viewer" />
          </motion.div>
        )}
        {isARViewerOpen && (
          <motion.div className="studio-overlay ar-viewer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src={`/apps/ar-viewer/index.html?lang=${lang}${arViewerUrl ? '&url=' + encodeURIComponent(arViewerUrl) : ''}`} className="studio-iframe" title="AR Viewer 3D" />
          </motion.div>
        )}
        {isDFXOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/dfx/index.html" className="studio-iframe" title="Studio DFX" />
          </motion.div>
        )}
         {isRulesOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/rules/index.html" className="studio-iframe" title="Rules" />
          </motion.div>
        )}
        {isDepthOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/depth-maps/index.html" className="studio-iframe" title="Depth Maps" />
          </motion.div>
        )}
        {isNew3DOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/new3d4d/index.html" className="studio-iframe" title="New 3D 4D" />
          </motion.div>
        )}
        {isVectorOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/vector-cnc/index.html" className="studio-iframe" title="Vector CNC" />
          </motion.div>
        )}
        {isStudioProOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/studio-pro/index.html" className="studio-iframe" title="Studio Pro 4D" />
          </motion.div>
        )}
        {isMaker7Open && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/maker7/index.html" className="studio-iframe" title="Maker Studio 7" />
          </motion.div>
        )}
        {isJewelryOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/jewelry-pro/index.html" className="studio-iframe" title="Jewelry Maker Pro" />
          </motion.div>
        )}
        {isArchPro1Open && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/architect-pro-1/index.html" className="studio-iframe" title="Architect Pro 1" />
          </motion.div>
        )}
        {isArchPro2Open && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/architect-pro-2/index.html" className="studio-iframe" title="Architect Pro 2" />
          </motion.div>
        )}
        {isFigureBuilderOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/figure-builder/index.html" className="studio-iframe" title="4D Figure Builder" />
          </motion.div>
        )}
        {isMusicComposerOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/music-composer/index.html" className="studio-iframe" title="4D Music Composer" />
          </motion.div>
        )}
        {isDesignProOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/design-pro-studio/index.html" className="studio-iframe" title="Design Pro Studio" />
          </motion.div>
        )}
        {isStudioPro2Open && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/studio-pro-2/index.html" className="studio-iframe" title="Studio Pro 2" />
          </motion.div>
        )}
        {isMechGenProOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/mech-gen-pro/index.html" className="studio-iframe" title="Mech Gen Pro" />
          </motion.div>
        )}
        {isScriptingOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe 
              ref={scriptingIframeRef}
              src={`/apps/scripting-live/index.html?premium=${isPremium || isAdmin}&room=${collabRoomId || ''}`} 
              className="studio-iframe" 
              title="Scripting Studio" 
            />
          </motion.div>
        )}
        {isSandboxOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/sandbox/index.html" className="studio-iframe" title="Zen Sandscape" />
          </motion.div>
        )}
        {isArtGenOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/artgen/index.html" className="studio-iframe" title="ArtGen Studio" />
          </motion.div>
        )}
        {isPolyMorphOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/polymorph-3d/index.html" className="studio-iframe" title="PolyMorph 3D Studio" />
          </motion.div>
        )}
      </AnimatePresence>

      {isEmbed && (
        <div style={{
          position: 'fixed',
          bottom: '15px',
          right: '15px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          padding: '8px 16px',
          borderRadius: '30px',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          pointerEvents: 'auto'
        }}>
          <img src="/logo_studios_pro.png" width="18" height="18" style={{ borderRadius: '4px' }} alt="Logo" />
          <a href="https://studios-pro.com" target="_blank" rel="noopener noreferrer" style={{
            color: '#f8fafc',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            fontFamily: 'Outfit, sans-serif'
          }}>
            View on Studios-Pro
          </a>
        </div>
      )}
    </div>
  );
};

export default StudiosPro;
