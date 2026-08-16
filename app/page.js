import PricingCalculator from "./components/PricingCalculator";
import ABTestVariant from "./components/ABTestVariant";
import ConversionTracker from "./components/ConversionTracker";
import SEOHead from "./components/SEOHead";

const FEATURES = {
  starter: { name: "Starter", basePrice: 29, includes: ["5 projects", "10GB storage", "Email support"] },
  pro: { name: "Pro", basePrice: 79, includes: ["25 projects", "100GB storage", "Priority support", "API access"], multiplier: 1.0 },
  enterprise: { name: "Enterprise", basePrice: 299, includes: ["Unlimited projects", "1TB storage", "24/7 support", "API access", "Custom integrations", "SLA"], multiplier: 1.0 },
};

const ADDONS = {
  extraStorage: { name: "Extra Storage", pricePerUnit: 5, unit: "10GB" },
  apiCalls: { name: "API Calls", pricePerUnit: 10, unit: "10k calls" },
  teamMembers: { name: "Team Members", pricePerUnit: 15, unit: "per seat" },
  sso: { name: "SSO Integration", pricePerUnit: 25, unit: "per month" },
};

function computePrice(plan, addons = {}, annual = false) {
  const base = FEATURES[plan]?.basePrice || 0;
  let addonTotal = 0;
  const addonBreakdown = [];
  for (const [key, qty] of Object.entries(addons)) {
    if (ADDONS[key] && qty > 0) {
      const cost = ADDONS[key].pricePerUnit * qty;
      addonTotal += cost;
      addonBreakdown.push({ name: ADDONS[key].name, quantity: qty, unit: ADDONS[key].unit, cost });
    }
  }
  const monthlyTotal = base + addonTotal;
  const discount = annual ? 0.2 : 0;
  const annualTotal = Math.round(monthlyTotal * 12 * (1 - discount));
  const monthlyEffective = annual ? Math.round(annualTotal / 12) : monthlyTotal;
  return {
    plan,
    planName: FEATURES[plan]?.name,
    basePrice: base,
    addonBreakdown,
    addonTotal,
    monthlyTotal,
    annualDiscount: `${discount * 100}%`,
    annualTotal,
    monthlyEffective,
    annual,
    savings: annual ? Math.round(monthlyTotal * 12 * discount) : 0,
  };
}

function generateVariant(basePage, variantId, changes) {
  const variant = { ...basePage, variantId, isControl: false };
  for (const [element, replacement] of Object.entries(changes)) {
    variant[element] = replacement;
  }
  variant.variants = {
    control: { headline: basePage.headline, cta: basePage.cta, conversionRate: 0.032 },
    [variantId]: { headline: variant.headline || basePage.headline, cta: variant.cta || basePage.cta, conversionRate: 0.032 + (Math.random() * 0.04 - 0.01) },
  };
  return variant;
}

function trackConversion(event) {
  const { elementId, eventType, page, variant, userId, metadata } = event;
  const score = eventType === "signup" ? 10 : eventType === "click" ? 3 : eventType === "scroll" ? 1 : 0;
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    elementId,
    eventType,
    page,
    variant: variant || "control",
    userId,
    score,
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    attribution: {
      channel: metadata?.channel || "direct",
      source: metadata?.source || "organic",
      medium: metadata?.medium || "none",
    },
  };
}

function generateMetaTags(page) {
  const title = `${page.productName} - ${page.headline}`;
  const description = page.description || `${page.productName} helps you build better products with AI-powered tools.`;
  const url = page.canonicalUrl || `https://example.com`;
  return {
    title,
    description,
    canonical: url,
    openGraph: { title, description, url, type: "website", siteName: page.productName },
    twitter: { card: "summary_large_image", title, description },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: page.productName,
      description,
      applicationCategory: "BusinessApplication",
      offers: {
        "@type": "Offer",
        price: FEATURES.starter.basePrice,
        priceCurrency: "USD",
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    },
    robots: { index: true, follow: true },
    keywords: page.keywords || ["saas", "ai", "productivity"],
  };
}

