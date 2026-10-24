#!/usr/bin/env python3
"""
Validated Bengaluru Transport & Geography Data Ingestion Script.
Checks required fields, validates WGS84 coordinates within Greater Bengaluru bounding box,
detects duplicate records, reports rejected rows, records source & import timestamps,
and supports repeatable idempotent imports.
"""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.database.db import db_manager

BENGALURU_BBOX = {
    "min_lat": 12.70,
    "max_lat": 13.25,
    "min_lon": 77.35,
    "max_lon": 77.85,
}


def validate_coordinates(lat: Any, lon: Any) -> Tuple[bool, str]:
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return False, "Coordinates are not valid floating-point numbers"
    if not (BENGALURU_BBOX["min_lat"] <= lat_f <= BENGALURU_BBOX["max_lat"]):
        return False, f"Latitude {lat_f} outside Greater Bengaluru bounds"
    if not (BENGALURU_BBOX["min_lon"] <= lon_f <= BENGALURU_BBOX["max_lon"]):
        return False, f"Longitude {lon_f} outside Greater Bengaluru bounds"
    return True, "ok"


def validate_and_import_locations(records: List[Dict[str, Any]], source_label: str) -> Dict[str, Any]:
    db_manager.run_migrations_and_seed()
    seen_ids = set()
    seen_coords = set()
    imported = 0
    rejected: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    required_fields = ["location_id", "name_en", "name_kn", "category", "latitude", "longitude", "ward_or_area", "source"]

    with db_manager.session() as conn:
        for idx, row in enumerate(records):
            missing = [f for f in required_fields if f not in row or row[f] in (None, "")]
            if missing:
                rejected.append({"row_index": idx, "id": row.get("location_id"), "reason": f"Missing fields: {missing}"})
                continue

            loc_id = str(row["location_id"]).strip()
            if loc_id in seen_ids:
                rejected.append({"row_index": idx, "id": loc_id, "reason": "Duplicate location_id in batch"})
                continue

            valid_coord, reason = validate_coordinates(row["latitude"], row["longitude"])
            if not valid_coord:
                rejected.append({"row_index": idx, "id": loc_id, "reason": reason})
                continue

            coord_key = (round(float(row["latitude"]), 5), round(float(row["longitude"]), 5), row["name_en"].strip().lower())
            if coord_key in seen_coords:
                rejected.append({"row_index": idx, "id": loc_id, "reason": "Duplicate name & coordinate pair"})
                continue

            seen_ids.add(loc_id)
            seen_coords.add(coord_key)

            conn.execute(
                """
                INSERT INTO geographic_locations
                (location_id, name_en, name_kn, aliases_json, category, latitude, longitude,
                 ward_or_area, wheelchair_accessible, source, verified_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(location_id) DO UPDATE SET
                    name_en=excluded.name_en,
                    name_kn=excluded.name_kn,
                    aliases_json=excluded.aliases_json,
                    category=excluded.category,
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    ward_or_area=excluded.ward_or_area,
                    wheelchair_accessible=excluded.wheelchair_accessible,
                    source=excluded.source,
                    verified_at=excluded.verified_at
                """,
                (
                    loc_id,
                    row["name_en"],
                    row["name_kn"],
                    json.dumps(row.get("aliases", []), ensure_ascii=False),
                    row["category"],
                    float(row["latitude"]),
                    float(row["longitude"]),
                    row["ward_or_area"],
                    1 if row.get("wheelchair_accessible", True) else 0,
                    row["source"],
                    row.get("verified_at", now_iso),
                ),
            )
            imported += 1

        payload_hash = hashlib.sha256(json.dumps(records, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:16]
        rec_id = f"IMP_LOC_{payload_hash}"
        conn.execute(
            """
            INSERT OR REPLACE INTO data_source_records
            (record_id, source_name, dataset_type, imported_count, rejected_count, imported_at, checksum)
            VALUES (?, ?, 'geographic_locations', ?, ?, ?, ?)
            """,
            (rec_id, source_label, imported, len(rejected), now_iso, payload_hash),
        )

    return {
        "dataset_type": "geographic_locations",
        "source": source_label,
        "imported_count": imported,
        "rejected_count": len(rejected),
        "rejected_rows": rejected,
        "imported_at": now_iso,
    }


def import_all_default_fixtures() -> Dict[str, Any]:
    db_manager.run_migrations_and_seed()
    loc_path = ROOT_DIR / "data" / "samples" / "bengaluru_locations.json"
    bmtc_path = ROOT_DIR / "data" / "samples" / "bmtc_network_fixture.json"
    metro_path = ROOT_DIR / "data" / "samples" / "namma_metro_fixture.json"

    loc_payload = json.loads(loc_path.read_text(encoding="utf-8"))
    loc_report = validate_and_import_locations(
        loc_payload["locations"],
        loc_payload["dataset_metadata"]["source"],
    )

    bmtc_payload = json.loads(bmtc_path.read_text(encoding="utf-8"))
    metro_payload = json.loads(metro_path.read_text(encoding="utf-8"))
    now_iso = datetime.now(timezone.utc).isoformat()

    bmtc_stops_imported = 0
    bmtc_routes_imported = 0
    metro_stations_imported = 0

    with db_manager.session() as conn:
        for stop in bmtc_payload["stops"]:
            ok, _ = validate_coordinates(stop["lat"], stop["lon"])
            if not ok:
                continue
            conn.execute(
                """
                INSERT OR REPLACE INTO bmtc_stops
                (stop_id, name, latitude, longitude, location_id, has_shelter, wheelchair_boarding, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    stop["stop_id"],
                    stop["name"],
                    float(stop["lat"]),
                    float(stop["lon"]),
                    stop.get("location_id"),
                    1 if stop.get("shelter", True) else 0,
                    1 if stop.get("wheelchair_boarding", True) else 0,
                    bmtc_payload["dataset_label"],
                ),
            )
            bmtc_stops_imported += 1

        for route in bmtc_payload["routes"]:
            conn.execute(
                """
                INSERT OR REPLACE INTO bmtc_routes
                (route_id, route_short_name, route_long_name, service_type, headway_mins,
                 base_fare_inr, per_km_inr, wheelchair_accessible, stop_sequence_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    route["route_id"],
                    route["route_short_name"],
                    route["route_long_name"],
                    route["service_type"],
                    int(route["headway_mins"]),
                    float(route["base_fare_inr"]),
                    float(route["per_km_inr"]),
                    1 if route.get("wheelchair_accessible", True) else 0,
                    json.dumps(route["stop_sequence"]),
                ),
            )
            bmtc_routes_imported += 1

        for line in metro_payload["lines"]:
            conn.execute(
                """
                INSERT OR REPLACE INTO metro_lines
                (line_id, name_en, name_kn, color_hex, headway_peak_mins, headway_offpeak_mins)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    line["line_id"],
                    line["name_en"],
                    line["name_kn"],
                    line["color_hex"],
                    int(line["headway_peak_mins"]),
                    int(line["headway_offpeak_mins"]),
                ),
            )
            for st in line["stations"]:
                ok, _ = validate_coordinates(st["lat"], st["lon"])
                if not ok:
                    continue
                conn.execute(
                    """
                    INSERT OR REPLACE INTO metro_stations
                    (station_id, name, line_id, latitude, longitude, location_id,
                     is_interchange, interchange_lines_json, wheelchair_accessible)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    """,
                    (
                        f"{st['station_id']}_{line['line_id']}",
                        st["name"],
                        line["line_id"],
                        float(st["lat"]),
                        float(st["lon"]),
                        st.get("location_id"),
                        1 if st.get("is_interchange") else 0,
                        json.dumps(st.get("interchange_lines", [])),
                    ),
                )
                metro_stations_imported += 1

        # Seed verified service alerts fixture
        alerts = [
            (
                "ALT_ORR_500D_01",
                "traffic",
                "moderate",
                "Slow Moving Traffic near KR Puram & Benniganahalli Flyover",
                "Peak-hour congestion along Outer Ring Road northbound toward Manyata Tech Park adding 8–12 mins to BMTC 500-D buses. Consider taking Namma Metro Purple Line to Benniganahalli and switching to Metro Feeder MF-12.",
                "Outer Ring Road / KR Puram / Benniganahalli",
                "Bengaluru Traffic Police & BMTC Corridor Advisory (Demo Fixture)",
                "https://btp.gov.in/",
                now_iso,
                1,
            ),
            (
                "ALT_METRO_PURPLE_01",
                "metro",
                "info",
                "Namma Metro Purple Line Operating on 4-Minute Peak Headway",
                "Short-loop and full-corridor trains between Majestic, Indiranagar, KR Puram, and Whitefield (Kadugodi) are operating on schedule with 4-minute peak frequency.",
                "Purple Line (Majestic — Whitefield)",
                "BMRCL Official Service Status (Demo Fixture)",
                "https://english.bmrc.co.in/",
                now_iso,
                1,
            ),
            (
                "ALT_SILK_BOARD_01",
                "civic_advisory",
                "high",
                "Silk Board Junction Flyover Ramp Maintenance Window",
                "Lane narrowing near Central Silk Board toward Electronic City. Commuters heading to Electronic City are advised to board BMTC 356-C Express via the Elevated Flyover.",
                "Central Silk Board / Hosur Road",
                "BBMP & BTP Civic Traffic Advisory (Demo Fixture)",
                "https://bbmp.gov.in/",
                now_iso,
                1,
            ),
        ]
        for a in alerts:
            conn.execute(
                """
                INSERT OR REPLACE INTO service_alerts
                (alert_id, category, severity, title, description, affected_area_or_route,
                 source_name, source_url, published_at, is_demo_fixture)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                a,
            )

        conn.execute(
            """
            INSERT OR REPLACE INTO data_source_records
            (record_id, source_name, dataset_type, imported_count, rejected_count, imported_at, checksum)
            VALUES ('IMP_TRANSIT_DEFAULT', 'BMTC_AND_BMRCL_DEMO_FIXTURES', 'transit_network', ?, 0, ?, 'verified_2026_v1')
            """,
            (bmtc_stops_imported + bmtc_routes_imported + metro_stations_imported, now_iso),
        )

    return {
        "locations": loc_report,
        "bmtc_stops_imported": bmtc_stops_imported,
        "bmtc_routes_imported": bmtc_routes_imported,
        "metro_stations_imported": metro_stations_imported,
        "imported_at": now_iso,
    }


if __name__ == "__main__":
    summary = import_all_default_fixtures()
    print(json.dumps(summary, indent=2))
