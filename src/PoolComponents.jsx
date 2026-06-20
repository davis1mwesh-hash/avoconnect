import { useState, useEffect } from "react";
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

// ── Auto-select algorithm: closest match to target kg, fewest farmers ──────────
function autoSelectFarmers(contributions, targetKg) {
  const sorted = [...contributions].sort((a, b) => b.quantity_kg - a.quantity_kg);
  const selected = [];
  let runningTotal = 0;

  for (const c of sorted) {
    if (runningTotal >= targetKg) break;
    selected.push(c);
    runningTotal += c.quantity_kg;
  }

  if (selected.length > 1) {
    const withoutLast = runningTotal - selected[selected.length - 1].quantity_kg;
    if (withoutLast >= targetKg) {
      selected.pop();
      runningTotal = withoutLast;
    }
  }

  return { selected, totalKg: runningTotal };
}

export function PoolDetail({ pool, contributorCount, setPage, profile }) {
  const [targetKg, setTargetKg] = useState(100);
  const [suggested, setSuggested] = useState([]);
  const [suggestedTotal, setSuggestedTotal] = useState(0);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchSuggestion() {
    if (!targetKg || targetKg <= 0) { setError("Enter how many kg you need."); return; }
    setLoadingSuggest(true); setError(""); setSuggested([]);

    const { data: contributions, error: fetchErr } = await supabase
      .from("pool_contributions")
      .select("*, profiles!pool_contributions_farmer_id_fkey(name, phone, county)")
      .eq("pool_id", pool.id)
      .eq("status", "active")
      .order("quantity_kg", { ascending: false });

    setLoadingSuggest(false);
    if (fetchErr) { setError("Could not load farmers. Try again."); return; }
    if (!contributions || contributions.length === 0) { setError("No active farmers in this pool right now."); return; }

    const { selected, totalKg } = autoSelectFarmers(contributions, targetKg);
    if (totalKg < targetKg) {
      setError(`This pool only has ${totalKg.toLocaleString()}kg available right now — less than your ${targetKg}kg target. You can still request a visit for what's available.`);
    }
    setSuggested(selected);
    setSuggestedTotal(totalKg);
  }

  async function requestVisit() {
    if (!profile) { setPage("signup"); return; }
    if (profile.role === "farmer") { setError("Farmers cannot place orders. Switch to a buyer account."); return; }
    if (suggested.length === 0) { setError("No farmers selected. Click 'Find farmers' first."); return; }
    setLoading(true); setError("");

    const { data: buyerProfile } = await supabase.from("profiles").select("suspended, verified").eq("id", profile.id).single();
    if (buyerProfile?.suspended) { setError("Your account is suspended due to no-shows. Contact support."); setLoading(false); return; }
    if (!buyerProfile?.verified) { setError("Your account is pending verification."); setLoading(false); return; }

    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: visitRequest, error: vrErr } = await supabase
      .from("pool_visit_requests")
      .insert({
        pool_id: pool.id, buyer_id: profile.id,
        target_kg: targetKg, total_selected_kg: suggestedTotal,
        status: "pending_visit", expires_at: expiresAt,
      })
      .select().single();

    if (vrErr) { setError("Failed to create visit request: " + vrErr.message); setLoading(false); return; }

    const visitFarmerRows = suggested.map(c => ({
      visit_request_id: visitRequest.id, contribution_id: c.id,
      farmer_id: c.farmer_id, quantity_kg: c.quantity_kg,
    }));
    await supabase.from("pool_visit_farmers").insert(visitFarmerRows);

    const contributionIds = suggested.map(c => c.id);
    await supabase.from("pool_contributions").update({ status: "reserved" }).in("id", contributionIds);

    const { data: remaining } = await supabase
      .from("pool_contributions").select("quantity_kg").eq("pool_id", pool.id).eq("status", "active");
    const newTotal = (remaining || []).reduce((s, c) => s + (c.quantity_kg || 0), 0);
    await supabase.from("constituency_pools").update({ total_kg: newTotal }).eq("id", pool.id);

    const { data: admin } = await supabase.from("profiles").select("id").eq("phone", "0710701013").maybeSingle();
    if (admin) {
      await supabase.from("notifications").insert({
        user_id: admin.id, type: "order",
        title: "New pool visit request 🚜",
        message: `${profile.name} wants to visit ${suggested.length} farmer(s) in ${pool.constituency} pool for ${suggestedTotal}kg. Notify farmers and coordinate the visit.`,
      });
    }

    setLoading(false);
    setRequested(true);
  }

  if (requested) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 32, textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: t.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>🚜</div>
      <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, marginBottom: 10 }}>Visit request sent!</h2>
      <p style={{ color: t.textMuted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
        AvoConnect admin will notify <strong>{suggested.length} farmer{suggested.length !== 1 ? "s" : ""}</strong> in <strong>{pool.constituency}</strong> that you're coming to inspect {suggestedTotal.toLocaleString()}kg.<br/><br/>
        Once you've visited and you're happy with the fruit, let admin know to confirm the sale. You have <strong>3 days</strong> before these farmers return to the general pool.
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
            🚜 <strong>How it works:</strong> Tell us how much you need, we'll suggest the fewest farmers to cover it. You visit them in person to inspect quality, then confirm with admin once you're happy to buy.
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
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 6, fontWeight: 500 }}>How many kg do you need?</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input type="number" min="1" max={pool.total_kg} value={targetKg} onChange={e => setTargetKg(Number(e.target.value))}
                  style={{ flex: 1, padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, fontFamily: "Inter, sans-serif" }} />
                <button onClick={fetchSuggestion} disabled={loadingSuggest}
                  style={{ padding: "11px 20px", background: t.purple, color: t.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", opacity: loadingSuggest ? 0.7 : 1 }}>
                  {loadingSuggest ? "Finding…" : "Find farmers"}
                </button>
              </div>

              {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 16 }}>{error}</p>}

              {suggested.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: t.text }}>
                    Suggested: {suggested.length} farmer{suggested.length !== 1 ? "s" : ""} · {suggestedTotal.toLocaleString()}kg total
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                    {suggested.map(c => {
                      const gradeColors = { A: { bg: "#D1FAE5", text: "#065F46" }, B: { bg: "#FEF3C7", text: "#92400E" }, C: { bg: "#FEE2E2", text: "#991B1B" } };
                      const gc = gradeColors[c.quality_grade] || gradeColors.A;
                      return (
                        <div key={c.id} style={{ background: t.cream, borderRadius: 10, padding: "10px 12px", border: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.profiles?.name || "Farmer"}</div>
                            <div style={{ fontSize: 11, color: t.textMuted }}>📍 {c.profiles?.county}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.quantity_kg}kg</div>
                            <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 99, background: gc.bg, color: gc.text, fontWeight: 600 }}>Grade {c.quality_grade || "A"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>Estimated total</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: t.greenDark }}>Ksh {(suggestedTotal * (pool.price_per_kg || 0)).toLocaleString()}</div>
                </div>
                <button onClick={requestVisit} disabled={loading || suggested.length === 0}
                  style={{ padding: "13px 32px", background: t.green, color: t.white, border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: (loading || suggested.length === 0) ? 0.5 : 1 }}>
                  {loading ? "Sending…" : profile ? "Request visit" : "Sign up to request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}