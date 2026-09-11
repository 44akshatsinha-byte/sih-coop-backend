import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function RecenterMap({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value?.lat != null && value?.lng != null) {
      map.setView([value.lat, value.lng], Math.max(map.getZoom() || 14, 14), {
        animate: true
      });
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, [value?.lat, value?.lng, map]);
  return null;
}

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

/** Interactive Map with auto-recentering, tile invalidation, and drag-drop marker */
export default function MapPicker({ value, onChange, height = "18rem" }) {
  const center = useMemo(() => {
    if (value?.lat != null && value?.lng != null) return [value.lat, value.lng];
    return [12.9716, 77.5946];
  }, [value?.lat, value?.lng]);

  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          onChange({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onChange]
  );

  return (
    <div style={{ height }} className="overflow-hidden rounded-card border border-[#cfc8b8] relative shadow-inner">
      <MapContainer center={center} zoom={value?.lat != null ? 14 : 12} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture onPick={onChange} />
        <RecenterMap value={value} />
        {value?.lat != null && value?.lng != null && (
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[value.lat, value.lng]}
            icon={pin}
            ref={markerRef}
          />
        )}
      </MapContainer>
    </div>
  );
}
