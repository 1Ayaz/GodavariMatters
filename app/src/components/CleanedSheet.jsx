import { useState, useRef } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

export default function CleanedSheet() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
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
      console.error('CleanedSheet submit error:', e)
      alert(e.message || 'Failed to submit verification. Please try again.')
    }
    setSubmitting(false)
  }

  if (!state.showCleanedForm) return null

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && actions.showCleanedForm(false)}>
      <div className="bottom-sheet small-sheet">
        <div className="sheet-header">
          <h2>{t('mark_cleaned', lang)}</h2>
          <button className="close-btn" onClick={() => actions.showCleanedForm(false)}>&times;</button>
        </div>
        <div className="sheet-body">
          <p className="cleaned-desc">
            {t('cleaned_desc', lang)}
          </p>
          <div className="photo-capture cleaned-photo" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} className="photo-preview" alt="Verification" />
            ) : (
              <div className="photo-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M5 3l2-2h10l2 2"/></svg>
                <p style={{ color: '#16a34a', fontWeight: 600, marginTop: 8 }}>{t('take_verify_photo', lang)}</p>
                <p className="photo-sub">{t('show_clean', lang)}</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          </div>
          <button className={`action-btn submit-cleaned-btn${photo ? '' : ' disabled'}`} disabled={!photo || submitting} onClick={handleSubmit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {submitting ? t('submitting', lang) : t('submit_review', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
