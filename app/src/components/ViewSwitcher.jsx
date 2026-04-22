import { useState, useRef, useEffect } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

function Dropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = options.find(o => o.value === value)

  return (
    <div className="dropdown-wrap" ref={ref}>
      <button className="dropdown-btn" onClick={() => setOpen(!open)}>
        {current?.label || label}
        <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="3,4 6,7 9,4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
      </button>
      {open && (
        <div className="dropdown-menu">
          {options.map(o => (
            <div key={o.value} className={`dd-item${value === o.value ? ' active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ViewSwitcher() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'

  return (
    <div className="view-switcher">
      <div className="filter-row">
        <Dropdown
          label={t('all_severity', lang)}
          value={state.filterSeverity}
          onChange={actions.setSeverityFilter}
          options={[
            { value: 'all', label: t('all_severity', lang) },
            { value: 'minor', label: t('minor', lang) },
            { value: 'moderate', label: t('moderate', lang) },
            { value: 'severe', label: t('severe', lang) },
            { value: 'critical', label: t('critical', lang) },
          ]}
        />
        <Dropdown
          label={t('all_status', lang)}
          value={state.filterStatus}
          onChange={actions.setStatusFilter}
          options={[
            { value: 'all', label: t('all_status', lang) },
            { value: 'unresolved', label: t('unresolved', lang) },
            { value: 'resolved', label: t('resolved', lang) },
          ]}
        />
        <div className="view-toggle">
          <button className={`toggle-btn${state.activeView === 'map' ? ' active' : ''}`}
            onClick={() => actions.setView('map')}>{t('map', lang)}</button>
          <button className={`toggle-btn${state.activeView === 'list' ? ' active' : ''}`}
            onClick={() => actions.setView('list')}>{t('list', lang)}</button>
        </div>
      </div>
    </div>
  )
}
