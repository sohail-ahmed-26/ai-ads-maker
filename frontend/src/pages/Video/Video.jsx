import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../state/projectStore.jsx';
import * as api from '../../services/api.js';
import './Video.css';

const STEPS = ['Upload', 'Script', 'Voice', 'Video'];

const DEFAULT_INSTRUCTIONS =
  'Cinematic product showcase. Elegant slow zoom. Premium lighting. No text overlays.';

const Video = () => {
  const {
    setCurrentPage,
    backendFilename,
    setApprovedVideoId,
  } = useProjectStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState('idle'); // idle | generating | ready | approving | approved | error
  const [errorMessage, setErrorMessage] = useState('');
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [videoId, setVideoId] = useState(null);

  // Video element control
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // ── Generation ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!backendFilename) {
      setErrorMessage('Project data is missing. Please start from the Upload step.');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setErrorMessage('');
    setVideoId(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    try {
      const res = await api.generateVideo(backendFilename, instructions);
      if (!res.success) {
        throw new Error(res.message || 'Video generation failed.');
      }
      setVideoId(res.data.videoId);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  };

  // ── Regenerate ─────────────────────────────────────────────────────────────
  const handleRegenerate = () => {
    setVideoId(null);
    setStatus('idle');
  };

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!videoId) return;
    setStatus('approving');
    try {
      const res = await api.approveVideo(videoId);
      if (!res.success) throw new Error(res.message || 'Approval failed.');
      setApprovedVideoId(res.data.approvedId);
      setStatus('approved');
    } catch (err) {
      setErrorMessage(err.message || 'Approval failed.');
      setStatus('error');
    }
  };

  // ── Video element event handlers ───────────────────────────────────────────
  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) setCurrentTime(videoRef.current.currentTime);
  };

  const handleVideoEnded = () => setIsPlaying(false);

  const handleVideoError = () => {
    setErrorMessage('Browser could not load the video. The file may still be processing.');
    setStatus('error');
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const formatTime = (s) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="video-page">
      <div className="bg-glow bg-glow--purple" aria-hidden="true" />
      <div className="bg-glow bg-glow--pink" aria-hidden="true" />
      <div className="bg-glow bg-glow--orange" aria-hidden="true" />

      <div className="app-shell">
        {/* ══ HEADER ══ */}
        <header className="app-header">
          <div className="brand">
            <button
              type="button"
              className="btn-back"
              onClick={() => setCurrentPage('voice')}
              aria-label="Go back to Voice"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginRight: '8px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <span className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#brand-grad-v)" />
                <defs>
                  <linearGradient id="brand-grad-v" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a855f7" /><stop offset="50%" stopColor="#ec4899" /><stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span className="brand-name">AI Ad Maker</span>
          </div>

          <nav className="stepper" aria-label="Progress steps">
            {STEPS.map((step, i) => {
              const isActive = i === 3;
              const isDone = i < 3;
              return (
                <React.Fragment key={step}>
                  {i > 0 && <div className="stepper-line" aria-hidden="true" />}
                  <div
                    className={`stepper-step${isActive ? ' stepper-step--active' : ''}${isDone ? ' stepper-step--done' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div className="stepper-dot">
                      {isDone
                        ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <span className="stepper-num">{i + 1}</span>}
                    </div>
                    <span className="stepper-label">{step}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </nav>
        </header>

        {/* ══ MAIN ══ */}
        <main className="app-main">

          {/* ─── IDLE: Instruction editor + Generate button ─── */}
          {(status === 'idle') && (
            <div className="state-container" role="main">
              <div className="page-heading-wrap">
                <h1 className="page-heading">
                  Generate your <span className="heading-accent">advertisement</span>
                </h1>
                <p className="page-subheading">
                  Customize the video direction below, then generate your final 9:16 MP4.
                </p>
              </div>

              <div className="instructions-card">
                <label htmlFor="video-instructions" className="instructions-label">
                  Video Style Instructions
                </label>
                <textarea
                  id="video-instructions"
                  className="instructions-textarea"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="Describe the visual style, movement, mood, or anything else you want..."
                />
                <p className="instructions-hint">
                  These instructions are sent directly to the AI. Be specific for best results.
                </p>
              </div>

              <button
                type="button"
                id="btn-generate-video"
                className="btn-primary"
                onClick={handleGenerate}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="btn-primary-text">Generate Advertisement Video</span>
              </button>

              <p className="state-subheading" style={{ marginTop: '12px', fontSize: '13px' }}>
                Video generation takes 2–5 minutes. Please keep this tab open.
              </p>
            </div>
          )}

          {/* ─── GENERATING ─── */}
          {status === 'generating' && (
            <div className="state-container loading-state" role="status" aria-live="polite">
              <div className="loader-spinner" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="spin-anim">
                  <circle cx="24" cy="24" r="20" stroke="rgba(168,85,247,0.15)" strokeWidth="4" />
                  <path d="M44 24a20 20 0 00-20-20" stroke="url(#loader-grad-v)" strokeWidth="4" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="loader-grad-v" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a855f7" /><stop offset="1" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="state-heading">Creating your advertisement...</h2>
              <p className="state-subheading">
                Veo AI is generating your video. This may take a few minutes.
              </p>
              <p className="state-subheading" style={{ fontSize: '13px', marginTop: '6px', opacity: 0.6 }}>
                Please keep this tab open.
              </p>
            </div>
          )}

          {/* ─── ERROR ─── */}
          {status === 'error' && (
            <div className="state-container error-state" role="alert">
              <div className="error-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="state-heading">Something went wrong</h2>
              <p className="state-subheading">{errorMessage}</p>
              <button
                type="button"
                id="btn-retry-video"
                className="btn-secondary mt-4"
                onClick={() => setStatus('idle')}
              >
                Try Again
              </button>
            </div>
          )}

          {/* ─── READY / APPROVED: Video Player ─── */}
          {(status === 'ready' || status === 'approving' || status === 'approved') && videoId && (
            <div className="video-review-layout">
              <div className="page-heading-wrap">
                <h1 className="page-heading">
                  {status === 'approved'
                    ? <><span className="heading-accent">Approved!</span> Your advertisement is ready</>
                    : <>Your advertisement is <span className="heading-accent">ready</span></>
                  }
                </h1>
                <p className="page-subheading">
                  Preview your final 9:16 advertisement and download or approve it.
                </p>
              </div>

              {/* 9:16 Video Player */}
              <div className="video-hero-container">
                <div className="video-player-card" aria-label="Final Video Player">
                  <div className={`video-screen ${isPlaying ? 'is-playing' : ''}`}>
                    <video
                      ref={videoRef}
                      src={api.getVideoStreamUrl(videoId)}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleVideoEnded}
                      onError={handleVideoError}
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                    />
                    {!isPlaying && (
                      <button
                        className="video-center-play"
                        onClick={togglePlay}
                        aria-label="Play video"
                        id="btn-video-play-center"
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="player-controls">
                  <button
                    type="button"
                    id="btn-video-play-pause"
                    className="btn-play-pause-small"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    }
                  </button>

                  <div className="progress-container">
                    <div
                      className="progress-track"
                      role="slider"
                      aria-label="Video seek bar"
                      aria-valuenow={Math.round(currentTime)}
                      aria-valuemin={0}
                      aria-valuemax={Math.round(duration)}
                      tabIndex={0}
                      onClick={handleSeek}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="time-display">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="video-actions">
                {status !== 'approved' && (
                  <>
                    <button
                      type="button"
                      id="btn-regenerate-video"
                      className="btn-secondary"
                      onClick={handleRegenerate}
                    >
                      Try Again
                    </button>

                    <a
                      href={api.getVideoDownloadUrl(videoId)}
                      download
                      className="btn-secondary"
                      style={{ textDecoration: 'none' }}
                      id="btn-download-video"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download MP4
                    </a>

                    <button
                      type="button"
                      id="btn-approve-video"
                      className="btn-primary"
                      onClick={handleApprove}
                      disabled={status === 'approving'}
                    >
                      <span className="btn-primary-text">
                        {status === 'approving' ? 'Approving...' : 'Approve Advertisement'}
                      </span>
                    </button>
                  </>
                )}

                {status === 'approved' && (
                  <a
                    href={api.getVideoDownloadUrl(videoId)}
                    download
                    className="btn-primary btn-download"
                    style={{ textDecoration: 'none' }}
                    id="btn-download-approved-video"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span className="btn-primary-text">Download Final Advertisement</span>
                  </a>
                )}
              </div>

              <div className="video-summary">
                <p>
                  <span>Product Image</span>
                  <span className="plus">+</span>
                  <span>Approved Voice</span>
                  <span className="plus">+</span>
                  <span>Veo AI Video</span>
                  <span className="plus">+</span>
                  <span>FFmpeg Composed</span>
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Video;
