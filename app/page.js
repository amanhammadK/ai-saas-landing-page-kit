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
    <div>
      <SEOHead meta={seo} />
      <header>
        <h1>{basePage.headline}</h1>
        <p>{basePage.description}</p>
        <button>{basePage.cta}</button>
      </header>
      <section>
        <h2>Features</h2>
        <ul>{basePage.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
      </section>
      <PricingCalculator plans={FEATURES} addons={ADDONS} pricing={pricing} />
      <ABTestVariant variants={{ control: basePage, A: variantA, B: variantB }} />
      <ConversionTracker events={conversionEvents} topElements={topElements} />
      <footer>
        <p>{seo.title}</p>
        <p>{seo.description}</p>
      </footer>
    </div>
  );
}
