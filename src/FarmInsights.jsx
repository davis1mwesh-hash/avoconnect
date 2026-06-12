import { useState } from "react";
import { supabase } from "./App";

async function askAI(prompt) {
  const { data, error } = await supabase.functions.invoke('ask-ai', {
    body: { query: prompt }
  });

  if (error) throw new Error(error.message || "AI request failed");

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || "No response received.";
}

const t = {
  green: "#1D9E75", greenDark: "#0F6E56", greenLight: "#E1F5EE",
  text: "#1a1a1a", muted: "#6b7280", border: "#e5e7eb", bg: "#fafaf8", white: "#ffffff",
  amber: "#F59E0B", amberLight: "#FEF3C7", amberDark: "#92400E",
  blue: "#3B82F6", blueLight: "#DBEAFE", blueDark: "#1E40AF",
  purple: "#8B5CF6", purpleLight: "#EDE9FE", purpleDark: "#5B21B6",
};

const btn = (variant = "default") => ({
  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
  padding: "8px 18px", borderRadius: 10, border: "none", display: "inline-flex",
  alignItems: "center", gap: 6, transition: "opacity 0.15s",
  ...(variant === "primary" ? { background: t.green, color: "#fff" } :
      variant === "blue"    ? { background: t.blue, color: "#fff" } :
      variant === "purple"  ? { background: t.purple, color: "#fff" } :
                              { background: t.bg, border: `1px solid ${t.border}`, color: t.muted }),
});

function RenderMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div style={{ fontSize: 14, lineHeight: 1.75, color: t.text }}>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p);
        if (line.trim().startsWith("* ") || line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
          const cleanLine = line.trim().replace(/^[\*\-•]\s*/, "");
          const cleanParts = cleanLine.split(/\*\*(.*?)\*\*/g);
          const cleanRendered = cleanParts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p);
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <span style={{ color: t.green, flexShrink: 0 }}>•</span>
              <span>{cleanRendered}</span>
            </div>
          );
        }
        if (line.startsWith("## ")) return <div key={i} style={{ fontWeight: 600, fontSize: 15, marginTop: 10, marginBottom: 4, color: t.greenDark }}>{line.replace("## ", "")}</div>;
        if (line.startsWith("# ")) return <div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: 12, marginBottom: 6, color: t.greenDark }}>{line.replace("# ", "")}</div>;
        if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
        return <div key={i} style={{ marginBottom: 2 }}>{rendered}</div>;
      })}
    </div>
  );
}

function InsightCard({ icon, title, subtitle, accentColor, accentLight, buttonLabel, buttonVariant, onFetch, result, loading, error, children }) {
  return (
    <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 18, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ height: 4, background: accentColor }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
              <div style={{ fontSize: 12, color: t.muted }}>{subtitle}</div>
            </div>
          </div>
          <button onClick={onFetch} disabled={loading} style={{ ...btn(buttonVariant), opacity: loading ? 0.65 : 1, flexShrink: 0 }}>
            {loading ? "Thinking…" : result ? "↺ Refresh" : buttonLabel}
          </button>
        </div>
        {children}
        {error && (
          <div style={{ background: "#FEE2E2", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "#991B1B" }}>⚠️ {error}</span>
          </div>
        )}
        {loading && !result && (
          <div style={{ marginTop: 14 }}>
            {[100, 85, 90, 70].map((w, i) => (
              <div key={i} style={{ height: 12, borderRadius: 6, background: "#f0f0f0", marginBottom: 8, width: `${w}%` }} />
            ))}
          </div>
        )}
        {result && !loading && (
          <div style={{ marginTop: 14, background: accentLight, borderRadius: 12, padding: "14px 16px" }}>
            <RenderMarkdown text={result} />
          </div>
        )}
        {!result && !loading && !error && (
          <div style={{ marginTop: 10, padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
            <div style={{ fontSize: 13, color: t.muted }}>Click "{buttonLabel}" to get your AI-powered insight</div>
          </div>
        )}
      </div>
      {result && !loading && (
        <div style={{ padding: "8px 20px 12px", borderTop: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 11, color: t.muted }}>🤖 Powered by AvoConnect AI · {new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}
    </div>
  );
}

function EstimatorControls({ orchards, pricePerKg, setPricePerKg }) {
  const totalTrees = orchards.reduce((s, o) => s + (o.total_trees || 0), 0);
  if (orchards.length === 0) return null;
  return (
    <div style={{ background: t.bg, borderRadius: 12, padding: "12px 14px", marginBottom: 4 }}>
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 10, fontWeight: 500 }}>
        {orchards.length} orchard{orchards.length > 1 ? "s" : ""} · {totalTrees.toLocaleString()} trees
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontSize: 12, color: t.muted, flexShrink: 0 }}>Expected price (Ksh/kg)</label>
        <input type="number" value={pricePerKg} onChange={e => setPricePerKg(Number(e.target.value))} min={10} max={300} step={5}
          style={{ width: 90, padding: "6px 10px", border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, background: t.white }} />
        <span style={{ fontSize: 12, color: t.muted }}>per kg</span>
      </div>
    </div>
  );
}

