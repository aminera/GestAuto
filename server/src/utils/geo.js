const R = 6371; // rayon terrestre (km)
const rad = (d) => (d * Math.PI) / 180;

/** Distance haversine en km entre deux points {lat, lng}. */
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Test point-dans-polygone (ray casting). polygon = [[lng, lat], ...] */
export function pointInPolygon({ lat, lng }, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Vrai si le point est dans la géofence (cercle ou polygone). */
export function isInsideGeofence(point, geofence) {
  if (geofence.shape === 'circle') {
    const [lng, lat] = geofence.center.coordinates;
    return haversineKm(point, { lat, lng }) * 1000 <= geofence.radius;
  }
  return pointInPolygon(point, geofence.area.coordinates[0]);
}
