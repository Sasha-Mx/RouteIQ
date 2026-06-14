export function estimateAutoFare(distanceKm) {
  if (distanceKm <= 1.5) return 25;
  return Math.round(25 + (distanceKm - 1.5) * 9.5);
}

export function estimateUberFare(distanceKm, isPeakHour) {
  const surge = isPeakHour ? 1.3 : 1.0;
  return Math.round((50 + distanceKm * 12) * surge);
}

export function estimateRapidoFare(distanceKm) {
  return Math.round(25 + distanceKm * 6);
}

export function estimateOlaFare(distanceKm) {
  return Math.round(45 + distanceKm * 11);
}

export function estimateUberBikeFare(distanceKm) {
  return Math.round(20 + distanceKm * 5);
}

export function isPeakHour() {
  const h = new Date().getHours();
  return (h >= 8 && h <= 10) || (h >= 17 && h <= 20);
}

export function distanceFromLatLng(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
