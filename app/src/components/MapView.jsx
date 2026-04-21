import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, useMap, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'
import StatsPanel from './StatsPanel'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const RJY_CENTER = [17.0005, 81.804]
const SEVERITY_COLORS = {
  minor: '#fb923c',
  moderate: '#f97316',
  severe: '#ef4444',
  critical: '#dc2626',
}

function MapControls() {
  const map = useMap()
  const { actions } = useApp()

  const handleZoomIn = () => map.zoomIn()
  const handleZoomOut = () => map.zoomOut()
  const handleGPS = () => {
    if (!navigator.geolocation) return alert('GPS not available')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 })
        actions.setUserLocation(loc)
      },
      () => alert('Could not get your location. Please enable GPS.')
    )
  }

  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={handleZoomIn} title="Zoom In">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="map-ctrl-btn" onClick={handleZoomOut} title="Zoom Out">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="map-ctrl-btn gps-btn" onClick={handleGPS} title="My Location">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
      </button>
    </div>
  )
}

function BoundaryLayer() {
  const [geojson, setGeojson] = useState(null)
  const { state } = useApp()

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  // Count reports per area for coloring
  const reportsByArea = {}
  state.reports.forEach(r => {
    const area = r.assigned_area || ''
    if (!reportsByArea[area]) reportsByArea[area] = 0
    reportsByArea[area]++
  })

  const style = useCallback((feature) => {
    const isUrban = feature.properties.type === 'urban_sachivalayam'
    const name = feature.properties.name || ''
    const count = reportsByArea[name] || 0
    const fillOpacity = count > 0 ? Math.min(0.35, 0.05 + count * 0.03) : (isUrban ? 0.04 : 0.02)
    return {
      color: isUrban ? '#E8390E' : '#94a3b8',
      weight: isUrban ? 1.2 : 0.6,
      opacity: isUrban ? 0.5 : 0.25,
      fillColor: count > 0 ? '#E8390E' : (isUrban ? '#E8390E' : '#94a3b8'),
      fillOpacity,
    }
  }, [reportsByArea])

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const isUrban = feature.properties.type === 'urban_sachivalayam'
    const count = reportsByArea[name] || 0

    // Hover highlight + tooltip
    layer.on('mouseover', (e) => {
      layer.setStyle({
        weight: 2.5,
        fillOpacity: 0.3,
        fillColor: '#E8390E',
        opacity: 0.9,
      })
      layer.bringToFront()
      // Show tooltip at mouse position
      const tooltip = L.tooltip({ className: 'ward-tooltip', direction: 'top', offset: [0, -10] })
        .setContent(`<strong>${name}</strong><br/>${isUrban ? 'Urban Sachivalayam' : 'Rural'}<br/>${count} report${count !== 1 ? 's' : ''}`)
        .setLatLng(e.latlng)
      layer._customTooltip = tooltip
      tooltip.addTo(e.target._map)
    })
    layer.on('mousemove', (e) => {
      if (layer._customTooltip) layer._customTooltip.setLatLng(e.latlng)
    })
    layer.on('mouseout', (e) => {
      layer.setStyle(style(feature))
      if (layer._customTooltip) {
        e.target._map.removeLayer(layer._customTooltip)
        layer._customTooltip = null
      }
    })
  }, [reportsByArea, style])

  if (!geojson) return null

  // Split: render rural first (behind), urban second (on top)
  const rural = { ...geojson, features: geojson.features.filter(f => f.properties.type !== 'urban_sachivalayam') }
  const urban = { ...geojson, features: geojson.features.filter(f => f.properties.type === 'urban_sachivalayam') }

  return (
    <>
      <GeoJSON data={rural} style={style} onEachFeature={onEachFeature} key={'rural-' + JSON.stringify(reportsByArea)} />
      <GeoJSON data={urban} style={style} onEachFeature={onEachFeature} key={'urban-' + JSON.stringify(reportsByArea)} />
    </>
  )
}

function ReportMarkers() {
  const { filteredReports, actions } = useApp()

  return filteredReports.map(report => {
    const isResolved = report.status === 'resolved'
    const color = isResolved ? '#16a34a' : (SEVERITY_COLORS[report.severity] || '#f97316')

    return (
      <CircleMarker
        key={report.id}
        center={[report.lat, report.lng]}
        radius={8}
        pathOptions={{
          color: '#fff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.9,
        }}
        eventHandlers={{
          click: () => actions.selectReport(report)
        }}
      />
    )
  })
}

export default function MapView() {
  const { state } = useApp()

  if (state.activeView !== 'map') return null

  return (
    <div className="view-panel map-panel active">
      <MapContainer
        center={RJY_CENTER}
        zoom={13}
        className="map-container"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <BoundaryLayer />
        <ReportMarkers />
        <MapControls />
      </MapContainer>
      <StatsPanel />
    </div>
  )
}
