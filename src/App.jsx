import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Circle, Hexagon, User, LogOut, CreditCard, X, Mail, Lock, ShieldCheck } from 'lucide-react';
import './App.css';

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
        <div className="auth-form">
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input type="email" placeholder={t.email} />
          </div>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input type="password" placeholder={t.password} />
          </div>
          <button className="auth-submit" onClick={onClose}>{t.submit}</button>
          <p className="auth-switch" onClick={() => setIsLogin(!isLogin)}>{t.switch}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StudiosPro = () => {
  const [lang, setLang] = useState('fr');
  const [user, setUser] = useState(null); // Mocked user state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [pendingExport, setPendingExport] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'TRIGGER_PAYMENT_MODAL') {
        if (isPremium) {
          // If premium, allow immediately
          event.source.postMessage({ type: 'EXPORT_ALLOWED' }, '*');
        } else {
          // If not premium, show payment request
          setShowPaymentRequest(true);
          setPendingExport(event.source);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPremium]);

  const handlePayForExport = () => {
    // Mock payment success for $2
    if (pendingExport) {
      pendingExport.postMessage({ type: 'EXPORT_ALLOWED' }, '*');
      setShowPaymentRequest(false);
      setPendingExport(null);
      alert(lang === 'fr' ? "Paiement de 2$ réussi ! Votre export va commencer." : "2$ Payment successful! Your export will begin.");
    }
  };

  const t = {
    fr: {
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
      payMessage: "Vous n'avez pas de compte Premium. Voulez-vous payer 2$ pentru cet export ou devenir Premium ?",
      payBtn: "Payer 2$",
      cancel: "Annuler",
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
                <button className="premium-btn" onClick={() => { setIsPremium(true); setShowPaymentRequest(false); }}>{currentT.getPremium} ($35)</button>
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
        </div>

        <div className="nav-right">
          {user ? (
            <div className="user-controls">
              <button
                className={`premium-btn ${isPremium ? 'active' : ''}`}
                onClick={() => setIsPremium(!isPremium)}
              >
                {isPremium ? <ShieldCheck size={18} /> : <CreditCard size={18} />}
                <span>{isPremium ? currentT.premiumActive : currentT.getPremium}</span>
              </button>
              <div className="user-profile">
                <div className="user-icon"><User size={20} /></div>
                <span className="user-email">{user.email}</span>
                <button className="logout-btn" onClick={() => setUser(null)} title={currentT.logout}><LogOut size={18} /></button>
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
          onClick={() => window.open('/apps/ap3d/index.html', '_blank')}
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
          onClick={() => window.open('/apps/dfx/index.html', '_blank')}
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
          onClick={() => window.open('/apps/rules/index.html', '_blank')}
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
            onClose={() => {
              setIsAuthOpen(false);
              setUser({ email: 'user@example.com' }); // Mock login
            }}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudiosPro;
