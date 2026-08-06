"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { LocateFixed, Loader2, Minus, Navigation, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface OsmMapProps {
  onLocationChange?: (lat: number, lng: number, source: "drag" | "geolocation" | "zoom" | "map") => void;
  onCurrentLocationResolved?: (lat: number, lng: number) => void;
  onCurrentLocationError?: (message: string) => void;
  onCurrentLocationLoadingChange?: (isLoading: boolean) => void;
  initialLat?: number;
  initialLng?: number;
  className?: string;
  squareControls?: boolean;
}

export function OsmMap({ onLocationChange, onCurrentLocationResolved, onCurrentLocationError, onCurrentLocationLoadingChange, initialLat, initialLng, className = "w-full h-[300px] rounded-xl overflow-hidden relative", squareControls = false }: OsmMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const suppressNextMoveEndRef = useRef(false);
  const initialPositionRef = useRef({ lat: initialLat, lng: initialLng });
  const moveSourceRef = useRef<"drag" | "geolocation" | "zoom" | "map">("map");
  const [isMoving, setIsMoving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const onLocationChangeRef = useRef(onLocationChange);
  const currentLocationResolvedRef = useRef(onCurrentLocationResolved);
  const currentLocationErrorRef = useRef(onCurrentLocationError);
  const currentLocationLoadingRef = useRef(onCurrentLocationLoadingChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    currentLocationResolvedRef.current = onCurrentLocationResolved;
    currentLocationErrorRef.current = onCurrentLocationError;
    currentLocationLoadingRef.current = onCurrentLocationLoadingChange;
  }, [onCurrentLocationError, onCurrentLocationLoadingChange, onCurrentLocationResolved]);

  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame: number | null = null;
    let isSynchronizingSize = false;

    const initMap = async () => {
      if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted) return;

      const startingLat = initialPositionRef.current.lat;
      const startingLng = initialPositionRef.current.lng;
      const defaultLat = startingLat ?? 10.762622;
      const defaultLng = startingLng ?? 106.660172;

      const container = mapContainerRef.current;
      // Clean up any leaflet leftovers inside the DOM element to guarantee fresh map load
      container.innerHTML = '';
      const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number | null };
      if (leafletContainer._leaflet_id) {
        leafletContainer._leaflet_id = null;
      }

      const map = L.map(container, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: false,
        keyboard: true,
        inertia: false,
        zoomSnap: 1,
      }).setView([defaultLat, defaultLng], 16);

      mapRef.current = map;

      const syncMapSize = () => {
        if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          if (!isMounted || mapRef.current !== map) return;
          isSynchronizingSize = true;
          map.invalidateSize({ animate: false, pan: true });
          requestAnimationFrame(() => {
            isSynchronizingSize = false;
          });
        });
      };

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(syncMapSize);
        resizeObserver.observe(container);
      }
      syncMapSize();

      L.tileLayer(
        process.env.NEXT_PUBLIC_OSM_TILE_URL || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 20,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      map.on("dragstart", () => {
        moveSourceRef.current = "drag";
        setIsMoving(true);
      });

      map.on("dragend", () => {
        setIsMoving(false);
      });

      map.on("zoomstart", () => {
        if (moveSourceRef.current !== "geolocation") {
          moveSourceRef.current = "zoom";
        }
      });

      map.on("moveend", () => {
        const pinPosition = map.containerPointToLatLng([
          container.clientWidth / 2,
          container.clientHeight / 2,
        ]);
        if (isSynchronizingSize) return;
        if (suppressNextMoveEndRef.current) {
          suppressNextMoveEndRef.current = false;
          return;
        }
        if (moveSourceRef.current === "zoom") {
          moveSourceRef.current = "map";
          return;
        }
        if (onLocationChangeRef.current) {
          onLocationChangeRef.current(
            pinPosition.lat,
            pinPosition.lng,
            moveSourceRef.current
          );
        }
        moveSourceRef.current = "map";
      });

      // Auto locate if no initial coordinates are passed
      if (startingLat == null && startingLng == null && navigator.geolocation) {
        setIsLocating(true);
        currentLocationLoadingRef.current?.(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!isMounted) return;
            const { latitude, longitude } = position.coords;
            setIsLocating(false);
            currentLocationLoadingRef.current?.(false);
            currentLocationResolvedRef.current?.(latitude, longitude);
            moveSourceRef.current = "geolocation";
            map.setView([latitude, longitude], 16, { animate: true });
          },
          (error) => {
            if (!isMounted) return;
            setIsLocating(false);
            currentLocationLoadingRef.current?.(false);
            console.error("Auto-location failed", error);
            currentLocationErrorRef.current?.(
              error.code === error.PERMISSION_DENIED
                ? "Vui lòng cho phép truy cập vị trí hiện tại để thêm địa chỉ."
                : "Không thể lấy vị trí hiện tại. Vui lòng thử lại."
            );
          }
        );
      } else if (startingLat == null && startingLng == null) {
        currentLocationErrorRef.current?.("Trình duyệt này không hỗ trợ định vị.");
      }
    };

    initMap();

    return () => {
      isMounted = false;
      resizeObserver?.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array so map only initializes once

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(initialLat) || !Number.isFinite(initialLng)) return;

    const current = map.getCenter();
    if (Math.abs(current.lat - initialLat!) < 0.000001 && Math.abs(current.lng - initialLng!) < 0.000001) {
      return;
    }

    suppressNextMoveEndRef.current = true;
    moveSourceRef.current = "map";
    map.setView([initialLat!, initialLng!], 16, { animate: true });
  }, [initialLat, initialLng]);

  const handleLocateMe = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const map = mapRef.current;
    if (navigator.geolocation && map) {
      setIsLocating(true);
      currentLocationLoadingRef.current?.(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          currentLocationResolvedRef.current?.(latitude, longitude);
          moveSourceRef.current = "geolocation";
          map.setView([latitude, longitude], 16, { animate: true });
          setIsLocating(false);
          currentLocationLoadingRef.current?.(false);
        },
        (error) => {
          setIsLocating(false);
          currentLocationLoadingRef.current?.(false);
          console.error("Error getting location", error);
          const message = error.code === error.PERMISSION_DENIED
            ? "Vui lòng cho phép truy cập vị trí hiện tại để thêm địa chỉ."
            : "Không thể lấy vị trí hiện tại. Vui lòng thử lại.";
          currentLocationErrorRef.current?.(message);
          if (error.code === error.PERMISSION_DENIED) {
            alert(message);
          } else {
            alert(message);
          }
        }
      );
    } else {
      currentLocationErrorRef.current?.("Trình duyệt này không hỗ trợ định vị.");
    }
  };

  return (
    <div
      className={`${className} bg-[#eef2ef] [&_.leaflet-control-attribution]:!m-0 [&_.leaflet-control-attribution]:!bg-white/80 [&_.leaflet-control-attribution]:!px-1.5 [&_.leaflet-control-attribution]:!py-0.5 [&_.leaflet-control-attribution]:!text-[8px] [&_.leaflet-control-attribution]:!text-neutral-500`}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={mapContainerRef} className="h-full w-full bg-[#eef2ef]" style={{ zIndex: 0 }} />


      <button
        type="button"
        onClick={handleLocateMe}
        disabled={isLocating}
        aria-label="Lấy vị trí hiện tại"
        className={`absolute top-2 left-3 z-20 flex h-10 items-center justify-center gap-2 border border-black/5 bg-white px-3.5 text-xs font-bold text-[#008f45] shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition-all hover:bg-[#f2fff7] active:scale-[0.98] disabled:opacity-60 ${squareControls ? "rounded-none" : "rounded-full"}`}
      >
        {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
        <span>{isLocating ? "Đang lấy vị trí…" : "Lấy vị trí hiện tại"}</span>
      </button>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[64px] w-[44px] -translate-x-1/2 -translate-y-full"
      >
        <svg
          viewBox="0 0 44 64"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.22)]"
        >
          <path
            d="M22 0C9.85 0 0 9.85 0 22C0 39.8 13 54.8 22 64C31 54.8 44 39.8 44 22C44 9.85 34.15 0 22 0Z"
            fill="white"
          />
          <path
            d="M22 4C12.059 4 4 12.059 4 22C4 36.4 14.5 49.7 22 57.8C29.5 49.7 40 36.4 40 22C40 12.059 31.941 4 22 4Z"
            fill="#00b14f"
          />
        </svg>
        <Navigation className="absolute left-[48%] top-[13px] z-10 h-[21px] w-[21px] -translate-x-1/2 -rotate-3 fill-white text-white" strokeWidth={1.9} />
      </div>

      <div className={`pointer-events-none absolute left-1/2 top-1/2 z-10 h-1 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#174d31]/35 shadow-[0_1px_2px_rgba(0,80,40,0.32)] transition-all duration-150 ${isMoving ? "scale-50 opacity-25" : "opacity-80"}`} />



      <div className={`absolute right-3 top-3 z-20 grid overflow-hidden border border-black/5 bg-white shadow-[0_4px_18px_rgba(0,0,0,0.12)] ${squareControls ? "rounded-none" : "rounded-lg"}`}>
        <button type="button" aria-label="Phóng to" onClick={() => mapRef.current?.zoomIn()} className="flex h-9 w-9 items-center justify-center text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"><Plus className="h-4 w-4" /></button>
        <span className="mx-2 border-t border-neutral-200" />
        <button type="button" aria-label="Thu nhỏ" onClick={() => mapRef.current?.zoomOut()} className="flex h-9 w-9 items-center justify-center text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"><Minus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
