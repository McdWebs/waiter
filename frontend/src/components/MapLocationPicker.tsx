import { useCallback, useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Icon, type LatLngLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Fix default marker icon in Vite (bundler breaks default paths)
const markerIcon = new Icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const NOMINATIM_USER_AGENT = "AI-Waiter-Restaurant-Settings/1.0";

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch address");
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name?: string;
}

async function searchPlace(
  query: string,
): Promise<(LatLngLiteral & { display_name?: string }) | null> {
  if (!query.trim()) return null;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&limit=1`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    },
  );
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as NominatimSearchResult[];
  const first = data[0];
  if (!first) return null;
  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    display_name: first.display_name,
  };
}

const DEFAULT_CENTER: LatLngLiteral = { lat: 40.7128, lng: -74.006 };

function MapClickHandler({
  onPositionChange,
}: {
  onPositionChange: (latlng: LatLngLiteral) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });
  return null;
}

function MapCenterTo({ center }: { center: LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  useEffect(() => {
    map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

export interface MapLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  initialCenter?: LatLngLiteral | null;
}

export default function MapLocationPicker({
  open,
  onClose,
  onSelect,
  initialCenter,
}: MapLocationPickerProps) {
  const [position, setPosition] = useState<LatLngLiteral | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(DEFAULT_CENTER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // On open: get device location first, then show map centered there (or default)
  useEffect(() => {
    if (!open) {
      setMapReady(false);
      return;
    }
    setPosition(initialCenter ?? null);
    setError(null);
    setSearchError(null);
    setSearchQuery("");

    if (!navigator.geolocation) {
      setMapCenter(initialCenter ?? DEFAULT_CENTER);
      const t = setTimeout(() => setMapReady(true), 100);
      return () => clearTimeout(t);
    }

    const timeout = setTimeout(() => {
      setMapCenter(initialCenter ?? DEFAULT_CENTER);
      setMapReady(true);
    }, 4000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(center);
        if (!initialCenter) setPosition(center);
        clearTimeout(timeout);
        setTimeout(() => setMapReady(true), 50);
      },
      () => {
        setMapCenter(initialCenter ?? DEFAULT_CENTER);
        clearTimeout(timeout);
        setTimeout(() => setMapReady(true), 50);
      },
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 },
    );

    return () => clearTimeout(timeout);
  }, [open, initialCenter]);

  const handleConfirm = useCallback(async () => {
    if (!position) return;
    setLoading(true);
    setError(null);
    try {
      const address = await reverseGeocode(position.lat, position.lng);
      onSelect(address);
      onClose();
    } catch {
      setError("Could not get address for this location.");
    } finally {
      setLoading(false);
    }
  }, [position, onSelect, onClose]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await searchPlace(searchQuery);
      if (result) {
        setMapCenter(result);
        setPosition(result);
      } else {
        setSearchError("No results found. Try a different search.");
      }
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Pick location on map
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Search for an address or click on the map. Confirm to fill the
            address.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search address or place…"
              className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              aria-label="Search address or place"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {searching ? "…" : "Search"}
            </button>
          </div>
          {searchError && (
            <p className="mt-2 text-xs text-amber-600">{searchError}</p>
          )}
        </div>
        <div className="relative h-[320px] w-full shrink-0">
          {!mapReady && (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
              Getting your location…
            </div>
          )}
          {mapReady && (
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="h-full w-full"
              style={{ height: "100%", width: "100%", minHeight: 320 }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenterTo center={mapCenter} />
              <MapClickHandler onPositionChange={setPosition} />
              {position && <Marker position={position} icon={markerIcon} />}
            </MapContainer>
          )}
        </div>
        {error && <p className="px-4 py-2 text-xs text-amber-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!position || loading}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Resolving…" : "Use this location"}
          </button>
        </div>
      </div>
    </div>
  );
}
