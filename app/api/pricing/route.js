import { NextResponse } from "next/server";

const PLANS = {
  starter: { name: "Starter", basePrice: 29, features: ["5 projects", "10GB storage", "Email support"] },
  pro: { name: "Pro", basePrice: 79, features: ["25 projects", "100GB storage", "Priority support", "API access"] },
  enterprise: { name: "Enterprise", basePrice: 299, features: ["Unlimited projects", "1TB storage", "24/7 support", "API access", "Custom integrations", "SLA"] },
};

const ADDONS = {
  extraStorage: { name: "Extra Storage", pricePerUnit: 5, unit: "10GB" },
  apiCalls: { name: "API Calls", pricePerUnit: 10, unit: "10k calls" },
  teamMembers: { name: "Team Members", pricePerUnit: 15, unit: "per seat" },
  sso: { name: "SSO Integration", pricePerUnit: 25, unit: "per month" },
};

export async function POST(request) {
  const { plan, addons = {}, annual = false } = await request.json();
  if (!PLANS[plan]) {
    return NextResponse.json({ error: `Invalid plan. Options: ${Object.keys(PLANS).join(", ")}` }, { status: 400 });
  }
  const base = PLANS[plan].basePrice;
  let addonTotal = 0;
  const breakdown = [];
  for (const [key, qty] of Object.entries(addons)) {
    if (ADDONS[key] && qty > 0) {
      const cost = ADDONS[key].pricePerUnit * qty;
      addonTotal += cost;
      breakdown.push({ name: ADDONS[key].name, quantity: qty, unit: ADDONS[key].unit, cost });
    }
  }
  const monthlyTotal = base + addonTotal;
  const discount = annual ? 0.2 : 0;
  const annualTotal = Math.round(monthlyTotal * 12 * (1 - discount));
  return NextResponse.json({
    plan,
    planName: PLANS[plan].name,
    features: PLANS[plan].features,
    basePrice: base,
    addonBreakdown: breakdown,
    addonTotal,
    monthlyTotal,
    annual,
    annualTotal,
    monthlyEffective: annual ? Math.round(annualTotal / 12) : monthlyTotal,
    savings: annual ? Math.round(monthlyTotal * 12 * discount) : 0,
  });
}
