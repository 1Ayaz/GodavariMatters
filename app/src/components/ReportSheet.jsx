import { useState, useRef, useEffect } from 'react'
import { useApp } from '../lib/store'

const SEVERITIES = [
  { value: 'minor', label: 'Minor', desc: 'A few bags or scattered litter — fits in a small area (under 1m²)' },
  { value: 'moderate', label: 'Moderate', desc: 'Noticeable heap — roughly the size of an auto-rickshaw (1–5m²)' },
  { value: 'severe', label: 'Severe', desc: 'Covers a significant area — sidewalk blocked or road edge piled up (5–20m²)' },
  { value: 'critical', label: 'Critical', desc: 'Major illegal dumpsite — occupies a vacant plot or entire stretch (20m²+)' },
]

const WASTE_TYPES = ['Street Garbage', 'Mixed Waste', 'Clogged Drain', 'Construction Debris', 'Medical Waste', 'River / Ghat']

export default function ReportSheet() {
  const { state, actions } = useApp()
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
        landmark: landmark.trim(),
        severity,
        waste_type: wasteType,
      }, photo)
    } catch (e) {
      console.error(e)
      alert('Failed to submit. Please try again.')
    }
    setSubmitting(false)
  }

  if (!state.showReportForm) return null

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && actions.showReportForm(false)}>
      <div className="bottom-sheet">
        <div className="sheet-header">
          <h2>Report Garbage</h2>
          <button className="close-btn" onClick={() => actions.showReportForm(false)}>&times;</button>
        </div>
        <div className="sheet-body">
          {/* PHOTO */}
          <label className="field-label">PHOTO <span className="required">*</span></label>
          <div className="photo-capture" onClick={() => fileRef.current?.click()}>
            {photoPreview ? (
              <img src={photoPreview} className="photo-preview" alt="Captured" />
            ) : (
              <div className="photo-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E8390E" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M5 3l2-2h10l2 2"/></svg>
                <p className="photo-text">Tap to take a photo</p>
                <p className="photo-sub">Live camera photo required for authenticity</p>
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
              <strong>{locStatus === 'success' ? '📍 Location captured' : locStatus === 'error' ? '❌ Location access failed' : '⏳ Acquiring location...'}</strong>
              <span>{locStatus === 'success' ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'GPS coordinates captured silently in background'}</span>
            </div>
          </div>

          {/* LANDMARK */}
          <label className="field-label">LANDMARK / ADDRESS <span className="required">*</span></label>
          <input type="text" className="text-input" placeholder="e.g., Near Danavaipeta Park, opposite SBI"
            value={landmark} onChange={(e) => setLandmark(e.target.value)} />

          {/* SEVERITY */}
          <label className="field-label">HOW BAD IS IT?</label>
          <div className="severity-pills">
            {SEVERITIES.map(s => (
              <button key={s.value} className={`pill${severity === s.value ? ' active' : ''}`}
                data-severity={s.value} onClick={() => setSeverity(s.value)}>
                <span className={`pill-dot ${s.value}`} />
                <div className="pill-content">
                  <strong>{s.label}</strong>
                  <span>{s.desc}</span>
                </div>
              </button>
            ))}
          </div>

          {/* WASTE TYPE */}
          <label className="field-label">WASTE TYPE</label>
          <div className="waste-pills">
            {WASTE_TYPES.map(t => (
              <button key={t} className={`wpill${wasteType === t ? ' active' : ''}`}
                onClick={() => setWasteType(t)}>{t}</button>
            ))}
          </div>

          {/* SUBMIT */}
          <button className={`submit-btn${canSubmit ? '' : ' disabled'}`} disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? '⏳ Submitting...' : '📸 Submit Report'}
          </button>
          <p className="anon-badge">🛡️ All reports are anonymous</p>
        </div>
      </div>
    </div>
  )
}
