import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
const ContactModal = ({ isOpen, onClose, lang }) => {
  const t = {
    fr: {
      title: "Contactez-nous",
      name: "Nom",
      email: "Email",
      message: "Message",
      send: "Envoyer",
      success: "Message envoyé ! Nous vous répondrons bientôt.",
    },
    en: {
      title: "Contact Us",
      name: "Name",
      email: "Email",
      message: "Message",
      send: "Send",
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
          const formData = new FormData(e.target);
          fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString(),
          })
            .then(async () => {
              // Also save to Firebase
              try {
                await addDoc(collection(db, "messages"), {
                  name: formData.get('name'),
                  email: formData.get('email'),
                  message: formData.get('message'),
                  timestamp: new Date().toISOString(),
                  read: false
                });
              } catch (err) {
                console.error("Firebase save error:", err);
              }
              alert(t.success);
              onClose();
            })
            .catch((error) => alert(error));
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
          <button type="submit" className="auth-submit">{t.send}</button>
        </form>
      </motion.div>
    </motion.div>
  );
};

import {
  Box, Circle, Hexagon, User, LogOut, CreditCard, X, Mail, Lock,
  ShieldCheck, MessageSquare, Settings, Users, Star, Trash2
} from 'lucide-react';
import './App.css';

const ADMIN_EMAIL = 'andart1174@gmail.com';

