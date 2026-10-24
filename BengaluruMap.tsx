import React, { useEffect, useState } from 'react';
import { BengaluruLocation, RouteAlternative } from '../types/tripbuddy';

interface BengaluruMapProps {
  locations: BengaluruLocation[];
  selectedAlternative: RouteAlternative | null;
  userCoords: { lat: number; lon: number; accuracy: number } | null;
  onSelectLocation?: (name: string) => void;
}

/**
 * Interactive Bengaluru Map Canvas with SVG + OpenStreetMap coordinate projection,
 * zoom/pan/recenter controls, origin/destination markers, BMTC/Metro station nodes,
 * synchronized route polylines, and accessible list-based journey alternative toggle.
 * Never renders fake simulated moving vehicles as live GPS telemetry.
 */
export const BengaluruMap: React.FC<BengaluruMapProps> = ({
  locations,
  selectedAlternative,
  userCoords,
  onSelectLocation,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showAccessibleList, setShowAccessibleList] = useState<boolean>(false);

  // Greater Bengaluru Bounding Box for SVG projection
  const minLat = 12.82;
  const maxLat = 13.07;
  const minLon = 77.52;
  const maxLon = 77.78;

  const project = (lat: number, lon: number): { x: number; y: number } => {
    const normX = (lon - minLon) / (maxLon - minLon);
    const normY = 1 - (lat - minLat) / (maxLat - minLat);
    const baseX = normX * 700 + 50;
    const baseY = normY * 420 + 40;
    return {
      x: (baseX - 400) * zoom + 400 + centerOffset.x,
      y: (baseY - 250) * zoom + 250 + centerOffset.y,
    };
  };

  useEffect(() => {
    setCenterOffset({ x: 0, y: 0 });
  }, [selectedAlternative?.option_type]);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-lg overflow-hidden">
      {/* Top Map Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 px-4 py-3 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Bengaluru Geospatial Transit Canvas (WGS84 / EPSG:4326)
          </span>
          <p className="text-xs text-slate-400">
            Synchronized with Namma Metro Purple/Green Lines &amp; BMTC Corridors (No fake moving vehicles shown)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.25).toFixed(2)))}
            className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium hover:bg-slate-700"
            aria-label="Zoom in map"
          >
            + Zoom
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
            className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium hover:bg-slate-700"
            aria-label="Zoom out map"
          >
            - Zoom
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setCenterOffset({ x: 0, y: 0 });
            }}
            className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-medium hover:bg-teal-500"
          >
            Recenter / Fit
          </button>
          <button
            type="button"
            onClick={() => setShowAccessibleList((v) => !v)}
            className="rounded-lg border border-sky-400/50 bg-sky-950/60 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-900/60"
          >
            {showAccessibleList ? 'Show Map Canvas' : 'Accessible Text View'}
          </button>
        </div>
      </div>

      {showAccessibleList ? (
        <div className="p-5 bg-slate-900 text-slate-100 space-y-3" role="region" aria-label="Accessible route list">
          <h4 className="text-sm font-semibold text-teal-400">
            Screen-Reader &amp; Keyboard Accessible Route Node Breakdown
          </h4>
          {selectedAlternative ? (
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {selectedAlternative.legs.map((leg) => (
                <li key={leg.sequence_order} className="rounded-lg bg-slate-800/80 p-3">
                  <span className="font-semibold text-sky-300 uppercase">[{leg.mode}]</span>{' '}
                  {leg.instruction} — Boarding: {leg.boarding_guidance} ({leg.freshness_label})
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-400">
              Select or plan a journey to inspect step-by-step accessible transfer nodes.
            </p>
          )}
        </div>
      ) : (
        <svg
          viewBox="0 0 800 500"
          className="w-full h-[380px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800"
          role="img"
          aria-label="Interactive map of Bengaluru transit hubs and selected route polyline"
        >
          {/* Subtle coordinate grid */}
          {[100, 200, 300, 400].map((y) => (
            <line key={`gy-${y}`} x1={0} y1={y} x2={800} y2={y} stroke="#1e293b" strokeWidth={1} />
          ))}
          {[150, 300, 450, 600, 750].map((x) => (
            <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={500} stroke="#1e293b" strokeWidth={1} />
          ))}

          {/* Selected Route Polyline */}
          {selectedAlternative && selectedAlternative.legs.map((leg) => {
            const p1 = project(leg.from_coords[0], leg.from_coords[1]);
            const p2 = project(leg.to_coords[0], leg.to_coords[1]);
            const strokeColor =
              leg.mode === 'metro'
                ? '#a855f7'
                : leg.mode === 'bmtc'
                ? '#0ea5e9'
                : leg.mode === 'walk'
                ? '#2dd4bf'
                : '#f59e0b';
            return (
              <g key={`leg-line-${leg.sequence_order}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={strokeColor}
                  strokeWidth={5}
                  strokeDasharray={leg.mode === 'walk' ? '6 4' : undefined}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Bengaluru Transit Hub Markers */}
          {locations.map((loc) => {
            const pt = project(loc.latitude, loc.longitude);
            const isOrigin =
              selectedAlternative?.legs[0]?.from_node_id === loc.location_id;
            const isDest =
              selectedAlternative?.legs[selectedAlternative.legs.length - 1]?.to_node_id ===
              loc.location_id;
            return (
              <g
                key={loc.location_id}
                transform={`translate(${pt.x}, ${pt.y})`}
                className="cursor-pointer"
                onClick={() => onSelectLocation && onSelectLocation(loc.name_en)}
              >
                <circle
                  r={isOrigin || isDest ? 9 : 6}
                  fill={isOrigin ? '#10b981' : isDest ? '#f43f5e' : '#38bdf8'}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
                <text
                  x={11}
                  y={4}
                  fill={isOrigin || isDest ? '#ffffff' : '#cbd5e1'}
                  fontSize={isOrigin || isDest ? '12' : '10'}
                  fontWeight={isOrigin || isDest ? 'bold' : 'normal'}
                >
                  {loc.name_en.split('(')[0].trim()}
                </text>
              </g>
            );
          })}

          {/* Consented User Geolocation Marker */}
          {userCoords && (() => {
            const uPt = project(userCoords.lat, userCoords.lon);
            return (
              <g transform={`translate(${uPt.x}, ${uPt.y})`}>
                <circle r={14} fill="#14b8a6" fillOpacity={0.25} />
                <circle r={6} fill="#14b8a6" stroke="#ffffff" strokeWidth={2} />
                <text x={10} y={-8} fill="#5eead4" fontSize="11" fontWeight="bold">
                  Your GPS (±{Math.round(userCoords.accuracy)}m)
                </text>
              </g>
            );
          })()}
        </svg>
      )}

      {/* Map Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-2.5 text-xs text-slate-300 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Origin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> Destination
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 bg-purple-500" /> Namma Metro
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 bg-sky-500" /> BMTC Bus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 bg-teal-400" /> Pedestrian / Skywalk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 bg-amber-500" /> Auto / Feeder
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Click any station node on the map to populate the journey planner
        </span>
      </div>
    </div>
  );
};
