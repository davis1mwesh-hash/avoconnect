import React, { useState, useEffect } from "react";
import { supabase } from "./App";

export default function BuyerDashboard({ profile, setPage }) {
  const [tab, setTab] = useState("broadcast");
  const [historyTab, setHistoryTab] = useState("orders");
  const [loading, setLoading] = useState(false);
  const [pitches, setPitches] = useState([]);
  const [loadingPitches, setLoadingPitches] = useState(false);
const [requirements, setRequirements] = useState([]);
const [loadingReqs, setLoadingReqs] = useState(false);
const [myOrders, setMyOrders] = useState([]);
const [myVisits, setMyVisits] = useState([]);
const [loadingHistory, setLoadingHistory] = useState(false);
const [matchForm, setMatchForm] = useState({
  variety: "Hass", county: "", constituency: "",
  quantity: "", maxPrice: "", minGrade: "A",
  certification: "Any",
});
const [matchResults, setMatchResults] = useState(null);
const [loadingMatch, setLoadingMatch] = useState(false);
const [matchError, setMatchError] = useState("");
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

async function fetchHistory() {
  setLoadingHistory(true);
  const [{ data: directOrders }, { data: poolOrders }, { data: visits }] = await Promise.all([
    supabase.from("orders").select("*, listings(variety, county), profiles!orders_farmer_id_fkey(name, phone)").eq("buyer_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("pool_orders").select("*, constituency_pools(constituency, county, variety)").eq("buyer_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("pool_visit_requests").select("*, constituency_pools(constituency, county, variety)").eq("buyer_id", profile.id).order("created_at", { ascending: false }),
  ]);
  // Normalize direct orders + pool orders into one "orders" list, tagged by source
  const normalizedOrders = [
    ...(directOrders || []).map(o => ({ ...o, source: "direct", title: o.listings?.variety, location: o.listings?.county, contact: o.profiles })),
    ...(poolOrders || []).map(o => ({ ...o, source: "pool", title: o.constituency_pools?.variety, location: o.constituency_pools?.constituency })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  setMyOrders(normalizedOrders);
  setMyVisits(visits || []);
  setLoadingHistory(false);
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

  async function runSmartMatch() {
  if (!matchForm.quantity || Number(matchForm.quantity) <= 0) { setMatchError("Please enter how many kg you need."); return; }
  setLoadingMatch(true); setMatchError(""); setMatchResults(null);

  const qty = Number(matchForm.quantity);
  const maxP = matchForm.maxPrice ? Number(matchForm.maxPrice) : null;
  const gradeOrder = { A: 3, B: 2, C: 1 };
  const minGradeScore = gradeOrder[matchForm.minGrade] || 1;

  try {
    // ── Source 1: Individual listings ──────────────────────────────────────────
    let listingQuery = supabase
      .from("listings")
      .select("*, profiles!inner(name, county, verified, suspended)")
      .eq("is_active", true)
      .eq("variety", matchForm.variety)
      .eq("profiles.verified", true)
      .eq("profiles.suspended", false);
    if (matchForm.county) listingQuery = listingQuery.ilike("county", `%${matchForm.county}%`);
    if (maxP) listingQuery = listingQuery.lte("price_per_kg", maxP);
    if (matchForm.certification !== "Any") listingQuery = listingQuery.eq("certification", matchForm.certification);
    const { data: listings } = await listingQuery.order("price_per_kg", { ascending: true });

    // ── Source 2: Pool contributions ───────────────────────────────────────────
    let poolQuery = supabase
      .from("pool_contributions")
      .select("*, constituency_pools!inner(constituency, county, id), profiles!pool_contributions_farmer_id_fkey(name, county)")
      .eq("status", "active")
      .eq("variety", matchForm.variety);
    if (maxP) poolQuery = poolQuery.lte("price_per_kg", maxP);
    if (matchForm.county) poolQuery = poolQuery.ilike("constituency_pools.county", `%${matchForm.county}%`);
    if (matchForm.constituency) poolQuery = poolQuery.ilike("constituency_pools.constituency", `%${matchForm.constituency}%`);
    // Grade filter
    const gradeMap = { A: ["A"], B: ["A","B"], C: ["A","B","C"] };
    const allowedGrades = gradeMap[matchForm.minGrade] || ["A","B","C"];
    poolQuery = poolQuery.in("quality_grade", allowedGrades);
    const { data: poolContribs } = await poolQuery;

    // Group pool contributions by constituency pool
    const poolGroups = {};
    for (const c of poolContribs || []) {
      const poolId = c.constituency_pools?.id;
      if (!poolId) continue;
      if (!poolGroups[poolId]) {
        poolGroups[poolId] = {
          pool: c.constituency_pools, contributions: [],
          totalKg: 0, minPrice: Infinity, maxGrade: "C"
        };
      }
      poolGroups[poolId].contributions.push(c);
      poolGroups[poolId].totalKg += Number(c.quantity_kg || 0);
      if (Number(c.price_per_kg) < poolGroups[poolId].minPrice) poolGroups[poolId].minPrice = Number(c.price_per_kg);
      if (gradeOrder[c.quality_grade] > gradeOrder[poolGroups[poolId].maxGrade]) poolGroups[poolId].maxGrade = c.quality_grade;
    }

    // ── Source 3: Cooperative listings ─────────────────────────────────────────
    let coopQuery = supabase
      .from("listings")
      .select("*, profiles!inner(name, county, role, verified, suspended)")
      .eq("is_active", true)
      .eq("variety", matchForm.variety)
      .eq("profiles.role", "cooperative")
      .eq("profiles.verified", true)
      .eq("profiles.suspended", false);
    if (matchForm.county) coopQuery = coopQuery.ilike("county", `%${matchForm.county}%`);
    if (maxP) coopQuery = coopQuery.lte("price_per_kg", maxP);
    if (matchForm.certification !== "Any") coopQuery = coopQuery.eq("certification", matchForm.certification);
    const { data: coopListings } = await coopQuery.order("price_per_kg", { ascending: true });

    // ── Score and rank results ─────────────────────────────────────────────────
    // Score = (can_cover_qty ? 100 : partial_coverage_pct) + grade_bonus + price_bonus
    function scoreItem(availableKg, pricePerKg, grade) {
      const coverage = Math.min(availableKg / qty, 1) * 60;
      const gradeBonus = (gradeOrder[grade] || 1) * 10;
      const priceBonus = maxP ? Math.max(0, (1 - pricePerKg / maxP) * 30) : 15;
      return coverage + gradeBonus + priceBonus;
    }

    const individualResults = (listings || [])
      .filter(l => l.profiles?.county && (!matchForm.county || l.profiles.county.toLowerCase().includes(matchForm.county.toLowerCase())))
      .map(l => ({
        type: "individual",
        name: l.profiles?.name,
        location: `${l.county} County`,
        quantity_kg: Number(l.quantity_kg),
        price_per_kg: Number(l.price_per_kg),
        grade: "—",
        certification: l.certification,
        harvest_date: l.harvest_date,
        score: scoreItem(Number(l.quantity_kg), Number(l.price_per_kg), "A"),
        listing_id: l.id,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const poolResults = Object.values(poolGroups)
      .filter(g => g.totalKg > 0)
      .map(g => ({
        type: "pool",
        name: `${g.pool.constituency} Pool`,
        location: `${g.pool.county} County`,
        quantity_kg: g.totalKg,
        price_per_kg: g.minPrice === Infinity ? 0 : g.minPrice,
        grade: g.maxGrade,
        certification: "—",
        farmer_count: g.contributions.length,
        score: scoreItem(g.totalKg, g.minPrice === Infinity ? 0 : g.minPrice, g.maxGrade),
        pool_id: g.pool.id,
        constituency: g.pool.constituency,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const coopResults = (coopListings || [])
      .map(l => ({
        type: "cooperative",
        name: l.profiles?.name,
        location: `${l.county} County`,
        quantity_kg: Number(l.quantity_kg),
        price_per_kg: Number(l.price_per_kg),
        grade: "—",
        certification: l.certification,
        harvest_date: l.harvest_date,
        score: scoreItem(Number(l.quantity_kg), Number(l.price_per_kg), "A"),
        listing_id: l.id,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setMatchResults({ individualResults, poolResults, coopResults, searchedAt: new Date() });
  } catch (err) {
    setMatchError("Search failed: " + err.message);
  }
  setLoadingMatch(false);
}

async function downloadMatchPDF(results) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210; const margin = 18; const cw = W - margin * 2;
  let y = 0;

  // Cover
  doc.setFillColor(45, 122, 79);
  doc.rect(0, 0, W, 48, "F");
  doc.setTextColor(255,255,255);
  doc.setFontSize(22); doc.setFont("helvetica","bold");
  doc.text("AvoConnect Smart Match Report", margin, 22);
  doc.setFontSize(11); doc.setFont("helvetica","normal");
  doc.text(`Buyer: ${profile.name}  |  Generated: ${new Date().toLocaleDateString("en-KE", { day:"numeric", month:"long", year:"numeric" })}`, margin, 32);
  doc.text(`Variety: ${matchForm.variety}  |  Qty needed: ${matchForm.quantity}kg  |  Max price: ${matchForm.maxPrice ? "Ksh "+matchForm.maxPrice+"/kg" : "Any"}  |  Min grade: ${matchForm.minGrade}`, margin, 40);
  y = 60;

  const totalFound = results.individualResults.length + results.poolResults.length + results.coopResults.length;
  const totalKg = [
    ...results.individualResults, ...results.poolResults, ...results.coopResults
  ].reduce((s,r) => s + r.quantity_kg, 0);

  doc.setTextColor(40,40,40);
  doc.setFontSize(11); doc.setFont("helvetica","normal");
  doc.text(`Found ${totalFound} sources · ${totalKg.toLocaleString()}kg total available · ${results.searchedAt.toLocaleTimeString("en-KE")}`, margin, y); y += 14;

  const sections = [
    { title: "Individual Farmers", items: results.individualResults, icon: "🌱" },
    { title: "Constituency Pools", items: results.poolResults, icon: "🤝" },
    { title: "Cooperatives", items: results.coopResults, icon: "🏢" },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(45,122,79);
    doc.rect(margin, y, cw, 9, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
    doc.text(`${section.title} (${section.items.length})`, margin+3, y+6.5); y += 13;

    for (const item of section.items) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setTextColor(20,20,20); doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text(item.name, margin+2, y);
      doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(80,80,80);
      doc.text(`${item.location}  ·  ${item.quantity_kg.toLocaleString()}kg  ·  Ksh ${item.price_per_kg}/kg${item.grade !== "—" ? "  ·  Grade "+item.grade : ""}${item.certification && item.certification !== "—" ? "  ·  "+item.certification : ""}${item.farmer_count ? "  ·  "+item.farmer_count+" farmers" : ""}`, margin+2, y+5.5);
      doc.text(`To contact: Place an order or visit request through AvoConnect.`, margin+2, y+10.5);
      doc.setDrawColor(220,220,220); doc.line(margin, y+14, margin+cw, y+14);
      y += 17;
    }
    y += 4;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(248,248,246); doc.rect(0,284,W,13,"F");
    doc.setTextColor(150,150,150); doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text("AvoConnect Smart Match  —  Confidential buyer report", margin, 291);
    doc.text(`Page ${p} of ${totalPages}`, W-margin-18, 291);
  }

  doc.save(`AvoConnect_SmartMatch_${new Date().toISOString().split("T")[0]}.pdf`);
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
<button onClick={() => { setTab("history"); fetchHistory(); }} style={{ background: tab === "history" ? t.greenLight : "none", color: tab === "history" ? t.greenDark : t.textMuted, border: "none", padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
  🧾 My Orders & Visits
</button>
<button onClick={() => setTab("smartmatch")} style={{ background: tab === "smartmatch" ? t.greenLight : "none", color: tab === "smartmatch" ? t.greenDark : t.textMuted, border: "none", padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
  🎯 Smart Match
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

      {tab === "smartmatch" && (
        <div>
          {/* Search form */}
          <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, boxShadow: t.shadow, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>🎯 Smart Match</h2>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>Tell us what you need — we'll find the best matching farmers, pools, and cooperatives across all of AvoConnect.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Variety *</label>
                <select value={matchForm.variety} onChange={e => setMatchForm(f => ({...f, variety: e.target.value}))} style={inp}>
                  {["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Quantity needed (kg) *</label>
                <input type="number" placeholder="e.g. 2000" value={matchForm.quantity} onChange={e => setMatchForm(f => ({...f, quantity: e.target.value}))} style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>County (optional)</label>
                <input placeholder="e.g. Nakuru" value={matchForm.county} onChange={e => setMatchForm(f => ({...f, county: e.target.value}))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Constituency (optional)</label>
                <input placeholder="e.g. Njoro" value={matchForm.constituency} onChange={e => setMatchForm(f => ({...f, constituency: e.target.value}))} style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Max price (Ksh/kg)</label>
                <input type="number" placeholder="e.g. 80" value={matchForm.maxPrice} onChange={e => setMatchForm(f => ({...f, maxPrice: e.target.value}))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Minimum grade</label>
                <select value={matchForm.minGrade} onChange={e => setMatchForm(f => ({...f, minGrade: e.target.value}))} style={inp}>
                  <option value="A">Grade A only (export)</option>
                  <option value="B">Grade B and above</option>
                  <option value="C">Any grade</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Certification</label>
                <select value={matchForm.certification} onChange={e => setMatchForm(f => ({...f, certification: e.target.value}))} style={inp}>
                  {["Any","None","GlobalG.A.P","KEPHIS","Organic","KS EAS 12"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {matchError && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{matchError}</p>}
            <button onClick={runSmartMatch} disabled={loadingMatch}
              style={{ width: "100%", padding: 13, background: t.green, color: t.white, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loadingMatch ? 0.7 : 1 }}>
              {loadingMatch ? "Searching…" : "🎯 Find best matches"}
            </button>
          </div>

          {/* Results */}
          {matchResults && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {matchResults.individualResults.length + matchResults.poolResults.length + matchResults.coopResults.length} sources found
                  </span>
                  <span style={{ fontSize: 13, color: t.textMuted, marginLeft: 8 }}>
                    · {[...matchResults.individualResults, ...matchResults.poolResults, ...matchResults.coopResults].reduce((s,r) => s + r.quantity_kg, 0).toLocaleString()}kg total available
                  </span>
                </div>
                <button onClick={() => downloadMatchPDF(matchResults)}
                  style={{ ...btn("none", t.green, `1px solid ${t.green}`), fontSize: 12 }}>
                  📄 Download PDF
                </button>
              </div>

              {[
                { key: "individualResults", label: "🌱 Individual Farmers", color: t.greenLight, textColor: t.greenDark },
                { key: "poolResults", label: "🤝 Constituency Pools", color: "#EDE9FE", textColor: "#5B21B6" },
                { key: "coopResults", label: "🏢 Cooperatives", color: t.brownLight, textColor: t.brown },
              ].map(section => matchResults[section.key].length > 0 && (
                <div key={section.key} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: section.textColor, background: section.color, padding: "8px 14px", borderRadius: 10, marginBottom: 10 }}>
                    {section.label} ({matchResults[section.key].length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {matchResults[section.key].map((r, i) => (
                      <div key={i} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, boxShadow: t.shadow }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: t.textMuted, display: "flex", gap: 12, flexWrap: "wrap" }}>
                              <span>📍 {r.location}</span>
                              <span>🧺 {r.quantity_kg.toLocaleString()}kg available</span>
                              {r.grade !== "—" && <span>⭐ Grade {r.grade}</span>}
                              {r.certification && r.certification !== "—" && <span>✅ {r.certification}</span>}
                              {r.farmer_count && <span>👥 {r.farmer_count} farmers</span>}
                              {r.harvest_date && <span>📅 {r.harvest_date}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: t.greenDark }}>Ksh {r.price_per_kg}/kg</div>
                            <div style={{ fontSize: 11, color: t.textMuted }}>
                              {r.quantity_kg >= Number(matchForm.quantity)
                                ? <span style={{ color: t.green, fontWeight: 600 }}>✓ Covers your full {matchForm.quantity}kg</span>
                                : <span style={{ color: "#F59E0B", fontWeight: 600 }}>Partial: {r.quantity_kg}kg of {matchForm.quantity}kg</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, padding: "8px 12px", background: t.cream, borderRadius: 8, fontSize: 12, color: t.textMuted }}>
                          🔒 To get contact details, place an order or visit request through AvoConnect.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {matchResults.individualResults.length === 0 && matchResults.poolResults.length === 0 && matchResults.coopResults.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>No matches found</p>
                  <p style={{ color: t.textMuted, fontSize: 13 }}>Try broadening your search — lower the min grade, increase max price, or remove the county filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => setHistoryTab("orders")} style={{ padding: "7px 16px", borderRadius: 99, fontSize: 13, cursor: "pointer", border: "none", fontWeight: historyTab === "orders" ? 600 : 400, background: historyTab === "orders" ? t.green : t.brownLight, color: historyTab === "orders" ? t.white : t.textMuted }}>
              📦 Direct Orders ({myOrders.length})
            </button>
            <button onClick={() => setHistoryTab("visits")} style={{ padding: "7px 16px", borderRadius: 99, fontSize: 13, cursor: "pointer", border: "none", fontWeight: historyTab === "visits" ? 600 : 400, background: historyTab === "visits" ? t.green : t.brownLight, color: historyTab === "visits" ? t.white : t.textMuted }}>
              🚜 Pool Visits ({myVisits.length})
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading your history...</div>
          ) : historyTab === "orders" ? (
            myOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>📦</p>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No orders yet</p>
                <p style={{ color: t.textMuted, fontSize: 13 }}>Orders you place on listings or pools will show up here.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myOrders.map(o => {
                  const col = STATUS_COLORS[o.status] || { bg: t.border, text: t.text };
                  return (
                    <div key={o.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{o.source === "pool" ? "🤝" : "🌱"} {o.title || "Avocados"}</span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, fontWeight: 500, textTransform: "capitalize" }}>{o.status}</span>
                            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: t.brownLight, color: t.brown }}>{o.source === "pool" ? "Pool order" : "Direct order"}</span>
                          </div>
                          <div style={{ fontSize: 12, color: t.textMuted }}>📍 {o.location || "—"}{o.contact?.phone && ` · 📞 ${o.contact.phone}`}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: t.greenDark }}>Ksh {(o.quantity_kg * o.price_per_kg)?.toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: t.textMuted }}>{o.quantity_kg?.toLocaleString()} kg @ Ksh {o.price_per_kg}/kg</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>🗓 {new Date(o.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            myVisits.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>🚜</p>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No pool visits yet</p>
                <p style={{ color: t.textMuted, fontSize: 13 }}>Field visit requests you make to constituency pools will show up here.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myVisits.map(v => {
                  const visitCol = { pending_visit: { bg: t.amberLight || "#FEF3C7", text: "#92400E" }, confirmed_sold: { bg: t.greenLight, text: t.greenDark }, expired: { bg: "#FEE2E2", text: "#991B1B" } };
                  const col = visitCol[v.status] || { bg: t.border, text: t.text };
                  return (
                    <div key={v.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>🚜 {v.constituency_pools?.constituency} Pool</span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, fontWeight: 500 }}>
                              {v.status === "pending_visit" ? "Pending visit" : v.status === "confirmed_sold" ? "Confirmed sold" : "Expired"}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: t.textMuted }}>📍 {v.constituency_pools?.county} · {v.constituency_pools?.variety}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: t.greenDark }}>{v.total_selected_kg?.toLocaleString()} kg</div>
                          <div style={{ fontSize: 11, color: t.textMuted }}>target: {v.target_kg}kg</div>
                        </div>
                      </div>
                      {v.status === "pending_visit" && (
                        <div style={{ fontSize: 12, color: "#92400E", fontWeight: 500 }}>
                          ⏱ Visit window expires {new Date(v.expires_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}{v.extended && " (extended)"}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>🗓 Requested {new Date(v.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}