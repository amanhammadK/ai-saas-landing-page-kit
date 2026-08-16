"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const EVENTS_KEY = "conversion_events";
const HEATMAP_KEY = "heatmap_data";
const SESSION_KEY = "session_recording";

function loadEvents() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]"); } catch { return []; }
}
function saveEvents(events) {
  if (typeof window !== "undefined") localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-500)));
}
function loadHeatmap() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HEATMAP_KEY) || "[]"); } catch { return []; }
}
function saveHeatmap(data) {
  if (typeof window !== "undefined") localStorage.setItem(HEATMAP_KEY, JSON.stringify(data.slice(-1000)));
}

const DEFAULT_EVENTS = [
  { id: 1, type: "pageview", element: "/landing", variant: "control", channel: "organic", timestamp: Date.now() - 3600000, coordinates: { x: 400, y: 300 } },
  { id: 2, type: "click", element: "cta-button", variant: "control", channel: "organic", timestamp: Date.now() - 3500000, coordinates: { x: 450, y: 520 } },
  { id: 3, type: "form_submit", element: "signup-form", variant: "variant-a", channel: "paid", timestamp: Date.now() - 3400000, coordinates: { x: 380, y: 600 } },
  { id: 4, type: "scroll", element: "pricing-section", variant: "control", channel: "organic", timestamp: Date.now() - 3300000, coordinates: { x: 400, y: 800 } },
  { id: 5, type: "click", element: "demo-button", variant: "variant-a", channel: "paid", timestamp: Date.now() - 3200000, coordinates: { x: 500, y: 450 } },
  { id: 6, type: "pageview", element: "/pricing", variant: "control", channel: "social", timestamp: Date.now() - 3100000, coordinates: { x: 390, y: 280 } },
  { id: 7, type: "click", element: "cta-button", variant: "variant-a", channel: "social", timestamp: Date.now() - 3000000, coordinates: { x: 460, y: 510 } },
  { id: 8, type: "form_submit", element: "contact-form", variant: "control", channel: "email", timestamp: Date.now() - 2900000, coordinates: { x: 370, y: 590 } },
];

const FUNNEL_STAGES = ["pageview:/landing", "click:cta-button", "pageview:/signup", "form_submit:signup-form", "pageview:/confirmation"];

