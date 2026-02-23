import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Circle, Hexagon, Globe, Clock, Sparkles } from 'lucide-react';
import './App.css';

const StudiosPro = () => {
  const [lang, setLang] = useState('fr');

  const t = {
    fr: {
      welcome: "Bienvenue sur Studios-Pro",
      subtitle: "Votre hub créatif professionnel",
      message: "Nous espérons que vous réaliserez votre modèle à la qualité souhaitée et que vous reviendrez sur notre site.",
      app3d: "Studio 3D",
      appdfx: "Studio DFX",
      rules: "Règles du Site",
    },
    en: {
      welcome: "Welcome to Studios-Pro",
      subtitle: "Your professional creative hub",
      message: "We hope you will create your model at the desired quality and return to our site.",
      app3d: "3D Studio",
      appdfx: "DFX Studio",
      rules: "Site Rules",
    }
  };

  const currentT = t[lang];

  return (
    <div className="main-container">
      <div className="lang-toggle">
        <button
          className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
          onClick={() => setLang('fr')}
        >
          FR
        </button>
        <button
          className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
          onClick={() => setLang('en')}
        >
          EN
        </button>
      </div>

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
        </motion.div>
      </header>

      <div className="compartments-grid">
        {/* Compartment 1: 3D App */}
        <motion.div
          className="compartment-card"
          whileHover={{ y: -10 }}
          onClick={() => window.open('/apps/ap3d/index.html', '_blank')}
        >
          <div className="shape-wrapper">
            <div className="shape-1" />
            <Box size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} />
          </div>
          <div className="card-label">{currentT.app3d}</div>
        </motion.div>

        {/* Compartment 2: DFX App */}
        <motion.div
          className="compartment-card"
          whileHover={{ y: -10 }}
          onClick={() => window.open('/apps/dfx/index.html', '_blank')}
        >
          <div className="shape-wrapper">
            <div className="shape-2" />
            <Circle size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} />
          </div>
          <div className="card-label">{currentT.appdfx}</div>
        </motion.div>

        {/* Compartment 3: Rules */}
        <motion.div
          className="compartment-card"
          whileHover={{ y: -10 }}
          onClick={() => window.open('/apps/rules/index.html', '_blank')}
        >
          <div className="shape-wrapper">
            <div className="shape-3" />
            <Hexagon size={50} color="white" style={{ position: 'absolute', zIndex: 2 }} />
          </div>
          <div className="card-label">{currentT.rules}</div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudiosPro;
