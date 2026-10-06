import L from 'leaflet';

/** Convertit une géofence (GeoJSON côté API) en couche Leaflet. */
export function geofenceLayer(g, opts = {}) {
  const style = { color: g.color || '#2563eb', weight: 2, fillOpacity: 0.12, ...opts };
  const layer = g.shape === 'circle'
    ? L.circle([g.center.coordinates[1], g.center.coordinates[0]], { radius: g.radius, ...style })
    : L.polygon(g.area.coordinates[0].map(([lng, lat]) => [lat, lng]), style);
  return layer.bindTooltip(g.name, { sticky: true });
}
