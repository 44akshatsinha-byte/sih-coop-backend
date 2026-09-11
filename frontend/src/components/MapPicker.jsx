import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

/** Map stays mounted across i18n changes — no key={language}. */
export default function MapPicker({ value, onChange, height = "16rem" }) {
  const center = useMemo(() => {
    if (value?.lat != null && value?.lng != null) return [value.lat, value.lng];
    return [28.6139, 77.209];
  }, [value?.lat, value?.lng]);

  return (
    <div style={{ height }} className="overflow-hidden rounded-card border border-[#cfc8b8]">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture onPick={onChange} />
        {value?.lat != null && value?.lng != null && (
          <Marker position={[value.lat, value.lng]} icon={pin} />
        )}
      </MapContainer>
    </div>
  );
}
