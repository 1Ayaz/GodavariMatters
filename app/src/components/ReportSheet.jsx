import { useState, useRef, useEffect } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'
import { detectJurisdiction } from '../lib/jurisdiction'


const WASTE_TYPE_KEYS = [
  { key: 'wt_street', value: 'Street Garbage' },
  { key: 'wt_mixed', value: 'Mixed Waste' },
  { key: 'wt_drain', value: 'Clogged Drain' },
  { key: 'wt_construction', value: 'Construction Debris' },
  { key: 'wt_medical', value: 'Medical Waste' },
  { key: 'wt_river', value: 'River / Ghat' },
]

const SEVERITY_KEYS = [
  { value: 'minor', labelKey: 'minor', descKey: 'minor_desc' },
  { value: 'moderate', labelKey: 'moderate', descKey: 'moderate_desc' },
  { value: 'severe', labelKey: 'severe', descKey: 'severe_desc' },
  { value: 'critical', labelKey: 'critical', descKey: 'critical_desc' },
]

export default function ReportSheet() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [landmark, setLandmark] = useState('')
  const [severity, setSeverity] = useState('moderate')
  const [wasteType, setWasteType] = useState('Mixed Waste')
  const [location, setLocation] = useState(null)
  const [locStatus, setLocStatus] = useState('acquiring') // 'acquiring' | 'success' | 'error' | 'denied'
  const [submitting, setSubmitting] = useState(false)
  const [isOutside, setIsOutside] = useState(false)
  const [showAndroidHelp, setShowAndroidHelp] = useState(false)
  const fileRef = useRef()

  const attemptGeolocation = () => {
    setLocStatus('acquiring')
    setIsOutside(false)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setLocation({ lat, lng })
          const jur = detectJurisdiction(lat, lng)
          if (jur) {
            setLocStatus('success')
            setIsOutside(false)
          } else {
            setLocStatus('error')
            setIsOutside(true)
          }
        },
        (err) => {
          // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
          if (err.code === 1) {
            setLocStatus('denied')
          } else {
            setLocStatus('error')
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setLocStatus('error')
    }
  }

  // Get GPS on open
  useEffect(() => {
    if (state.showReportForm) {
      attemptGeolocation()
    } else {
      // Reset on close
      setPhoto(null); setPhotoPreview(null); setLandmark(''); setSeverity('moderate')
      setWasteType('Mixed Waste'); setLocation(null); setLocStatus('acquiring')
      setShowAndroidHelp(false)
    }
  }, [state.showReportForm])

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const canSubmit = photo && landmark.trim() && location && !submitting && !isOutside

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await actions.submitReport({
        lat: location.lat,
        lng: location.lng,
        landmark: landmark.trim().slice(0, 500),
        severity,
        waste_type: wasteType,
      }, photo)
    } catch (e) {
      console.error(e)
      alert(e.message || 'Failed to submit. Please try again.')
    }
    setSubmitting(false)
  }

  if (!state.showReportForm) return null

  if (!state.isMobile) return null

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && actions.showReportForm(false)}>
      <div className="bottom-sheet">
        <div className="sheet-header">
          <h2>{t('report_garbage', lang)}</h2>
          <button className="close-btn" onClick={() => actions.showReportForm(false)}>&times;</button>
        </div>
        <div className="sheet-body">
          {/* PHOTO */}
          <label className="field-label">{t('photo_label', lang)} <span className="required">*</span></label>
          <div className="photo-capture" onClick={() => fileRef.current?.click()}>
            {photoPreview ? (
              <img src={photoPreview} className="photo-preview" alt="Captured" />
            ) : (
              <div className="photo-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E8390E" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M5 3l2-2h10l2 2"/></svg>
                <p className="photo-text">{t('take_photo', lang)}</p>
                <p className="photo-sub">{t('photo_sub', lang)}</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          </div>

          {/* LOCATION */}
          {locStatus === 'denied' ? (
            <div className="location-denied-box">
              <div className="loc-denied-header">
                <div className="loc-denied-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
                </div>
                <div className="loc-denied-text">
                  <strong>Location access is off</strong>
                  <span>GodavariMatters needs your GPS to verify you're at this spot. This keeps reports authentic.</span>
                </div>
              </div>
              <button className="loc-try-again-btn" onClick={attemptGeolocation}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                Try Again
              </button>
              <button className="loc-help-toggle" onClick={() => setShowAndroidHelp(!showAndroidHelp)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
                How to enable on Android
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showAndroidHelp ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showAndroidHelp && (
                <div className="loc-android-steps">
                  <div className="loc-step"><span className="loc-step-num">1</span> Tap the lock icon in the address bar</div>
                  <div className="loc-step"><span className="loc-step-num">2</span> Tap Permissions</div>
                  <div className="loc-step"><span className="loc-step-num">3</span> Find Location and set it to "Allow"</div>
                  <div className="loc-step"><span className="loc-step-num">4</span> Reload the page and tap "Try Again"</div>
                  <p className="loc-step-note">Can't find these settings? Try restarting your browser after changing them.</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
              padding: '6px 12px', borderRadius: 20, width: 'fit-content',
              background: locStatus === 'success' ? '#f0fdf4' : isOutside ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${locStatus === 'success' ? '#bbf7d0' : isOutside ? '#fecaca' : '#e2e8f0'}`,
              color: locStatus === 'success' ? '#16a34a' : isOutside ? '#ef4444' : '#64748b',
              fontSize: 12, fontWeight: 700
            }}>
              {locStatus === 'success' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : locStatus === 'acquiring' ? (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s infinite' }} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
              )}
              {locStatus === 'success' ? 'GPS Locked' : isOutside ? 'Outside Rajamahendravaram Limits' : locStatus === 'error' ? t('location_failed', lang) : 'Acquiring GPS...'}
            </div>
          )}

          {/* LANDMARK */}
          <label className="field-label">{t('landmark_label', lang)} <span className="required">*</span></label>
          <input type="text" className="text-input" placeholder={t('landmark_placeholder', lang)}
            value={landmark} onChange={(e) => setLandmark(e.target.value)} />

          {/* SEVERITY */}
          <label className="field-label">{t('how_bad', lang)}</label>
          <div className="severity-pills">
            {SEVERITY_KEYS.map(s => (
              <button key={s.value} className={`pill${severity === s.value ? ' active' : ''}`}
                data-severity={s.value} onClick={() => setSeverity(s.value)}>
                <span className={`pill-dot ${s.value}`} />
                <div className="pill-content">
                  <strong>{t(s.labelKey, lang)}</strong>
                  <span>{t(s.descKey, lang)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* WASTE TYPE */}
          <label className="field-label">{t('waste_type_label', lang)}</label>
          <div className="waste-pills">
            {WASTE_TYPE_KEYS.map(wt => (
              <button key={wt.value} className={`wpill${wasteType === wt.value ? ' active' : ''}`}
                onClick={() => setWasteType(wt.value)}>{t(wt.key, lang)}</button>
            ))}
          </div>

          {/* SUBMIT */}
          <button className={`submit-btn${canSubmit ? '' : ' disabled'}`} disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? t('submitting', lang) : t('submit_report', lang)}
          </button>
          <p className="anon-badge">{t('anonymous', lang)}</p>
        </div>
      </div>
    </div>
  )
}
