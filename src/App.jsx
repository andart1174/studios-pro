import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import {
  Box, Circle, Hexagon, User, LogOut, CreditCard, X, Mail, Lock,
  ShieldCheck, MessageSquare, Settings, Layers, Component, Cpu,
  Boxes, BookOpen, Code, Search, Copy, Palette, Sparkles, Check,
  Share2, Paintbrush, QrCode, HelpCircle, Menu
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import AdminCommandCenter, { isUserCurrentlyPremium } from './components/AdminCommandCenter.jsx';
import './App.css';

const ADMIN_EMAIL = 'andart1174@gmail.com';
const SAFE_ROOM_RE = /^[a-zA-Z0-9_-]{4,32}$/;

function copyTextSafe(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopyText(text));
  }
  return Promise.resolve(fallbackCopyText(text));
}

function fallbackCopyText(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (_) {
    return false;
  }
}

const ContactModal = ({ isOpen, onClose, lang }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok' | 'err', msg }
  const isFr = lang === 'fr';
  const t = {
    fr: {
      title: "Contactez-nous",
      name: "Votre nom",
      email: "Votre adresse e-mail",
      message: "Votre message (max 5 000 caractères)",
      send: "Envoyer le message",
      sending: "Envoi en cours...",
      success: "Message envoyé ! Nous vous répondrons rapidement.",
      invalid: "Veuillez remplir tous les champs avec une adresse e-mail valide.",
      err: "Échec de l'envoi. Veuillez réessayer ou écrire à support@studios-pro.com.",
    },
    en: {
      title: "Contact Us",
      name: "Your name",
      email: "Your email address",
      message: "Your message (max 5,000 characters)",
      send: "Send Message",
      sending: "Sending...",
      success: "Message sent! We will get back to you soon.",
      invalid: "Please complete all fields with a valid email address.",
      err: "Delivery failed. Please try again or email support@studios-pro.com.",
    }
  }[isFr ? 'fr' : 'en'];

  useEffect(() => {
    if (!isOpen) { setStatus(null); return; }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    // Honeypot anti-spam trap
    if (String(formData.get('bot-field') || '').trim()) {
      setStatus({ type: 'ok', msg: t.success });
      return;
    }
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();
    if (!name || !email || !email.includes('@') || !message) {
      setStatus({ type: 'err', msg: t.invalid });
      return;
    }

    setLoading(true);
    setStatus(null);

    let netlifyOk = false;
    let firestoreOk = false;

    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          'form-name': 'contact',
          'bot-field': '',
          name: name.slice(0, 120),
          email: email.slice(0, 254),
          message: message.slice(0, 5000),
        }).toString(),
      });
      netlifyOk = res.ok;
    } catch (err) {
      console.warn("Netlify Form submit notice:", err);
    }

    if (db) {
      try {
        await addDoc(collection(db, "messages"), {
          name: name.slice(0, 120),
          email: email.slice(0, 254),
          message: message.slice(0, 5000),
          timestamp: new Date().toISOString(),
          read: false,
          lang: isFr ? 'fr' : 'en',
        });
        firestoreOk = true;
      } catch (err) {
        console.error("Firestore message sync error:", err);
      }
    }

    setLoading(false);
    if (netlifyOk || firestoreOk) {
      setStatus({ type: 'ok', msg: t.success });
      form.reset();
      setTimeout(() => { setStatus(null); onClose(); }, 1800);
    } else {
      setStatus({ type: 'err', msg: t.err });
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      <motion.div className="auth-modal contact-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <button type="button" className="close-btn" aria-label={isFr ? 'Fermer' : 'Close'} onClick={onClose}>
          <X size={20} />
        </button>
        <h2>{t.title}</h2>
        {status && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            marginBottom: '12px',
            background: status.type === 'ok' ? 'rgba(16,185,129,0.16)' : 'rgba(239,68,68,0.16)',
            border: `1px solid ${status.type === 'ok' ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}`,
            color: status.type === 'ok' ? '#6ee7b7' : '#fca5a5',
          }}>
            {status.msg}
          </div>
        )}
        <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" className="auth-form" onSubmit={handleSubmit}>
          <input type="hidden" name="form-name" value="contact" />
          <p style={{ display: 'none' }} aria-hidden="true">
            <label>Don’t fill this out: <input name="bot-field" tabIndex={-1} autoComplete="off" /></label>
          </p>
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input type="text" name="name" placeholder={t.name} maxLength={120} required />
          </div>
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input type="email" name="email" placeholder={t.email} maxLength={254} required />
          </div>
          <div className="input-group">
            <MessageSquare size={18} className="input-icon" style={{ top: '15px' }} />
            <textarea name="message" placeholder={t.message} maxLength={5000} required className="contact-textarea"></textarea>
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t.sending : t.send}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const formatAuthError = (err, lang) => {
  const code = err && err.code ? err.code : '';
  const isFr = lang === 'fr';
  const map = {
    'auth/invalid-email': isFr ? 'Adresse e-mail invalide.' : 'Invalid email address.',
    'auth/user-not-found': isFr ? 'Aucun compte trouvé avec cet e-mail.' : 'No account found with this email.',
    'auth/wrong-password': isFr ? 'Mot de passe incorrect.' : 'Incorrect password.',
    'auth/invalid-credential': isFr ? 'E-mail ou mot de passe incorrect.' : 'Invalid email or password.',
    'auth/email-already-in-use': isFr ? 'Cet e-mail est déjà utilisé.' : 'This email is already registered.',
    'auth/weak-password': isFr ? 'Le mot de passe doit contenir au moins 6 caractères.' : 'Password must be at least 6 characters.',
    'auth/too-many-requests': isFr ? 'Trop de tentatives. Réessayez dans quelques minutes.' : 'Too many attempts. Please try again shortly.',
    'auth/user-disabled': isFr ? 'Ce compte a été suspendu.' : 'This account has been suspended.',
  };
  return map[code] || (isFr ? 'Erreur de connexion. Veuillez réessayer.' : (err?.message || 'Authentication error.'));
};

