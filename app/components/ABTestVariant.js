"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "ab_test_variants";

function chiSquaredTest(observed, expected) {
  if (observed.length !== expected.length || observed.length < 2) return { chiSq: 0, pValue: 1, significant: false };
  const chiSq = observed.reduce((sum, obs, i) => sum + Math.pow(obs - expected[i], 2) / expected[i], 0);
  const df = observed.length - 1;
  const pValue = 1 - chiSquaredCDF(chiSq, df);
  return { chiSq, pValue, significant: pValue < 0.05 };
}

function chiSquaredCDF(x, k) {
  if (x <= 0) return 0;
  let sum = 0, term = Math.exp(-x / 2);
  for (let i = 0; i < k / 2; i++) { sum += term; term *= (x / 2) / (i + 1); }
  return Math.min(sum, 1);
}

function requiredSampleSize(baselineRate, mde, alpha = 0.05, power = 0.8) {
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + mde);
  const pAvg = (p1 + p2) / 2;
  const zAlpha = 1.96, zBeta = 0.84;
  const n = Math.ceil(Math.pow(zAlpha * Math.sqrt(2 * pAvg * (1 - pAvg)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2));
  return n;
}

function confidenceInterval(rate, n, z = 1.96) {
  const se = Math.sqrt((rate * (1 - rate)) / n);
  return { lower: Math.max(0, rate - z * se), upper: Math.min(1, rate + z * se) };
}

function loadVariants() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveVariants(variants) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(variants));
}

const DEFAULT_VARIANTS = [
  { id: "control", name: "Control", headline: "Start your free trial today", cta: "Get Started", trafficPercent: 50, impressions: 1240, conversions: 89, isControl: true },
  { id: "variant-a", name: "Variant A", headline: "Try it free for 14 days", cta: "Start Free Trial", trafficPercent: 50, impressions: 1180, conversions: 102, isControl: false },
];

