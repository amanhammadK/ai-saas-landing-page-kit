"use client";
import { useState, useMemo, useCallback } from "react";

const DEFAULT_PLANS = {
  starter: {
    name: "Starter",
    basePrice: 29,
    features: ["5 users", "10GB storage", "10K API calls/mo", "Email support", "Basic analytics"],
    maxUsers: 5,
    maxStorage: 10,
    maxApiCalls: 10000,
  },
  pro: {
    name: "Pro",
    basePrice: 79,
    features: ["25 users", "100GB storage", "100K API calls/mo", "Priority support", "Advanced analytics", "Custom domain"],
    maxUsers: 25,
    maxStorage: 100,
    maxApiCalls: 100000,
  },
  enterprise: {
    name: "Enterprise",
    basePrice: 299,
    features: ["Unlimited users", "1TB storage", "Unlimited API calls", "24/7 support", "Custom analytics", "SSO", "Audit logs", "SLA"],
    maxUsers: Infinity,
    maxStorage: 1000,
    maxApiCalls: Infinity,
  },
};

const DEFAULT_ADDONS = {
  premiumSupport: { name: "Premium Support", price: 49, unit: "mo", description: "24/7 dedicated support with 1hr response time" },
  customDomain: { name: "Custom Domain", price: 12, unit: "mo", description: "Use your own domain with SSL" },
  sso: { name: "SSO Integration", price: 99, unit: "mo", description: "SAML/OIDC single sign-on for your team" },
  auditLogs: { name: "Audit Logs", price: 39, unit: "mo", description: "Detailed activity logs for compliance" },
  extraStorage: { name: "Extra Storage (50GB)", price: 15, unit: "mo", description: "Additional 50GB cloud storage" },
  extraApiCalls: { name: "Extra API Calls (50K)", price: 20, unit: "mo", description: "Additional 50K API calls per month" },
};

const USAGE_RATES = { storage: 0.10, apiCalls: 0.002, users: 5 };
const TAX_RATE = 0.08;
const ANNUAL_DISCOUNT = 0.20;

