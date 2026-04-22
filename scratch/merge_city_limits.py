import json
import shapely.geometry
import shapely.ops

# Load all wards
with open('app/public/rajahmundry_combined.geojson', 'r') as f:
    data = json.load(f)

polygons = []
for f in data['features']:
    if f['properties'].get('type') == 'urban_sachivalayam':
        geom = shapely.geometry.shape(f['geometry'])
        if not geom.is_valid:
            geom = geom.buffer(0)
        polygons.append(geom)

# Merge all polygons into one unified city boundary
city_boundary = shapely.ops.unary_union(polygons)

# Export to city_limits.geojson for the map to consume
output = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"name": "Rajamahendravaram City Limits"},
            "geometry": shapely.geometry.mapping(city_boundary)
        }
    ]
}

with open('app/public/city_limits.geojson', 'w') as f:
    json.dump(output, f)

print("Merged city limits successfully.")
