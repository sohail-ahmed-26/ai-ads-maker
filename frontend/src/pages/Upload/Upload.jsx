import React, { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../../state/projectStore.jsx';
import { uploadProductData } from '../../services/api.js';
import './Upload.css';

/* ── Step definitions ───────────────────────────────────────────── */
const STEPS = ['Upload', 'Script', 'Voice', 'Video'];

const Upload = () => {
  const { setCurrentPage, setProductImage, setBackendFilename, setProductDescription } = useProjectStore();
  
  const [image, setImage] = useState(null);        // { file, previewUrl }
  const [description, setDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({});         // { image?: string, description?: string, server?: string }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // ── helpers ──────────────────────────────────────────────────────

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file.' }));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImage({ file, previewUrl });
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const clearImage = () => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const next = {};
    if (!image) next.image = 'A product photo is required.';
    if (!description.trim()) next.description = 'A short product description is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, server: undefined }));

    try {
      const response = await uploadProductData(image.file, description);
      
      // Save to global store
      setProductImage(image.previewUrl);
      setBackendFilename(response.data.filename);
      setProductDescription(response.data.description);
      
      // Navigate to next phase
      setCurrentPage('script');
    } catch (err) {
      setErrors((prev) => ({ ...prev, server: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── drag-and-drop ─────────────────────────────────────────────────

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    acceptFile(file);
  }, []);

  // ── file input ────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    acceptFile(e.target.files?.[0]);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDropZoneKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  };

  // ── description ───────────────────────────────────────────────────

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    if (e.target.value.trim()) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  // ── derived state ─────────────────────────────────────────────────

  const isReady = image !== null && description.trim().length > 0;

  // ── render ────────────────────────────────────────────────────────

  return (
    <div className="upload-page">

      {/* ── Ambient background layers ── */}
      <div className="bg-glow bg-glow--purple"  aria-hidden="true" />
      <div className="bg-glow bg-glow--pink"    aria-hidden="true" />
      <div className="bg-glow bg-glow--orange"  aria-hidden="true" />

      {/* ── Main application container ── */}
      <div className="app-shell">

        {/* ══ HEADER ══ */}
        <header className="app-header">
          {/* Brand */}
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="url(#brand-grad)" />
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
              const isActive = i === 0;
              const isDone   = false; // no previous steps yet
              return (
                <React.Fragment key={step}>
                  {i > 0 && <div className="stepper-line" aria-hidden="true" />}
                  <div
                    className={`stepper-step${isActive ? ' stepper-step--active' : ''}${isDone ? ' stepper-step--done' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div className="stepper-dot">
                      {isDone
                        ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

          {/* Page heading */}
          <div className="page-heading-wrap">
            <h1 className="page-heading">
              Start with your{' '}
              <span className="heading-accent">product photo</span>
            </h1>
            <p className="page-subheading">
              Upload a clear product photo and write one line about it.
              We'll turn it into a polished advertisement.
            </p>
          </div>

          {/* Two-column form area */}
          <form className="content-grid" onSubmit={handleContinue} noValidate>

            {/* ═══ LEFT — Upload area ═══ */}
            <section className="col-upload" aria-labelledby="photo-label">
              <label className="field-label" id="photo-label">
                Product photo
                <span className="field-required" aria-hidden="true"> *</span>
              </label>

              {!image ? (
                <div
                  className={`drop-zone${dragging ? ' drop-zone--active' : ''}${errors.image ? ' drop-zone--error' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload product photo. Click or drag an image here."
                  onClick={openFilePicker}
                  onKeyDown={handleDropZoneKeyDown}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Upload cloud icon */}
                  <div className="drop-zone-icon" aria-hidden="true">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="24" fill="url(#dz-circle-grad)" fillOpacity="0.12" />
                      <path d="M24 14v14M18 20l6-6 6 6" stroke="url(#dz-arrow-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 32h20" stroke="url(#dz-line-grad)" strokeWidth="2" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="dz-circle-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#a855f7"/>
                          <stop offset="1" stopColor="#ec4899"/>
                        </linearGradient>
                        <linearGradient id="dz-arrow-grad" x1="18" y1="14" x2="30" y2="26" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#a855f7"/>
                          <stop offset="1" stopColor="#ec4899"/>
                        </linearGradient>
                        <linearGradient id="dz-line-grad" x1="14" y1="32" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#ec4899"/>
                          <stop offset="1" stopColor="#f97316"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <p className="drop-zone-primary">
                    {dragging ? 'Release to upload' : 'Drop your product photo here'}
                  </p>
                  <p className="drop-zone-secondary">
                    PNG, JPG, WEBP supported
                  </p>

                  <button
                    type="button"
                    className="btn-browse"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Browse files
                  </button>
                </div>
              ) : (
                <div className="image-preview-wrapper">
                  <img
                    className="image-preview"
                    src={image.previewUrl}
                    alt="Selected product"
                  />
                  <div className="image-preview-actions">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={openFilePicker}
                      aria-label="Replace product photo"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Replace photo
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--danger"
                      onClick={clearImage}
                      aria-label="Remove product photo"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileChange}
              />

              {errors.image && (
                <p className="field-error" role="alert">{errors.image}</p>
              )}
            </section>

            {/* ═══ RIGHT — Description + controls ═══ */}
            <div className="col-right">

              {/* Description field */}
              <section className="field-section" aria-labelledby="desc-label">
                <label className="field-label" id="desc-label" htmlFor="product-description">
                  Product description
                  <span className="field-required" aria-hidden="true"> *</span>
                </label>
                <input
                  id="product-description"
                  type="text"
                  className={`text-input${errors.description ? ' text-input--error' : ''}`}
                  placeholder="e.g. Handmade leather wallet available in three colours"
                  value={description}
                  onChange={handleDescriptionChange}
                  maxLength={120}
                  aria-describedby={errors.description ? 'desc-error' : undefined}
                />
                <div className="input-footer">
                  {errors.description ? (
                    <p className="field-error" id="desc-error" role="alert">{errors.description}</p>
                  ) : (
                    <span />
                  )}
                  <span className="char-count" aria-live="polite">
                    {description.length}/120
                  </span>
                </div>
              </section>

              {/* AI info card */}
              <div className="info-card" role="note">
                <div className="info-card-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14v-4m0-4h.01" stroke="url(#info-grad)" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="info-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#a855f7"/>
                        <stop offset="1" stopColor="#ec4899"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="info-card-body">
                  <p className="info-card-title">One line is all you need</p>
                  <p className="info-card-text">
                    Our AI reads your product description and crafts a full marketing script,
                    voice-over, and final advertisement video — automatically.
                  </p>
                </div>
              </div>

              {/* Primary action */}
              <button
                type="submit"
                className="btn-primary"
                disabled={!isReady || isSubmitting}
              >
                <span className="btn-primary-text">
                  {isSubmitting ? 'Uploading...' : 'Generate advertisement script'}
                </span>
                {!isSubmitting && <span className="btn-arrow" aria-hidden="true">→</span>}
              </button>

              {errors.server && (
                <div className="state-container error-state" role="alert" style={{ marginTop: '16px', padding: '12px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#ff4d4f' }}>{errors.server}</p>
                </div>
              )}

              {!isReady && (
                <p className="form-hint">
                  Add a photo and a description to continue.
                </p>
              )}

              {/* Privacy note */}
              <p className="privacy-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{display:'inline',verticalAlign:'middle',marginRight:'5px'}}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Your photo and description are processed securely and not stored permanently.
              </p>
            </div>

          </form>
        </main>

        {/* ══ FEATURE STRIP ══ */}
        <footer className="feature-strip" aria-label="How it works">
          <div className="feature-item">
            <div className="feature-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#fi-grad1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                <defs>
                  <linearGradient id="fi-grad1" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a855f7"/><stop offset="1" stopColor="#ec4899"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="feature-title">Clear Photo</p>
              <p className="feature-desc">A sharp product image gives the AI the best material to work with.</p>
            </div>
          </div>

          <div className="feature-divider" aria-hidden="true" />

          <div className="feature-item">
            <div className="feature-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#fi-grad2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
                <defs>
                  <linearGradient id="fi-grad2" x1="3" y1="6" x2="21" y2="18" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ec4899"/><stop offset="1" stopColor="#f97316"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="feature-title">Short Description</p>
              <p className="feature-desc">One clear sentence is all the AI needs to understand your product.</p>
            </div>
          </div>

          <div className="feature-divider" aria-hidden="true" />

          <div className="feature-item">
            <div className="feature-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#fi-grad3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                <defs>
                  <linearGradient id="fi-grad3" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f97316"/><stop offset="1" stopColor="#a855f7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="feature-title">AI-Powered Creation</p>
              <p className="feature-desc">Script, voice, subtitles, and final video — generated automatically.</p>
            </div>
          </div>
        </footer>

      </div>{/* end app-shell */}
    </div>
  );
};

export default Upload;
