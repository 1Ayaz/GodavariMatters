import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'
import { t } from '../lib/i18n'
import { displayName, normalizeKey } from '../lib/names'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Center covering both Urban and Rural Rajahmundry
const RJY_CENTER = [17.005, 81.780]
const RJY_ZOOM = 13

const SEVERITY_COLORS = {
  minor: '#fbbf24', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626',
}

// ── Map Controls ──
function MapControls() {
  const map = useMap()
  const { actions } = useApp()
  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={() => map.zoomIn()} aria-label="Zoom in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="map-ctrl-btn" onClick={() => map.zoomOut()} aria-label="Zoom out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="map-ctrl-btn gps-btn" aria-label="My location" onClick={() => {
        if (!navigator.geolocation) return alert('GPS not available')
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 })
            actions.setUserLocation(loc)
          },
          () => alert('Could not get your location.')
        )
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
      </button>
    </div>
  )
}

// ── Get centroid of a GeoJSON polygon ──
function getCentroid(feature) {
  const coords = feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates[0][0]
  const n = coords.length
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
  return [sum[1] / n, sum[0] / n] // [lat, lng]
}

// ── Time ago helper ──
function timeAgo(date) {
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// ── Ward count bubbles — clickable! ──
function WardBubbles({ boundaries, reportsByArea, onBubbleClick }) {
  if (!boundaries) return null

  return boundaries.features.map((feature) => {
    const name = feature.properties.name || 'Unknown'
    let matchName = normalizeKey(name)
    if (matchName.includes('SESHAYYAMETTA')) matchName = 'SESHAYYAMETTA'
    const stats = reportsByArea[matchName]
    const count = stats?.active || 0
    if (count === 0) return null

    const center = feature.properties.lat && feature.properties.lng 
      ? [feature.properties.lat, feature.properties.lng]
      : getCentroid(feature)
    // Aggressive scaling for visual impact
    const baseSize = 24
    let size = baseSize
    if (count > 0) size = Math.min(80, baseSize + (count * 6))
    
    const isHot = count >= 5
    const isCritical = count >= 10

    const icon = L.divIcon({
      className: '',
      html: `<div class="ward-bubble has-reports ${isHot ? 'hot' : ''} ${isCritical ? 'critical' : ''}" style="width:${size}px;height:${size}px;font-size:${size > 40 ? 18 : 13}px">
        ${count}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })

    return (
      <Marker 
        key={name} 
        position={center} 
        icon={icon}
        eventHandlers={{
          click: (e) => {
            L.DomEvent.stopPropagation(e)
            onBubbleClick?.({
              name,
              matchName,
              count,
              isUrban: feature.properties.type === 'urban_sachivalayam',
              code: feature.properties.code,
            })
          }
        }}
      />
    )
  })
}

// ── Interactive boundary layer with hover/click ──
function InteractiveBoundaryLayer({ onHover, onSelect, reportsByArea, cityLimits }) {
  const [geojson, setGeojson] = useState(null)
  const hoveredRef = useRef(null)
  const map = useMap()

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  // Choropleth style — both urban and rural use same red accent
  // Internal borders are nearly invisible; only heatmap fill shows
  const getUrbanStyle = useCallback((feature) => {
    let name = normalizeKey(feature.properties.name || '')
    if (name.includes('SESHAYYAMETTA')) name = 'SESHAYYAMETTA'
    const stats = reportsByArea?.[name]
    const count = stats?.total || 0
    const resolved = stats?.resolved || 0
    const isFullyResolved = count > 0 && count === resolved

    let fillOpacity = 0
    if (count > 0) fillOpacity = Math.min(0.6, 0.05 + (count * 0.05))
    
    return {
      color: 'rgba(0,0,0,0.06)',
      weight: 0.5,
      opacity: 0.3,
      fillColor: isFullyResolved ? '#16a34a' : '#E8390E',
      fillOpacity: fillOpacity,
    }
  }, [reportsByArea])

  const hoverUrbanStyle = {
    color: '#E8390E',
    weight: 1.5,
    opacity: 0.8,
    fillColor: '#E8390E',
    fillOpacity: 0.15,
  }

  const selectedUrbanStyle = {
    color: '#E8390E',
    weight: 1.5,
    opacity: 0.9,
    fillColor: '#E8390E',
    fillOpacity: 0.2,
  }

  // Rural uses same style as urban
  const getRuralStyle = useCallback((feature) => {
    const name = normalizeKey(feature.properties.name || '')
    const stats = reportsByArea?.[name]
    const count = stats?.total || 0
    const resolved = stats?.resolved || 0
    const isFullyResolved = count > 0 && count === resolved

    let fillOpacity = 0
    if (count > 0) fillOpacity = Math.min(0.6, 0.05 + (count * 0.05))
    
    return {
      color: 'rgba(0,0,0,0.06)',
      weight: 0.5,
      opacity: 0.3,
      fillColor: isFullyResolved ? '#16a34a' : '#E8390E',
      fillOpacity: fillOpacity,
    }
  }, [reportsByArea])

  const hoverRuralStyle = {
    color: '#E8390E',
    weight: 1.5,
    opacity: 0.8,
    fillColor: '#E8390E',
    fillOpacity: 0.15,
  }

  const selectedRuralStyle = {
    color: '#E8390E',
    weight: 1.5,
    opacity: 0.9,
    fillColor: '#E8390E',
    fillOpacity: 0.2,
  }

  const onEachUrban = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const matchName = normalizeKey(name)
    const stats = reportsByArea?.[matchName]
    const count = stats?.total || 0

    layer.on({
      mouseover: (e) => {
        const l = e.target
        if (hoveredRef.current && hoveredRef.current !== l) {
          hoveredRef.current.setStyle(getUrbanStyle(hoveredRef.current.feature))
        }
        l.setStyle(hoverUrbanStyle)
        l.bringToFront()
        hoveredRef.current = l
        onHover?.({ ...feature.properties, name: displayName(name), rawName: name, isUrban: true, count, code: feature.properties.code })
      },
      mouseout: (e) => {
        e.target.setStyle(getUrbanStyle(feature))
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        const l = e.target
        l.setStyle(selectedUrbanStyle)
        onSelect?.({
          name: displayName(name), 
          rawName: name,
          isUrban: true, 
          count, 
          code: feature.properties.code,
          address: feature.properties.address || 'Rajamahendravaram Municipal Corporation'
        })
        map.flyToBounds(e.target.getBounds(), { padding: [50, 50], duration: 1 })
      },
    })
  }, [reportsByArea, onHover, onSelect, getUrbanStyle, map])

  const onEachRural = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const matchName = normalizeKey(name)
    const stats = reportsByArea?.[matchName]
    const count = stats?.total || 0

    layer.on({
      mouseover: (e) => {
        const l = e.target
        if (hoveredRef.current && hoveredRef.current !== l) {
          const isUrb = hoveredRef.current.feature.properties.type === 'urban_sachivalayam'
          hoveredRef.current.setStyle(isUrb ? getUrbanStyle(hoveredRef.current.feature) : getRuralStyle(hoveredRef.current.feature))
        }
        l.setStyle(hoverRuralStyle)
        l.bringToFront()
        hoveredRef.current = l
        onHover?.({ ...feature.properties, name: displayName(name), rawName: name, isUrban: false, count, code: feature.properties.code })
      },
      mouseout: (e) => {
        e.target.setStyle(getRuralStyle(feature))
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        const l = e.target
        l.setStyle(selectedRuralStyle)
        onSelect?.({
          name: displayName(name), 
          rawName: name,
          isUrban: false, 
          count, 
          code: feature.properties.code,
          address: feature.properties.address || 'Rural Rajamahendravaram'
        })
        map.flyToBounds(e.target.getBounds(), { padding: [50, 50], duration: 1 })
      },
    })
  }, [reportsByArea, onHover, onSelect, getRuralStyle, getUrbanStyle, map])

  const { rural, urban } = useMemo(() => {
    if (!geojson) return { rural: null, urban: null }
    return {
      rural: { ...geojson, features: geojson.features.filter(f => f.properties.type !== 'urban_sachivalayam') },
      urban: { ...geojson, features: geojson.features.filter(f => f.properties.type === 'urban_sachivalayam') }
    }
  }, [geojson])

  // Build inverted mask: gray out everything OUTSIDE the city boundary
  const maskGeoJSON = useMemo(() => {
    if (!cityLimits) return null
    // Get city boundary coordinates
    const cityCoords = cityLimits.geometry?.coordinates?.[0]
      || cityLimits.features?.[0]?.geometry?.coordinates?.[0]
    if (!cityCoords) return null

    // World rectangle (outer ring) — must be counter-clockwise for GeoJSON hole
    const worldRing = [
      [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
    ]
    // City boundary is the hole (inner ring) — already clockwise from GeoJSON
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [worldRing, cityCoords]
      }
    }
  }, [cityLimits])

  // Style for the outside mask — warm muted overlay
  const maskStyle = {
    color: 'transparent',
    weight: 0,
    fillColor: '#e8e4e0',
    fillOpacity: 0.6,
    interactive: false
  }

  // Style for the city boundary line — barely visible whisper
  const boundaryLineStyle = {
    color: '#d4574a',
    weight: 1.5,
    opacity: 0.3,
    dashArray: '8, 6',
    fillColor: 'transparent',
    fillOpacity: 0,
    interactive: false
  }

  if (!rural || !urban) return null

  return (
    <>
      {/* Outside mask — grays out areas outside city limits */}
      {maskGeoJSON && <GeoJSON key="city_mask" data={maskGeoJSON} style={() => maskStyle} />}
      {/* Subtle boundary line on city edge */}
      {cityLimits && <GeoJSON key="city_border" data={cityLimits} style={() => boundaryLineStyle} />}
      <GeoJSON key="rural" data={rural} style={getRuralStyle} onEachFeature={onEachRural} />
      <GeoJSON key="urban" data={urban} style={getUrbanStyle} onEachFeature={onEachUrban} />
    </>
  )
}

// ── Report dot markers with mini preview ──
function ReportMarkers({ onReportPreview }) {
  const { filteredReports, actions } = useApp()
  return filteredReports.map(report => {
    const isResolved = report.status === 'resolved'
    const isPending = report.cleaned_image_url && !isResolved
    const color = isResolved ? '#16a34a' : isPending ? '#f59e0b' : (SEVERITY_COLORS[report.severity] || '#f97316')
    return (
      <CircleMarker
        key={report.id}
        center={[report.lat, report.lng]}
        radius={6}
        pathOptions={{ color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
        eventHandlers={{
          click: (e) => {
            L.DomEvent.stopPropagation(e)
            onReportPreview?.(report)
          }
        }}
      />
    )
  })
}

// ── Ward Complaints Sliding Panel (new!) ──
function WardComplaintsPanel({ wardName, rawName, reports, onClose, onReportClick }) {
  const lang = 'en'
  const panelRef = useRef(null)
  const startY = useRef(0)

  // Filter reports for this ward — match by normalized name
  const wardKey = normalizeKey(rawName || wardName)
  const wardReports = useMemo(() => {
    return reports.filter(r => {
      let area = normalizeKey(r.assigned_area || '')
      if (area.includes('SESHAYYAMETTA')) area = 'SESHAYYAMETTA'
      let wk = wardKey
      if (wk.includes('SESHAYYAMETTA')) wk = 'SESHAYYAMETTA'
      return area === wk
    })
  }, [reports, wardKey])

  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - startY.current
    if (diff > 80) onClose()
  }

  return (
    <div className="ward-complaints-backdrop" onClick={onClose}>
      <div 
        className="ward-complaints-panel" 
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="wcp-drag-handle" onClick={onClose} />
        
        {/* Header */}
        <div className="wcp-header">
          <div className="wcp-header-left">
            <h3 className="wcp-title">{displayName(rawName || wardName)}</h3>
            <span className="wcp-subtitle">{wardReports.length} {wardReports.length === 1 ? 'complaint' : 'complaints'}</span>
          </div>
          <button className="wcp-close" onClick={onClose}>✕</button>
        </div>

        {/* Reports List */}
        <div className="wcp-list">
          {wardReports.length === 0 ? (
            <div className="wcp-empty">
              <span style={{ fontSize: 32, marginBottom: 8 }}>📍</span>
              <p>No complaints in this area yet.</p>
            </div>
          ) : (
            wardReports.map(r => {
              const isResolved = r.status === 'resolved'
              return (
                <div key={r.id} className="wcp-item" onClick={() => onReportClick(r)}>
                  <img src={r.image_url} alt="" className="wcp-item-img" onError={(e) => { e.target.style.display = 'none' }} />
                  <div className="wcp-item-info">
                    <div className="wcp-item-type">{r.waste_type || 'Report'}</div>
                    <div className="wcp-item-landmark">{r.landmark || 'No landmark'}</div>
                    <div className="wcp-item-meta">
                      <span className={`wcp-severity ${r.severity}`}>{r.severity}</span>
                      <span className="wcp-time">{timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                  <div className="wcp-item-seen">
                    {isResolved ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    ) : (
                      <>
                        <span className="wcp-seen-num">{r.seen_count || 0}</span>
                        <span className="wcp-seen-label">seen</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Report Preview Card (mini card at bottom of map) ──
function ReportPreviewCard({ report, onOpen, onClose }) {
  if (!report) return null
  const isResolved = report.status === 'resolved'
  const color = isResolved ? '#16a34a' : (SEVERITY_COLORS[report.severity] || '#f97316')

  return (
    <div className="report-preview-card" onClick={onOpen}>
      <div className="rpc-indicator" style={{ background: color }} />
      <img src={report.image_url} alt="" className="rpc-img" onError={(e) => { e.target.style.display = 'none' }} />
      <div className="rpc-info">
        <div className="rpc-type">{report.waste_type || 'Report'}</div>
        <div className="rpc-landmark">{report.landmark || displayName(report.assigned_area)}</div>
        <div className="rpc-meta">
          <span className={`wcp-severity ${report.severity}`}>{report.severity}</span>
          <span className="wcp-time">{timeAgo(report.created_at)}</span>
          {report.seen_count > 0 && <span className="wcp-time">👁 {report.seen_count}</span>}
        </div>
      </div>
      <button className="rpc-close" onClick={(e) => { e.stopPropagation(); onClose() }}>✕</button>
    </div>
  )
}

// ── MAIN MAP VIEW ──
export default function MapView() {
  const { state, actions } = useApp()
  const [boundaries, setBoundaries] = useState(null)
  const [cityLimits, setCityLimits] = useState(null)
  const [hoveredArea, setHoveredArea] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)
  const [complaintsPanel, setComplaintsPanel] = useState(null) // { name, rawName }
  const [previewReport, setPreviewReport] = useState(null) // mini preview

  useEffect(() => {
    loadData().then(({ boundaries }) => setBoundaries(boundaries))
    fetch('/city_limits.geojson').then(r => r.json()).then(setCityLimits).catch(() => {})
  }, [])

  const reportsByArea = useMemo(() => {
    const map = {}
    state.reports.forEach(r => {
      let area = normalizeKey(r.assigned_area || 'Unknown')
      if (area.includes('SESHAYYAMETTA')) area = 'SESHAYYAMETTA'
      if (!map[area]) map[area] = { total: 0, resolved: 0, active: 0 }
      map[area].total++
      if (r.status === 'resolved') {
        map[area].resolved++
      } else {
        map[area].active++
      }
    })
    return map
  }, [state.reports])

  const totalActive = state.reports.filter(r => r.status !== 'resolved').length
  const totalReports = state.reports.length
  const lang = state.lang || 'en'

  if (state.activeView !== 'map') return null

  const infoData = selectedWard || hoveredArea

  const handleWardSelect = (ward) => {
    setSelectedWard(ward)
    setPreviewReport(null) // close any preview
  }

  const handleBubbleClick = (data) => {
    // Open the complaints sliding panel directly
    setComplaintsPanel({ name: data.name, rawName: data.name })
    setSelectedWard(null)
    setPreviewReport(null)
  }

  const handleReportPreview = (report) => {
    if (state.isMobile) {
      // On mobile: show mini preview card at bottom
      setPreviewReport(report)
      setSelectedWard(null)
      setComplaintsPanel(null)
    } else {
      // On desktop: open full detail
      actions.selectReport(report)
    }
  }

  const handleViewReports = () => {
    if (selectedWard) {
      // Open complaints panel inline instead of switching to list view
      setComplaintsPanel({ name: selectedWard.name, rawName: selectedWard.rawName || selectedWard.name })
      setSelectedWard(null)
    }
  }

  const handleMapClick = () => {
    if (selectedWard) setSelectedWard(null)
    if (previewReport) setPreviewReport(null)
  }

  return (
    <div className="view-panel map-panel active">
      <MapContainer center={RJY_CENTER} zoom={RJY_ZOOM} minZoom={11} maxZoom={19}
        className="map-container" zoomControl={false} attributionControl={false}
        preferCanvas={true}
        whenReady={(e) => {
          e.target.on('click', handleMapClick)
        }}>
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
          maxZoom={19}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />
        <InteractiveBoundaryLayer
          onHover={setHoveredArea}
          onSelect={handleWardSelect}
          reportsByArea={reportsByArea}
          cityLimits={cityLimits}
        />
        <WardBubbles 
          boundaries={boundaries} 
          reportsByArea={reportsByArea} 
          onBubbleClick={handleBubbleClick}
        />
        <ReportMarkers onReportPreview={handleReportPreview} />
        <MapControls />
      </MapContainer>

      {/* Inline stats badges — repositioned to avoid topbar overlap */}
      <div className="map-stats-badges">
        <div className="map-badge badge-active">
          <span className="badge-num">{totalActive}</span>
          <span className="badge-label">{t('active_reports', lang)}</span>
        </div>
        <div className="map-badge badge-total">
          <span className="badge-num">{totalReports}</span>
          <span className="badge-label">{t('total_reports', lang)}</span>
        </div>
      </div>

      {/* Ward info panel — hover or click */}
      {infoData && (
        <div className={`map-info-panel mip-light${selectedWard ? ' mip-selected' : ''}`}>
          <div className="mip-indicator" />
          <div className="mip-content" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                <div className="mip-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(infoData.name)}</div>
                <div className="mip-meta">{infoData.isUrban ? t('sachivalayam_urban', lang) : t('gram_panchayat', lang)}</div>
              </div>
              <div className="mip-count" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.1' }}>
                <span className="mip-count-num" style={{ fontSize: '22px', fontWeight: '900', color: 'var(--accent)' }}>{infoData.count}</span>
                <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.5px' }}>
                  {infoData.count !== 1 ? t('reports_word', lang) : t('report_word', lang)}
                </span>
              </div>
            </div>
            
            {selectedWard && (
              <div className="mip-actions" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button className="mip-btn" onClick={handleViewReports} style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                  {t('view_reports', lang)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </button>
                <button className="mip-dismiss" onClick={() => setSelectedWard(null)}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini report preview card (mobile) */}
      {previewReport && (
        <ReportPreviewCard 
          report={previewReport}
          onOpen={() => {
            actions.selectReport(previewReport)
            setPreviewReport(null)
          }}
          onClose={() => setPreviewReport(null)}
        />
      )}

      {/* Ward complaints sliding panel */}
      {complaintsPanel && (
        <WardComplaintsPanel
          wardName={complaintsPanel.name}
          rawName={complaintsPanel.rawName}
          reports={state.reports}
          onClose={() => setComplaintsPanel(null)}
          onReportClick={(r) => {
            setComplaintsPanel(null)
            actions.selectReport(r)
          }}
        />
      )}
    </div>
  )
}
