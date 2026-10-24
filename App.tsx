import React, { useEffect, useState } from 'react';
import { BengaluruMap } from './components/BengaluruMap';
import { tripBuddyApi } from './services/api';
import { BengaluruLocation, JourneyPlanResponse, RouteAlternative } from './types/tripbuddy';

type ScreenTab =
  | 'planner'
  | 'comparison'
  | 'navigation'
  | 'assistant'
  | 'explorer'
  | 'bookings'
  | 'updates'
  | 'settings'
  | 'admin';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ScreenTab>('planner');
  const [operatingMode, setOperatingMode] = useState<'demo' | 'live'>('demo');
  const [locations, setLocations] = useState<BengaluruLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Journey Planner Form State
  const [origin, setOrigin] = useState<string>('Kempegowda Bus Station (Majestic)');
  const [destination, setDestination] = useState<string>('Manyata Tech Park');
  const [nlQuery, setNlQuery] = useState<string>('');
  const [optimizationObjective, setOptimizationObjective] = useState<string>('balanced');
  const [maxWalkingMeters, setMaxWalkingMeters] = useState<number>(800);
  const [maxBudgetInr, setMaxBudgetInr] = useState<number>(150);
  const [wheelchairRequired, setWheelchairRequired] = useState<boolean>(false);
  const [enableMonitoring, setEnableMonitoring] = useState<boolean>(true);
  const [preferredModes, setPreferredModes] = useState<string[]>(['metro', 'bmtc', 'walk', 'auto']);

  // Planned Journey & Selected Route State
  const [planResult, setPlanResult] = useState<JourneyPlanResponse | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<'fastest' | 'cheapest' | 'balanced'>('balanced');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [journeyLifecycle, setJourneyLifecycle] = useState<'PLANNED' | 'ACTIVE' | 'PAUSED' | 'REPLANNED' | 'COMPLETED'>('PLANNED');

  // Consented Live Geolocation State
  const [gpsTrackingActive, setGpsTrackingActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Conversational AI Assistant State
  const [chatInput, setChatInput] = useState<string>('Compare metro and bus travel from Majestic to Whitefield');
  const [chatHistory, setChatHistory] = useState<
    Array<{
      sender: 'user' | 'assistant';
      text: string;
      plan?: JourneyPlanResponse | null;
      citations?: Array<{ title: string; source_org: string; source_url: string }>;
    }>
  >([]);

  // Explorer, Bookings, Updates, Settings & Admin Data
  const [explorerData, setExplorerData] = useState<Record<string, unknown> | null>(null);
  const [explorerQuery, setExplorerQuery] = useState<string>('');
  const [bookingsList, setBookingsList] = useState<Array<Record<string, unknown>>>([]);
  const [bookingApprovalCheck, setBookingApprovalCheck] = useState<boolean>(false);
  const [updatesData, setUpdatesData] = useState<Record<string, unknown> | null>(null);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [userPrefs, setUserPrefs] = useState<Record<string, unknown> | null>(null);
  const [adminDiag, setAdminDiag] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const locRes = await tripBuddyApi.searchLocations('');
      setLocations(locRes.results);
      const initialPlan = await tripBuddyApi.planJourney({
        origin,
        destination,
        constraints: {
          preferred_modes: preferredModes,
          max_walking_meters: maxWalkingMeters,
          wheelchair_required: wheelchairRequired,
          optimization_objective: optimizationObjective,
          max_budget_inr: maxBudgetInr,
          language: 'en',
        },
        enable_monitoring: enableMonitoring,
      });
      setPlanResult(initialPlan);
      setOperatingMode(initialPlan.operating_mode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to connect to TripBuddy AI backend.');
    } finally {
      setLoading(false);
    }
  };

  const selectedAlternative: RouteAlternative | null =
    planResult?.alternatives.find((a) => a.option_type === selectedOptionType) ||
    planResult?.alternatives[0] ||
    null;

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setBannerMsg(null);
    try {
      setLoading(true);
      const res = await tripBuddyApi.planJourney({
        origin,
        destination,
        natural_language_query: nlQuery || undefined,
        constraints: {
          preferred_modes: preferredModes,
          max_walking_meters: maxWalkingMeters,
          wheelchair_required: wheelchairRequired,
          optimization_objective: optimizationObjective,
          max_budget_inr: maxBudgetInr,
          language: 'en',
        },
        enable_monitoring: enableMonitoring,
      });
      setPlanResult(res);
      setSelectedOptionType((res.recommended_option_type as 'fastest' | 'cheapest' | 'balanced') || 'balanced');
      setJourneyLifecycle('PLANNED');
      setActiveStepIndex(0);
      setBannerMsg(`Planned ${res.alternatives.length} validated multimodal routes in ${res.orchestration_latency_ms} ms.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to plan journey.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGpsConsent = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Browser geolocation is not supported on this device. Using manual Bengaluru hub selection.');
      return;
    }
    setGpsTrackingActive(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        // Fallback to consented Majestic demonstration coordinate when browser permission is denied in headless environment
        setGpsError(
          'Location permission denied or unavailable. Displaying manual landmark selection (no background tracking).'
        );
        setGpsTrackingActive(false);
      }
    );
  };

  const handleStartLiveJourney = async () => {
    if (!planResult) return;
    try {
      await tripBuddyApi.startJourney(planResult.journey_id, enableMonitoring);
      setJourneyLifecycle('ACTIVE');
      setActiveTab('navigation');
      const notifRes = await tripBuddyApi.getNotifications();
      setNotifications(notifRes.notifications);
      setBannerMsg('Journey started. Proactive transfer and boarding reminders are active.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start journey.');
    }
  };

  const handleReplanJourney = async (reason: string, avoidModes: string[] = []) => {
    if (!planResult) return;
    try {
      setLoading(true);
      const res = await tripBuddyApi.replanJourney(planResult.journey_id, reason, avoidModes);
      setPlanResult(res.updated_plan);
      setJourneyLifecycle('REPLANNED');
      setBannerMsg(`Route dynamically replanned (${reason}).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to replan journey.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndJourney = async () => {
    if (!planResult) return;
    try {
      await tripBuddyApi.endJourney(planResult.journey_id);
      setJourneyLifecycle('COMPLETED');
      setGpsTrackingActive(false);
      setBannerMsg('Journey completed. Automated monitoring has been stopped.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to end journey.');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatHistory((prev) => [...prev, { sender: 'user', text: msg }]);
    setChatInput('');
    try {
      setLoading(true);
      const res = await tripBuddyApi.chatAssistant(msg);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.assistant_message,
          plan: res.structured_plan,
          citations: res.rag_citations,
        },
      ]);
      if (res.structured_plan) {
        setPlanResult(res.structured_plan);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Assistant request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovedBooking = async (mode: string, fare: number) => {
    if (!bookingApprovalCheck) {
      setErrorMsg('Please check the explicit human approval box before initiating an official booking handoff.');
      return;
    }
    try {
      setErrorMsg(null);
      const res = await tripBuddyApi.initiateBooking({
        journey_id: planResult?.journey_id,
        mode,
        origin_name: planResult?.origin.name_en || origin,
        destination_name: planResult?.destination.name_en || destination,
        estimated_fare_inr: fare,
        user_explicit_approval: true,
      });
      const list = await tripBuddyApi.listBookings();
      setBookingsList(list.bookings);
      setBannerMsg(
        `Official booking handoff created (${String(res.booking_id)}). Status: ${String(
          res.status
        )} — no false ticket confirmation claimed.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Booking handoff failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar & Mode Indicator */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center font-bold text-slate-950 shadow">
              TB
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
                TripBuddy AI
                <span className="text-xs font-normal text-sky-300">
                  Bengaluru Multimodal Agentic Assistant
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                BMTC Buses • Namma Metro • Pedestrian Skywalks • Multi-Agent RAG &amp; ML
              </p>
            </div>
          </div>

          {/* Explicit Demo Mode vs Live Mode Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                operatingMode === 'demo'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              }`}
            >
              {operatingMode === 'demo'
                ? 'DEMO MODE: Verified Schedule & Labeled Fixtures'
                : 'LIVE MODE: Connected Providers + Safe Fallback'}
            </span>
            <button
              type="button"
              onClick={async () => {
                const nextMode = operatingMode === 'demo' ? 'live' : 'demo';
                const res = await tripBuddyApi.switchOperatingMode(nextMode);
                setOperatingMode(res.operating_mode);
              }}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-200 border border-slate-700"
            >
              Switch to {operatingMode === 'demo' ? 'Live' : 'Demo'}
            </button>
          </div>
        </div>

        {/* 8 Required Screens + Admin Diagnostics Navigation Bar */}
        <nav
          aria-label="Primary application screens"
          className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 text-xs"
        >
          {[
            { id: 'planner', label: '1. Home & Planner' },
            { id: 'comparison', label: '2. Route Comparison' },
            { id: 'navigation', label: '3. Live Navigation' },
            { id: 'assistant', label: '4. AI Assistant (EN/KN)' },
            { id: 'explorer', label: '5. Transport Explorer' },
            { id: 'bookings', label: '6. Official Bookings' },
            { id: 'updates', label: '7. Bengaluru Updates' },
            { id: 'settings', label: '8. Settings & Privacy' },
            { id: 'admin', label: '9. Admin & Agents' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={async () => {
                const t = tab.id as ScreenTab;
                setActiveTab(t);
                if (t === 'explorer') setExplorerData(await tripBuddyApi.getTransportExplorer(explorerQuery));
                if (t === 'bookings') setBookingsList((await tripBuddyApi.listBookings()).bookings);
                if (t === 'updates') setUpdatesData(await tripBuddyApi.getBengaluruUpdates());
                if (t === 'settings') setUserPrefs(await tripBuddyApi.getUserPreferences());
                if (t === 'admin') setAdminDiag(await tripBuddyApi.getAdminDiagnostics());
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Status & Error Banners */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-3 space-y-2">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="font-bold underline ml-4">
              Dismiss
            </button>
          </div>
        )}
        {bannerMsg && (
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-2.5 text-xs text-teal-900 flex items-center justify-between">
            <span>{bannerMsg}</span>
            <button type="button" onClick={() => setBannerMsg(null)} className="font-bold underline ml-4">
              Close
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 py-5 flex-1 space-y-6">
        {/* SCREEN 1: HOME & JOURNEY PLANNER */}
        {activeTab === 'planner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Bengaluru Multimodal Journey Planner
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const temp = origin;
                    setOrigin(destination);
                    setDestination(temp);
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg"
                >
                  ⇄ Swap Origin / Destination
                </button>
              </div>

              <form onSubmit={handlePlanSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Origin (Bengaluru Hub / Station)
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    list="bengaluru-hubs"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination (Bengaluru Hub / Tech Park)
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    list="bengaluru-hubs"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    required
                  />
                </div>

                <datalist id="bengaluru-hubs">
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.name_en}>
                      {loc.name_kn} — {loc.ward_or_area}
                    </option>
                  ))}
                </datalist>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Natural-Language Constraint (English or Kannada)
                  </label>
                  <input
                    type="text"
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    placeholder="e.g., Avoid walking more than 500 metres, reach before 9 AM"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Optimization Objective
                    </label>
                    <select
                      value={optimizationObjective}
                      onChange={(e) => setOptimizationObjective(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    >
                      <option value="balanced">Best-Balanced</option>
                      <option value="fastest">Fastest Arrival</option>
                      <option value="cheapest">Cheapest Fare</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Walking Limit ({maxWalkingMeters}m)
                    </label>
                    <input
                      type="range"
                      min={200}
                      max={2000}
                      step={100}
                      value={maxWalkingMeters}
                      onChange={(e) => setMaxWalkingMeters(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wheelchairRequired}
                      onChange={(e) => setWheelchairRequired(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    Wheelchair / Step-Free Only
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMonitoring}
                      onChange={(e) => setEnableMonitoring(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    Enable Proactive Journey Monitoring
                  </label>
                </div>

                {/* Live Location Consent Control */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">Consented Device GPS: </span>
                    <span className="text-slate-600">
                      {gpsTrackingActive ? 'Active (User Consented)' : 'Off (No unconsented tracking)'}
                    </span>
                    {gpsError && <p className="text-amber-700 text-[11px] mt-0.5">{gpsError}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      gpsTrackingActive ? setGpsTrackingActive(false) : handleStartGpsConsent()
                    }
                    className="rounded-lg bg-slate-800 text-white px-2.5 py-1 font-medium hover:bg-slate-700"
                  >
                    {gpsTrackingActive ? 'Stop GPS' : 'Use My Location'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 text-sm shadow transition"
                >
                  {loading ? 'Orchestrating 12 Specialist Agents...' : 'Plan Multimodal Journey'}
                </button>
              </form>
            </section>

            {/* Map + Quick Route Preview */}
            <section className="lg:col-span-7 space-y-4">
              <BengaluruMap
                locations={locations}
                selectedAlternative={selectedAlternative}
                userCoords={userCoords}
                onSelectLocation={(placeName) => setDestination(placeName)}
              />

              {planResult && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      AI Orchestrator Recommendation ({planResult.origin.name_en} →{' '}
                      {planResult.destination.name_en})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('comparison')}
                        className="rounded-lg bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 text-xs font-semibold"
                      >
                        Compare All {planResult.alternatives.length} Options
                      </button>
                      <button
                        type="button"
                        onClick={handleStartLiveJourney}
                        className="rounded-lg bg-teal-600 text-white px-3 py-1 text-xs font-semibold hover:bg-teal-500"
                      >
                        Start Live Navigation
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {planResult.assistant_explanation}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SCREEN 2: ROUTE COMPARISON (Fastest, Cheapest, Best-Balanced) */}
        {activeTab === 'comparison' && planResult && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <h2 className="text-base font-bold">
                  Multimodal Route Comparison: {planResult.origin.name_en} →{' '}
                  {planResult.destination.name_en}
                </h2>
                <p className="text-xs text-slate-500">
                  Generalized cost function optimizing duration, BMRCL/BMTC fares, walking distance, transfers &amp; reliability
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartLiveJourney}
                className="rounded-xl bg-teal-600 text-white px-4 py-2 text-xs font-semibold hover:bg-teal-500"
              >
                Start Navigation with Selected Route ({selectedOptionType.toUpperCase()})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planResult.alternatives.map((alt) => {
                const isSelected = alt.option_type === selectedOptionType;
                return (
                  <div
                    key={alt.option_type}
                    onClick={() => setSelectedOptionType(alt.option_type)}
                    className={`cursor-pointer rounded-2xl border p-5 transition space-y-3 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/40 shadow-md ring-2 ring-teal-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-900 text-teal-300">
                        {alt.option_type}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        ETA: {alt.expected_arrival_time}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{alt.label}</h3>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div>
                        <div className="text-base font-extrabold text-slate-900">
                          {Math.round(alt.total_duration_mins)}m
                        </div>
                        <div className="text-[10px] text-slate-500">Duration</div>
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-teal-700">
                          ₹{Math.round(alt.total_fare_inr)}
                        </div>
                        <div className="text-[10px] text-slate-500">Est. Fare</div>
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-slate-800">
                          {Math.round(alt.total_walking_meters)}m
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Walk ({alt.transfer_count} xfer)
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{alt.explanation}</p>
                    <div className="text-[11px] text-slate-500 border-t border-slate-200/70 pt-2 flex items-center justify-between">
                      <span>Freshness: {alt.freshness_summary}</span>
                      <span>Confidence: {Math.round(alt.confidence_score * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 3: LIVE NAVIGATION & PROACTIVE MONITORING */}
        {activeTab === 'navigation' && selectedAlternative && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <BengaluruMap
                locations={locations}
                selectedAlternative={selectedAlternative}
                userCoords={userCoords}
              />
            </div>
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase text-teal-600">
                    Trip Status: {journeyLifecycle}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Step-by-Step Boarding &amp; Transfer Guidance
                  </h2>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReplanJourney('BMTC bus delayed on ORR corridor', ['bmtc'])}
                    className="rounded-lg bg-amber-100 text-amber-900 px-2.5 py-1 text-xs font-semibold hover:bg-amber-200"
                  >
                    Replan (Bus Delayed)
                  </button>
                  <button
                    type="button"
                    onClick={handleEndJourney}
                    className="rounded-lg bg-rose-600 text-white px-2.5 py-1 text-xs font-semibold hover:bg-rose-500"
                  >
                    End Trip
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedAlternative.legs.map((leg, idx) => (
                  <div
                    key={leg.sequence_order}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`rounded-xl border p-3.5 cursor-pointer transition ${
                      idx === activeStepIndex
                        ? 'border-teal-600 bg-teal-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="uppercase text-teal-800">
                        Leg {leg.sequence_order}: {leg.mode} — {leg.route_or_line}
                      </span>
                      <span>
                        {Math.round(leg.duration_mins)} mins • ₹{Math.round(leg.fare_inr)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 mt-1">{leg.instruction}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      <strong>Board:</strong> {leg.boarding_guidance}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Alight:</strong> {leg.alighting_guidance}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Source: {leg.freshness_label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: CONVERSATIONAL AI ASSISTANT (ENGLISH & KANNADA) */}
        {activeTab === 'assistant' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                TripBuddy Conversational AI Assistant (English &amp; ಕನ್ನಡ)
              </h2>
              <p className="text-xs text-slate-500">
                Powered by Multilingual NLP + Hybrid Vector RAG + 12 Specialist Agents
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'Take me from my current location to Manyata Tech Park.',
                'Find the cheapest route from Majestic to Electronic City.',
                'Avoid walking more than 500 metres from Indiranagar to Whitefield.',
                'ಮೆಜೆಸ್ಟಿಕ್ ನಿಂದ ವೈಟ್‌ಫೀಲ್ಡ್ ಗೆ ಮೆಟ್ರೋ ಮಾರ್ಗ ತೋರಿಸಿ',
                'Tell me about Bengaluru traffic updates affecting my journey.',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setChatInput(sample)}
                  className="text-xs rounded-full bg-slate-100 hover:bg-teal-50 text-slate-700 border border-slate-200 px-3 py-1"
                >
                  {sample}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask in English or Kannada..."
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl bg-teal-600 text-white px-5 py-2 text-sm font-semibold hover:bg-teal-500"
              >
                Send
              </button>
            </form>

            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {chatHistory.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3.5 text-xs ${
                    item.sender === 'user'
                      ? 'bg-slate-900 text-white ml-12'
                      : 'bg-slate-50 border border-slate-200 mr-12 space-y-2'
                  }`}
                >
                  <p className="leading-relaxed">{item.text}</p>
                  {item.citations && item.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                      <strong>Grounded RAG Sources: </strong>
                      {item.citations.map((c, idx) => (
                        <a
                          key={idx}
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 underline mr-3"
                        >
                          {c.source_org}: {c.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCREEN 5: TRANSPORT EXPLORER (BMTC & NAMMA METRO) */}
        {activeTab === 'explorer' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">
                Bengaluru Transport Explorer (BMTC Corridors &amp; Namma Metro Lines)
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={explorerQuery}
                  onChange={(e) => setExplorerQuery(e.target.value)}
                  placeholder="Filter route 500-D, 335-E, Majestic..."
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={async () =>
                    setExplorerData(await tripBuddyApi.getTransportExplorer(explorerQuery))
                  }
                  className="rounded-xl bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Search
                </button>
              </div>
            </div>
            {explorerData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800">BMTC Corridor Routes (Schedule Fixture)</h3>
                  {(explorerData.bmtc_routes as Array<Record<string, unknown>>)?.map((r) => (
                    <div key={String(r.route_id)} className="rounded-xl border border-slate-200 p-3">
                      <div className="font-bold text-teal-800">
                        Route {String(r.route_short_name)} — {String(r.service_type)}
                      </div>
                      <div className="text-slate-700">{String(r.route_long_name)}</div>
                      <div className="text-slate-500 mt-1">
                        Headway: Every {String(r.headway_mins)} mins • Base Fare: ₹{String(r.base_fare_inr)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800">Namma Metro Stations (Purple &amp; Green Lines)</h3>
                  {(explorerData.metro_stations as Array<Record<string, unknown>>)?.map((st) => (
                    <div key={String(st.station_id)} className="rounded-xl border border-slate-200 p-3">
                      <div className="font-bold text-purple-800">{String(st.name)}</div>
                      <div className="text-slate-600">
                        Line: {String(st.line_id)} • Interchange: {st.is_interchange ? 'Yes (Majestic)' : 'No'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 6: OFFICIAL BOOKINGS & TICKETING WORKFLOW */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold">
              Authorized Official Ticketing &amp; Booking Handoffs
            </h2>
            <p className="text-xs text-slate-600">
              TripBuddy AI enforces an explicit human approval gate before initiating any external booking handoff. Payment credentials are never collected or stored, and unverified booking confirmations are never fabricated.
            </p>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <input
                type="checkbox"
                checked={bookingApprovalCheck}
                onChange={(e) => setBookingApprovalCheck(e.target.checked)}
              />
              I explicitly approve generating an official ticketing handoff for my selected Bengaluru route.
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {planResult?.booking_options.map((opt) => (
                <div key={opt.mode} className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="font-bold uppercase text-teal-800">{opt.mode} Official Channel</div>
                  <div className="font-semibold text-slate-900">{opt.provider_name}</div>
                  <div>Estimated Leg Fare: ₹{Math.round(opt.estimated_fare_inr)}</div>
                  <p className="text-[11px] text-slate-500">{opt.disclaimer}</p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApprovedBooking(opt.mode, opt.estimated_fare_inr)}
                      className="rounded-lg bg-teal-600 text-white px-3 py-1.5 font-semibold"
                    >
                      Approve &amp; Record Handoff
                    </button>
                    <a
                      href={opt.official_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"
                    >
                      Open Portal ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {bookingsList.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                <h3 className="font-bold">Recorded Booking Handoff References</h3>
                {bookingsList.map((b) => (
                  <div key={String(b.booking_id)} className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <strong>{String(b.booking_id)}</strong> • {String(b.provider_name)} • Status:{' '}
                    <span className="font-semibold text-amber-800">{String(b.status)}</span> (₹
                    {String(b.estimated_fare_inr)})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 7: BENGALURU TRAFFIC, WEATHER & CIVIC UPDATES */}
        {activeTab === 'updates' && updatesData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <h2 className="text-base font-bold">
              Contextual Bengaluru Traffic, Weather &amp; Civic Advisories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-1">
                <div className="font-bold text-sky-900">Bengaluru Weather Conditions</div>
                <div>
                  Temperature: {String((updatesData.weather as Record<string, unknown>)?.temperature_c)}°C —{' '}
                  {String((updatesData.weather as Record<string, unknown>)?.condition)}
                </div>
                <div className="text-slate-600">
                  {String((updatesData.weather as Record<string, unknown>)?.walking_advisory)}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1">
                <div className="font-bold text-amber-900">Active Service &amp; Traffic Advisories</div>
                {((updatesData.alerts as Array<Record<string, unknown>>) || []).map((a) => (
                  <div key={String(a.alert_id)} className="border-t border-amber-200/60 pt-1.5 mt-1.5">
                    <strong>{String(a.title)}</strong>: {String(a.description)}{' '}
                    <a href={String(a.source_url)} target="_blank" rel="noreferrer" className="underline">
                      ({String(a.source_name)})
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 8: SETTINGS, PRIVACY & DATA DELETION */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <h2 className="text-base font-bold">User Preferences, Privacy &amp; Journey History Control</h2>
            <p className="text-slate-600">
              TripBuddy AI stores only minimal operational data and redacts PII from logs. You can permanently purge your journey history and notifications at any time.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  const res = await tripBuddyApi.deleteJourneyHistory();
                  setBannerMsg(`Purged ${res.journeys_deleted} stored journey record(s).`);
                }}
                className="rounded-xl bg-rose-600 text-white px-4 py-2 font-semibold hover:bg-rose-500"
              >
                Delete All My Journey History &amp; Notifications
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 9: ADMIN & MULTI-AGENT DIAGNOSTICS */}
        {activeTab === 'admin' && adminDiag && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <h2 className="text-base font-bold">
              Administrator View: Provider Health, Background Jobs &amp; Agent Traces
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {((adminDiag.integrations as Array<Record<string, unknown>>) || []).map((prov) => (
                <div key={String(prov.provider_id)} className="rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-900">{String(prov.name)}</div>
                  <div className="text-teal-700 font-semibold">
                    Mode: {String(prov.operating_mode)} • Freshness: {String(prov.data_freshness_label)}
                  </div>
                  <div className="text-slate-500 mt-1">{String(prov.notes)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
