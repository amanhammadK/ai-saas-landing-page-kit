"use client";
import { useMemo } from "react";

const DEFAULT_META = {
  title: "AI SaaS Platform - Build Smarter Applications",
  description: "The all-in-one AI platform that helps you build, deploy, and scale intelligent applications with ease.",
  keywords: ["AI", "SaaS", "machine learning", "API", "cloud platform", "developer tools"],
  canonical: "https://example.com",
  robots: { index: true, follow: true, maxSnippet: -1, maxImagePreview: "large" },
  openGraph: { title: "AI SaaS Platform", description: "Build smarter applications with AI", type: "website", url: "https://example.com", image: "https://example.com/og-image.png", siteName: "AI SaaS", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "AI SaaS Platform", description: "Build smarter applications with AI", image: "https://example.com/twitter-image.png", site: "@aisaas" },
  structuredData: { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "AI SaaS Platform", applicationCategory: "BusinessApplication", operatingSystem: "Web" },
};

const DEFAULT_SITEMAP_PAGES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/pricing", priority: 0.9, changefreq: "weekly" },
  { path: "/features", priority: 0.8, changefreq: "weekly" },
  { path: "/docs", priority: 0.7, changefreq: "daily" },
  { path: "/blog", priority: 0.6, changefreq: "daily" },
  { path: "/about", priority: 0.5, changefreq: "monthly" },
  { path: "/contact", priority: 0.5, changefreq: "monthly" },
];

const DEFAULT_FAQS = [
  { question: "What is AI SaaS Platform?", answer: "An all-in-one AI platform for building and deploying intelligent applications." },
  { question: "How much does it cost?", answer: "Plans start at $29/month with a 14-day free trial." },
  { question: "Do you offer an API?", answer: "Yes, we provide a comprehensive REST API and SDKs for popular languages." },
];

const DEFAULT_ORG = { name: "AI SaaS Inc.", url: "https://example.com", logo: "https://example.com/logo.png", social: { twitter: "@aisaas", linkedin: "company/aisaas" } };

const IMAGE_SUGGESTIONS = [
  { src: "/hero.jpg", suggestion: "AI platform dashboard showing analytics and insights", alt: "Screenshot of AI SaaS dashboard displaying real-time analytics, machine learning model performance metrics, and data visualization charts" },
  { src: "/features.jpg", suggestion: "Product features overview", alt: "Illustration showing key features including API integration, real-time processing, team collaboration, and automated workflows" },
  { src: "/pricing.jpg", suggestion: "Pricing plans comparison", alt: "Visual comparison of Starter, Pro, and Enterprise pricing tiers with feature highlights and monthly pricing" },
];

function buildJSONLD(type, data) {
  const base = { "@context": "https://schema.org", "@type": type };
  return { ...base, ...data };
}

function buildProductLD({ name, description, price, currency = "USD", rating = 4.8, reviewCount = 256 }) {
  return buildJSONLD("Product", { name, description, offers: { "@type": "Offer", price, priceCurrency: currency, availability: "https://schema.org/InStock" }, aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount } });
}

function buildOrganizationLD(org) {
  return buildJSONLD("Organization", { name: org.name, url: org.url, logo: org.logo, sameAs: [org.social?.twitter, org.social?.linkedin].filter(Boolean) });
}

function buildFAQLD(faqs) {
  return buildJSONLD("FAQPage", { mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) });
}

function buildBreadcrumbLD(items) {
  return buildJSONLD("BreadcrumbList", { itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })) });
}

function buildWebPageLD({ title, description, url, dateModified }) {
  return buildJSONLD("WebPage", { name: title, description, url, dateModified: dateModified || new Date().toISOString() });
}

