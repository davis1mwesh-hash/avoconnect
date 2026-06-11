import React, { useState, useEffect } from "react";
import { supabase } from "./App";

export default function BuyerDashboard({ profile, setPage }) {
  const [tab, setTab] = useState("broadcast");
  const [loading, setLoading] = useState(false);
  const [pitches, setPitches] = useState([]);
  const [loadingPitches, setLoadingPitches] = useState(false);
const [requirements, setRequirements] = useState([]);
const [loadingReqs, setLoadingReqs] = useState(false);
  const [formData, setFormData] = useState({
    variety: "Hass", location: "", price: "", volume: "", notes: ""
  });

  const t = {
    green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
    brown: "#6B4C2A", brownLight: "#F5EFE6", brownMid: "#C4965A",
    border: "#E2DDD6", text: "#1C1C1A", textMuted: "#6B6B5F",
    white: "#FFFFFF", cream: "#FDFAF5", shadow: "0 2px 12px rgba(0,0,0,.06)"
  };

  const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white };
  const btn = (bg, color, border) => ({ padding: "9px 20px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" });

 useEffect(() => {
  fetchPitches();
  fetchRequirements();

    // Real-time: listen for new pitches coming in
    const channel = supabase
      .channel("buyer-pitches:" + profile.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "pitches",
        filter: `buyer_id=eq.${profile.id}`,
      }, () => {
        fetchPitches(); // refresh when a new pitch arrives
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchPitches() {
    setLoadingPitches(true);
    const { data, error } = await supabase
      .from("pitches")
      .select("*, listings(variety, quantity_kg, price_per_kg, harvest_date, certification), profiles!pitches_farmer_id_fkey(name, phone)")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) console.error("Pitches fetch error:", error);
    setPitches(data || []);
    setLoadingPitches(false);
  }

  async function fetchRequirements() {
  setLoadingReqs(true);
  const { data } = await supabase
    .from("buyer_requirements")
    .select("*")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false });
  setRequirements(data || []);
  setLoadingReqs(false);
}