const AdminModal = ({ isOpen, onClose, lang }) => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'messages'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'users') {
          const querySnapshot = await getDocs(collection(db, "users"));
          const usersList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsers(usersList);
        } else {
          const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
          const querySnapshot = await getDocs(q);
          const messagesList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messagesList);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [isOpen, activeTab]);

  const togglePremium = async (userId, currentStatus) => {
    try {
      await setDoc(doc(db, "users", userId), { isPremium: !currentStatus }, { merge: true });
      setUsers(users.map(u => u.id === userId ? { ...u, isPremium: !currentStatus } : u));
    } catch (error) {
      alert("Error updating user: " + error.message);
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

  const t = {
    fr: {
      title: "Panneau d'administration",
      loading: "Chargement...",
      email: "Email",
      status: "Statut",
      action: "Action",
      revoke: "Révoquer",
      makePremium: "Rendre Premium"
    },
    en: {
      title: "Admin Dashboard",
      loading: "Loading...",
      email: "Email",
      status: "Status",
      action: "Action",
      revoke: "Revoke",
      makePremium: "Make Premium"
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

        <div className="admin-tabs">
          <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={18} />
            <span>{lang === 'fr' ? 'Utilisateurs' : 'Users'}</span>
          </button>
          <button className={`admin-tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <MessageSquare size={18} />
            <span>{lang === 'fr' ? 'Messages' : 'Messages'}</span>
          </button>
        </div>

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">{t.loading}</div>
          ) : activeTab === 'users' ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.email}</th>
                  <th>{t.status}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status-badge ${u.isPremium ? 'premium' : 'free'}`}>
                        {u.isPremium ? 'PREMIUM' : 'FREE'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-action-btn"
                        onClick={() => togglePremium(u.id, u.isPremium)}
                      >
                        {u.isPremium ? t.revoke : t.makePremium}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="admin-messages-list">
              {messages.length === 0 ? (
                <p className="no-messages">{lang === 'fr' ? 'Aucun message.' : 'No messages.'}</p>
              ) : messages.map(m => (
                <div key={m.id} className="admin-message-card">
                  <div className="message-header">
                    <strong>{m.name}</strong>
                    <span className="message-email">{m.email}</span>
                    <button className="delete-msg-btn" onClick={() => deleteMessage(m.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="message-text">{m.message}</p>
                  <small className="message-date">{new Date(m.timestamp).toLocaleString()}</small>
                </div>
              ))}
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
    },
    en: {
      login: "Login",
      register: "Register",
      email: "Email",
      password: "Password",
      submit: isLogin ? "Login" : "Register",
      switch: isLogin ? "No account? Register" : "Have an account? Login",
    }
  }[lang];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Initialize user profile in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: userCredential.user.email,
          isPremium: false,
          createdAt: new Date().toISOString()
        });
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

const StudiosPro = () => {
  const [lang, setLang] = useState('fr');
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [hasExportCredit, setHasExportCredit] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [pendingExport, setPendingExport] = useState(null);
  const [is3DOpen, setIs3DOpen] = useState(false);
  const [isDFXOpen, setIsDFXOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const isAdmin = user && user.email === ADMIN_EMAIL;

  // Listen to Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // Check premium status in Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsPremium(data.isPremium || false);
            setHasExportCredit(data.hasExportCredit || false);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      } else {
        setUser(null);
        setIsPremium(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle URL redirects after payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success')) {
      const type = params.get('type');
      if (type === 'premium') {
        setIsPremium(true);
        if (user) {
          setDoc(doc(db, "users", user.uid), { isPremium: true }, { merge: true });
        }
        alert(lang === 'fr' ? "Paiement réussi ! Votre abonnement est actif." : "Payment successful! Your subscription is active.");
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
      if (ref === 'dfx') setIsDFXOpen(true);
    }
  }, [lang, user]);

  useEffect(() => {
    const channel = new BroadcastChannel('studios_pro_channel');

    const handleMessage = (data) => {
      const { type, payload } = data;

      if (type === 'TRIGGER_PAYMENT_MODAL') {
        if (isPremium || isAdmin || hasExportCredit) {
          channel.postMessage({ type: 'EXPORT_ALLOWED' });
          window.postMessage({ type: 'EXPORT_ALLOWED' }, '*');
        } else {
          // Identify which studio requested this
          const ref = payload?.ref || 'site';
          channel.postMessage({
            type: 'SHOW_LOCAL_MODAL',
            payload: { lang, ref }
          });
        }
      } else if (type === 'START_STRIPE_PAYMENT') {
        console.log("Payment request received:", payload);
        // Payload can be a string or an object { type, ref }
        if (typeof payload === 'object') {
          redirectToStripe(payload.type, payload.ref);
        } else {
          redirectToStripe(payload);
        }
      } else if (type === 'EXPORT_COMPLETED') {
        if (hasExportCredit && !isPremium && !isAdmin) {
          setHasExportCredit(false);
          if (user) {
            setDoc(doc(db, "users", user.uid), { hasExportCredit: false }, { merge: true });
          }
        }
      } else if (type === 'CLOSE_STUDIO') {
        setIs3DOpen(false);
        setIsDFXOpen(false);
        setIsRulesOpen(false);
      } else if (type === 'PAYMENT_SUCCESS_INTERNAL') {
        console.log("Internal payment success received:", payload.type);
        if (payload.type === 'premium') setIsPremium(true);
        if (payload.type === 'single') setHasExportCredit(true);
        // Automatically allow the export in the current session
        channel.postMessage({ type: 'EXPORT_ALLOWED' });
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
  }, [isPremium, isAdmin, lang, hasExportCredit, user]);

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

      const { url } = await response.json();
      if (url) {
        window.open(url, '_blank');
        alert(lang === 'fr' ? "Redirection vers Stripe... Veuillez compléter le paiement în noua fereastră și reveniți aici." : "Redirecting to Stripe... Please complete the payment in the new window and return here.");
      }
    } catch (error) {
      console.error("Stripe Redirect Error:", error);
      alert("Error starting checkout. Please try again.");
    }
  };

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
      appdfx: "Studio DFX",
      rules: "Règles du Site",
      login: "Connexion",
      logout: "Déconnexion",
      getPremium: "Devenir Premium",
      premiumActive: "Premium Actif",
      premiumDesc: "Accès illimité - 35$/mois",
      payRequest: "Paiement requis pour l'export",
      payMessage: "Vous n'avez pas de compte Premium. Voulez-vous payer 2$ pour cet export ou devenir Premium ?",
      payBtn: "Payer 2$",
      cancel: "Annuler",
      contact: "Contact",
    },
    en: {
      welcome: "Welcome to Studios-Pro",
      subtitle: "Your professional creative hub",
      message: "We hope you will create your model at the desired quality and return to our site.",
      app3d: "3D Studio",
      appdfx: "DFX Studio",
      rules: "Site Rules",
      login: "Login",
      logout: "Logout",
      getPremium: "Go Premium",
      premiumActive: "Premium Active",
      premiumDesc: "Unlimited access - 35$/mo",
      payRequest: "Payment required for export",
      payMessage: "You don't have a Premium account. Would you like to pay $2 for this export or go Premium?",
      payBtn: "Pay $2",
      cancel: "Cancel",
      contact: "Contact",
    }
  };

  const currentT = t[lang];

  return (
    <div className="main-container">
      {/* Payment Request Modal */}
      <AnimatePresence>
        {showPaymentRequest && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="auth-modal payment-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <button className="close-btn" onClick={() => setShowPaymentRequest(false)}><X size={20} /></button>
              <CreditCard size={48} color="#f59e0b" style={{ marginBottom: 20 }} />
              <h2>{currentT.payRequest}</h2>
              <p className="payment-desc">{currentT.payMessage}</p>
              <div className="payment-options">
                <button className="auth-submit" onClick={handlePayForExport}>{currentT.payBtn}</button>
                <button className="premium-btn" onClick={() => redirectToStripe('premium')}>{currentT.getPremium} ($35)</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navigation Top Bar */}
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
        </div>

        <div className="nav-right">
          {user ? (
            <div className="user-controls">
              {!isPremium && (
                <button
                  className="premium-btn"
                  onClick={() => redirectToStripe('premium')}
                >
                  <CreditCard size={18} />
                  <span>{currentT.getPremium}</span>
                </button>
              )}
              {isPremium && (
                <div className="premium-btn active">
                  <ShieldCheck size={18} />
                  <span>{currentT.premiumActive}</span>
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

      <header className="header">
        <motion.h1
          className="title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Studios-Pro
        </motion.h1>

        <motion.div
          className="hero-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="subtitle">{currentT.subtitle}</h2>
          <p className="main-message">{currentT.message}</p>
          {user && !isPremium && (
            <motion.div className="premium-promo" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="promo-tag">PRO</span>
              <p>{currentT.premiumDesc}</p>
            </motion.div>
          )}
        </motion.div>
      </header>

      <div className="compartments-grid">
        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIs3DOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-1" />
            <Box size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} />
          </div>
          <div className="card-label">{currentT.app3d}</div>
        </motion.div>

        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsDFXOpen(true)}
        >
          <div className="shape-wrapper">
            <div className="shape-2" />
            <Circle size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} />
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
            <Hexagon size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} />
          </div>
          <div className="card-label">{currentT.rules}</div>
        </motion.div>
      </div>

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
      </AnimatePresence>
    </div>
  );
};

export default StudiosPro;
