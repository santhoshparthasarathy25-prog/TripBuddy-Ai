export interface BengaluruLocation {
  location_id: string;
  name_en: string;
  name_kn: string;
  category: string;
  latitude: number;
  longitude: number;
  ward_or_area: string;
  wheelchair_accessible: boolean;
  distance_km?: number | null;
  source: string;
  verified_at: string;
}

export interface JourneyLeg {
  sequence_order: number;
  mode: 'metro' | 'bmtc' | 'walk' | 'auto' | 'cab';
  route_or_line?: string;
  from_node_id: string;
  from_name: string;
  from_coords: [number, number];
  to_node_id: string;
  to_name: string;
  to_coords: [number, number];
  duration_mins: number;
  wait_mins: number;
  distance_km: number;
  walking_meters: number;
  fare_inr: number;
  instruction: string;
  boarding_guidance: string;
  alighting_guidance: string;
  freshness_label: string;
  is_wheelchair_accessible: boolean;
}

export interface RouteAlternative {
  option_type: 'fastest' | 'cheapest' | 'balanced';
  label: string;
  total_duration_mins: number;
  total_fare_inr: number;
  total_walking_meters: number;
  transfer_count: number;
  generalized_cost_score: number;
  confidence_score: number;
  expected_arrival_time: string;
  freshness_summary: string;
  explanation: string;
  assumptions: string[];
  legs: JourneyLeg[];
  polyline_coords: [number, number][];
}

export interface AgentTrace {
  execution_id: string;
  agent_name: string;
  permission_scope: string;
  status: string;
  latency_ms: number;
  summary: string;
}

export interface BookingOption {
  mode: string;
  provider_name: string;
  official_url: string;
  estimated_fare_inr: number;
  requires_user_approval: boolean;
  booking_status: string;
  disclaimer: string;
}

export interface JourneyPlanResponse {
  request_id: string;
  journey_id: string;
  status: string;
  operating_mode: 'demo' | 'live';
  origin: BengaluruLocation;
  destination: BengaluruLocation;
  recommended_option_type: string;
  alternatives: RouteAlternative[];
  assistant_explanation: string;
  rag_knowledge: {
    summary: string;
    citations: Array<{
      doc_id: string;
      title: string;
      source_org: string;
      source_url: string;
      published_at: string;
    }>;
    disclaimer: string;
  };
  contextual_intelligence: {
    traffic: {
      freshness_label: string;
      is_demo_fixture: boolean;
      corridors: Array<{
        corridor_id: string;
        name: string;
        congestion_level: string;
        delay_multiplier: number;
        estimated_extra_mins: number;
        advisory: string;
      }>;
    };
    weather: {
      temperature_c: number;
      condition: string;
      rain_probability_pct: number;
      walking_advisory: string;
      freshness_label: string;
    };
    alerts: Array<{
      alert_id: string;
      category: string;
      severity: string;
      title: string;
      description: string;
      affected_area_or_route: string;
      source_name: string;
      source_url: string;
      published_at: string;
    }>;
  };
  booking_options: BookingOption[];
  agent_execution_traces: AgentTrace[];
  orchestration_latency_ms: number;
}