export default function FarmInsights({ profile, orchards, entries }) {
  const county = profile?.county || "Kenya";
  const totalTrees = orchards.reduce((s, o) => s + (o.total_trees || 0), 0);

  const [marketResult, setMarketResult] = useState("");
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");

  const [weatherResult, setWeatherResult] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const [estimateResult, setEstimateResult] = useState("");
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [pricePerKg, setPricePerKg] = useState(45);

  function orchardContext() {
    if (orchards.length === 0) return "No orchards registered yet.";
    return orchards.map(o => {
      const age = o.year_planted ? new Date().getFullYear() - o.year_planted : null;
      const ageClass = !age ? "Unknown age" :
        age <= 2 ? "Young (0–2 yrs, pre-bearing)" :
        age <= 5 ? "Juvenile (3–5 yrs, early bearing)" :
        age <= 10 ? "Mature (6–10 yrs, peak bearing)" :
                    "Established (10+ yrs, full bearing)";
      return `- ${o.name}: ${o.total_trees || 0} ${o.variety || "Hass"} trees, ${o.size_acres || "?"} acres, planted ${o.year_planted || "unknown"} (${ageClass})`;
    }).join("\n");
  }

  function recentActivityContext() {
    const recent = entries.slice(0, 5);
    if (!recent.length) return "No recent activity logged.";
    return recent.map(e => `- ${e.date}: ${e.activity_type}${e.product_used ? " (" + e.product_used + ")" : ""}${e.notes ? " — " + e.notes.substring(0, 60) : ""}`).join("\n");
  }

  async function fetchMarket() {
    setMarketLoading(true); setMarketError(""); setMarketResult("");
    const varieties = [...new Set(orchards.map(o => o.variety).filter(Boolean))];
    const prompt = `You are an expert on Kenya's avocado market. Today is ${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

The farmer is based in ${county} County, Kenya and grows: ${varieties.length ? varieties.join(", ") : "Hass"} avocados.

Their orchards:
${orchardContext()}

Provide a practical market intelligence report covering:
## Current Farm-Gate Prices
Realistic current Ksh/kg farm-gate price ranges for ${varieties.length ? varieties.join(", ") : "Hass"} avocados in ${county}.

## Best Buyers Right Now
What types of buyers are paying best prices this season?

## Price Outlook (Next 4–8 Weeks)
Will prices go up or down?

## Action Recommendation
One clear action this farmer should take this week to maximize returns.

Keep it practical and Kenya-specific. Use bullet points and bold key numbers.`;
    try {
      const res = await askAI(prompt);
      setMarketResult(res);
    } catch (e) { setMarketError(e.message); }
    setMarketLoading(false);
  }

  async function fetchWeather() {
    setWeatherLoading(true); setWeatherError(""); setWeatherResult("");
    const prompt = `You are an agricultural meteorologist specializing in Kenyan avocado farming.

Today is ${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. The farmer is in ${county} County, Kenya.

Recent farm activities:
${recentActivityContext()}

Orchards:
${orchardContext()}

Provide a practical weather advisory covering:
## Current Weather Pattern for ${county}
Typical weather for ${county} in late May / early June.

## Critical Alerts
Weather risks right now for avocado farmers.

## Disease & Pest Risk
Highest risk diseases and pests this season in ${county}.

## Recommended Farm Actions This Week
Specific actions the farmer should take based on current weather.

Keep advice Kenya-specific and practical. Use bullet points.`;
    try {
      const res = await askAI(prompt);
      setWeatherResult(res);
    } catch (e) { setWeatherError(e.message); }
    setWeatherLoading(false);
  }

  async function fetchEstimate() {
    if (orchards.length === 0) { setEstimateError("Add at least one orchard first."); return; }
    setEstimateLoading(true); setEstimateError(""); setEstimateResult("");
    const prompt = `You are a Kenyan avocado production expert.

Today is ${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}. Farmer is in ${county} County.

Orchards:
${orchardContext()}

Expected farm-gate price: Ksh ${pricePerKg} per kg
Total trees: ${totalTrees.toLocaleString()}

Using Kenyan yield benchmarks:
- Young (0–2 yrs): 0 kg/tree
- Juvenile (3–5 yrs): 15–30 kg/tree/year
- Mature (6–10 yrs): 40–80 kg/tree/year
- Established (10+ yrs): 60–120 kg/tree/year

Provide:
## Production Estimate by Orchard
For each orchard: age class, yield range, estimated production (low/mid/high), estimated revenue.

## Overall Farm Totals
Total production and gross revenue (low/mid/high).

## How to Increase Yield
Top 3 specific actions to move from low to high yield.

Show all calculations clearly in Kenya Shillings.`;
    try {
      const res = await askAI(prompt);
      setEstimateResult(res);
    } catch (e) { setEstimateError(e.message); }
    setEstimateLoading(false);
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: `linear-gradient(135deg, ${t.greenLight} 0%, #f0fdf9 100%)`, border: `1px solid ${t.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 32 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>AI Farm Intelligence</div>
          <div style={{ fontSize: 13, color: t.muted }}>
            Powered by AvoConnect AI · <strong>{county} County</strong> · {orchards.length} orchard{orchards.length !== 1 ? "s" : ""}, {totalTrees.toLocaleString()} trees
          </div>
        </div>
      </div>

      <InsightCard icon="📈" title="Live Market Intelligence" subtitle={`Avocado prices & buyer demand — ${county} & Kenya`}
        accentColor={t.green} accentLight={t.greenLight} buttonLabel="Get market prices" buttonVariant="primary"
        onFetch={fetchMarket} result={marketResult} loading={marketLoading} error={marketError} />

      <InsightCard icon="🌦️" title="Weather & Disease Alert" subtitle={`${county} County — farm advisory for this week`}
        accentColor={t.blue} accentLight={t.blueLight} buttonLabel="Get weather advisory" buttonVariant="blue"
        onFetch={fetchWeather} result={weatherResult} loading={weatherLoading} error={weatherError} />

      <InsightCard icon="🌳" title="Production & Revenue Estimator" subtitle="Harvest forecast by orchard age · low / mid / high scenarios"
        accentColor={t.purple} accentLight={t.purpleLight} buttonLabel="Estimate my harvest" buttonVariant="purple"
        onFetch={fetchEstimate} result={estimateResult} loading={estimateLoading} error={estimateError}>
        <EstimatorControls orchards={orchards} pricePerKg={pricePerKg} setPricePerKg={setPricePerKg} />
      </InsightCard>

      <div style={{ padding: "12px 16px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, marginTop: 8 }}>
        <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.6, margin: 0 }}>
          ⚠️ <strong>Disclaimer:</strong> AI insights are estimates based on typical Kenya avocado market conditions. Always verify prices with local buyers and extension officers before making major decisions.
        </p>
      </div>
    </>
  );
}