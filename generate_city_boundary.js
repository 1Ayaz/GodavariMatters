const fs = require('fs')
const turf = require('@turf/turf')

const data = JSON.parse(fs.readFileSync('./app/public/rajahmundry_combined.geojson'))
const urbanFeatures = data.features.filter(f => f.properties.type === 'urban_sachivalayam')

const featureCollection = turf.featureCollection(urbanFeatures)
const dissolved = turf.dissolve(featureCollection)

fs.writeFileSync('./app/public/city_limits.geojson', JSON.stringify(dissolved))
console.log('City limits generated successfully!')
