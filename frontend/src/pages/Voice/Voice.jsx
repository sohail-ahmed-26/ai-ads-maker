import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../state/projectStore.jsx';
import * as api from '../../services/api.js';
import './Voice.css';

/* ── Step definitions ───────────────────────────────────────────── */
const STEPS = ['Upload', 'Script', 'Voice', 'Video'];

const Voice = () => {
  const { setCurrentPage, scriptText, approvedScriptId, setApprovedAudioId } = useProjectStore();
  
  // Frontend-only states: 'generating' | 'success' | 'error' | 'approving'
  const [status, setStatus] = useState('generating');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [audioId, setAudioId] = useState(null);
  
  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  // Generate voice on mount
  useEffect(() => {
    generateInitialVoice();
  }, []);

  const generateInitialVoice = async () => {
    if (!approvedScriptId) {
      setStatus('error');
      setErrorMessage('No approved script found to generate voice.');
      return;
    }
    setStatus('generating');
    setErrorMessage('');
    
    try {
      const res = await api.generateVoice(approvedScriptId);
      if (res.success && res.data.audioId) {
        setAudioId(res.data.audioId);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(res.message || 'Failed to generate voice');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error');
    }
  };

  const handleTryAgain = async () => {
    setStatus('generating');
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setAudioId(null);
    setErrorMessage('');

    try {
      const res = await api.regenerateVoice(approvedScriptId);
      if (res.success && res.data.audioId) {
        setAudioId(res.data.audioId);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(res.message || 'Failed to regenerate voice');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error');
    }
  };

  const handleApprove = async () => {
    if (!audioId) return;
    setStatus('approving');
    try {
      const res = await api.approveVoice(audioId);
      if (res.success) {
        setApprovedAudioId(res.data.approvedId);
        setCurrentPage('video');
      } else {
        setStatus('error');
        setErrorMessage(res.message || 'Failed to approve voice');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error');
    }
  };

  // Audio player handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 0;
      setCurrentTime(current);
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Format time (seconds) to m:ss
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="voice-page">
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
              onClick={() => setCurrentPage('script')}
              aria-label="Go back to Script"
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
              const isActive = i === 2; // Voice is active (index 2)
              const isDone = i < 2;     // Upload and Script are done
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
                {status === 'generating' ? 'Generating your voice...' : 'Approving voice...'}
              </h2>
              <p className="state-subheading">
                {status === 'generating' 
                  ? 'We are transforming your script into natural, human-like speech using Gemini TTS.' 
                  : 'Saving your choice and preparing the video rendering engine.'}
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
                {errorMessage || "We couldn't generate the voice at this time. Please try again."}
              </p>
              <button type="button" className="btn-secondary mt-4" onClick={handleTryAgain}>
                Retry Generation
              </button>
            </div>
          )}

          {/* SUCCESS / REVIEW STATE */}
          {status === 'success' && audioId && (
            <div className="voice-review-layout">
              {/* Hidden Real Audio Player */}
              <audio 
                ref={audioRef}
                src={api.getVoiceAudioUrl(audioId)} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
              />

              {/* Page heading */}
              <div className="page-heading-wrap">
                <h1 className="page-heading">
                  Your <span className="heading-accent">voiceover</span> is ready
                </h1>
                <p className="page-subheading">
                  Listen to the generated voice below. You can approve it, or ask the AI to try another version.
                </p>
              </div>

              {/* Script Context Area */}
              <div className="script-context">
                <div className="script-context-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <span>Approved Script</span>
                </div>
                <div className="script-context-body">
                  <p className="script-context-text">"{scriptText}"</p>
                </div>
              </div>

              {/* Voice Player Card */}
              <div className="voice-player-card" aria-label="Audio player">
                <div className="player-top">
                  <span className="player-title">Generated Audio Track</span>
                  {isPlaying ? (
                    <div className="audio-visualizer playing" aria-hidden="true">
                      <span className="bar bar1"></span>
                      <span className="bar bar2"></span>
                      <span className="bar bar3"></span>
                      <span className="bar bar4"></span>
                    </div>
                  ) : (
                    <div className="audio-visualizer" aria-hidden="true">
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                    </div>
                  )}
                </div>

                <div className="player-controls">
                  <button 
                    type="button" 
                    className="btn-play-pause" 
                    onClick={togglePlayback}
                    aria-label={isPlaying ? 'Pause audio' : progress >= 100 ? 'Replay audio' : 'Play audio'}
                  >
                    {isPlaying ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    ) : progress >= 100 ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    )}
                  </button>

                  <div className="progress-container">
                    <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="time-display">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="voice-actions">
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
                  <span className="btn-primary-text">Use this voice</span>
                  <span className="btn-arrow" aria-hidden="true">→</span>
                </button>
              </div>

            </div>
          )}
        </main>
      </div>{/* end app-shell */}
    </div>
  );
};

export default Voice;
