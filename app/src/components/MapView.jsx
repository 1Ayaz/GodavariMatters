import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'
import { t } from '../lib/i18n'
import { displayName, normalizeKey } from '../lib/names'
import TranslatedText from '../lib/TranslatedText'
import { timeAgo } from '../lib/utils'

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

// ── Report dot markers — clustered ──
function ReportMarkers({ onReportPreview, visible }) {
  const { filteredReports } = useApp()
  if (!visible) return null
  
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={45}
      showCoverageOnHover={false}
      spiderfyOnMaxZoom={true}
      iconCreateFunction={(cluster) => {
        const count = cluster.getChildCount()
        const markers = cluster.getAllChildMarkers()
        
        // A marker is resolved if its HTML contains the green background color #16a34a
        const activeCount = markers.filter(m => !m.options.icon.options.html.includes('#16a34a')).length
        
        const size = Math.min(60, 32 + (count * 2))
        
        if (activeCount === 0) {
          // All reports are resolved: Green Bubble with total resolved count
          return L.divIcon({
            html: `<div class="ward-bubble" style="background:#16a34a;box-shadow:0 3px 12px rgba(22,163,74,0.4);border:2.5px solid rgba(255,255,255,0.5);width:${size}px;height:${size}px;font-size:${size > 40 ? 16 : 13}px">${count}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          })
        }
        
        // Has active reports: Red Bubble with active issues count
        return L.divIcon({
          html: `<div class="ward-bubble has-reports" style="width:${size}px;height:${size}px;font-size:${size > 40 ? 16 : 13}px">${activeCount}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        })
      }}
    >
      {filteredReports.map(report => {
        const isResolved = report.status === 'resolved'
        const isPending = report.cleaned_image_url && !isResolved
        const color = isResolved ? '#16a34a' : isPending ? '#f59e0b' : (SEVERITY_COLORS[report.severity] || '#f97316')
        
        const dotIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })

        return (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={dotIcon}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e)
                onReportPreview?.(report)
              }
            }}
          />
        )
      })}
    </MarkerClusterGroup>
  )
}

// ── Interactive boundary layer with hover/click ──
function InteractiveBoundaryLayer({ onHover, onWardZoom, reportsByArea, cityLimits }) {
  const [geojson, setGeojson] = useState(null)
  const hoveredRef = useRef(null)
  const map = useMap()

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  // Single style function for both urban and rural — logic is identical
  const getBoundaryStyle = useCallback((feature) => {
    let name = normalizeKey(feature.properties.name || '')
    if (name.includes('SESHAYYAMETTA')) name = 'SESHAYYAMETTA'
    const stats = reportsByArea?.[name]
    const count = stats?.total || 0
    const resolved = stats?.resolved || 0
    const isFullyResolved = count > 0 && count === resolved
    const fillOpacity = count > 0 ? Math.min(0.6, 0.05 + count * 0.05) : 0
    return {
      color: 'rgba(0,0,0,0.06)',
      weight: 0.5,
      opacity: 0.3,
      fillColor: isFullyResolved ? '#16a34a' : '#E8390E',
      fillOpacity,
    }
  }, [reportsByArea])

  // Factory — returns the onEachFeature callback with isUrban closed over
  const makeOnEachFeature = useCallback((isUrban) => (feature, layer) => {
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
        onHover?.({ name, count, isUrban, rawName: name })
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 0.5, color: 'rgba(0,0,0,0.06)' })
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        const bounds = e.target.getBounds()
        onWardZoom?.({ name, count, isUrban, rawName: name, bounds })
      }
    })
  }, [reportsByArea, onHover, onWardZoom])

  const onEachUrban = useMemo(() => makeOnEachFeature(true), [makeOnEachFeature])
  const onEachRural = useMemo(() => makeOnEachFeature(false), [makeOnEachFeature])

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
      <GeoJSON key="rural" data={rural} style={getBoundaryStyle} onEachFeature={onEachRural} />
      <GeoJSON key="urban" data={urban} style={getBoundaryStyle} onEachFeature={onEachUrban} />
    </>
  )
}



// ── MAIN MAP VIEW ──
export default function MapView() {
  const { state, actions } = useApp()
  const [boundaries, setBoundaries] = useState(null)
  const [cityLimits, setCityLimits] = useState(null)
  const [hoveredArea, setHoveredArea] = useState(null)
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

  const showBubbles = currentZoom < ZOOM_THRESHOLD

  if (state.activeView !== 'map') return null

  // Ward click → auto-zoom into the ward boundary (flyToBounds)
  const handleWardZoom = (ward) => {
    if (mapRef.current && ward.bounds) {
      mapRef.current.flyToBounds(ward.bounds, {
        padding: [40, 40],
        maxZoom: ZOOM_THRESHOLD + 1,
        duration: 0.8,
      })
    }
    setPreviewReport(null)
  }

  const handleBubbleClick = (data) => {
    // Zoom into the ward directly
    if (mapRef.current) {
      mapRef.current.flyTo(data.center, ZOOM_THRESHOLD + 1, { duration: 0.8 })
    }
  }

  const handleReportPreview = (report) => {
    actions.selectReport(report)
  }

  const handleMapClick = () => {
    // Left empty since preview report is removed
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
          onWardZoom={handleWardZoom}
          reportsByArea={reportsByArea}
          cityLimits={cityLimits}
        />
        <WardBubbles 
          boundaries={boundaries} 
          reportsByArea={reportsByArea} 
          onBubbleClick={handleBubbleClick}
          visible={showBubbles}
        />
        <ReportMarkers onReportPreview={handleReportPreview} visible={!showBubbles} />
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

      {/* Ward hover info panel — bottom-right, NammaKasa style: name + type only */}
      {hoveredArea && (
        <div className="map-info-panel mip-light">
          <div className="mip-indicator" />
          <div className="mip-content">
            <div className="mip-name">{displayName(hoveredArea.name)}</div>
            <div className="mip-meta">
              {hoveredArea.isUrban ? t('sachivalayam_urban', lang) : t('gram_panchayat', lang)}
              {hoveredArea.count > 0 && (
                <span> · <strong style={{ color: 'var(--accent)' }}>{hoveredArea.count}</strong> {hoveredArea.count !== 1 ? t('reports_word', lang) : t('report_word', lang)}</span>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}