import { JourneyPlanResponse, BengaluruLocation } from '../types/tripbuddy';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail));
  }
  return response.json() as Promise<T>;
}

export const tripBuddyApi = {
  searchLocations: (query: string, lat?: number, lon?: number) =>
    requestJson<{ count: number; results: BengaluruLocation[]; freshness_label: string }>('/locations/search', {
      method: 'POST',
      body: JSON.stringify({ query, latitude: lat, longitude: lon, radius_km: 15, limit: 15 }),
    }),

  planJourney: (payload: {
    origin: string;
    destination: string;
    natural_language_query?: string;
    constraints: {
      departure_time?: string;
      arrival_deadline?: string;
      max_budget_inr?: number;
      preferred_modes: string[];
      max_walking_meters: number;
      wheelchair_required: boolean;
      optimization_objective: string;
      language: string;
    };
    enable_monitoring: boolean;
  }) =>
    requestJson<JourneyPlanResponse>('/journeys/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  startJourney: (journeyId: string, enableMonitoring: boolean) =>
    requestJson<{ journey_id: string; status: string; monitoring_enabled: boolean }>(
      `/journeys/${journeyId}/start?enable_monitoring=${enableMonitoring}`,
      { method: 'POST' }
    ),

  replanJourney: (journeyId: string, reason: string, avoidModes: string[] = []) =>
    requestJson<{ journey_id: string; status: string; updated_plan: JourneyPlanResponse }>(
      `/journeys/${journeyId}/replan`,
      {
        method: 'POST',
        body: JSON.stringify({ reason, avoid_modes: avoidModes }),
      }
    ),

  endJourney: (journeyId: string) =>
    requestJson<{ journey_id: string; status: string; monitoring_enabled: boolean }>(
      `/journeys/${journeyId}/end`,
      { method: 'POST' }
    ),

  chatAssistant: (message: string, language = 'en') =>
    requestJson<{
      intent: Record<string, unknown>;
      needs_clarification?: boolean;
      assistant_message: string;
      structured_plan: JourneyPlanResponse | null;
      rag_citations: Array<{ title: string; source_org: string; source_url: string }>;
    }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    }),

  getTransportExplorer: (query = '') =>
    requestJson<{
      operating_mode: string;
      bmtc_stops: Array<Record<string, unknown>>;
      bmtc_routes: Array<Record<string, unknown>>;
      metro_lines: Array<Record<string, unknown>>;
      metro_stations: Array<Record<string, unknown>>;
      alerts: Array<Record<string, unknown>>;
    }>(`/transport/explorer?query=${encodeURIComponent(query)}`),

  initiateBooking: (payload: {
    journey_id?: string;
    mode: string;
    origin_name: string;
    destination_name: string;
    estimated_fare_inr: number;
    user_explicit_approval: boolean;
  }) =>
    requestJson<Record<string, unknown>>('/bookings/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listBookings: () => requestJson<{ bookings: Array<Record<string, unknown>> }>('/bookings'),

  getBengaluruUpdates: () => requestJson<Record<string, unknown>>('/updates/bengaluru'),

  getNotifications: () => requestJson<{ notifications: Array<Record<string, unknown>> }>('/notifications'),

  getUserPreferences: () => requestJson<Record<string, unknown>>('/users/preferences'),

  updateUserPreferences: (prefs: Record<string, unknown>) =>
    requestJson<Record<string, unknown>>('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),

  deleteJourneyHistory: () =>
    requestJson<{ status: string; journeys_deleted: number }>('/users/history', {
      method: 'DELETE',
    }),

  getAdminDiagnostics: () => requestJson<Record<string, unknown>>('/admin/diagnostics'),

  switchOperatingMode: (mode: 'demo' | 'live') =>
    requestJson<{ operating_mode: 'demo' | 'live' }>('/admin/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
};