export default function PricingCalculator({ plans = DEFAULT_PLANS, addons = DEFAULT_ADDONS }) {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedAddons, setSelectedAddons] = useState({});
  const [usage, setUsage] = useState({ users: 10, storage: 25, apiCalls: 50000 });
  const [showInvoice, setShowInvoice] = useState(false);
  const [showROI, setShowROI] = useState(false);
  const [inHouseCost, setInHouseCost] = useState({ salary: 120000, infra: 500, hours: 40 });

  const plan = plans[selectedPlan];
  const isAnnual = billingCycle === "annual";

  const overage = useMemo(() => {
    const userOverage = Math.max(0, usage.users - plan.maxUsers);
    const storageOverage = Math.max(0, usage.storage - plan.maxStorage);
    const apiOverage = Math.max(0, usage.apiCalls - plan.maxApiCalls);
    return {
      users: userOverage,
      storage: storageOverage,
      apiCalls: apiOverage,
      userCost: userOverage * USAGE_RATES.users,
      storageCost: storageOverage * USAGE_RATES.storage,
      apiCost: apiOverage * USAGE_RATES.apiCalls,
      total: userOverage * USAGE_RATES.users + storageOverage * USAGE_RATES.storage + apiOverage * USAGE_RATES.apiCalls,
    };
  }, [usage, plan]);

  const addonTotal = useMemo(() => {
    return Object.entries(selectedAddons).reduce((sum, [key, qty]) => {
      return sum + (addons[key]?.price || 0) * qty;
    }, 0);
  }, [selectedAddons, addons]);

  const pricing = useMemo(() => {
    const baseMonthly = plan.basePrice;
    const baseWithOverage = baseMonthly + overage.total;
    const monthlyTotal = baseWithOverage + addonTotal;
    const annualMonthly = monthlyTotal * (1 - ANNUAL_DISCOUNT);
    const annualTotal = annualMonthly * 12;
    const savings = isAnnual ? (monthlyTotal * 12) - annualTotal : 0;
    return { baseMonthly, baseWithOverage, monthlyTotal, annualMonthly, annualTotal, savings, perMonth: isAnnual ? annualMonthly : monthlyTotal };
  }, [plan, overage, addonTotal, isAnnual]);

  const roi = useMemo(() => {
    const buildCost = inHouseCost.salary + (inHouseCost.infra * 12) + (inHouseCost.hours * 52 * 75);
    const annualSaasCost = pricing.perMonth * 12;
    const savingsVsBuild = buildCost - annualSaasCost;
    const paybackMonths = Math.ceil((inHouseCost.hours * 75) / pricing.perMonth);
    return { buildCost, annualSaasCost, savingsVsBuild, paybackMonths, breakEven: savingsVsBuild > 0 };
  }, [pricing, inHouseCost]);

  const invoice = useMemo(() => {
    const items = [
      { description: `${plan.name} Plan`, quantity: 1, unitPrice: plan.basePrice, total: plan.basePrice },
    ];
    if (overage.users > 0) items.push({ description: `Extra Users (${overage.users})`, quantity: overage.users, unitPrice: USAGE_RATES.users, total: overage.userCost });
    if (overage.storage > 0) items.push({ description: `Extra Storage (${overage.storage}GB)`, quantity: overage.storage, unitPrice: USAGE_RATES.storage, total: overage.storageCost });
    if (overage.apiCalls > 0) items.push({ description: `Extra API Calls (${overage.apiCalls.toLocaleString()})`, quantity: overage.apiCalls, unitPrice: USAGE_RATES.apiCalls, total: overage.apiCost });
    Object.entries(selectedAddons).forEach(([key, qty]) => {
      if (qty > 0 && addons[key]) items.push({ description: addons[key].name, quantity: qty, unitPrice: addons[key].price, total: addons[key].price * qty });
    });
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const discount = isAnnual ? subtotal * ANNUAL_DISCOUNT : 0;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * TAX_RATE;
    const total = afterDiscount + tax;
    return { items, subtotal, discount, afterDiscount, tax, total, isAnnual };
  }, [plan, overage, selectedAddons, addons, isAnnual]);

  const toggleAddon = useCallback((key) => {
    setSelectedAddons((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  }, []);

  const decrementAddon = useCallback((key) => {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[key] > 1) next[key]--;
      else delete next[key];
      return next;
    });
  }, []);

  const exportPricing = useCallback(() => {
    const data = { plan: selectedPlan, billingCycle, usage, selectedAddons, pricing, invoice, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pricing-${selectedPlan}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedPlan, billingCycle, usage, selectedAddons, pricing, invoice]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Pricing Calculator</h2>
      <p style={{ color: "#666", marginBottom: 24 }}>Configure your plan and see exactly what you'll pay.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <span style={{ color: billingCycle === "monthly" ? "#000" : "#999" }}>Monthly</span>
        <button onClick={() => setBillingCycle(isAnnual ? "monthly" : "annual")} style={{ width: 48, height: 26, borderRadius: 13, border: "none", background: isAnnual ? "#2563eb" : "#ccc", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <span style={{ position: "absolute", top: 3, left: isAnnual ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
        <span style={{ color: isAnnual ? "#000" : "#999" }}>Annual <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Save 20%</span></span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {Object.entries(plans).map(([key, p]) => (
          <div key={key} onClick={() => setSelectedPlan(key)} style={{ border: selectedPlan === key ? "2px solid #2563eb" : "1px solid #e5e7eb", borderRadius: 12, padding: 20, cursor: "pointer", background: selectedPlan === key ? "#f0f7ff" : "#fff", transition: "all 0.15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{p.name}</h3>
              {selectedPlan === key && <span style={{ background: "#2563eb", color: "#fff", padding: "2px 10px", borderRadius: 12, fontSize: 12 }}>Selected</span>}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>${isAnnual ? Math.round(p.basePrice * (1 - ANNUAL_DISCOUNT)) : p.basePrice}<span style={{ fontSize: 14, fontWeight: 400, color: "#666" }}>/{isAnnual ? "mo" : "mo"}</span></div>
            {isAnnual && <div style={{ fontSize: 13, color: "#16a34a" }}>Billed ${Math.round(p.basePrice * (1 - ANNUAL_DISCOUNT) * 12)}/year</div>}
            <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
              {p.features.map((f, i) => <li key={i} style={{ padding: "4px 0", fontSize: 14, color: "#374151" }}>âœ“ {f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ background: "#f9fafb", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Usage Configuration</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Users</label>
            <input type="number" value={usage.users} onChange={(e) => setUsage((u) => ({ ...u, users: Math.max(1, +e.target.value) }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db" }} />
            {overage.users > 0 && <span style={{ fontSize: 12, color: "#dc2626" }}>+{overage.users} over limit (+${overage.userCost.toFixed(2)}/mo)</span>}
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Storage (GB)</label>
            <input type="number" value={usage.storage} onChange={(e) => setUsage((u) => ({ ...u, storage: Math.max(1, +e.target.value) }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db" }} />
            {overage.storage > 0 && <span style={{ fontSize: 12, color: "#dc2626" }}>+{overage.storage}GB over limit (+${overage.storageCost.toFixed(2)}/mo)</span>}
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>API Calls/mo</label>
            <input type="number" value={usage.apiCalls} onChange={(e) => setUsage((u) => ({ ...u, apiCalls: Math.max(0, +e.target.value) }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db" }} />
            {overage.apiCalls > 0 && <span style={{ fontSize: 12, color: "#dc2626" }}>+{overage.apiCalls.toLocaleString()} over limit (+${overage.apiCost.toFixed(2)}/mo)</span>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Add-ons</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {Object.entries(addons).map(([key, addon]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: selectedAddons[key] ? "#f0f7ff" : "#fff" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{addon.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{addon.description}</div>
                <div style={{ fontSize: 13, color: "#2563eb" }}>+${addon.price}/{addon.unit}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selectedAddons[key] ? (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); decrementAddon(key); }} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 16 }}>-</button>
                    <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>{selectedAddons[key]}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleAddon(key); }} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 16 }}>+</button>
                  </>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); toggleAddon(key); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #2563eb", background: "#fff", color: "#2563eb", cursor: "pointer", fontSize: 13 }}>Add</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#f9fafb", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Estimated Monthly Cost</h3>
        <div style={{ fontSize: 42, fontWeight: 700, color: "#2563eb" }}>${pricing.perMonth.toFixed(2)}<span style={{ fontSize: 16, fontWeight: 400, color: "#666" }}>/mo</span></div>
        {isAnnual && <div style={{ fontSize: 14, color: "#16a34a" }}>You save ${pricing.savings.toFixed(2)}/year with annual billing</div>}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setShowROI(!showROI)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}>{showROI ? "Hide" : "Show"} ROI Calculator</button>
        <button onClick={() => setShowInvoice(!showInvoice)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}>{showInvoice ? "Hide" : "Show"} Invoice Preview</button>
        <button onClick={exportPricing} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 14 }}>Export JSON</button>
      </div>

      {showROI && (
        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid #bbf7d0" }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>ROI vs Building In-House</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "#666" }}>Engineer Salary ($/yr)</label>
              <input type="number" value={inHouseCost.salary} onChange={(e) => setInHouseCost((c) => ({ ...c, salary: +e.target.value }))} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#666" }}>Infra Cost ($/mo)</label>
              <input type="number" value={inHouseCost.infra} onChange={(e) => setInHouseCost((c) => ({ ...c, infra: +e.target.value }))} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#666" }}>Dev Hours/Week</label>
              <input type="number" value={inHouseCost.hours} onChange={(e) => setInHouseCost((c) => ({ ...c, hours: +e.target.value }))} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, color: "#666" }}>Build Cost (Year 1)</div><div style={{ fontSize: 20, fontWeight: 700 }}>${roi.buildCost.toLocaleString()}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, color: "#666" }}>SaaS Cost (Year 1)</div><div style={{ fontSize: 20, fontWeight: 700 }}>${roi.annualSaasCost.toLocaleString()}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, color: "#666" }}>Net Savings</div><div style={{ fontSize: 20, fontWeight: 700, color: roi.breakEven ? "#16a34a" : "#dc2626" }}>{roi.breakEven ? `$${roi.savingsVsBuild.toLocaleString()}` : `-$${Math.abs(roi.savingsVsBuild).toLocaleString()}`}</div></div>
          </div>
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#666" }}>
            {roi.breakEven ? `Payback in ~${roi.paybackMonths} months` : "SaaS is more cost-effective than building in-house"}
          </div>
        </div>
      )}

      {showInvoice && (
        <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ background: "#1f2937", color: "#fff", padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 700, fontSize: 18 }}>Invoice Preview</div><div style={{ fontSize: 13, opacity: 0.7 }}>Generated {new Date().toLocaleDateString()}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, opacity: 0.7 }}>Billing: {isAnnual ? "Annual" : "Monthly"}</div><div style={{ fontSize: 13, opacity: 0.7 }}>Plan: {plan.name}</div></div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f3f4f6" }}><th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13 }}>Description</th><th style={{ padding: "10px 16px", textAlign: "right", fontSize: 13 }}>Qty</th><th style={{ padding: "10px 16px", textAlign: "right", fontSize: 13 }}>Unit Price</th><th style={{ padding: "10px 16px", textAlign: "right", fontSize: 13 }}>Total</th></tr></thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 16px", fontSize: 14 }}>{item.description}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14 }}>{item.quantity}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14 }}>${item.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14 }}>${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "12px 16px", borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}><span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span></div>
            {invoice.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, color: "#16a34a" }}><span>Annual Discount (20%)</span><span>-${invoice.discount.toFixed(2)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}><span>Tax (8%)</span><span>${invoice.tax.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 18, fontWeight: 700, borderTop: "1px solid #d1d5db", marginTop: 4 }}><span>Total</span><span>${invoice.total.toFixed(2)}/mo</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
