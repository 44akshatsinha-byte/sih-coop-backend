function parseUrgency(value) {
  const v = String(value || "normal").toLowerCase();
  return v === "emergency" || v === "on-demand" ? "emergency" : "normal";
}

function parseLocationPoint(body = {}) {
  const { locationPoint, latitude, longitude, lat, lng } = body;

  if (locationPoint && Array.isArray(locationPoint.coordinates) && locationPoint.coordinates.length >= 2) {
    const [cLng, cLat] = locationPoint.coordinates.map(Number);
    if (Number.isFinite(cLat) && Number.isFinite(cLng)) {
      return { type: "Point", coordinates: [cLng, cLat] };
    }
  }

  const la = Number(latitude != null ? latitude : lat);
  const lo = Number(longitude != null ? longitude : lng);
  if (Number.isFinite(la) && Number.isFinite(lo)) {
    if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
    return { type: "Point", coordinates: [lo, la] };
  }

  return undefined;
}

function coordsFromPoint(point) {
  if (!point || !Array.isArray(point.coordinates) || point.coordinates.length < 2) {
    return null;
  }
  const [lng, lat] = point.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

module.exports = { parseUrgency, parseLocationPoint, coordsFromPoint };