export default function ConversionTracker({ events: initialEvents = DEFAULT_EVENTS }) {
  const [events, setEvents] = useState(() => { const saved = loadEvents(); return saved.length ? saved : initialEvents; });
  const [heatmapData, setHeatmapData] = useState(() => loadHeatmap());
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("24h");
  const [filterVariant, setFilterVariant] = useState("all");
  const [sessionRecording, setSessionRecording] = useState([]);
  const recordingRef = useRef(false);

  useEffect(() => { saveEvents(events); }, [events]);
  useEffect(() => { saveHeatmap(heatmapData); }, [heatmapData]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const ranges = { "1h": 3600000, "24h": 86400000, "7d": 604800000, "30d": 2592000000 };
    const cutoff = now - (ranges[dateRange] || 86400000);
    return events.filter((e) => e.timestamp >= cutoff && (filterVariant === "all" || e.variant === filterVariant));
  }, [events, dateRange, filterVariant]);

  const stats = useMemo(() => {
    const byType = {};
    const byVariant = {};
    const byChannel = {};
    const byHour = new Array(24).fill(0);
    filteredEvents.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byVariant[e.variant] = (byVariant[e.variant] || 0) + 1;
      byChannel[e.channel] = (byChannel[e.channel] || 0) + 1;
      byHour[new Date(e.timestamp).getHours()]++;
    });
    const conversions = filteredEvents.filter((e) => e.type === "form_submit").length;
    const totalSessions = filteredEvents.filter((e) => e.type === "pageview").length;
    return { byType, byVariant, byChannel, byHour, conversions, totalSessions, convRate: totalSessions > 0 ? (conversions / totalSessions * 100) : 0, total: filteredEvents.length };
  }, [filteredEvents]);

  const funnel = useMemo(() => {
    const stageCounts = FUNNEL_STAGES.map((stage) => filteredEvents.filter((e) => `${e.type}:${e.element}` === stage).length);
    return FUNNEL_STAGES.map((stage, i) => ({ stage, count: stageCounts[i], dropoff: i > 0 ? ((1 - stageCounts[i] / (stageCounts[i - 1] || 1)) * 100) : 0, rate: stageCounts[0] > 0 ? (stageCounts[i] / stageCounts[0] * 100) : 0 }));
  }, [filteredEvents]);

  const topElements = useMemo(() => {
    const counts = {};
    filteredEvents.forEach((e) => { if (e.type === "click") counts[e.element] = (counts[e.element] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredEvents]);

  const attribution = useMemo(() => {
    const channelConv = {};
    filteredEvents.filter((e) => e.type === "form_submit").forEach((e) => { channelConv[e.channel] = (channelConv[e.channel] || 0) + 1; });
    const channelTotal = {};
    filteredEvents.forEach((e) => { channelTotal[e.channel] = (channelTotal[e.channel] || 0) + 1; });
    return Object.entries(channelConv).map(([ch, conv]) => ({ channel: ch, conversions: conv, impressions: channelTotal[ch] || 0, rate: channelTotal[ch] > 0 ? (conv / channelTotal[ch] * 100) : 0 })).sort((a, b) => b.rate - a.rate);
  }, [filteredEvents]);

  const addEvent = useCallback((type, element, variant = "control", channel = "organic", coordinates = { x: 0, y: 0 }) => {
    const event = { id: Date.now(), type, element, variant, channel, timestamp: Date.now(), coordinates };
    setEvents((prev) => [...prev, event]);
    if (type === "click") setHeatmapData((prev) => [...prev, { x: coordinates.x, y: coordinates.y, timestamp: Date.now() }]);
    if (recordingRef.current) setSessionRecording((prev) => [...prev, { ...event, scrollY: typeof window !== "undefined" ? window.scrollY : 0 }]);
  }, []);

  const startRecording = useCallback(() => {
    recordingRef.current = true;
    setSessionRecording([]);
  }, []);

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
  }, []);

  const exportReport = useCallback(() => {
    const report = { generatedAt: new Date().toISOString(), dateRange, filterVariant, summary: { total: stats.total, conversions: stats.conversions, convRate: stats.convRate }, funnel, attribution, topElements, byType: stats.byType, byVariant: stats.byVariant, byChannel: stats.byChannel, hourlyDistribution: stats.byHour };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `conversion-report-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  }, [stats, funnel, attribution, topElements, dateRange, filterVariant]);

  const tabs = ["overview", "funnel", "attribution", "heatmap", "sessions"];
  const tabStyle = (active) => ({ padding: "8px 16px", borderRadius: 8, border: "none", background: active ? "#2563eb" : "transparent", color: active ? "#fff" : "#666", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400 });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Conversion Tracking</h2><p style={{ color: "#666", margin: "4px 0 0", fontSize: 14 }}>{stats.total} events Â· {stats.conversions} conversions</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}><option value="1h">Last hour</option><option value="24h">Last 24h</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select>
          <select value={filterVariant} onChange={(e) => setFilterVariant(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}><option value="all">All variants</option><option value="control">Control</option><option value="variant-a">Variant A</option></select>
          <button onClick={exportReport} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13 }}>Export</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, background: "#f3f4f6", borderRadius: 10 }}>
        {tabs.map((t) => <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(activeTab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[{ label: "Total Events", value: stats.total, color: "#2563eb" }, { label: "Conversions", value: stats.conversions, color: "#16a34a" }, { label: "Conv. Rate", value: `${stats.convRate.toFixed(1)}%`, color: "#ea580c" }, { label: "Unique Sessions", value: stats.totalSessions, color: "#8b5cf6" }].map((s) => (
              <div key={s.label} style={{ padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}><div style={{ fontSize: 12, color: "#999", textTransform: "uppercase" }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div></div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Events by Type</h3>
              {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}><span style={{ fontSize: 13, textTransform: "capitalize" }}>{type.replace("_", " ")}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{count}</span></div>
              ))}
            </div>
            <div style={{ padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Hourly Distribution</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
                {stats.byHour.map((count, h) => {
                  const max = Math.max(...stats.byHour, 1);
                  return <div key={h} title={`${h}:00 - ${count}`} style={{ flex: 1, height: `${(count / max) * 100}%`, background: "#2563eb", borderRadius: 2, minHeight: 2 }} />;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginTop: 4 }}><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Top Clicked Elements</h3>
            {topElements.map(([el, count], i) => (
              <div key={el} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ width: 20, fontSize: 12, color: "#999" }}>#{i + 1}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{el}</div></div>
                <div style={{ width: 200, height: 6, background: "#e5e7eb", borderRadius: 3 }}><div style={{ width: `${(count / (topElements[0]?.[1] || 1)) * 100}%`, height: "100%", background: "#2563eb", borderRadius: 3 }} /></div>
                <span style={{ fontSize: 13, fontWeight: 600, width: 40, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "funnel" && (
        <div style={{ padding: 20, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>Conversion Funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {funnel.map((stage, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0" }}>
                  <div style={{ width: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{stage.stage.split(":")[0].replace("_", " ")}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>{stage.stage.split(":")[1]}</div>
                  </div>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ height: 32, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: `${stage.rate}%`, height: "100%", background: i === funnel.length - 1 ? "#16a34a" : "#2563eb", borderRadius: 6, transition: "width 0.5s", display: "flex", alignItems: "center", paddingLeft: 12 }}>
                        <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{stage.count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 80, textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{stage.rate.toFixed(1)}%</div>
                    {i > 0 && stage.dropoff > 0 && <div style={{ fontSize: 11, color: "#dc2626" }}>-{stage.dropoff.toFixed(1)}%</div>}
                  </div>
                </div>
                {i < funnel.length - 1 && <div style={{ borderLeft: "2px dashed #d1d5db", height: 16, marginLeft: 10 }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "attribution" && (
        <div style={{ padding: 20, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Channel Attribution</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "2px solid #e5e7eb" }}><th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Channel</th><th style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>Events</th><th style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>Conversions</th><th style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>Conv. Rate</th><th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, width: 200 }}>Performance</th></tr></thead>
            <tbody>
              {attribution.map((a) => (
                <tr key={a.channel} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>{a.channel}</td><td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14 }}>{a.impressions}</td><td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14, fontWeight: 600, color: "#16a34a" }}>{a.conversions}</td><td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14 }}>{a.rate.toFixed(1)}%</td><td style={{ padding: "10px 12px" }}><div style={{ height: 6, background: "#e5e7eb", borderRadius: 3 }}><div style={{ width: `${a.rate}%`, height: "100%", background: "#2563eb", borderRadius: 3 }} /></div></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "heatmap" && (
        <div style={{ padding: 20, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Click Heatmap ({heatmapData.length} clicks)</h3>
            <button onClick={() => setHeatmapData([])} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>Clear</button>
          </div>
          <div style={{ position: "relative", width: "100%", height: 400, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {heatmapData.map((point, i) => {
              const age = (Date.now() - point.timestamp) / 3600000;
              const opacity = Math.max(0.2, 1 - age / 24);
              return <div key={i} style={{ position: "absolute", left: `${(point.x / 800) * 100}%`, top: `${(point.y / 400) * 100}%`, width: 20, height: 20, borderRadius: "50%", background: `rgba(239, 68, 68, ${opacity})`, transform: "translate(-50%, -50%)", filter: "blur(4px)" }} />;
            })}
            {heatmapData.length === 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14 }}>Click anywhere on the page to generate heatmap data</div>}
          </div>
        </div>
      )}

      {activeTab === "sessions" && (
        <div style={{ padding: 20, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Session Recording ({sessionRecording.length} events captured)</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {!recordingRef.current ? <button onClick={startRecording} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 13 }}>â— Record</button> : <button onClick={stopRecording} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#6b7280", color: "#fff", cursor: "pointer", fontSize: 13 }}>â–  Stop</button>}
              {recordingRef.current && <span style={{ fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "pulse 1s infinite" }} />Recording</span>}
            </div>
          </div>
          {sessionRecording.length > 0 ? (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>#</th><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Event</th><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Element</th><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Position</th><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Scroll</th><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Time</th></tr></thead>
                <tbody>{sessionRecording.map((e, i) => <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}><td style={{ padding: "6px 12px", fontSize: 12, color: "#999" }}>{i + 1}</td><td style={{ padding: "6px 12px", fontSize: 12 }}>{e.type}</td><td style={{ padding: "6px 12px", fontSize: 12 }}>{e.element}</td><td style={{ padding: "6px 12px", fontSize: 12 }}>{e.coordinates.x}, {e.coordinates.y}</td><td style={{ padding: "6px 12px", fontSize: 12 }}>{e.scrollY}px</td><td style={{ padding: "6px 12px", fontSize: 12 }}>{new Date(e.timestamp).toLocaleTimeString()}</td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 14 }}>Click "Record" to start capturing user interactions</div>
          )}
        </div>
      )}
    </div>
  );
}