const AuthModal = ({ isOpen, onClose, lang }) => {
  const [isLogin, setIsLogin] = useState(true);
  const t = {
    fr: {
      login: "Se connecter",
      register: "S'inscrire",
      email: "E-mail",
      password: "Mot de passe",
      submit: isLogin ? "Connexion" : "Créer un compte",
      switch: isLogin ? "Pas de compte ? Inscrivez-vous" : "Déjà un compte ? Connectez-vous",
      googleBtn: "Continuer avec Google",
      orDivider: "ou avec e-mail"
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
  }[lang === 'fr' ? 'fr' : 'en'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Clickjacking protection: never render auth form inside third-party frames
  if (!isOpen || (typeof window !== 'undefined' && window.self !== window.top)) return null;

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
      const localFreeUsed = Math.max(0, parseInt(localStorage.getItem('freeExportsUsed'), 10) || 0);
      if (!existingDoc.exists()) {
        await setDoc(userRef, {
          email: googleUser.email,
          displayName: googleUser.displayName || '',
          isPremium: false,
          freeExportsUsed: localFreeUsed,
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(formatAuthError(err, lang));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    if (!auth) {
      setError(lang === 'fr' ? "Le système d'authentification n'est pas configuré." : "Authentication system not configured.");
      return;
    }
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'login', { method: 'Email' });
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        sendEmailVerification(userCredential.user).catch(() => {});
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'sign_up', { method: 'Email' });
          window.gtag('event', 'conversion', { 'send_to': 'AW-18273639003' });
        }
        const userRef = doc(db, "users", userCredential.user.uid);
        const existingDoc = await getDoc(userRef);
        const localFreeUsed = Math.max(0, parseInt(localStorage.getItem('freeExportsUsed'), 10) || 0);
        if (!existingDoc.exists()) {
          await setDoc(userRef, {
            email: userCredential.user.email,
            isPremium: false,
            freeExportsUsed: localFreeUsed,
            createdAt: new Date().toISOString()
          });
        }
      }
      onClose();
    } catch (err) {
      setError(formatAuthError(err, lang));
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={isLogin ? t.login : t.register}
    >
      <motion.div
        className="auth-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button type="button" className="close-btn" aria-label={lang === 'fr' ? 'Fermer' : 'Close'} onClick={onClose}><X size={20} /></button>
        <h2>{isLogin ? t.login : t.register}</h2>
        {error && <p style={{ color: '#fca5a5', fontSize: '0.82rem', marginBottom: '10px' }}>{error}</p>}
        
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

        <form className="auth-form" onSubmit={handleAuth}>
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-submit">{t.submit}</button>
          <button type="button" className="auth-switch" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{t.switch}</button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const SeoFooter = ({ lang, onOpenPricing, onOpenContact, onOpenRules }) => {
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
              <strong>{isFr ? 'Confidentialité 100 % locale' : '100% Client-Side Privacy'}</strong>
              <p>{isFr ? 'Vos fichiers 3D et images restent sur votre appareil' : 'Your 3D files & images stay in your browser'}</p>
            </div>
          </div>
          <div className="seo-trust-item">
            <span className="seo-trust-icon">🎁</span>
            <div>
              <strong>{isFr ? '5 Exports Gratuits Inclus' : '5 Free Exports Included'}</strong>
              <p>{isFr ? 'STL, OBJ, 3MF, GLB, DXF, G-Code sans carte bancaire' : 'STL, OBJ, 3MF, GLB, DXF, G-Code — no credit card'}</p>
            </div>
          </div>
          <div className="seo-trust-item">
            <span className="seo-trust-icon">💎</span>
            <div>
              <strong>{isFr ? 'Formule Pro à 10 $ / mois' : 'Unlimited Pro at $10/mo'}</strong>
              <p>{isFr ? 'Reliefs CNC HD, WebAR et licence commerciale' : 'HD CNC reliefs, WebAR & commercial license'}</p>
            </div>
          </div>
        </div>

        {/* 5-Column Categorized Directory (Zero Orphan Pages!) */}
        <div className="seo-footer-grid">
          {/* Column 1: 3D & CNC Tools */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#f59e0b' }}></span>
              {isFr ? 'Outils 3D & CNC' : '3D & CNC Tools'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/tools/filament-painting-studio-online">{isFr ? 'Peinture Filament (Alternative HueForge)' : 'Filament Painting Studio (HueForge Alt)'}</a></li>
              <li><a href="/tools/multicolor-3mf-painter">{isFr ? 'Peinture 3D 3MF multicouleur (Bambu AMS)' : 'Multi-Color 3MF Painter & AMS'}</a></li>
              <li><a href="/tools/3d-qr-wifi-coaster-generator">{isFr ? 'Générateur Sous-Verres QR & Wi-Fi' : '3D QR Code & Wi-Fi Coaster'}</a></li>
              <li><a href="/tools/photo-to-3d-4d-relief-glb-stl">{isFr ? 'Photo vers Relief 3D/4D GLB & STL' : 'Photo to 3D/4D Relief (GLB & STL)'}</a></li>
              <li><a href="/tools/3d-portrait-bas-relief-coin-medal-maker">{isFr ? 'Bas-Relief Portrait, Pièce & Médaille 3D' : '3D Portrait Bas-Relief, Coin & Medal'}</a></li>
              <li><a href="/tools/animated-4d-glb-hologram-creator">{isFr ? 'Créateur Hologramme 4D GLB Animé' : 'Animated 4D GLB Hologram Creator'}</a></li>
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
              <li><a href="/tools/3d-text-extruder-online">{isFr ? 'Extrudeur de Texte 3D en Ligne' : 'Online 3D Text Extruder'}</a></li>
              <li><a href="/tools/3d-print-file-analyzer">{isFr ? 'Analyseur de Fichiers Impression 3D' : '3D Print File Analyzer'}</a></li>
              <li><a href="/tools/3d-watch-mechanism-generator">{isFr ? 'Générateur Mécanisme Horloger 3D' : '3D Watch Mechanism Generator'}</a></li>
              <li><a href="/tools/flexi-articulated-3d-generator">{isFr ? 'Générateur Flexi Articulé 3D' : 'Flexi Articulated 3D Generator'}</a></li>
              <li><a href="/tools/dungeon-tiles-rpg-scenery-generator">{isFr ? 'Tuiles Donjon RPG 3D' : 'RPG Dungeon Tiles 3D Generator'}</a></li>
              <li><a href="/tools/3d-topographic-terrain-cityscape-generator">{isFr ? 'Terrain Topographique & Ville 3D' : '3D Topographic Terrain & Cityscape'}</a></li>
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
              <li><a href="/viewer/gcode">{isFr ? 'Visualiseur G-Code Impression & CNC' : 'Online G-Code Toolpath Viewer'}</a></li>
              <li><a href="/apps/ar-viewer/">{isFr ? 'Visualiseur Réalité Augmentée (AR)' : 'Augmented Reality (AR) WebXR'}</a></li>
              <li><a href="/ar-viewer/stl">{isFr ? 'Projeter Modèle STL en AR' : 'Project STL in AR Phone Viewer'}</a></li>
              <li><a href="/ar-viewer/obj">{isFr ? 'Projeter Modèle OBJ en AR' : 'Project OBJ in AR Phone Viewer'}</a></li>
              <li><a href="/ar-viewer/glb">{isFr ? 'Projeter Modèle GLB en AR' : 'Project GLB in AR Mobile Viewer'}</a></li>
              <li><a href="/cards/pokemon-card-maker">{isFr ? 'Créateur de Cartes 3D Holo' : 'Holo 3D Card Maker'}</a></li>
              <li><a href="/cards/custom-3d-card-generator">{isFr ? 'Générateur de Cartes 3D sur Mesure' : 'Custom 3D Card Generator'}</a></li>
            </ul>
          </div>

          {/* Column 3: Converters & CAD */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#10b981' }}></span>
              {isFr ? 'Convertisseurs & CAO' : 'Converters & CAD'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/convert/2d-image-to-3d-stl">{isFr ? 'Convertir Image 2D en STL 3D' : '2D Image to 3D STL Converter'}</a></li>
              <li><a href="/convert/photo-to-3d-relief-stl">{isFr ? 'Photo vers Bas-Relief STL' : 'Photo to 3D Relief STL Converter'}</a></li>
              <li><a href="/convert/photo-to-filament-painting-3mf">{isFr ? 'Photo vers Peinture Filament 3MF' : 'Photo to Filament Painting 3MF'}</a></li>
              <li><a href="/convert/png-to-svg">{isFr ? 'Convertisseur PNG en SVG Vectoriel' : 'PNG to SVG Vector Converter'}</a></li>
              <li><a href="/convert/jpg-to-svg">{isFr ? 'Convertisseur JPG en SVG Vectoriel' : 'JPG to SVG Vector Converter'}</a></li>
              <li><a href="/convert/dxf-to-svg">{isFr ? 'Convertisseur DXF vers SVG' : 'AutoCAD DXF to SVG Converter'}</a></li>
              <li><a href="/convert/svg-to-dxf">{isFr ? 'Convertisseur SVG vers DXF' : 'SVG to AutoCAD DXF Converter'}</a></li>
              <li><a href="/convert/dxf-to-gcode">{isFr ? 'Convertisseur DXF vers G-Code' : 'DXF to Laser/CNC G-Code'}</a></li>
              <li><a href="/tools/svg-to-gcode-laser-engraver">{isFr ? 'SVG vers G-Code Laser CNC' : 'SVG to Laser Engraver G-Code'}</a></li>
              <li><a href="/convert/obj-to-stl">{isFr ? 'Convertisseur OBJ vers STL' : 'OBJ to STL 3D Mesh Converter'}</a></li>
              <li><a href="/convert/stl-to-obj">{isFr ? 'Convertisseur STL vers OBJ' : 'STL to OBJ 3D Mesh Converter'}</a></li>
              <li><a href="/convert/glb-to-html">{isFr ? 'Convertir GLB en HTML Autonome' : 'GLB to Standalone HTML Exporter'}</a></li>
              <li><a href="/convert/stl-to-html">{isFr ? 'Convertir STL en HTML 3D' : 'STL to Interactive HTML Viewer'}</a></li>
              <li><a href="/convert/2d-sketch-to-3d">{isFr ? 'Croquis 2D vers Modèle 3D' : '2D Sketch to 3D Model'}</a></li>
              <li><a href="/convert/text-to-3d-model">{isFr ? 'Texte vers Modèle 3D STL' : 'Text to 3D Model Converter'}</a></li>
              <li><a href="/convert/svg-to-3d-model">{isFr ? 'SVG Vectoriel vers 3D STL' : 'SVG to 3D Model Extruder'}</a></li>
              <li><a href="/convert/ai-art-generator">{isFr ? 'Générateur d\'Art Vectoriel IA' : 'AI Generative Vector Art'}</a></li>
              <li><a href="/convert/procedural-logo-maker">{isFr ? 'Créateur de Logos 3D Procédural' : 'Procedural 3D Logo Maker'}</a></li>
              <li><a href="/convert/2d-canvas-to-3d-relief">{isFr ? 'Toile 2D vers Relief 3D' : '2D Canvas to 3D Relief'}</a></li>
              <li><a href="/convert/image-to-depth-map">{isFr ? 'Image vers Carte de Profondeur' : 'Image to AI Depth Map'}</a></li>
            </ul>
          </div>

          {/* Column 4: Free Software Alternatives */}
          <div className="seo-footer-col">
            <h4 className="seo-footer-col-title">
              <span className="seo-col-dot" style={{ background: '#8b5cf6' }}></span>
              {isFr ? 'Alternatives Logicielles' : 'Free Alternatives'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/compare/free-alternative-to-hueforge">{isFr ? 'Alternative Gratuite à HueForge' : 'Free Alternative to HueForge'}</a></li>
              <li><a href="/compare/free-alternative-to-bambu-studio-color-painting">{isFr ? 'Alternative Peinture Bambu Studio' : 'Bambu Studio Color Painting Alternative'}</a></li>
              <li><a href="/compare/free-photo-to-3d-relief-sculptok-itslitho-alternative">{isFr ? 'Alternative à SculptOK & ItsLitho' : 'SculptOK & ItsLitho Free Alternative'}</a></li>
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
              {isFr ? 'Studios & Écosystème' : 'Studios & Ecosystem'}
            </h4>
            <ul className="seo-footer-links">
              <li><a href="/apps/filament-painting-studio/">{isFr ? 'Studio Peinture Filament' : 'Filament Painting Studio'}</a></li>
              <li><a href="/apps/multicolor-3mf-painter/">{isFr ? 'Peinture 3MF Multicouleur' : 'MultiColor 3MF Painter'}</a></li>
              <li><a href="/apps/qr-wifi-coaster-generator/">{isFr ? 'Sous-Verres QR & Wi-Fi 3D' : '3D QR Wi-Fi Coaster Studio'}</a></li>
              <li><a href="/apps/new3d4d/">{isFr ? 'New 3D 4D Relief Studio' : 'New 3D 4D Relief Studio'}</a></li>
              <li><a href="/apps/polymorph-3d/">{isFr ? 'PolyMorph 3D Studio' : 'PolyMorph 3D Studio'}</a></li>
              <li><a href="/apps/studio-pro/">{isFr ? 'Studio Pro 4D' : 'Studio Pro 4D'}</a></li>
              <li><a href="/apps/studio-pro-2/">{isFr ? 'Studio Pro 2 (CAD 4D)' : 'Studio Pro 2 (4D CAD)'}</a></li>
              <li><a href="/apps/figure-builder/">{isFr ? '4D Figure Builder PRO' : '4D Figure Builder PRO'}</a></li>
              <li><a href="/apps/scripting-live/">{isFr ? 'Studio Scripting PRO v5' : 'Scripting Studio PRO v5'}</a></li>
              <li><a href="/apps/design-pro-studio/">{isFr ? 'Design Pro Studio 3D' : 'Design Pro Studio 3D'}</a></li>
              <li><a href="/apps/architect-pro-1/">{isFr ? 'Architect Pro 1' : 'Architect Pro 1'}</a></li>
              <li><a href="/apps/architect-pro-2/">{isFr ? 'Architect Pro 2' : 'Architect Pro 2'}</a></li>
              <li><a href="/apps/dfx/">{isFr ? 'DFX Studio Pro (CAD/CNC)' : 'DFX Studio Pro (CAD/CNC)'}</a></li>
              <li><a href="/apps/vector-cnc/">{isFr ? 'Vector CNC Studio' : 'Vector CNC Toolpath Studio'}</a></li>
              <li><a href="/apps/depth-maps/">{isFr ? 'Cartes de Profondeur IA' : 'AI Depth Maps Studio'}</a></li>
              <li><a href="/apps/maker7/">{isFr ? 'Maker Studio 7' : 'Maker Studio 7'}</a></li>
              <li><a href="/apps/jewelry-pro/">{isFr ? 'Jewelry Maker Pro' : 'Jewelry Maker Pro'}</a></li>
              <li><a href="/apps/mech-gen-pro/">{isFr ? 'Mech Gen Pro' : 'Mech Gen Pro'}</a></li>
              <li><a href="/apps/artgen/">{isFr ? 'ArtGen Studio IA' : 'ArtGen AI Studio'}</a></li>
              <li><a href="/apps/music-composer/">{isFr ? '4D Music Composer' : '4D Music Composer'}</a></li>
              <li><a href="/apps/sandbox/">{isFr ? 'Zen Sandscape 4D' : 'Zen Sandscape 4D'}</a></li>
              <li><a href="/apps/aura-gen/">{isFr ? 'Aura AI Studio' : 'Aura AI Studio'}</a></li>
              <li><a href="/blog/">{isFr ? 'Blog & Tutoriels 3D / CNC' : '3D Design Blog & Tutorials'}</a></li>
              <li><a href="/faq.html">{isFr ? 'Questions Fréquentes (FAQ)' : 'Frequently Asked Questions (FAQ)'}</a></li>
              <li><a href="/fr/">{isFr ? 'Version Française (/fr/)' : 'Version Française (/fr/)'}</a></li>
              <li>
                <button type="button" onClick={onOpenPricing} className="seo-footer-btn-link">
                  💎 {isFr ? 'Tarifs & Formule Pro (10 $ / mois)' : 'Pricing & Pro Plan ($10/mo)'}
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

        {/* Bottom Bar: Copyright, Legal, Language, Meta */}
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
            <button type="button" onClick={onOpenRules} className="seo-footer-btn-link" style={{ fontSize: 'inherit' }}>
              {isFr ? 'Règles & Conditions' : 'Site Rules & Terms'}
            </button>
            <a href="/privacy.html">{isFr ? 'Confidentialité' : 'Privacy Policy'}</a>
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
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get('lang');
      if (langParam === 'fr' || langParam === 'en') return langParam;
      const saved = localStorage.getItem('sp_lang');
      if (saved === 'fr' || saved === 'en') return saved;
      if (navigator.language && navigator.language.toLowerCase().startsWith('fr')) return 'fr';
    }
    return 'en';
  });

  // Sync document language attribute and localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sp_lang', lang);
    }
  }, [lang]);
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
  const [isPainterOpen, setIsPainterOpen] = useState(false);
  const [isCoasterOpen, setIsCoasterOpen] = useState(false);
  const [isFilamentPaintingOpen, setIsFilamentPaintingOpen] = useState(false);

  // Category filter, mobile nav & maintenance state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [maintenanceBanner, setMaintenanceBanner] = useState(null);

  const studioCategories = [
    { id: 'all', labelEn: 'All Studios (24)', labelFr: 'Tous les Studios (24)', icon: '✨' },
    { id: '3d-printing', labelEn: '3D Printing & Bambu', labelFr: 'Impression 3D & Bambu', icon: '🖨️' },
    { id: 'cnc-laser', labelEn: 'CNC & Laser CAD', labelFr: 'CNC & Découpe Laser', icon: '⚡' },
    { id: 'cad-arch', labelEn: 'CAD & Architecture', labelFr: 'CAO & Architecture', icon: '📐' },
    { id: 'ai-creative', labelEn: 'AI Art & Creative', labelFr: 'Art IA & Créatif', icon: '🎨' }
  ];

  const isCardVisible = (catId, tags, title) => {
    if (selectedCategory !== 'all' && selectedCategory !== catId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const haystack = (tags + ' ' + (title || '')).toLowerCase();
    return haystack.includes(q);
  };

  const isAnyStudioOpen = Boolean(
    is3DOpen || is3DViewerOpen || isARViewerOpen || isDFXOpen || isRulesOpen || 
    isDepthOpen || isNew3DOpen || isVectorOpen || isStudioProOpen || isMaker7Open || 
    isJewelryOpen || isArchPro1Open || isArchPro2Open || isFigureBuilderOpen || 
    isMusicComposerOpen || isDesignProOpen || isStudioPro2Open || isMechGenProOpen || 
    isScriptingOpen || isSandboxOpen || isArtGenOpen || isPolyMorphOpen || 
    isPainterOpen || isCoasterOpen || isFilamentPaintingOpen
  );

  const closeAllStudios = () => {
    setIs3DOpen(false);
    setIs3DViewerOpen(false);
    setIsARViewerOpen(false);
    setArViewerUrl('');
    window.lastArModelData = null;
    window.lastArModelMeta = null;
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
    setIsPainterOpen(false);
    setIsCoasterOpen(false);
    setIsFilamentPaintingOpen(false);
    setCollabRoomId(null);
    setIsIframeReady(false);
    isIframeReadyRef.current = false;
  };

  // Mobile Back Button Handler (popstate)
  useEffect(() => {
    if (isAnyStudioOpen) {
      window.history.pushState({ studiosProStudioOpen: true }, '');
      const handlePopState = () => {
        closeAllStudios();
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isAnyStudioOpen]);
  const openStudioByRef = (refStr) => {
    if (!refStr) return false;
    const r = String(refStr).toLowerCase().trim();

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'open_studio', { studio_id: r });
    }

    // 1. Studio 3D (ap3d)
    if (['ap3d', '3d', 'studio3d', 'studio-3d', 'ap-3d'].includes(r)) {
      setIs3DOpen(true);
      return true;
    }
    // 2. 3D Viewer (s3dviewer)
    if (['s3dviewer', 'studio-3d-viewer', '3dviewer', 'stl-viewer', 'obj-viewer', 'glb-viewer', 'stl', 'obj', 'glb', 'gltf', 'ply', '3mf'].includes(r)) {
      setIs3DViewerOpen(true);
      return true;
    }
    // 3. WebAR Viewer (arviewer)
    if (['arviewer', 'ar-viewer', 'webar', 'ar'].includes(r)) {
      setIsARViewerOpen(true);
      return true;
    }
    // 4. DFX Studio (dfx)
    if (['dfx', 'dxf', 'studio-dfx', 'dxf-viewer', 'dxf-editor'].includes(r)) {
      setIsDFXOpen(true);
      return true;
    }
    // 5. Rules
    if (['rules', 'regles', 'site-rules'].includes(r)) {
      setIsRulesOpen(true);
      return true;
    }
    // 6. Depth Maps / Heightmaps / Lithophane / Relief (depth)
    if (['depth', 'depth-maps', 'depthmaps', 'lithophane', 'heightmap', 'relief', '2d-to-3d'].includes(r)) {
      setIsDepthOpen(true);
      return true;
    }
    // 7. New 3D/4D (n3d)
    if (['n3d', 'new3d4d', 'new-3d-4d', '3d4d', 'cards', 'pokemon-card-maker', 'custom-3d-card-generator'].includes(r)) {
      setIsNew3DOpen(true);
      return true;
    }
    // 8. Vector CNC / G-Code (vcnc)
    if (['vcnc', 'vector-cnc', 'vector', 'cnc', 'gcode', 'svg-to-gcode', 'dxf-to-gcode', 'svg-to-dxf', 'dxf-to-svg'].includes(r)) {
      setIsVectorOpen(true);
      return true;
    }
    // 9. Studio Pro 4D (spro)
    if (['spro', 'studio-pro', 'studiopro', 'studio-pro-4d'].includes(r)) {
      setIsStudioProOpen(true);
      return true;
    }
    // 10. Maker Studio 7 / Laser Cut Box (mkr7)
    if (['mkr7', 'maker7', 'maker-studio-7', 'maker-studio', 'box-generator', 'laser-cut-box'].includes(r)) {
      setIsMaker7Open(true);
      return true;
    }
    // 11. Jewelry Maker Pro (jwly)
    if (['jwly', 'jewelry-pro', 'jewelry', 'jewelry-maker-pro', 'ring-designer'].includes(r)) {
      setIsJewelryOpen(true);
      return true;
    }
    // 12. Architect Pro 1 (arp1)
    if (['arp1', 'architect-pro-1', 'arch1', 'architect1'].includes(r)) {
      setIsArchPro1Open(true);
      return true;
    }
    // 13. Architect Pro 2 (arp2)
    if (['arp2', 'architect-pro-2', 'arch2', 'architect2'].includes(r)) {
      setIsArchPro2Open(true);
      return true;
    }
    // 14. 4D Figure Builder (figb)
    if (['figb', 'figure-builder', 'figure', '4d-figure-builder'].includes(r)) {
      setIsFigureBuilderOpen(true);
      return true;
    }
    // 15. 4D Music Composer (musc)
    if (['musc', 'music-composer', 'music', '4d-music-composer'].includes(r)) {
      setIsMusicComposerOpen(true);
      return true;
    }
    // 16. Design Pro Studio (desp)
    if (['desp', 'design-pro-studio', 'design-pro', 'designpro'].includes(r)) {
      setIsDesignProOpen(true);
      return true;
    }
    // 17. Studio Pro 2 (spro2)
    if (['spro2', 'studio-pro-2', 'studiopro2', 'studio-pro-2-0'].includes(r)) {
      setIsStudioPro2Open(true);
      return true;
    }
    // 18. Mech Gen Pro / Gears (mechgen)
    if (['mechgen', 'mech-gen-pro', 'gear-generator', 'mech-gen'].includes(r)) {
      setIsMechGenProOpen(true);
      return true;
    }
    // 19. Scripting Studio Live (scripting)
    if (['scripting', 'scripting-live', 'code', 'scripting-studio'].includes(r)) {
      setIsScriptingOpen(true);
      return true;
    }
    // 20. Zen Sandscape (sandbox)
    if (['sandbox', 'zen-sandscape', 'sandscape', 'zen-sand'].includes(r)) {
      setIsSandboxOpen(true);
      return true;
    }
    // 21. ArtGen AI Vector Studio (artgen)
    if (['artgen', 'art-gen', 'ai-art', 'artgen-studio'].includes(r)) {
      setIsArtGenOpen(true);
      return true;
    }
    // 22. PolyMorph 3D Studio (polymorph)
    if (['polymorph', 'poly3d', 'polymorph-3d', 'polymorph-studio'].includes(r)) {
      setIsPolyMorphOpen(true);
      return true;
    }
    // 23. MultiColor 3MF Painter (painter)
    if (['painter', 'multicolor-3mf-painter', '3mfpainter', '3mf-painter', 'multicolor-painter'].includes(r)) {
      setIsPainterOpen(true);
      return true;
    }
    // 24. 3D QR WiFi Coaster (coaster)
    if (['coaster', 'qr-wifi-coaster-generator', 'qrcoaster', 'qr-coaster', 'wifi-coaster'].includes(r)) {
      setIsCoasterOpen(true);
      return true;
    }
    // 25. Filament Painting & Layer-Swap (filament)
    if (['filament', 'filament-painting', 'filament-painting-studio', 'layer-swap', 'hueforge-alternative'].includes(r)) {
      setIsFilamentPaintingOpen(true);
      return true;
    }
    // 26. Standalone AuraGen IDE
    if (['aurg', 'aura-gen', 'aura-ai', 'auragen'].includes(r)) {
      window.location.href = '/apps/aura-gen/index.html';
      return true;
    }
    // 27. Standalone IA Architecte
    if (['iaar', 'ia-architecte', 'ia-arch'].includes(r)) {
      window.location.href = '/apps/ia-architecte/index.html';
      return true;
    }
    return false;
  };

  const [paymentReason, setPaymentReason] = useState('free_limit');
  const [collabRoomId, setCollabRoomId] = useState(null);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);
  const scriptingIframeRef = useRef(null);
  const isIframeReadyRef = useRef(false);
  const collabMessagesRef = useRef([]);
  const arViewerIframeRef = useRef(null);

  const [announcement, setAnnouncement] = useState(null);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);

  // Newsletter popup state
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterDismissed, setNewsletterDismissed] = useState(() => !!localStorage.getItem('nl_dismissed'));

  // Social share copy feedback & embed generator
  const [linkCopied, setLinkCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTab, setShareTab] = useState('social');
  const [embedTool, setEmbedTool] = useState('s3dviewer');
  const [embedCopied, setEmbedCopied] = useState(false);

  const getEmbedSnippet = () => {
    let url = 'https://studios-pro.com/?embed=true';
    if (embedTool === 's3dviewer') url = 'https://studios-pro.com/?embed=true&ref=s3dviewer';
    else if (embedTool === 'filament') url = 'https://studios-pro.com/apps/filament-painting-studio/?embed=true';
    else if (embedTool === 'painter') url = 'https://studios-pro.com/apps/multicolor-3mf-painter/?embed=true';
    else if (embedTool === 'coaster') url = 'https://studios-pro.com/apps/qr-wifi-coaster-generator/?embed=true';
    else if (embedTool === 'polymorph') url = 'https://studios-pro.com/apps/polymorph-3d/?embed=true';
    else if (embedTool === 'ar') url = 'https://studios-pro.com/apps/ar-viewer/?embed=true';
    else if (embedTool === 'depth') url = 'https://studios-pro.com/?embed=true&ref=depth';
    else if (embedTool === 'vcnc') url = 'https://studios-pro.com/?embed=true&ref=vcnc';
    const poweredLabel = lang === 'fr' ? 'Propulsé par Studios-Pro 3D' : 'Powered by Studios-Pro 3D Suite';
    return `<iframe src="${url}" width="100%" height="600" allow="camera; xr-spatial-tracking; fullscreen" style="border:1px solid rgba(255,255,255,0.15); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5);" loading="lazy"></iframe>\n<p style="text-align:center; font-size:12px; margin-top:6px; color:#94a3b8;"><a href="https://studios-pro.com" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:none; font-weight:600;">${poweredLabel}</a></p>`;
  };

  useEffect(() => {
    if (!db) return;
    const fetchSiteBanners = async () => {
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
      try {
        const maintDoc = await getDoc(doc(db, "site_config", "maintenance"));
        if (maintDoc.exists()) {
          setMaintenanceBanner(maintDoc.data());
        }
      } catch (_) {}
    };
    fetchSiteBanners();
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
    const cleanEmail = newsletterEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;
    if (db) {
      try {
        await addDoc(collection(db, 'newsletter'), {
          email: cleanEmail.slice(0, 254),
          lang,
          source: 'popup',
          timestamp: new Date().toISOString()
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

  const handleShareCopy = async () => {
    const shareUrl = lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com';
    const ok = await copyTextSafe(shareUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const isAdmin = Boolean(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL && user.emailVerified);

  const redirectToStripe = async (type, refStudio = null) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user && typeof user.getIdToken === 'function') {
        try {
          const idToken = await user.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
        } catch (_) {}
      }
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceType: type,
          email: user?.email || undefined,
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
  const isARViewerOpenRef = useRef(isARViewerOpen);
  const isPolyMorphOpenRef = useRef(isPolyMorphOpen);
  const isPainterOpenRef = useRef(isPainterOpen);
  const isCoasterOpenRef = useRef(isCoasterOpen);
  const isFilamentPaintingOpenRef = useRef(isFilamentPaintingOpen);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
    premiumRef.current = isPremium;
    adminRef.current = isAdmin;
    creditRef.current = hasExportCredit;
    freeUsedRef.current = freeExportsUsed;
    langRef.current = lang;
    collabRoomIdRef.current = collabRoomId;
    isIframeReadyRef.current = isIframeReady;
    isARViewerOpenRef.current = isARViewerOpen;
    isPolyMorphOpenRef.current = isPolyMorphOpen;
    isPainterOpenRef.current = isPainterOpen;
    isCoasterOpenRef.current = isCoasterOpen;
    isFilamentPaintingOpenRef.current = isFilamentPaintingOpen;
  }, [user, isPremium, isAdmin, hasExportCredit, freeExportsUsed, lang, collabRoomId, isIframeReady, isARViewerOpen, isPolyMorphOpen, isPainterOpen, isCoasterOpen, isFilamentPaintingOpen]);

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
            // Fixed expiry logic: timed subscriptions expire automatically at premiumUntil!
            isUserPremium = isUserCurrentlyPremium(data);
            premiumUntilVal = isUserPremium ? (data.premiumUntil || null) : null;
            hasExportCreditVal = !data.banned && Boolean(data.hasExportCredit);
            cloudFreeExportsUsed = data.freeExportsUsed;
          }

          // Server-side VIP pre-registration migration (supports Lifetime & Timed VIP cleanly!)
          if (!isUserPremium && authUser.emailVerified) {
            try {
              const idToken = await authUser.getIdToken();
              const migRes = await fetch('/.netlify/functions/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ action: 'migrate_vip' }),
              });
              const migData = await migRes.json().catch(() => ({}));
              if (migRes.ok && migData.migrated && migData.isPremium) {
                isUserPremium = true;
                premiumUntilVal = migData.premiumUntil || null;
              }
            } catch (migErr) {
              console.warn('VIP migration notice:', migErr);
            }
          }

          // Apply state variables & merge freeExportsUsed monotonically (never let 0 in a new browser reset cloud usage)
          const localFree = Math.max(0, parseInt(localStorage.getItem('freeExportsUsed'), 10) || 0);
          const cloudFree = typeof cloudFreeExportsUsed === 'number' ? Math.max(0, cloudFreeExportsUsed) : 0;
          const mergedFreeUsed = Math.max(localFree, cloudFree);
          userData.freeExportsUsed = mergedFreeUsed;

          setIsPremium(isUserPremium);
          setPremiumUntil(premiumUntilVal);
          setHasExportCredit(hasExportCreditVal);
          setFreeExportsUsed(mergedFreeUsed);
          localStorage.setItem('freeExportsUsed', String(mergedFreeUsed));

          // Always purge any legacy insecure boolean activation flag
          localStorage.removeItem('pendingPremiumActivation');

          // If a Stripe session was completed while logged out, verify & activate strictly server-side
          const pendingSessionId = localStorage.getItem('pendingStripeSessionId');
          if (pendingSessionId && pendingSessionId.startsWith('cs_') && userData.stripeSessionId !== pendingSessionId) {
            localStorage.removeItem('pendingStripeSessionId');
            try {
              const idToken = await authUser.getIdToken();
              const verifyRes = await fetch('/api/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ sessionId: pendingSessionId })
              });
              const verifyData = await verifyRes.json().catch(() => ({}));
              if (verifyRes.ok && verifyData.verified && verifyData.payment_status === 'paid' && verifyData.mode === 'subscription') {
                setIsPremium(true);
                setPremiumUntil(verifyData.premiumUntil || null);
              }
            } catch (verifyErr) {
              console.error('[Security] Pending Stripe session verification failed:', verifyErr);
            }
          } else if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              email: authUser.email,
              isPremium: false,
              freeExportsUsed: mergedFreeUsed,
              createdAt: new Date().toISOString()
            });
          } else if (mergedFreeUsed > cloudFree) {
            await setDoc(userDocRef, { freeExportsUsed: mergedFreeUsed }, { merge: true });
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

  // Save free exports to localStorage and sync to Cloud when changed (monotonic only)
  useEffect(() => {
    localStorage.setItem('freeExportsUsed', String(freeExportsUsed));
    if (user && db && freeExportsUsed > 0) {
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
      const sessionId = params.get('session_id');
      const ref = params.get('ref');

      // Reject forged or invalid session IDs immediately
      if (!sessionId || !sessionId.startsWith('cs_')) {
        console.warn('[Security] Invalid Stripe checkout session ID rejected:', sessionId);
        window.history.replaceState({}, document.title, window.location.pathname);
        alert(lang === 'fr' 
          ? "Session de paiement invalide. Veuillez réessayer." 
          : "Invalid checkout session. Please try again.");
        return;
      }

      if (!user) {
        localStorage.setItem('pendingStripeSessionId', sessionId);
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsAuthOpen(true);
        return;
      }

      // Authenticated server-side verification & activation against Stripe API
      user.getIdToken().then((idToken) =>
        fetch('/api/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ sessionId })
        })
      )
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.verified && data.payment_status === 'paid' && data.mode === 'subscription') {
          setIsPremium(true);
          setPremiumUntil(data.premiumUntil || null);
          alert(lang === 'fr' 
            ? "Paiement réussi et vérifié ! Votre abonnement Pro est actif." 
            : "Payment verified and successful! Your Pro subscription is active.");

          if (ref) openStudioByRef(ref);
        } else {
          console.error('[Security] Stripe session verification rejected:', data);
          alert(lang === 'fr' 
            ? "Échec de vérification du paiement auprès de Stripe. Aucun montant débité." 
            : "Payment verification failed with Stripe. No charges were confirmed.");
        }
      })
      .catch((err) => {
        console.error('[Security] Network error during payment verification:', err);
        alert(lang === 'fr' 
          ? "Erreur de connexion au serveur de vérification." 
          : "Network error while verifying payment session.");
      })
      .finally(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, [lang, user]);

  useEffect(() => {
    const channel = new BroadcastChannel('studios_pro_channel');
    const recentMsgMap = new Map();

    const handleMessage = (data) => {
      if (!data || typeof data !== 'object' || !data.type) return;
      const now = Date.now();
      for (const [k, ts] of recentMsgMap) {
        if (now - ts > 1500) recentMsgMap.delete(k);
      }
      if (data._msgId) {
        if (recentMsgMap.has(data._msgId)) return;
        recentMsgMap.set(data._msgId, now);
      } else if (
        data.type === 'TRIGGER_PAYMENT_MODAL' ||
        data.type === 'EXPORT_COMPLETED' ||
        data.type === 'START_STRIPE_PAYMENT' ||
        data.type === 'PAYMENT_SUCCESS_INTERNAL'
      ) {
        let dedupKey = data.type;
        try { dedupKey += ':' + JSON.stringify(data.payload || null); } catch (e) {}
        const prevTs = recentMsgMap.get(dedupKey);
        if (prevTs && now - prevTs < 120) return;
        recentMsgMap.set(dedupKey, now);
      }

      const { type, payload } = data;

      if (type === 'TRIGGER_PAYMENT_MODAL') {
        const currentUser = userRef.current;
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
          if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
            window.gtag('event', 'export_model', { used_count: used + 1 });
          }
        } else if (used < 5) {
          // If guest has used 2 initial trials, invite them to sign up to claim their next 3 free exports
          if (!currentUser && used >= 2) {
            setIsAuthOpen(true);
            return;
          }

          // Use one free export credit (5 free exports allowed)
          setFreeExportsUsed(prev => {
            const newVal = prev + 1;
            localStorage.setItem('freeExportsUsed', String(newVal));
            return newVal;
          });
          channel.postMessage({ type: 'EXPORT_ALLOWED', payload: { isPremium: false } });
          if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
            window.gtag('event', 'export_model', { used_count: used + 1 });
          }
          const remaining = 5 - (used + 1);
          if (remaining === 1) {
            alert(langRef.current === 'fr'
              ? 'Export autorisé ! Il vous reste 1 export gratuit.'
              : 'Export granted! You have 1 free export remaining.');
          } else if (remaining === 0) {
            alert(langRef.current === 'fr'
              ? 'Export autorisé ! C’était votre dernier export gratuit.'
              : 'Export granted! That was your last free export.');
          }
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
          redirectToStripe('premium', payload.ref);
        } else {
          redirectToStripe('premium');
        }
      } else if (type === 'EXPORT_COMPLETED') {
        if (creditRef.current && !premiumRef.current && !adminRef.current) {
          setHasExportCredit(false);
          if (user && typeof user.getIdToken === 'function') {
            user.getIdToken().then((idToken) =>
              fetch('/.netlify/functions/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ action: 'consume_export_credit' }),
              })
            ).catch(() => {});
          }
        }
      } else if (type === 'LOAD_EXTERNAL_FILE') {
        channel.postMessage({ type: 'LOAD_EXTERNAL_FILE', payload });
      } else if (type === 'LOAD_EXTERNAL_URL') {
        channel.postMessage({ type: 'LOAD_EXTERNAL_URL', payload });
      } else if (type === 'AR_VIEWER_READY_RECEIVED') {
        // AR Viewer iframe is ready - send pending model if any
        if (window.lastArModelData && arViewerIframeRef.current && arViewerIframeRef.current.contentWindow) {
          const meta = window.lastArModelMeta || {};
          const payloadToSend = {
            name: meta.name || window.lastArModelName || 'studio_pro_model.glb',
            extension: meta.extension || window.lastArModelExt || 'glb',
            data: window.lastArModelData,
            isBinary: meta.isBinary !== undefined ? meta.isBinary : (window.lastArModelIsBinary !== false),
            transferId: meta.transferId || '',
            placement: meta.placement || null,
            dimensionsMm: meta.dimensionsMm || null,
            autoScale: meta.autoScale || null,
            sourceStudio: meta.sourceStudio || ''
          };
          window.lastArModelData = null;
          window.lastArModelMeta = null;
          try {
            arViewerIframeRef.current.contentWindow.postMessage({
              type: 'LOAD_EXTERNAL_FILE',
              payload: payloadToSend
            }, '*');
            console.log('[App] Sent pending model to AR Viewer after ready signal');
          } catch (e) {}
        }
      } else if (type === 'OPEN_AR_VIEWER') {
        const cleanUrl = (payload && payload.url && payload.url !== 'broadcast') ? payload.url : '';
        setArViewerUrl(cleanUrl);
        if (payload && payload.modelData) {
          const isObjText = typeof payload.modelData === 'string' && (payload.modelData.trim().startsWith('#') || payload.modelData.trim().startsWith('o ') || payload.modelData.trim().startsWith('v ') || payload.modelData.includes('\nv '));
          const resolvedExt = payload.extension || (isObjText ? 'obj' : 'glb');
          const resolvedName = payload.name || (isObjText ? 'studio_pro_model.obj' : 'studio_pro_model.glb');
          const resolvedBinary = isObjText ? false : (payload.isBinary !== false);
          const resolvedTransferId = payload.transferId || ('ar_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
          const meta = {
            transferId: resolvedTransferId,
            name: resolvedName,
            extension: resolvedExt,
            isBinary: resolvedBinary,
            placement: payload.placement || null,
            dimensionsMm: payload.dimensionsMm || null,
            autoScale: payload.autoScale || null,
            sourceStudio: payload.sourceStudio || ''
          };
          window.lastArModelData = payload.modelData;
          window.lastArModelName = resolvedName;
          window.lastArModelExt = resolvedExt;
          window.lastArModelIsBinary = resolvedBinary;
          window.lastArModelMeta = meta;
          setIsARViewerOpen(true);
          if (arViewerIframeRef.current && arViewerIframeRef.current.contentWindow) {
            try {
              arViewerIframeRef.current.contentWindow.postMessage({
                type: 'LOAD_EXTERNAL_FILE',
                payload: { ...meta, data: payload.modelData }
              }, '*');
            } catch (e) {
              console.warn('[App] Forward to ar-viewer error:', e);
            }
          }
        } else {
          setIsARViewerOpen(true);
        }
      } else if (type === 'CLOSE_AR_VIEWER') {
        setIsARViewerOpen(false);
        setArViewerUrl('');
        window.lastArModelData = null;
        window.lastArModelMeta = null;
      } else if (type === 'OPEN_PRICING') {
        setPaymentReason('premium_feature');
        setShowPaymentRequest(true);
      } else if (type === 'CLOSE_STUDIO') {
        if (isARViewerOpenRef.current) {
          setIsARViewerOpen(false);
          setArViewerUrl('');
          window.lastArModelData = null;
          window.lastArModelMeta = null;
          return;
        }
        window.lastArModelData = null;
        window.lastArModelMeta = null;
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
        setIsPainterOpen(false);
        setIsCoasterOpen(false);
        setIsFilamentPaintingOpen(false);
        setCollabRoomId(null);
        setIsIframeReady(false);
        isIframeReadyRef.current = false;
        collabMessagesRef.current = [];
        // Reset URL parameters when closing
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (type === 'CREATE_COLLAB_ROOM') {
        const roomId = payload && typeof payload.roomId === 'string' && SAFE_ROOM_RE.test(payload.roomId) ? payload.roomId : '';
        if (roomId) {
          setCollabRoomId(roomId);
          window.history.replaceState({}, document.title, `?ref=scripting&room=${encodeURIComponent(roomId)}`);
        }
      } else if (type === 'COLLAB_MSG') {
        if (db && userRef.current && collabRoomIdRef.current && SAFE_ROOM_RE.test(collabRoomIdRef.current)) {
          addDoc(collection(db, "scripting_rooms", collabRoomIdRef.current, "messages"), {
            userId: String(payload?.userId || '').slice(0, 32),
            uid: userRef.current.uid,
            type: payload?.type === 'CHAT' ? 'CHAT' : 'CODE_SYNC',
            ...(payload?.code ? { code: String(payload.code).slice(0, 40000) } : {}),
            ...(payload?.text ? { text: String(payload.text).slice(0, 1000) } : {}),
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
            }, window.location.origin);
          });
        }
      } else if (type === 'PAYMENT_SUCCESS_INTERNAL') {
        if (userRef.current && db) {
          getDoc(doc(db, "users", userRef.current.uid))
            .then((snap) => {
              if (snap.exists()) {
                const d = snap.data();
                const isPremNow = isUserCurrentlyPremium(d);
                if (isPremNow) {
                  setIsPremium(true);
                  setPremiumUntil(d.premiumUntil || null);
                  channel.postMessage({ type: 'EXPORT_ALLOWED', payload: { isPremium: true } });
                }
              }
            })
            .catch(() => {});
        }
      }
    };

    channel.onmessage = (event) => handleMessage(event.data);

    const windowListener = (event) => {
      if (event.origin !== window.location.origin) return;
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

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('studios_pro_channel');
      channel.postMessage({
        type: 'USER_STATUS_CHANGED',
        payload: {
          isPremium: isPremium || isAdmin,
          userEmail: user ? user.email : 'Guest'
        }
      });
      channel.close();
    } catch (e) {}
  }, [user, isPremium, isAdmin]);

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
      openStudioByRef(ref);
    }
    if (room && SAFE_ROOM_RE.test(room)) {
      setIsScriptingOpen(true);
      setCollabRoomId(room);
    }
  }, []);

  // Real-time Firestore collaboration sync
  useEffect(() => {
    if (!db || !collabRoomId || !SAFE_ROOM_RE.test(collabRoomId) || !user) return;

    collabMessagesRef.current = [];
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
          const exists = collabMessagesRef.current.some(m => m.timestamp === msgData.timestamp && m.userId === msgData.userId && m.type === msgData.type);
          if (!exists) {
            collabMessagesRef.current.push(msgData);
          }
          if (isIframeReadyRef.current && scriptingIframeRef.current && scriptingIframeRef.current.contentWindow) {
            scriptingIframeRef.current.contentWindow.postMessage({
              type: 'COLLAB_MSG',
              payload: msgData
            }, window.location.origin);
          }
        }
      });
    }, () => {});

    return () => unsubscribeCollab();
  }, [collabRoomId, user]);

  const handlePayForExport = () => {
    // Single export payment $2
    redirectToStripe('single');
  };

  const t = {
    fr: {
      // ... existing translations ...
      welcome: "Bienvenue sur Studios-Pro",
      heroTagline: "Studio 3D Gratuit en Ligne, 3MF Multicouleur & WebAR",
      subtitle: "Suite Créative pour Impression 3D, Découpe Laser & Relief CNC",
      message: "Colorisez vos modèles 3MF pour Bambu AMS, créez des tableaux de filaments style HueForge, générez des sous-verres QR scannables et projetez vos modèles en réalité augmentée. Confidentialité 100 % locale dans votre navigateur.",
      app3d: "Studio 3D",
      app3dViewer: "Studio 3D Viewer",
      appARViewer: "AR Viewer",
      appdfx: "Studio DFX",
      rules: "Règles du site",
      login: "Connexion",
      logout: "Déconnexion",
      getPremium: "Devenir Pro",
      premiumActive: "Pro Actif",
      premiumDesc: "Accès illimité — 10 $ / mois",
      payRequest: "Abonnement requis pour l'export",
      payMessage: "Passez à la formule Pro pour exporter en illimité dans tous nos studios.",
      payBtn: "Passer à Pro",
      cancel: "Annuler",
      contact: "Contact",
      blogBtn: "Tutoriels",
      freeLimitTitle: "Vos 5 exports gratuits sont utilisés",
      freeLimitMsg: "Vous avez profité de vos 5 exports gratuits ! Passez à la formule Pro pour continuer à exporter en illimité.",
      loginNow: "Se connecter / S'inscrire",
      unlimitedTitle: "Illimité",
      unlimitedPrice: "10 $ / mois",
      daysLeft: "jours restants",
      oneDayLeft: "jour restant",
      expired: "Expiré",
      manageSubscription: "Gérer",
      depthMaps: "Cartes de Profondeur IA",
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
      multicolor3mfPainter: "Peinture 3MF Multicouleur",
      qrWifiCoaster: "Sous-Verres QR & Wi-Fi 3D",
      filamentPaintingStudio: "Peinture Filament & Layer-Swap",
      faqBtn: "FAQ",
      communityBtn: "Communauté"
    },
    en: {
      welcome: "Welcome to Studios-Pro",
      heroTagline: "Free In-Browser 3D, Multi-Color 3MF & WebAR Studio",
      subtitle: "Professional 3D Printing, Laser CAD & CNC Relief Suite",
      message: "Colorize 3MF models for Bambu AMS, create HueForge-style filament art, generate scannable 3D QR coasters, and project 3D models in WebAR. 100% client-side privacy, zero installation.",
      app3d: "3D Studio",
      app3dViewer: "Studio 3D Viewer",
      appARViewer: "AR Viewer",
      appdfx: "DFX Studio",
      rules: "Site Rules",
      login: "Login",
      logout: "Logout",
      getPremium: "Go Pro",
      premiumActive: "Pro Active",
      premiumDesc: "Unlimited access — $10/mo",
      payRequest: "Pro plan required for export",
      payMessage: "Upgrade to Studios-Pro Unlimited for unrestricted exports across all 24+ studios.",
      payBtn: "Upgrade to Pro",
      cancel: "Cancel",
      contact: "Contact",
      blogBtn: "Tutorials",
      freeLimitTitle: "All 5 free exports used",
      freeLimitMsg: "You've used your 5 free exports! Upgrade to Pro for unlimited exports across all 24+ studios.",
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
      multicolor3mfPainter: "Studio MultiColor 3MF Painter",
      qrWifiCoaster: "3D QR & Wi-Fi Coaster Studio",
      filamentPaintingStudio: "Filament Painting & Layer-Swap Studio",
      faqBtn: "FAQ",
      communityBtn: "Community"
    }
  };

  const currentT = t[lang];

  return (
    <div className={`main-container ${(is3DOpen || is3DViewerOpen || isARViewerOpen || isDFXOpen || isRulesOpen || isDepthOpen || isNew3DOpen || isVectorOpen || isStudioProOpen || isMaker7Open || isJewelryOpen || isArchPro1Open || isArchPro2Open || isFigureBuilderOpen || isMusicComposerOpen || isDesignProOpen || isStudioPro2Open || isMechGenProOpen || isScriptingOpen || isSandboxOpen || isArtGenOpen || isPolyMorphOpen || isPainterOpen || isCoasterOpen || isFilamentPaintingOpen) ? 'studio-active' : ''} ${isAnnouncementVisible ? 'has-announcement' : ''}`}>
      {!isEmbed && maintenanceBanner && maintenanceBanner.enabled && !isAdmin && (
        <div className="maintenance-banner" role="alert">
          <span>🚧 {lang === 'fr' ? maintenanceBanner.messageFr : maintenanceBanner.messageEn}</span>
        </div>
      )}
      {!isEmbed && isAnnouncementVisible && announcement && (
        <div className="announcement-banner">
          <span className="announcement-text">
            {lang === 'fr' ? announcement.textFr : announcement.textEn}
          </span>
          <button 
            type="button"
            aria-label={lang === 'fr' ? 'Fermer l’annonce' : 'Dismiss announcement'}
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
      {/* Pricing / Freemium Modal */}
      <AnimatePresence>
        {showPaymentRequest && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentRequest(false); }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div className="auth-modal pricing-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ maxWidth: '680px' }}>
              <button type="button" className="close-btn" aria-label={lang === 'fr' ? 'Fermer' : 'Close'} onClick={() => setShowPaymentRequest(false)}><X size={20} /></button>

              <div className="pricing-icon">
                <Sparkles size={44} color="#f59e0b" />
              </div>

              <h2>
                {paymentReason === 'premium_feature' 
                  ? (lang === 'fr' ? "Abonnement Pro Requis" : "Pro Subscription Required") 
                  : paymentReason === 'pricing_overview'
                  ? (lang === 'fr' ? "Tarifs & Formules Studios-Pro" : "Studios-Pro Pricing & Plans")
                  : currentT.freeLimitTitle}
              </h2>
              <p className="payment-desc">
                {paymentReason === 'premium_feature' 
                  ? (lang === 'fr' ? "Cette fonctionnalité est réservée aux membres Pro. Débloquez l'accès illimité dans tous nos 24+ studios !" : "This feature is reserved for Pro members. Unlock unlimited access across all 24+ studios!") 
                  : paymentReason === 'pricing_overview'
                  ? (lang === 'fr' ? "Exports haute résolution illimités, parcours d'outils CNC et licence commerciale directe." : "Unlimited high-resolution exports, CNC toolpaths, and full commercial license.")
                  : currentT.freeLimitMsg}
              </p>

              <div className="pricing-grid">
                {/* Free Plan Card */}
                <div className="pricing-card">
                  <h3>{lang === 'fr' ? "Formule Gratuite" : "Free Plan"}</h3>
                  <div className="pricing-price">{lang === 'fr' ? '0 $' : '$0'}</div>
                  <div className="pricing-desc">{lang === 'fr' ? "5 exports inclus pour démarrer" : "5 free exports included to start"}</div>
                  <ul className="pricing-features-list">
                    <li><Check size={16} /> <span>{lang === 'fr' ? "5 exports complets offerts (STL, OBJ, 3MF, GLB, DXF, G-Code)" : "5 full free exports (STL, OBJ, 3MF, GLB, DXF, G-Code)"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Accès direct aux 24+ studios 3D et CAO" : "Direct access to all 24+ 3D and CAD studios"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Visualisation 3D & projection AR sur mobile" : "3D viewing & mobile AR projection"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Sans carte bancaire ni engagement" : "No credit card, no commitment"}</span></li>
                  </ul>
                  <button type="button" className="pricing-select single" onClick={() => setShowPaymentRequest(false)}>
                    {lang === 'fr' ? "Commencer gratuitement" : "Start for Free"}
                  </button>
                </div>

                {/* Unlimited Pro Card */}
                <div className="pricing-card featured">
                  <div className="best-value">{lang === 'fr' ? 'MEILLEUR CHOIX' : 'BEST VALUE'}</div>
                  <h3>{lang === 'fr' ? "Accès Pro Illimité" : "Unlimited Pro Access"}</h3>
                  <div className="pricing-price">
                    {lang === 'fr' ? '10 $' : '$10'}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {lang === 'fr' ? 'mois' : 'mo'}</span>
                  </div>
                  <div className="pricing-desc">{lang === 'fr' ? "Exports illimités pour créateurs et makers" : "Unlimited exports for creators & makers"}</div>
                  <ul className="pricing-features-list">
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Exports 100 % illimités (STL, OBJ, 3MF, GLB, DXF, G-Code)" : "100% Unlimited exports (STL, OBJ, 3MF, GLB, DXF, G-Code)"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Reliefs 3D IA & cartes de profondeur HD" : "AI 3D reliefs & HD depth maps"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Licence commerciale complète incluse" : "Full commercial license included"}</span></li>
                    <li><Check size={16} /> <span>{lang === 'fr' ? "Exports HTML autonomes sans filigrane" : "Standalone HTML exports without watermark"}</span></li>
                  </ul>
                  <button type="button" className="pricing-select premium" onClick={() => redirectToStripe('premium')}>
                    {lang === 'fr' ? "Passer à Pro (10 $ / mois)" : "Upgrade to Pro ($10/mo)"}
                  </button>
                </div>
              </div>

              {!user && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>{lang === 'fr' ? "Vous avez déjà un compte ?" : "Already have an account?"}</span>
                  <button
                    type="button"
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
        <nav className="nav-bar" aria-label={lang === 'fr' ? 'Navigation principale' : 'Primary Navigation'}>
          <div className={`nav-left ${isMobileNavOpen ? 'mobile-open' : ''}`}>
            <div className="lang-toggle" role="group" aria-label={lang === 'fr' ? 'Choisir la langue' : 'Select language'}>
              <button type="button" aria-label="Français" aria-pressed={lang === 'fr'} className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>FR</button>
              <button type="button" aria-label="English" aria-pressed={lang === 'en'} className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            </div>
            <button type="button" className="contact-btn-nav" onClick={() => { setIsMobileNavOpen(false); setIsContactOpen(true); }}>
              <MessageSquare size={16} />
              <span>{currentT.contact}</span>
            </button>
            <a href="/blog/" className="contact-btn-nav">
              <BookOpen size={16} />
              <span>{currentT.blogBtn}</span>
            </a>
            <a href="/faq.html" className="contact-btn-nav">
              <HelpCircle size={16} />
              <span>{currentT.faqBtn}</span>
            </a>
            <button
              type="button"
              className="contact-btn-nav"
              onClick={() => { setIsMobileNavOpen(false); setIsRulesOpen(true); }}
              title={currentT.rules}
            >
              <ShieldCheck size={16} />
              <span>{currentT.rules}</span>
            </button>
            <button
              type="button"
              className="contact-btn-nav share-btn-nav"
              onClick={() => { setIsMobileNavOpen(false); setIsShareModalOpen(true); }}
              title={lang === 'fr' ? 'Partager Studios-Pro' : 'Share Studios-Pro'}
            >
              <Share2 size={16} />
              <span>{lang === 'fr' ? 'Partager' : 'Share'}</span>
            </button>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={lang === 'fr' ? 'Menu navigation' : 'Toggle menu'}
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
            >
              {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {!isPremium && (
              <button
                type="button"
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
                    <CreditCard size={16} />
                    <span>{currentT.premiumActive}</span>
                  </div>
                )}
                {isPremium && premiumUntil && (
                  <div className="premium-status-info" style={{ display: 'flex', flexDirection: 'column', padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.85, color: '#10b981', fontWeight: 'bold' }}>
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
                    <button type="button" className="admin-nav-btn" onClick={() => setIsAdminOpen(true)} title="Admin Command Center">
                      <Settings size={16} />
                      <span>Admin</span>
                    </button>
                  )}
                  <div className="user-icon"><User size={18} /></div>
                  <span className="user-email">{user.email}</span>
                  <button type="button" className="logout-btn" aria-label={currentT.logout} onClick={() => signOut(auth)} title={currentT.logout}><LogOut size={16} /></button>
                </div>
              </div>
            ) : (
              <button type="button" className="login-btn-nav" onClick={() => setIsAuthOpen(true)}>
                <User size={16} />
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
            Studios-Pro
            <span style={{
              display: 'block',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginTop: '10px',
              letterSpacing: '0.5px',
              background: 'linear-gradient(135deg, #00f3ff, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {currentT.heroTagline || "Free In-Browser 3D, WebAR & CNC Creative Hub"}
            </span>
          </motion.h1>

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
                ? `${currentT.premiumActive} — ${currentT.unlimitedTitle}` 
                : (lang === 'fr' ? '5 Exports Gratuits Inclus — Puis 10 $ / mois en Illimité' : '5 Free Exports Included — Then $10/mo for Unlimited')}
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
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(lang === 'fr' ? 'Découvrez Studios-Pro — 24+ studios gratuits de 3D, 3MF, WebAR, Laser & CNC dans votre navigateur !' : 'Check out Studios-Pro — 24+ free 3D, 3MF, WebAR, Laser & CNC studios right in your browser!')}&url=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-btn-twitter"
            >
              𝕏 Twitter
            </a>
            <a
              id="share-linkedin"
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-btn-linkedin"
            >
              in LinkedIn
            </a>
            <button
              type="button"
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

        {/* Studio Categories & Real-Time Search */}
        <div className="studios-filter-section" style={{
          maxWidth: '1200px',
          margin: '25px auto 20px auto',
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Category Tabs */}
          <div className="category-pill-row" style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px'
          }}>
            {studioCategories.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '24px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    border: active ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(15, 23, 42, 0.6)',
                    color: active ? '#ffffff' : '#94a3b8',
                    boxShadow: active ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{lang === 'fr' ? cat.labelFr : cat.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="search-bar-wrapper" style={{
            position: 'relative',
            width: '100%',
            maxWidth: '520px'
          }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'fr' 
                ? "Rechercher un studio (ex: 3MF, HueForge, lithophanie, DXF)..." 
                : "Search studios (e.g. 3MF, HueForge, lithophane, DXF)..."}
              style={{
                width: '100%',
                padding: '11px 40px 11px 44px',
                borderRadius: '30px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(12px)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

      <div className="compartments-grid">
        {/* 1. Filament Painting Studio • HueForge Alternative */}
        {isCardVisible('3d-printing', 'hueforge filament painting layer swap 3mf bambu ams color optical td peinture couche couleur impression imprimante', currentT.filamentPaintingStudio) && (
        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsFilamentPaintingOpen(true)}
          style={{ position: 'relative' }}
        >
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '0.8px',
            padding: '4px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {lang === 'fr' ? 'NOUVEAU • ALTERNATIVE HUEFORGE' : 'NEW • HUEFORGE ALTERNATIVE'}
          </div>
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8, #818cf8)' }} />
            <Layers size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Filament Painting & Layer-Swap Studio Icon" />
          </div>
          <div className="card-label">{currentT.filamentPaintingStudio}</div>
        </motion.div>
        )}

        
        {/* 2. MultiColor 3MF Painter */}
        {isCardVisible('3d-printing', 'multicolor 3mf painter bambu ams orcaslicer prusa mmu colorize stl multicouleur peinture couleur colorier', currentT.multicolor3mfPainter) && (
        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsPainterOpen(true)}
          style={{ position: 'relative' }}
        >
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '0.8px',
            padding: '4px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {lang === 'fr' ? 'BAMBU AMS & ORCASLICER' : 'BAMBU AMS & ORCASLICER'}
          </div>
          <div className="shape-wrapper">
            <div className="shape-1" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)' }} />
            <Paintbrush size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Studio MultiColor 3MF Painter Icon" />
          </div>
          <div className="card-label">{currentT.multicolor3mfPainter}</div>
        </motion.div>
        )}

        
        {/* 3. 3D QR WiFi Coaster & Sign Generator */}
        {isCardVisible('3d-printing', 'qr code wifi coaster table stand 3mf stl scannable laser dxf sous-verre sous verre pancarte plaque', currentT.qrWifiCoaster) && (
        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsCoasterOpen(true)}
          style={{ position: 'relative' }}
        >
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '0.8px',
            padding: '4px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {lang === 'fr' ? '3MF & STL IMPRIMABLE' : '3MF & STL PRINTABLE'}
          </div>
          <div className="shape-wrapper">
            <div className="shape-2" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4, #3b82f6)' }} />
            <QrCode size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="Studio 3D-QR-WiFi-Coaster Generator Icon" />
          </div>
          <div className="card-label">{currentT.qrWifiCoaster}</div>
        </motion.div>
        )}

        
        {/* 4. New 3D 4D Bas-Relief & Lithophane Studio */}
        {isCardVisible('3d-printing', 'photo to 3d lithophane lithophanie bas relief bas-relief coin medal piece medaille stl obj glb 4d sculpture', currentT.new3d4d) && (
        <motion.div
          className="compartment-card"
          whileHover={{ y: -15, scale: 1.02 }}
          onClick={() => setIsNew3DOpen(true)}
          style={{ position: 'relative' }}
        >
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '0.8px',
            padding: '4px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {lang === 'fr' ? 'PHOTO VERS 3D & 4D' : 'PHOTO TO 3D & 4D'}
          </div>
          <div className="shape-wrapper">
            <div className="shape-5" />
            <Component size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} aria-label="New 3D Icon" />
          </div>
          <div className="card-label">{currentT.new3d4d}</div>
        </motion.div>
        )}

        
        {/* 5. AR Viewer 3D */}
        {isCardVisible('3d-printing', 'ar webar augmented reality realite augmentee viewer visualiseur mobile 3d model sceneviewer quicklook', currentT.appARViewer) && (
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
        )}

        
        {/* 6. PolyMorph 3D Studio */}
        {isCardVisible('3d-printing', 'polymorph 3d converter voronoi cryptex watch movement flexi stl obj glb', currentT.polymorph3d) && (
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
        )}

        
        {/* 7. AI Depth Maps */}
        {isCardVisible('cnc-laser', 'depth map heightmap ai 2d to 3d relief grayscale cnc laser', currentT.depthMaps) && (
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
        )}

        
        {/* 8. Vector CNC Studio */}
        {isCardVisible('cnc-laser', 'vector cnc gcode dxf svg toolpath laser router simulator', currentT.vectorCnc) && (
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
        )}

        
        {/* 9. Studio 3D Viewer */}
        {isCardVisible('3d-printing', '3d viewer stl obj glb gltf 3mf ply inspection measurement', currentT.app3dViewer) && (
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
        )}

        
        {/* 10. Studio 3D */}
        {isCardVisible('cad-arch', 'studio 3d lithophane lithophanie lampe lamp coeur heart lune moon procedural modeling mesh editor cad cao', currentT.app3d) && (
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
        )}

        
        {/* 11. Jewelry Maker Pro */}
        {isCardVisible('cad-arch', 'jewelry maker ring bague bijoux joaillerie diamant designer gem setting cad cao 3d print', currentT.jewelry) && (
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
        )}

        
        {/* 12. Maker Studio 7 */}
        {isCardVisible('3d-printing', 'maker studio 7 parametric box boite boites lithophane lithophanie pbr texture stl laser', currentT.maker7) && (
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
        )}

        
        {/* 13. Mech Gen Pro */}
        {isCardVisible('cnc-laser', 'mech gen gear engrenage engrenages pignon mecanique generator sprocket procedural dxf svg laser cnc', currentT.mechGenPro) && (
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
        )}

        
        {/* 14. ArtGen AI Vector Studio */}
        {isCardVisible('ai-creative', 'artgen ai vector logo generator 3d relief stl obj glb styles', currentT.artGenStudio) && (
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
        )}

        
        {/* 15. Studio Pro 4D */}
        {isCardVisible('cad-arch', 'studio pro 4d procedural cad generative', currentT.studioPro) && (
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
        )}

        
        {/* 16. Studio Pro 2 */}
        {isCardVisible('cad-arch', 'studio pro 2 advanced cad generative modeling', currentT.studioPro2) && (
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
        )}

        
        {/* 17. Studio DFX */}
        {isCardVisible('cnc-laser', 'dfx dxf 2d cad vector drawings laser cnc drafting', currentT.appdfx) && (
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
        )}

        
        {/* 18. Architect Pro 1 */}
        {isCardVisible('cad-arch', 'architect pro 1 floor plan maison piece interieur 2d drafting 3d interior room layout architecture', currentT.archPro1) && (
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
        )}

        
        {/* 19. Architect Pro 2 */}
        {isCardVisible('cad-arch', 'architect pro 2 structural cad 3d architectural building', currentT.archPro2) && (
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
        )}

        
        {/* 20. 4D Figure Builder */}
        {isCardVisible('cad-arch', 'figure builder photo 4d sculpture tesseract hypercube character posing mannequin 3d anatomy', currentT.figureBuilder) && (
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
        )}

        
        {/* 21. 4D Music Composer */}
        {isCardVisible('ai-creative', 'music musique audio daw chanson composer synthesizer visualizer beats 4d', currentT.musicComposer) && (
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
        )}

        
        {/* 22. Design Pro Studio */}
        {isCardVisible('ai-creative', 'design pro interior interieur maison meuble architecture 3d cad cao layout', currentT.designPro) && (
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
        )}

        
        {/* 23. Scripting Studio */}
        {isCardVisible('ai-creative', 'scripting code javascript cad cao ai editor live webgl 3d generator', currentT.scriptingStudio) && (
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
        )}

        
        {/* 24. Zen Sandscape */}
        {isCardVisible('ai-creative', 'zen sandscape sable sand photo art generative mandala patterns relaxing simulation', currentT.sandbox) && (
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
        )}
      </div>

      {/* Why Creators Choose Studios-Pro Section */}
      <motion.section
        className="testimonials-section"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        aria-label="Features and Capabilities"
      >
        <h2 className="testimonials-title">
          {lang === 'fr' ? '⚡ Pourquoi Choisir Studios-Pro ?' : '⚡ Why Makers & Creators Choose Studios-Pro'}
        </h2>
        <div className="testimonials-grid">
          {[
            {
              icon: '🔒',
              color: '#3b82f6',
              titleEn: '100% Client-Side Privacy',
              titleFr: '100% Confidentialité Locale',
              descEn: 'All mesh generation, 3D tessellation, and slicing algorithms execute locally in your web browser. Your private design files never leave your computer.',
              descFr: 'Tous les calculs de maillage 3D et d\'extrusion s\'exécutent localement via WebGL et WebAssembly. Vos fichiers restent strictement privés sur votre appareil.'
            },
            {
              icon: '⚡',
              color: '#10b981',
              titleEn: 'Zero Installation Required',
              titleFr: 'Zéro Installation Requise',
              descEn: 'Instant access from Chrome, Safari, Edge, or Firefox across Windows, macOS, iPad, Chromebook, and Linux. No heavy software to install or configure.',
              descFr: 'Accès direct depuis tout navigateur moderne sur Windows, Mac, iPad et Linux. Aucun logiciel lourd à télécharger ni configurer.'
            },
            {
              icon: '🖨️',
              color: '#ec4899',
              titleEn: 'Bambu Lab & Prusa MMU Ready',
              titleFr: 'Prêt pour Bambu AMS & Prusa MMU',
              descEn: 'Multi-Color 3MF Painter with smart angle fill, Beer-Lambert layer-swap filament simulation, and 1-click 3MF project exports for OrcaSlicer.',
              descFr: 'Peinture 3MF multicouleur intelligente, simulation optique de filament Beer-Lambert et export 3MF direct prêt à imprimer pour Bambu Studio et OrcaSlicer.'
            },
            {
              icon: '📱',
              color: '#06b6d4',
              titleEn: 'Instant WebAR Mobile Projection',
              titleFr: 'Projection WebAR Mobile Instantanée',
              descEn: 'Project your STL, OBJ, and GLB creations directly into your room at true 1:1 scale using your phone camera and QR code transfer, with no external apps.',
              descFr: 'Projetez vos modèles 3D dans votre pièce à l\'échelle réelle 1:1 grâce au QR code et à WebXR/SceneViewer natif sans installer d\'application tierce.'
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              className="testimonial-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: '0 0 10px 0', fontWeight: '700' }}>
                {lang === 'fr' ? item.titleFr : item.titleEn}
              </h3>
              <p className="testimonial-text" style={{ fontStyle: 'normal', fontSize: '0.95rem' }}>
                {lang === 'fr' ? item.descFr : item.descEn}
              </p>
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
          onOpenRules={() => setIsRulesOpen(true)}
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
            onClick={(e) => { if (e.target === e.currentTarget) handleNewsletterDismiss(); }}
          >
            <motion.div
              className="newsletter-modal"
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 40 }}
            >
              <button type="button" className="close-btn" aria-label={lang === 'fr' ? 'Fermer' : 'Close'} onClick={handleNewsletterDismiss}><X size={20} /></button>
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
                    {lang === 'fr' ? 'Nouveaux studios & astuces 3D' : 'New 3D studios & maker tips'}
                  </h3>
                  <p className="newsletter-desc">
                    {lang === 'fr'
                      ? 'Recevez nos nouveaux outils 3D/AR, tutoriels Bambu AMS & CNC et offres réservées aux membres.'
                      : 'Get notified about new 3D/WebAR studios, Bambu AMS & CNC guides, and exclusive member offers.'}
                  </p>
                  <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
                    <input
                      id="newsletter-email-input"
                      type="email"
                      className="newsletter-input"
                      placeholder={lang === 'fr' ? 'Votre adresse e-mail...' : 'Your email address...'}
                      value={newsletterEmail}
                      onChange={e => setNewsletterEmail(e.target.value)}
                      maxLength={254}
                      required
                    />
                    <button type="submit" className="newsletter-submit">
                      {lang === 'fr' ? 'S\'inscrire' : 'Subscribe'}
                    </button>
                  </form>
                  <p className="newsletter-privacy">
                    {lang === 'fr' ? '🔒 Pas de spam. Désinscription à tout moment.' : '🔒 No spam. Unsubscribe anytime.'}
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
        {isAdminOpen && isAdmin && (
          <AdminCommandCenter
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            lang={lang}
            user={user}
            isAdmin={isAdmin}
            onAnnouncementSaved={(next) => {
              setAnnouncement(next);
              setIsAnnouncementVisible(!!next.active);
            }}
            onMaintenanceSaved={(next) => setMaintenanceBanner(next)}
          />
        )}
        {isShareModalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShareModalOpen(false)} role="dialog" aria-modal="true">
            <motion.div className="auth-modal share-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
              <button type="button" className="close-btn" aria-label={lang === 'fr' ? 'Fermer' : 'Close'} onClick={() => setIsShareModalOpen(false)}><X size={20} /></button>
              
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7, #06b6d4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <Share2 size={22} color="#ffffff" />
                </div>
                <h2 style={{ fontSize: '1.2rem', margin: '0 0 6px', color: '#ffffff' }}>
                  {lang === 'fr' ? "Partager Studios-Pro" : "Share Studios-Pro"}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  {lang === 'fr' 
                    ? "Recommandez Studios-Pro à vos collègues, makers et créateurs 3D !" 
                    : "Share Studios-Pro with fellow makers, designers & 3D creators!"}
                </p>
              </div>

              <div className="share-tabs">
                <button 
                  type="button" 
                  className={`share-tab-btn ${shareTab === 'social' ? 'active' : ''}`}
                  onClick={() => setShareTab('social')}
                >
                  <Share2 size={15} />
                  <span>{lang === 'fr' ? 'Réseaux & Amis' : 'Social & Friends'}</span>
                </button>
                <button 
                  type="button" 
                  className={`share-tab-btn ${shareTab === 'embed' ? 'active' : ''}`}
                  onClick={() => setShareTab('embed')}
                >
                  <Code size={15} />
                  <span>{lang === 'fr' ? 'Intégrer sur un site' : 'Embed on Website'}</span>
                </button>
              </div>

              {shareTab === 'social' ? (
                <>
                  <div className="share-buttons-grid">
                    <a 
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(lang === 'fr' ? 'Découvre Studios-Pro : 24+ studios gratuits de création 3D, Réalité Augmentée, Lithophanie et CNC directement en ligne : https://studios-pro.com/fr/' : 'Check out Studios-Pro: 24+ free 3D, WebAR, Lithophane & CNC maker studios right in your browser! https://studios-pro.com')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="share-channel-btn whatsapp"
                    >
                      <span className="share-icon">💬</span>
                      <span>WhatsApp</span>
                    </a>

                    <a 
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}&text=${encodeURIComponent(lang === 'fr' ? 'Studios-Pro : 24+ studios gratuits de 3D, Réalité Augmentée, Laser et CNC directement dans votre navigateur !' : 'Studios-Pro: 24+ free 3D, WebAR, Laser & CNC creative studios in your browser!')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="share-channel-btn twitter"
                    >
                      <span className="share-icon">𝕏</span>
                      <span>X / Twitter</span>
                    </a>

                    <a 
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="share-channel-btn facebook"
                    >
                      <span className="share-icon">📘</span>
                      <span>Facebook</span>
                    </a>

                    <a 
                      href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}&media=${encodeURIComponent('https://studios-pro.com/og_banner.jpg')}&description=${encodeURIComponent(lang === 'fr' ? 'Studios-Pro — 24+ outils gratuits de 3D, Réalité Augmentée, Découpe Laser et CNC' : 'Studios-Pro — 24+ Free 3D, WebAR, Laser Cutting & CNC Studios')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="share-channel-btn pinterest"
                    >
                      <span className="share-icon">📌</span>
                      <span>Pinterest</span>
                    </a>

                    <a 
                      href={`https://reddit.com/submit?url=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}&title=${encodeURIComponent(lang === 'fr' ? 'Studios-Pro — Suite gratuite 3D, WebAR, Laser & Relief CNC en ligne' : 'Studios-Pro — Free 3D Studio, WebAR Viewer, Laser & CNC Relief Hub')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="share-channel-btn reddit"
                    >
                      <span className="share-icon">🤖</span>
                      <span>Reddit</span>
                    </a>

                    <a 
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="share-channel-btn linkedin"
                    >
                      <span className="share-icon">💼</span>
                      <span>LinkedIn</span>
                    </a>

                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button 
                        type="button" 
                        className="share-channel-btn native-share"
                        style={{ gridColumn: '1 / -1' }}
                        onClick={() => {
                          navigator.share({
                            title: lang === 'fr' ? 'Studios-Pro — Suite 3D, WebAR & CNC' : 'Studios-Pro — 3D, WebAR & CNC Hub',
                            text: lang === 'fr' ? 'Découvre Studios-Pro, la suite gratuite de création 3D et AR !' : 'Check out Studios-Pro, free 3D & WebAR creative suite!',
                            url: lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com'
                          }).catch(() => {});
                        }}
                      >
                        <span className="share-icon">📱</span>
                        <span>{lang === 'fr' ? 'Plus d\'options de partage' : 'More share options...'}</span>
                      </button>
                    )}
                  </div>

                  <div className="share-copy-box">
                    <input type="text" readOnly value={lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com'} className="share-link-input" />
                    <button 
                      type="button" 
                      className="share-copy-btn" 
                      onClick={handleShareCopy}
                    >
                      {linkCopied ? (lang === 'fr' ? '✓ Copié !' : '✓ Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="embed-generator-section">
                  <label className="embed-select-label">
                    {lang === 'fr' ? "Choisissez l'outil à intégrer :" : "Choose tool to embed:"}
                  </label>
                  <select 
                    className="embed-select" 
                    value={embedTool} 
                    onChange={(e) => setEmbedTool(e.target.value)}
                  >
                    <option value="s3dviewer">
                      {lang === 'fr' ? 'Visualiseur 3D & WebAR (STL, OBJ, GLB)' : '3D & WebAR Model Viewer (STL, OBJ, GLB)'}
                    </option>
                    <option value="filament">
                      {lang === 'fr' ? 'Studio Peinture Filament (Alternative HueForge)' : 'Filament Painting Studio (HueForge Alternative)'}
                    </option>
                    <option value="painter">
                      {lang === 'fr' ? 'Peinture 3D 3MF multicouleur (Bambu AMS)' : 'Multi-Color 3MF Painter (Bambu Lab AMS)'}
                    </option>
                    <option value="coaster">
                      {lang === 'fr' ? 'Générateur Sous-Verres 3D QR & Wi-Fi' : '3D QR Code & Wi-Fi Coaster Generator'}
                    </option>
                    <option value="polymorph">
                      {lang === 'fr' ? 'PolyMorph 3D Studio & Découpeur de Maillage' : 'PolyMorph 3D Studio & Mesh Slicer'}
                    </option>
                    <option value="ar">
                      {lang === 'fr' ? 'Visualiseur Caméra WebAR Instantané' : 'WebAR Instant Camera Viewer'}
                    </option>
                    <option value="depth">
                      {lang === 'fr' ? 'Convertisseur Photo vers Relief 3D (IA)' : 'AI 2D Photo to 3D Relief'}
                    </option>
                    <option value="vcnc">
                      {lang === 'fr' ? 'Vector CNC & Découpe Laser (DXF/G-Code)' : 'Vector CNC & Laser G-Code'}
                    </option>
                    <option value="suite">
                      {lang === 'fr' ? 'Suite Complète Studios-Pro' : 'Full Studios-Pro Suite'}
                    </option>
                  </select>

                  <textarea 
                    className="embed-code-textarea" 
                    readOnly 
                    value={getEmbedSnippet()} 
                    onClick={(e) => e.target.select()}
                  />

                  <button 
                    type="button" 
                    className="embed-copy-action-btn"
                    onClick={async () => {
                      const ok = await copyTextSafe(getEmbedSnippet());
                      if (ok) {
                        setEmbedCopied(true);
                        setTimeout(() => setEmbedCopied(false), 2500);
                      }
                    }}
                  >
                    {embedCopied ? <Check size={18} /> : <Copy size={18} />}
                    <span>
                      {embedCopied 
                        ? (lang === 'fr' ? 'Code d\'intégration copié !' : 'Embed code copied!')
                        : (lang === 'fr' ? 'Copier le code HTML' : 'Copy HTML Embed Code')}
                    </span>
                  </button>

                  <p className="embed-badge-note">
                    {lang === 'fr' 
                      ? '✓ Compatible WordPress, Wix, Squarespace, Shopify, Ghost et blogs HTML. Inclut le badge interactif Studios-Pro.'
                      : '✓ Compatible with WordPress, Wix, Squarespace, Shopify, Ghost and HTML blogs. Includes interactive Studios-Pro badge.'}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
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
<iframe ref={arViewerIframeRef} src={`/apps/ar-viewer/index.html?lang=${lang}&premium=${isPremium || isAdmin}${arViewerUrl ? '&url=' + encodeURIComponent(arViewerUrl) : ''}`} className="studio-iframe" title="AR Viewer 3D" allow="camera; xr-spatial-tracking; fullscreen; accelerometer; gyroscope; microphone; xr-spatial-tracking" style={{border: 'none'}} />
          </motion.div>
        )}
        {isDFXOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/dfx/index.html" className="studio-iframe" title="Studio DFX" />
          </motion.div>
        )}
         {isRulesOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src={`/apps/rules/index.html?lang=${lang}`} className="studio-iframe" title="Site Rules & Legal" />
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
              src={`/apps/scripting-live/index.html${collabRoomId && SAFE_ROOM_RE.test(collabRoomId) ? `?room=${encodeURIComponent(collabRoomId)}` : ''}`} 
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
        {isPainterOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/multicolor-3mf-painter/index.html" className="studio-iframe" title="Studio MultiColor 3MF Painter" />
          </motion.div>
        )}
        {isCoasterOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src="/apps/qr-wifi-coaster-generator/index.html" className="studio-iframe" title="Studio 3D-QR-WiFi-Coaster Generator" />
          </motion.div>
        )}
        {isFilamentPaintingOpen && (
          <motion.div className="studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <iframe src={`/apps/filament-painting-studio/index.html${window.location.search || ''}`} className="studio-iframe" title="Filament Painting & Layer-Swap Studio" />
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
            {lang === 'fr' ? 'Voir sur Studios-Pro' : 'View on Studios-Pro'}
          </a>
        </div>
      )}
    </div>
  );
};

export default StudiosPro;