async function closeRequirement(id) {
  if (!confirm("Close this requirement? It will be hidden from farmers.")) return;
  await supabase.from("buyer_requirements").update({ is_active: false }).eq("id", id);
  setRequirements(prev => prev.map(r => r.id === id ? { ...r, is_active: false } : r));
}

  async function updatePitchStatus(pitchId, status, pitch) {
    await supabase.from("pitches").update({ status }).eq("id", pitchId);
    setPitches(prev => prev.map(p => p.id === pitchId ? { ...p, status } : p));

    if (status === "accepted") {
      // Remove listing from marketplace
      await supabase.from("listings").update({ is_active: false }).eq("id", pitch.listing_id);

      // Notify farmer
      await supabase.from("notifications").insert({
        user_id: pitch.farmer_id,
        type: "pitch",
        title: "Pitch Accepted! 🎉",
        message: `${profile.name} accepted your pitch for ${pitch.listings?.quantity_kg?.toLocaleString()} kg of ${pitch.listings?.variety}. They will contact you shortly on your registered number.`,
      });
    }

    if (status === "rejected") {
      await supabase.from("notifications").insert({
        user_id: pitch.farmer_id,
        type: "rejected",
        title: "Pitch Declined ❌",
        message: `${profile.name} was unable to proceed with your pitch for ${pitch.listings?.variety}. Keep an eye out for other requirements.`,
      });
    }
  }

  async function broadcastRequirement(e) {
  e.preventDefault();
  if (!profile.verified) { alert("Your account must be verified before broadcasting requirements."); return; }
  if (!formData.location) { alert("Please enter a target buying location."); return; }
  if (!formData.price || Number(formData.price) <= 0) { alert("Please enter a valid target price."); return; }
  if (!formData.volume || Number(formData.volume) <= 0) { alert("Please enter a valid minimum volume."); return; }
  setLoading(true);
  const { error } = await supabase.from("buyer_requirements").insert({
    buyer_id: profile.id,
    company_name: profile.name,
    variety: formData.variety,
    delivery_location: formData.location,
    target_price_per_kg: Number(formData.price),
    quantity_required_kg: Number(formData.volume),
    additional_notes: formData.notes,
    specifications: formData.notes
  });
  if (error) {
    alert("Broadcasting failed: " + error.message);
  } else {
    alert("Requirement broadcasted successfully!");
    setFormData({ variety: "Hass", location: "", price: "", volume: "", notes: "" });
    fetchRequirements();
  }
  setLoading(false);
}
  const pendingPitches = pitches.filter(p => p.status === "pending").length;

  const STATUS_COLORS = {
    pending:  { bg: "#FEF3C7", text: "#92400E" },
    accepted: { bg: "#D1FAE5", text: "#065F46" },
    rejected: { bg: "#FEE2E2", text: "#991B1B" },
  };

  if (!profile.verified) return (
    <div style={{ maxWidth: 500, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 40, boxShadow: t.shadow }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Verification Pending</h2>
        <p style={{ color: t.textMuted, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
          Your buyer account is awaiting admin verification. This usually takes 24 hours. You will be able to broadcast requirements and place orders once verified.
        </p>

        <a
      href="https://wa.me/254710701013?text=Hi%20AvoConnect%2C%20I%20just%20signed%20up%20as%20a%20buyer%20and%20need%20verification."
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          <span>💬</span> Contact Support to Speed Up Verification
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 32, color: t.text }}>Enterprise Buyer Portal</h1>
        <p style={{ color: t.textMuted }}>Welcome back, {profile.name}. Manage your sourcing and review incoming pitches.</p>
      </div>

      <div style={{ display: "flex", background: t.white, borderRadius: 12, padding: 4, border: `1px solid ${t.border}`, marginBottom: 28, width: "fit-content" }}>
        <button onClick={() => setTab("broadcast")} style={{ background: tab === "broadcast" ? t.greenLight : "none", color: tab === "broadcast" ? t.greenDark : t.textMuted, border: "none", padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          📢 Broadcast Requirement
        </button>
       <button onClick={() => { setTab("pitches"); fetchPitches(); }} style={{ background: tab === "pitches" ? t.greenLight : "none", color: tab === "pitches" ? t.greenDark : t.textMuted, border: "none", padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
  🥑 Incoming Pitches
  {pendingPitches > 0 && <span style={{ background: t.green, color: "#fff", fontSize: 10, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{pendingPitches}</span>}
</button>
<button onClick={() => { setTab("requirements"); fetchRequirements(); }} style={{ background: tab === "requirements" ? t.greenLight : "none", color: tab === "requirements" ? t.greenDark : t.textMuted, border: "none", padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
  📋 My Requirements
</button>
      </div>

      {tab === "broadcast" ? (
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Broadcast Sourcing Requirement</h2>
          <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 24 }}>Post what your company needs. Farmers will see this and pitch matching harvests.</p>
          <form onSubmit={broadcastRequirement} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Avocado Variety</label>
                <select value={formData.variety} onChange={e => setFormData({...formData, variety: e.target.value})} style={inp}>
                  {["Hass", "Fuerte", "Jumbo", "Pinkerton"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Target Buying Location</label>
                <input placeholder="e.g. Murang'a" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Target Price (KES/KG)</label>
                <input type="number" placeholder="e.g. 120" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Min. Volume (KG)</label>
                <input type="number" placeholder="e.g. 2000" value={formData.volume} onChange={e => setFormData({...formData, volume: e.target.value})} style={inp} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Quality Specs / Notes</label>
              <textarea rows={3} placeholder="e.g. Dry matter 21% min..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{...inp, resize: "none"}} />
            </div>
            <button type="submit" disabled={loading} style={{ background: t.green, color: t.white, padding: "12px", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
              {loading ? "Broadcasting..." : "Broadcast to Marketplace"}
            </button>
          </form>
        </div>
      ) : (
        <div>
          {loadingPitches ? (
            <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading incoming pitches...</div>
          ) : pitches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>🥑</p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No pitches yet</p>
              <p style={{ color: t.textMuted, fontSize: 13 }}>Farmers will pitch their harvests once you broadcast a requirement.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pitches.map(p => {
                const col = STATUS_COLORS[p.status] || { bg: t.border, text: t.text };
                return (
                  <div key={p.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>🌱 {p.profiles?.name || "Farmer"}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, fontWeight: 500, textTransform: "capitalize" }}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: t.textMuted }}>📞 {p.profiles?.phone || "N/A"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: t.greenDark }}>Ksh {p.listings?.price_per_kg}/kg</div>
                        <div style={{ fontSize: 11, color: t.textMuted }}>{p.listings?.quantity_kg?.toLocaleString()} kg • {p.listings?.variety}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: t.textMuted, marginBottom: 12 }}>
                      <span>📅 Harvest: <strong>{p.listings?.harvest_date || "—"}</strong></span>
                      <span>🛡️ Cert: <strong>{p.listings?.certification || "None"}</strong></span>
                    </div>
                    {p.message && (
                      <div style={{ padding: "10px 12px", background: t.cream, borderRadius: 8, fontSize: 13, color: t.text, marginBottom: 14, borderLeft: `3px solid ${t.brownMid}` }}>
                        "{p.message}"
                      </div>
                    )}
                    {p.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => updatePitchStatus(p.id, "rejected", p)} style={{ ...btn("none", "#EF4444", "1px solid #FCA5A5") }}>Decline</button>
                        <button onClick={() => updatePitchStatus(p.id, "accepted", p)} style={{ ...btn(t.green, t.white) }}>Accept Pitch</button>
                      </div>
                    )}
                    {p.status === "accepted" && (
                      <div style={{ fontSize: 13, color: t.greenDark, fontWeight: 500, textAlign: "right" }}>
                        ✅ Accepted — Contact farmer to arrange delivery
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "requirements" && (
        <div>
          {loadingReqs ? (
            <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading requirements...</div>
          ) : requirements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>📋</p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No requirements yet</p>
              <p style={{ color: t.textMuted, fontSize: 13 }}>Broadcast a requirement and it will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {requirements.map(r => (
                <div key={r.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow, opacity: r.is_active ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{r.variety} — {r.delivery_location}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: r.is_active ? t.greenLight : t.brownLight, color: r.is_active ? t.greenDark : t.textMuted, fontWeight: 500 }}>
                          {r.is_active ? "🟢 Active" : "⚫ Closed"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span>📦 {r.quantity_required_kg?.toLocaleString()} kg</span>
                        <span>💰 Ksh {r.target_price_per_kg}/kg</span>
                        {r.additional_notes && <span>📝 {r.additional_notes}</span>}
                      </div>
                    </div>
                    {r.is_active && (
                      <button onClick={() => closeRequirement(r.id)} style={{ ...btn("none", "#EF4444", "1px solid #FCA5A5"), padding: "6px 14px", fontSize: 12 }}>
                        Close Requirement
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}