import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../state/projectStore.jsx';
import * as api from '../../services/api.js';
import './Script.css';

/* ── Step definitions ───────────────────────────────────────────── */
const STEPS = ['Upload', 'Script', 'Voice', 'Video'];

const Script = () => {
  const { setCurrentPage, productDescription, backendFilename, scriptText, setScriptText, setApprovedScriptId } = useProjectStore();
  
  // Frontend-only states: 'generating' | 'success' | 'error' | 'approving'
  const [status, setStatus] = useState('generating');
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [errorText, setErrorText] = useState('');
  
  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    // Generate script on initial mount
    const generateInitial = async () => {
      try {
        const res = await api.generateScript(backendFilename, productDescription);
        setScriptText(res.data.script);
        setCurrentScriptId(res.data.scriptId);
        setStatus('success');
      } catch (err) {
        setErrorText(err.message);
        setStatus('error');
      }
    };

    if (!hasGeneratedRef.current && status === 'generating') {
      hasGeneratedRef.current = true;
      generateInitial();
    }
  }, [backendFilename, productDescription, setScriptText, status]);

  const handleTryAgain = async () => {
    setStatus('generating');
    setErrorText('');
    try {
      const res = await api.regenerateScript(backendFilename, productDescription);
      setScriptText(res.data.script);
      setCurrentScriptId(res.data.scriptId);
      setStatus('success');
    } catch (err) {
      setErrorText(err.message);
      setStatus('error');
    }
  };

  const handleApprove = async () => {
    if (!currentScriptId) return;
    setStatus('approving');
    setErrorText('');
    try {
      const res = await api.approveScript(currentScriptId);
      if (res.success) {
        setApprovedScriptId(res.data.approvedId);
        setCurrentPage('voice');
      } else {
        setStatus('error');
        setErrorText(res.message || 'Failed to approve script');
      }
    } catch (err) {
      setStatus('error');
      setErrorText(err.message || 'Network error');
    }
  };

  // Optional: A hidden dev trigger to test error state
  const forceError = () => {
    setErrorText('Simulated error for development testing.');
    setStatus('error');
  };

  return (
    <div className="script-page">
      {/* ── Ambient background layers ── */}
      <div className="bg-glow bg-glow--purple" aria-hidden="true" />
      <div className="bg-glow bg-glow--pink" aria-hidden="true" />
      <div className="bg-glow bg-glow--orange" aria-hidden="true" />

      {/* ── Main application container ── */}
      <div className="app-shell">
        {/* ══ HEADER ══ */}
        <header className="app-header">
          {/* Brand & Back Navigation */}
          <div className="brand">
            <button 
              type="button" 
              className="btn-back" 
              onClick={() => setCurrentPage('upload')}
              aria-label="Go back to Upload"
              style={{background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer', display:'flex', alignItems:'center', padding:'4px', marginRight:'8px'}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <span className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#brand-grad)" />
                <defs>
                  <linearGradient id="brand-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span className="brand-name">AI Ad Maker</span>
          </div>

          {/* Progress stepper */}
          <nav className="stepper" aria-label="Progress steps">
            {STEPS.map((step, i) => {
              const isActive = i === 1; // Script is active (index 1)
              const isDone = i < 1;   // Upload is done (index 0)
              return (
                <React.Fragment key={step}>
                  {i > 0 && <div className="stepper-line" aria-hidden="true" />}
                  <div
                    className={`stepper-step${isActive ? ' stepper-step--active' : ''}${isDone ? ' stepper-step--done' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div className="stepper-dot">
                      {isDone
                        ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <span className="stepper-num">{i + 1}</span>
                      }
                    </div>
                    <span className="stepper-label">{step}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </nav>
        </header>

        {/* ══ MAIN CONTENT ══ */}
        <main className="app-main">
          
          {/* LOADING STATE */}
          {(status === 'generating' || status === 'approving') && (
            <div className="state-container loading-state" role="status" aria-live="polite">
              <div className="loader-spinner" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="spin-anim">
                  <circle cx="24" cy="24" r="20" stroke="rgba(168,85,247,0.15)" strokeWidth="4" />
                  <path d="M44 24a20 20 0 00-20-20" stroke="url(#loader-grad)" strokeWidth="4" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="loader-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a855f7" />
                      <stop offset="1" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="state-heading">
                {status === 'generating' ? 'Crafting your script...' : 'Approving script...'}
              </h2>
              <p className="state-subheading">
                {status === 'generating' 
                  ? 'Our AI is analyzing your product and writing a compelling marketing message.' 
                  : 'Saving your choice and preparing the voice generation engine.'}
              </p>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="state-container error-state" role="alert">
              <div className="error-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h2 className="state-heading">Something went wrong</h2>
              <p className="state-subheading">
                {errorText || "We couldn't generate the script at this time. Please try again."}
              </p>
              <button type="button" className="btn-secondary mt-4" onClick={handleTryAgain}>
                Retry
              </button>
            </div>
          )}

          {/* SUCCESS / REVIEW STATE */}
          {status === 'success' && (
            <div className="script-review-layout">
              {/* Page heading */}
              <div className="page-heading-wrap">
                <h1 className="page-heading">
                  Your <span className="heading-accent">AI script</span> is ready
                </h1>
                <p className="page-subheading">
                  Review the script below. You can approve it to move forward, or ask the AI to try another version.
                </p>
              </div>

              {/* Product Context Area */}
              <div className="product-context">
                <div className="product-context-img" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div className="product-context-details">
                  <span className="product-context-label">Product context</span>
                  <p className="product-context-desc">"{productDescription || 'No description provided'}"</p>
                </div>
              </div>

              {/* Script Card */}
              <div className="script-card">
                <div className="script-card-header">
                  <span className="script-card-title">Advertisement Script</span>
                  <span className="ai-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14v-4m0-4h.01"/></svg>
                    AI Generated
                  </span>
                </div>
                <div className="script-card-body">
                  <p className="script-text">
                    {(scriptText || '').split('\\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="script-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleTryAgain}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Try Again
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleApprove}
                >
                  <span className="btn-primary-text">Approve script</span>
                  <span className="btn-arrow" aria-hidden="true">→</span>
                </button>
              </div>

              {/* Invisible Dev Tool: click to simulate error */}
              <div style={{marginTop: '40px', textAlign: 'center'}}>
                <button type="button" onClick={forceError} style={{background:'transparent', border:'none', color:'var(--text-3)', fontSize:'10px', cursor:'pointer'}}>
                  [Dev: Force Error State]
                </button>
              </div>

            </div>
          )}
        </main>
      </div>{/* end app-shell */}
    </div>
  );
};

export default Script;
