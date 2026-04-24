import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'
import { t } from '../lib/i18n'
import { displayName, normalizeKey } from '../lib/names'
import TranslatedText from '../lib/TranslatedText'

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

// NammaKasa-style: restrict bounds to Rajahmundry area so user can't zoom out to see the whole world
const RJY_BOUNDS = L.latLngBounds(
  [16.88, 81.62],  // SW corner
  [17.12, 81.92]   // NE corner
)

// Zoom threshold: above this zoom = show individual dots, below = show bubbles
const ZOOM_THRESHOLD = 15

const SEVERITY_COLORS = {
  minor: '#fbbf24', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626',
}

// ── Map Controls (bottom-right, NammaKasa style) ──
function MapControls() {
  const map = useMap()
  const { actions } = useApp()
  return (
    <div className="map-controls">
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
      <button className="map-ctrl-btn" onClick={() => map.zoomIn()} aria-label="Zoom in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="map-ctrl-btn" onClick={() => map.zoomOut()} aria-label="Zoom out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  )
}

// ── Track zoom level ──
function ZoomTracker({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  })
  return null
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

// ── Ward count bubbles — only visible at lower zoom levels ──
function WardBubbles({ boundaries, reportsByArea, onBubbleClick, visible }) {
  if (!boundaries || !visible) return null

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
    // NammaKasa-style: dark red circles scaled by count
    const baseSize = 28
    let size = Math.min(80, baseSize + (count * 5))
    
    const icon = L.divIcon({
      className: '',
      html: `<div class="ward-bubble has-reports" style="width:${size}px;height:${size}px;font-size:${size > 50 ? 18 : 14}px">
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
              center,
              isUrban: feature.properties.type === 'urban_sachivalayam',
              code: feature.properties.code,
            })
          }
        }}
      />
    )
  })
}

// ── Report dot markers — only visible at higher zoom levels ──
function ReportMarkers({ onReportPreview, visible }) {
  const { filteredReports, actions } = useApp()
  if (!visible) return null
  
  return filteredReports.map(report => {
    const isResolved = report.status === 'resolved'
    const isPending = report.cleaned_image_url && !isResolved
    const color = isResolved ? '#16a34a' : isPending ? '#f59e0b' : (SEVERITY_COLORS[report.severity] || '#f97316')
    return (
      <CircleMarker
        key={report.id}
        center={[report.lat, report.lng]}
        radius={7}
        pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }}
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

// ── Interactive boundary layer with hover/click ──
function InteractiveBoundaryLayer({ onHover, onSelect, reportsByArea, cityLimits }) {
  const [geojson, setGeojson] = useState(null)
  const hoveredRef = useRef(null)
  const map = useMap()

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  // Style for urban areas
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

  const onEachUrban = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const matchName = normalizeKey(name)
    const stats = reportsByArea?.[matchName]
    const count = stats?.total || 0

    layer.on({
      mouseover: (e) => {
        if (hoveredRef.current && hoveredRef.current !== e.target) {
          hoveredRef.current.setStyle({ weight: 0.5, color: 'rgba(0,0,0,0.06)' })
        }
        e.target.setStyle({ weight: 2, color: '#E8390E' })
        hoveredRef.current = e.target
        onHover?.({ name, count, isUrban: true, rawName: name })
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 0.5, color: 'rgba(0,0,0,0.06)' })
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        onSelect?.({ name, count, isUrban: true, rawName: name })
      }
    })
  }, [reportsByArea, onHover, onSelect])

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

  const onEachRural = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const matchName = normalizeKey(name)
    const stats = reportsByArea?.[matchName]
    const count = stats?.total || 0

    layer.on({
      mouseover: (e) => {
        if (hoveredRef.current && hoveredRef.current !== e.target) {
          hoveredRef.current.setStyle({ weight: 0.5, color: 'rgba(0,0,0,0.06)' })
        }
        e.target.setStyle({ weight: 2, color: '#E8390E' })
        hoveredRef.current = e.target
        onHover?.({ name, count, isUrban: false, rawName: name })
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 0.5, color: 'rgba(0,0,0,0.06)' })
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        onSelect?.({ name, count, isUrban: false, rawName: name })
      }
    })
  }, [reportsByArea, onHover, onSelect])

  if (!geojson) return null

  const urban = geojson.features.filter(f => f.properties.type === 'urban_sachivalayam')
  const rural = geojson.features.filter(f => f.properties.type !== 'urban_sachivalayam')

  // Outside-city mask
  let maskGeoJSON = null
  if (cityLimits) {
    try {
      const world = { type: 'Polygon', coordinates: [[[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]]] }
      const cityCoords = cityLimits.type === 'FeatureCollection'
        ? cityLimits.features[0].geometry.coordinates
        : cityLimits.geometry
          ? cityLimits.geometry.coordinates
          : cityLimits.coordinates
      maskGeoJSON = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [world.coordinates[0], ...(Array.isArray(cityCoords[0][0][0]) ? cityCoords.flat() : cityCoords)] }
      }
    } catch(e) {}
  }

  const maskStyle = {
    fillColor: '#f8f8fa',
    fillOpacity: 0.85,
    color: 'transparent',
    weight: 0,
    interactive: false
  }
  const boundaryLineStyle = {
    color: 'rgba(232,57,14,0.2)',
    weight: 1.5,
    dashArray: '6 4',
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

// ── Ward Complaints Sliding Panel ──
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

  const active = wardReports.filter(r => r.status !== 'resolved')
  const resolved = wardReports.filter(r => r.status === 'resolved')

  return (
    <div className="ward-complaints-backdrop" onClick={onClose}>
      <div className="ward-complaints-panel" onClick={(e) => e.stopPropagation()} ref={panelRef}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="wcp-drag-handle" />
        <div className="wcp-header">
          <div className="wcp-header-left">
            <div className="wcp-title">{displayName(wardName)}</div>
            <div className="wcp-subtitle">{active.length} active · {resolved.length} resolved</div>
          </div>
          <button className="wcp-close" onClick={onClose}>✕</button>
        </div>
        <div className="wcp-list">
          {wardReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 700 }}>No reports in this area</div>
            </div>
          ) : (
            wardReports.map(r => {
              const isResolved = r.status === 'resolved'
              return (
                <div key={r.id} className="wcp-item" onClick={() => onReportClick(r)}>
                  <div className={`wcp-dot ${r.severity}`} />
                  <img src={r.image_url} alt="" className="wcp-thumb"
                    onError={(e) => { e.target.style.display = 'none' }} />
                  <div className="wcp-info">
                    <TranslatedText text={r.landmark || displayName(r.assigned_area)} className="wcp-landmark" />
                    <div className="wcp-meta-row">
                      <span className={`wcp-severity ${r.severity}`}>{isResolved ? 'Resolved' : r.severity}</span>
                      <span className="wcp-time">{timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#ccc', flexShrink: 0 }}>→</div>
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
  const [complaintsPanel, setComplaintsPanel] = useState(null)
  const [previewReport, setPreviewReport] = useState(null)
  const [currentZoom, setCurrentZoom] = useState(RJY_ZOOM)
  const mapRef = useRef(null)

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

  // Zoom-based visibility
  const showBubbles = currentZoom < ZOOM_THRESHOLD
  const showDots = currentZoom >= ZOOM_THRESHOLD

  if (state.activeView !== 'map') return null

  const infoData = selectedWard || hoveredArea

  const handleWardSelect = (ward) => {
    setSelectedWard(ward)
    setPreviewReport(null)
  }

  const handleBubbleClick = (data) => {
    // Zoom into the ward, then show complaints panel
    if (mapRef.current) {
      mapRef.current.flyTo(data.center, ZOOM_THRESHOLD + 1, { duration: 0.8 })
    }
    // Open complaints panel after a short delay for the zoom animation
    setTimeout(() => {
      setComplaintsPanel({ name: data.name, rawName: data.name })
    }, 400)
    setSelectedWard(null)
    setPreviewReport(null)
  }

  const handleReportPreview = (report) => {
    if (state.isMobile) {
      setPreviewReport(report)
      setSelectedWard(null)
      setComplaintsPanel(null)
    } else {
      actions.selectReport(report)
    }
  }

  const handleViewReports = () => {
    if (selectedWard) {
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
      <MapContainer 
        center={RJY_CENTER} 
        zoom={RJY_ZOOM} 
        minZoom={12} 
        maxZoom={19}
        maxBounds={RJY_BOUNDS}
        maxBoundsViscosity={0.9}
        className="map-container" 
        zoomControl={false} 
        attributionControl={false}
        preferCanvas={true}
        whenReady={(e) => {
          mapRef.current = e.target
          e.target.on('click', handleMapClick)
        }}>
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
          maxZoom={19}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />
        <ZoomTracker onZoomChange={setCurrentZoom} />
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
          visible={showBubbles}
        />
        <ReportMarkers onReportPreview={handleReportPreview} visible={showDots} />
        <MapControls />
      </MapContainer>

      {/* Inline stats badges */}
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

      {/* Ward info panel — bottom-left, NammaKasa Kadumalleshwara style */}
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
