import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin } from "lucide-react";

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
}

export function LocationPicker({ value, onChange }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const start: L.LatLngExpression = value ? [value.lat, value.lng] : [-1.2921, 36.8219];
    const map = L.map(mapEl.current, { zoomControl: false }).setView(start, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM" }).addTo(map);
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,oklch(0.78 0.14 195),oklch(0.55 0.17 230));border:3px solid white;box-shadow:0 6px 20px -6px oklch(0.4 0.16 240 / 0.6);display:grid;place-items:center;color:white;font-weight:700;">📍</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const marker = L.marker(start, { draggable: true, icon }).addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      onChange({ lat: ll.lat, lng: ll.lng });
    });
    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    markerRef.current = marker;
    if (!value) {
      requestLocate();
    }
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        mapRef.current?.setView(ll, 16, { animate: true });
        markerRef.current?.setLatLng(ll);
        onChange({ lat: ll[0], lng: ll[1] });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="relative">
      <div ref={mapEl} className="h-56 w-full rounded-2xl overflow-hidden border border-border" />
      <button
        type="button"
        onClick={requestLocate}
        className="absolute bottom-3 right-3 z-[400] glass rounded-full px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-soft"
      >
        <Crosshair className={`size-3.5 ${locating ? "animate-spin" : ""}`} />
        {locating ? "Locating…" : "Use my location"}
      </button>
      {value && (
        <div className="absolute top-3 left-3 z-[400] glass rounded-full px-3 py-1.5 text-[11px] font-mono flex items-center gap-1">
          <MapPin className="size-3" /> {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </div>
      )}
    </div>
  );
}