function generateSitemap(pages, baseUrl, lastmod) {
  const urls = pages.map((page) => `  <url>\n    <loc>${baseUrl}${page.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function generateMetaTags(meta) {
  const tags = [];
  tags.push({ name: "description", content: meta.description });
  tags.push({ name: "keywords", content: meta.keywords.join(", ") });
  const robots = [meta.robots.index ? "index" : "noindex", meta.robots.follow ? "follow" : "nofollow"];
  if (meta.robots.maxSnippet >= 0) robots.push(`max-snippet:${meta.robots.maxSnippet}`);
  if (meta.robots.maxImagePreview) robots.push(`max-image-preview:${meta.robots.maxImagePreview}`);
  tags.push({ name: "robots", content: robots.join(", ") });
  tags.push({ property: "og:title", content: meta.openGraph.title });
  tags.push({ property: "og:description", content: meta.openGraph.description });
  tags.push({ property: "og:type", content: meta.openGraph.type });
  tags.push({ property: "og:url", content: meta.openGraph.url });
  tags.push({ property: "og:image", content: meta.openGraph.image });
  tags.push({ property: "og:site_name", content: meta.openGraph.siteName });
  tags.push({ property: "og:locale", content: meta.openGraph.locale });
  tags.push({ name: "twitter:card", content: meta.twitter.card });
  tags.push({ name: "twitter:title", content: meta.twitter.title });
  tags.push({ name: "twitter:description", content: meta.twitter.description });
  tags.push({ name: "twitter:image", content: meta.twitter.image });
  if (meta.twitter.site) tags.push({ name: "twitter:site", content: meta.twitter.site });
  return tags;
}

function generatePreloadLinks(resources) {
  return resources.map((r) => ({ rel: "preload", href: r.href, as: r.as, type: r.type, crossOrigin: r.crossOrigin }));
}

export default function SEOHead({ meta: inputMeta, sitemapPages = DEFAULT_SITEMAP_PAGES, faqs = DEFAULT_FAQS, org = DEFAULT_ORG, preloadResources = [] }) {
  const meta = useMemo(() => ({ ...DEFAULT_META, ...inputMeta, openGraph: { ...DEFAULT_META.openGraph, ...inputMeta?.openGraph }, twitter: { ...DEFAULT_META.twitter, ...inputMeta?.twitter }, robots: { ...DEFAULT_META.robots, ...inputMeta?.robots } }), [inputMeta]);

  const metaTags = useMemo(() => generateMetaTags(meta), [meta]);
  const lastmod = useMemo(() => new Date().toISOString().split("T")[0], []);

  const structuredData = useMemo(() => {
    const data = [];
    data.push(buildOrganizationLD(org));
    data.push(buildProductLD({ name: meta.title, description: meta.description, price: 29 }));
    if (faqs.length) data.push(buildFAQLD(faqs));
    data.push(buildBreadcrumbLD([{ name: "Home", url: meta.canonical }, { name: meta.title, url: meta.canonical }]));
    data.push(buildWebPageLD({ title: meta.title, description: meta.description, url: meta.canonical }));
    return data;
  }, [meta, org, faqs]);

  const sitemap = useMemo(() => generateSitemap(sitemapPages, meta.canonical, lastmod), [sitemapPages, meta.canonical, lastmod]);

  const preloadLinks = useMemo(() => generatePreloadLink(preloadResources), [preloadResources]);

  const altTextSuggestions = useMemo(() => IMAGE_SUGGESTIONS.map((img) => ({ ...img, score: img.alt.length > 50 ? "good" : img.alt.length > 20 ? "fair" : "poor", length: img.alt.length })), []);

  return (
    <head>
      <title>{meta.title}</title>
      {metaTags.map((tag, i) => <meta key={i} {...tag} />)}
      <link rel="canonical" href={meta.canonical} />
      {preloadLinks.map((link, i) => <link key={`preload-${i}`} {...link} />)}
      {structuredData.map((data, i) => <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />)}
      <meta name="theme-color" content="#2563eb" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
    </head>
  );
}

export { buildJSONLD, buildProductLD, buildOrganizationLD, buildFAQLD, buildBreadcrumbLD, buildWebPageLD, generateSitemap, generateMetaTags, generatePreloadLinks, DEFAULT_SITEMAP_PAGES, DEFAULT_FAQS, IMAGE_SUGGESTIONS };
