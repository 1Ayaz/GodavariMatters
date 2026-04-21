import { useState, useRef } from 'react'
import { useApp } from '../lib/store'

export default function CleanedSheet() {
  const { state, actions } = useApp()
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!photo || !state.selectedReport) return
    setSubmitting(true)
    try {
      await actions.markResolved(state.selectedReport.id, photo)
      setPhoto(null)
      setPreview(null)
    } catch (e) {
      console.error(e)
      alert('Failed to submit verification.')
    }
    setSubmitting(false)
  }

  if (!state.showCleanedForm) return null

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && actions.showCleanedForm(false)}>
      <div className="bottom-sheet small-sheet">
        <div className="sheet-header">
          <h2>Mark as Cleaned</h2>
          <button className="close-btn" onClick={() => actions.showCleanedForm(false)}>&times;</button>
        </div>
        <div className="sheet-body">
          <p className="cleaned-desc">
            Take a photo to verify this spot has been cleaned. We'll review it within 24 hours.
          </p>
          <div className="photo-capture cleaned-photo" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} className="photo-preview" alt="Verification" />
            ) : (
              <div className="photo-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M5 3l2-2h10l2 2"/></svg>
                <p style={{ color: '#16a34a', fontWeight: 600, marginTop: 8 }}>Take a Verification Photo</p>
                <p className="photo-sub">Show that this spot is now clean</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          </div>
          <button className={`action-btn submit-cleaned-btn${photo ? '' : ' disabled'}`} disabled={!photo || submitting} onClick={handleSubmit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
