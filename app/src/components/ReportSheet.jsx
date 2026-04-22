import { useState, useRef, useEffect } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

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
  const [locStatus, setLocStatus] = useState('acquiring')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  // Get GPS on open
  useEffect(() => {
    if (state.showReportForm) {
      setLocStatus('acquiring')
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setLocStatus('success')
          },
          () => setLocStatus('error'),
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        setLocStatus('error')
      }
    } else {
      // Reset on close
      setPhoto(null); setPhotoPreview(null); setLandmark(''); setSeverity('moderate')
      setWasteType('Mixed Waste'); setLocation(null); setLocStatus('acquiring')
    }
  }, [state.showReportForm])

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const canSubmit = photo && landmark.trim() && location && !submitting

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

  // SECURITY: Only allow reporting from mobile devices with cameras
  if (!isMobileDevice()) {
    return null
  }

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
          <div className={`location-box ${locStatus === 'success' ? 'success' : ''}`}>
            <div className="loc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={locStatus === 'success' ? '#16a34a' : '#E8390E'} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
            </div>
            <div className="loc-text">
              <strong>{locStatus === 'success' ? t('location_captured', lang) : locStatus === 'error' ? t('location_failed', lang) : t('location_acquiring', lang)}</strong>
              <span>{locStatus === 'success' ? t('location_sub_ok', lang) : t('location_sub_wait', lang)}</span>
            </div>
          </div>

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