export default function ABTestVariant({ variants: initialVariants = DEFAULT_VARIANTS }) {
  const [variants, setVariants] = useState(() => { const saved = loadVariants(); return saved.length ? saved : initialVariants; });
  const [showCreate, setShowCreate] = useState(false);
  const [newVariant, setNewVariant] = useState({ name: "", headline: "", cta: "", trafficPercent: 0 });
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [winner, setWinner] = useState(null);

  useEffect(() => { saveVariants(variants); }, [variants]);

  const stats = useMemo(() => variants.map((v) => {
    const conversionRate = v.impressions > 0 ? v.conversions / v.impressions : 0;
    const ci = confidenceInterval(conversionRate, v.impressions);
    return { ...v, conversionRate, ci, sampleSizeOK: v.impressions >= 100 };
  }), [variants]);

  const chiResult = useMemo(() => {
    if (stats.length < 2) return null;
    const totalConversions = stats.reduce((s, v) => s + v.conversions, 0);
    const totalImpressions = stats.reduce((s, v) => s + v.impressions, 0);
    const overallRate = totalConversions / totalImpressions;
    const expected = stats.map((v) => v.impressions * overallRate);
    const observed = stats.map((v) => v.conversions);
    return chiSquaredTest(observed, expected);
  }, [stats]);

  const autoWinner = useMemo(() => {
    if (!chiResult?.significant) return null;
    const eligible = stats.filter((s) => s.sampleSizeOK && !s.isControl);
    if (!eligible.length) return null;
    return eligible.reduce((best, v) => (v.conversionRate > best.conversionRate ? v : best), eligible[0]);
  }, [stats, chiResult]);

  useEffect(() => { setWinner(autoWinner); }, [autoWinner]);

  const createVariant = useCallback(() => {
    if (!newVariant.name || !newVariant.headline) return;
    const id = `variant-${Date.now()}`;
    setVariants((prev) => [...prev, { ...newVariant, id, impressions: 0, conversions: 0, isControl: false }]);
    setNewVariant({ name: "", headline: "", cta: "", trafficPercent: 0 });
    setShowCreate(false);
  }, [newVariant]);

  const deleteVariant = useCallback((id) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    setSelectedForCompare((prev) => prev.filter((s) => s !== id));
  }, []);

  const updateTraffic = useCallback((id, percent) => {
    setVariants((prev) => {
      const others = prev.filter((v) => v.id !== id);
      const remaining = 100 - percent;
      const otherTotal = others.reduce((s, v) => s + v.trafficPercent, 0);
      return prev.map((v) => v.id === id ? { ...v, trafficPercent: percent } : { ...v, trafficPercent: otherTotal > 0 ? Math.round((v.trafficPercent / otherTotal) * remaining) : Math.round(remaining / others.length) });
    });
  }, []);

  const toggleCompare = useCallback((id) => {
    setSelectedForCompare((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev);
  }, []);

  const resetStats = useCallback((id) => {
    setVariants((prev) => prev.map((v) => v.id === id ? { ...v, impressions: 0, conversions: 0 } : v));
  }, []);

  const exportReport = useCallback(() => {
    const report = { generatedAt: new Date().toISOString(), variants: stats, chiSquared: chiResult, winner: winner?.id || null, requiredSample: requiredSampleSize(0.1, 0.2) };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ab-test-report-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  }, [stats, chiResult, winner]);

  const requiredN = useMemo(() => requiredSampleSize(0.1, 0.2), []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>A/B Test Variants</h2><p style={{ color: "#666", margin: "4px 0 0", fontSize: 14 }}>{variants.length} variants Â· {stats.reduce((s, v) => s + v.impressions, 0).toLocaleString()} total impressions</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}>+ New Variant</button>
          <button onClick={exportReport} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13 }}>Export Report</button>
        </div>
      </div>

      {chiResult && (
        <div style={{ padding: 16, borderRadius: 10, background: chiResult.significant ? "#f0fdf4" : "#fefce8", border: `1px solid ${chiResult.significant ? "#bbf7d0" : "#fde68a"}`, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{chiResult.significant ? "Statistically Significant Result" : "Not Yet Significant"}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Ï‡Â² = {chiResult.chiSq.toFixed(3)} Â· p = {chiResult.pValue.toFixed(4)} Â· {chiResult.significant ? "Winner detected (p < 0.05)" : `Need ~${requiredN.toLocaleString()} samples per variant`}</div>
          {winner && <div style={{ marginTop: 8, padding: "8px 12px", background: "#dcfce7", borderRadius: 6, fontSize: 13 }}>ðŸ† Winner: <strong>{winner.name}</strong> ({(winner.conversionRate * 100).toFixed(1)}% conversion, +{((winner.conversionRate / (stats.find((s) => s.isControl)?.conversionRate || 1) - 1) * 100).toFixed(1)}% lift)</div>}
        </div>
      )}

      {showCreate && (
        <div style={{ padding: 16, borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 20, background: "#f9fafb" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Create New Variant</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input placeholder="Variant name" value={newVariant.name} onChange={(e) => setNewVariant((v) => ({ ...v, name: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input placeholder="Headline" value={newVariant.headline} onChange={(e) => setNewVariant((v) => ({ ...v, headline: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input placeholder="CTA text" value={newVariant.cta} onChange={(e) => setNewVariant((v) => ({ ...v, cta: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" placeholder="Traffic %" value={newVariant.trafficPercent} onChange={(e) => setNewVariant((v) => ({ ...v, trafficPercent: Math.min(100, Math.max(0, +e.target.value)) }))} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 80 }} />
              <span style={{ fontSize: 13, color: "#666" }}>%</span>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={createVariant} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>Traffic Allocation</h3>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "#e5e7eb" }}>
          {stats.map((v, i) => <div key={v.id} style={{ width: `${v.trafficPercent}%`, background: ["#2563eb", "#16a34a", "#ea580c", "#8b5cf6"][i % 4], transition: "width 0.3s" }} />)}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {stats.map((v, i) => <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: ["#2563eb", "#16a34a", "#ea580c", "#8b5cf6"][i % 4] }} />{v.name}: {v.trafficPercent}%</div>)}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {stats.map((v, i) => (
          <div key={v.id} style={{ padding: 16, borderRadius: 10, border: `1px solid ${winner?.id === v.id ? "#16a34a" : selectedForCompare.includes(v.id) ? "#2563eb" : "#e5e7eb"}`, background: winner?.id === v.id ? "#f0fdf4" : "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{v.name}</span>
                  {v.isControl && <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>CONTROL</span>}
                  {winner?.id === v.id && <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>WINNER</span>}
                </div>
                <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>&quot;{v.headline}&quot;</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>CTA: <strong>{v.cta}</strong></div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => toggleCompare(v.id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db", background: selectedForCompare.includes(v.id) ? "#2563eb" : "#fff", color: selectedForCompare.includes(v.id) ? "#fff" : "#374151", cursor: "pointer", fontSize: 12 }}>{selectedForCompare.includes(v.id) ? "Selected" : "Compare"}</button>
                {!v.isControl && <button onClick={() => deleteVariant(v.id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 12 }}>Delete</button>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
              <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Impressions</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v.impressions.toLocaleString()}</div></div>
              <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Conversions</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v.conversions}</div></div>
              <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Conv. Rate</div><div style={{ fontSize: 18, fontWeight: 700, color: v.conversionRate > 0.05 ? "#16a34a" : "#374151" }}>{(v.conversionRate * 100).toFixed(2)}%</div></div>
              <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>95% CI</div><div style={{ fontSize: 14, fontWeight: 500 }}>{(v.ci.lower * 100).toFixed(1)}% – {(v.ci.upper * 100).toFixed(1)}%</div></div>
              <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Traffic</div><div style={{ fontSize: 14 }}>{v.trafficPercent}%<input type="range" min="0" max="100" value={v.trafficPercent} onChange={(e) => updateTraffic(v.id, +e.target.value)} style={{ width: "100%", marginTop: 4 }} /></div></div>
            </div>
          </div>
        ))}
      </div>

      {selectedForCompare.length >= 2 && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Comparison</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 13 }}>Metric</th>{selectedForCompare.map((id) => { const v = stats.find((s) => s.id === id); return <th key={id} style={{ padding: "8px 12px", textAlign: "right", fontSize: 13 }}>{v?.name}</th>; })}</tr></thead>
            <tbody>
              {["impressions", "conversions", "conversionRate"].map((metric) => (
                <tr key={metric} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontSize: 13, textTransform: "capitalize" }}>{metric.replace(/([A-Z])/g, " $1")}</td>{selectedForCompare.map((id) => { const v = stats.find((s) => s.id === id); const val = metric === "conversionRate" ? `${(v[metric] * 100).toFixed(2)}%` : v[metric].toLocaleString(); return <td key={id} style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>{val}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
