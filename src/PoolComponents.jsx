import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  brown: "#6B4C2A", brownLight: "#F5EFE6", brownMid: "#C4965A",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)", shadowHover: "0 8px 24px rgba(0,0,0,.10)",
  purple: "#8B5CF6", purpleLight: "#EDE9FE",
};

export function PoolCard({ pool, contributorCount, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: t.white, border: `1.5px solid ${t.purple}30`, borderRadius: 16,
        padding: 20, cursor: "pointer", transition: "box-shadow .2s, transform .2s",
        boxShadow: t.shadow, position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = t.shadowHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = t.shadow; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: t.purpleLight, borderRadius: "0 0 0 60px", opacity: 0.5 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, position: "relative" }}>
        <span style={{ fontSize: 11, background: t.purpleLight, color: t.purple, padding: "3px 12px", borderRadius: 99, fontWeight: 600, letterSpacing: ".3px" }}>
          🤝 Constituency Pool
        </span>
        <span style={{ fontSize: 11, color: t.textMuted }}>📍 {pool.county}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4, color: t.text }}>{pool.constituency}</div>
      <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span>🥑 {pool.variety}</span>
        <span>👥 {contributorCount} farmer{contributorCount !== 1 ? "s" : ""} contributing</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: t.greenDark }}>{pool.total_kg?.toLocaleString()} kg</span>
          <span style={{ fontSize: 12, color: t.textMuted }}> available</span>
        </div>
        <button style={{ padding: "8px 16px", background: t.purpleLight, color: t.purple, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
          View pool →
        </button>
      </div>
    </div>
  );
}

export function PoolDetail({ pool, contributorCount, setPage, profile }) {
  const [qty, setQty] = useState(100);
  const [msg, setMsg] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function placeOrder() {
    if (!profile) { setPage("signup"); return; }
    if (profile.role === "farmer") { setError("Farmers cannot place orders. Switch to a buyer account."); return; }
    setLoading(true);

    const { data: buyerProfile } = await supabase.from("profiles").select("suspended, verified").eq("id", profile.id).single();
    if (buyerProfile?.suspended) { setError("Your account is suspended due to no-shows. Contact support."); setLoading(false); return; }
    if (!buyerProfile?.verified) { setError("Your account is pending verification."); setLoading(false); return; }

    if (qty > pool.total_kg) { setError(`Only ${pool.total_kg.toLocaleString()} kg available in this pool.`); setLoading(false); return; }

    const { error: err } = await supabase.from("pool_orders").insert({
      pool_id: pool.id, buyer_id: profile.id,
      quantity_kg: qty, price_per_kg: pool.price_per_kg || 0, message: msg,
    });
    setLoading(false);
    if (err) { setError("Failed to place order. Try again."); return; }
    setOrdered(true);
  }

  if (ordered) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 32, textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: t.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✅</div>
      <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, marginBottom: 10 }}>Pool order sent!</h2>
      <p style={{ color: t.textMuted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
        AvoConnect admin will review and confirm your order from the <strong>{pool.constituency}</strong> pool.<br/>
        Total: <strong style={{ color: t.greenDark }}>Ksh {(qty * (pool.price_per_kg || 0)).toLocaleString()}</strong>
      </p>
      <button onClick={() => setPage("home")} style={{ padding: "12px 32px", background: t.green, color: t.white, border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
        Back to marketplace
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 580, margin: "0 auto", padding: "28px 16px" }}>
      <button onClick={() => setPage("home")} style={{ fontSize: 13, color: t.textMuted, background: "none", border: "none", marginBottom: 20, cursor: "pointer" }}>← Back to listings</button>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, overflow: "hidden", boxShadow: t.shadow }}>
        <div style={{ background: `linear-gradient(135deg, ${t.purpleLight}, ${t.brownLight})`, padding: "28px 24px", borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 11, background: t.purpleLight, color: t.purple, padding: "3px 12px", borderRadius: 99, fontWeight: 600, display: "inline-block", marginBottom: 10 }}>
            🤝 Constituency Pool
          </span>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, marginBottom: 4 }}>{pool.constituency}</h2>
          <p style={{ fontSize: 14, color: t.textMuted }}>{pool.county} County · {contributorCount} contributing farmers</p>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ background: t.cream, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
            This is a pooled listing combining stock from {contributorCount} small-scale farmers in {pool.constituency} constituency. Orders are reviewed and confirmed by AvoConnect admin on behalf of contributing farmers.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[["🧺 Available", `${pool.total_kg?.toLocaleString()} kg`], ["🥑 Variety", pool.variety], ["👥 Farmers", contributorCount], ["💰 Price", `Ksh ${pool.price_per_kg || "TBD"}/kg`]].map(([k, v]) => (
              <div key={k} style={{ background: t.cream, borderRadius: 10, padding: "12px 14px", border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          {profile?.role === "farmer" ? (
            <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 13, color: "#92400E", fontWeight: 500 }}>🌱 You are logged in as a farmer. Only buyers can place orders.</p>
            </div>
          ) : (
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 6, fontWeight: 500 }}>Order quantity (kg)</label>
              <input type="number" min="1" max={pool.total_kg} value={qty} onChange={e => setQty(Number(e.target.value))}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, marginBottom: 12, fontFamily: "Inter, sans-serif" }} />
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 6, fontWeight: 500 }}>Message (optional)</label>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="e.g. Need delivery to Nakuru packhouse"
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, resize: "none", marginBottom: 20, fontFamily: "Inter, sans-serif" }} />
              {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 12 }}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>Total estimate</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: t.greenDark }}>Ksh {(qty * (pool.price_per_kg || 0)).toLocaleString()}</div>
                </div>
                <button onClick={placeOrder} disabled={loading}
                  style={{ padding: "13px 32px", background: t.green, color: t.white, border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Sending…" : profile ? "Place pool order" : "Sign up to order"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}