export default function LandingPage() {
  const pricing = {
    starter: computePrice("starter"),
    pro: computePrice("pro", { extraStorage: 2, apiCalls: 5 }),
    enterprise: computePrice("enterprise", { extraStorage: 5, apiCalls: 10, teamMembers: 3, sso: 1 }, true),
  };

  const basePage = {
    productName: "AI SaaS Kit",
    headline: "Ship Products 10x Faster with AI",
    description: "The complete toolkit for building AI-powered SaaS products. Landing pages, billing, auth, and more.",
    cta: "Start Free Trial",
    features: ["AI-powered analytics", "Real-time collaboration", "Enterprise security", "99.9% uptime SLA"],
  };

  const variantA = generateVariant(basePage, "A", { headline: "Build Smarter, Launch Faster", cta: "Get Started Free" });
  const variantB = generateVariant(basePage, "B", { headline: "AI That Works For You", cta: "Try It Now - No Credit Card" });

  const seo = generateMetaTags(basePage);

  const conversionEvents = [
    trackConversion({ elementId: "hero-cta", eventType: "click", page: "/", variant: "control", userId: "u1" }),
    trackConversion({ elementId: "pricing-signup", eventType: "signup", page: "/pricing", variant: "A", userId: "u2", metadata: { channel: "google", source: "ads", medium: "cpc" } }),
    trackConversion({ elementId: "feature-video", eventType: "scroll", page: "/features", variant: "control", userId: "u3" }),
  ];

  const topElements = {};
  for (const evt of conversionEvents) {
    topElements[evt.elementId] = (topElements[evt.elementId] || 0) + evt.score;
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#0f172a" }}>
      <SEOHead meta={seo} />

      <header style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff", padding: "5rem 2rem 6rem", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", padding: "0.35rem 1rem", background: "rgba(99,102,241,0.2)", borderRadius: 999, fontSize: "0.75rem", color: "#a5b4fc", marginBottom: "1.5rem", fontWeight: 500 }}>Trusted by 2,000+ teams</div>
          <h1 style={{ fontSize: "3rem", fontWeight: 800, margin: "0 0 1rem", lineHeight: 1.1, letterSpacing: "-0.03em" }}>{basePage.headline}</h1>
          <p style={{ fontSize: "1.15rem", color: "#94a3b8", margin: "0 0 2rem", lineHeight: 1.6 }}>{basePage.description}</p>
          <button style={{
            padding: "0.85rem 2rem", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
            border: "none", borderRadius: 10, fontSize: "1rem", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
          }}>{basePage.cta}</button>
          <div style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "#64748b" }}>No credit card required &middot; Free 14-day trial</div>
        </div>
      </header>

      <section style={{ padding: "5rem 2rem", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>Everything you need to ship</h2>
        <p style={{ color: "#64748b", margin: "0 0 3rem" }}>Stop stitching together 10 different tools. One kit, everything included.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", textAlign: "left" }}>
          {basePage.features.map((f, i) => (
            <div key={i} style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem", fontSize: "1.1rem" }}>
                {["📊", "🤝", "🔒", "⚡"][i]}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.35rem" }}>{f}</div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                {["Track metrics and trends with AI-powered insights.", "Work together in real-time with automatic sync.", "SOC 2 compliant with end-to-end encryption.", "Guaranteed uptime with automatic failover."][i]}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "5rem 2rem", background: "#f8fafc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>Simple, transparent pricing</h2>
            <p style={{ color: "#64748b", margin: 0 }}>Start free. Scale as you grow.</p>
          </div>
          <PricingCalculator plans={FEATURES} addons={ADDONS} pricing={pricing} />
        </div>
      </section>

      <section style={{ padding: "5rem 2rem", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>A/B Test Your Landing Pages</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Built-in variant testing and conversion tracking. No extra tools needed.</p>
        </div>
        <ABTestVariant variants={{ control: basePage, A: variantA, B: variantB }} />
      </section>

      <footer style={{ padding: "3rem 2rem", background: "#0f172a", color: "#94a3b8", textAlign: "center", fontSize: "0.85rem" }}>
        <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem", marginBottom: "0.5rem" }}>AI SaaS Kit</div>
        <p style={{ margin: 0 }}>{seo.description}</p>
      </footer>
    </div>
  );
}
