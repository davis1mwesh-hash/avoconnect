import { useState, useEffect } from "react";
import LinkListingModal from "./LinkListingModal";
import { supabase } from "./App";

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  brown: "#6B4C2A", brownLight: "#F5EFE6", brownMid: "#C4965A",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  red: "#EF4444", redLight: "#FEE2E2",
  amber: "#D97706", amberLight: "#FEF3C7"
};

const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text, fontFamily: "Inter, sans-serif", marginBottom: 12 };
const btn = (bg, color, border) => ({ padding: "10px 22px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" });

const COUNTIES = ["Nakuru","Nairobi","Kiambu","Murang'a","Nyeri","Meru","Kirinyaga","Embu","Kisii","Bomet","Nandi","Uasin Gishu"];
const VARIETIES = ["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"];

const STATUS_COLORS = {
  pending:  { bg: "#FEF3C7", text: "#92400E" },
  accepted: { bg: "#D1FAE5", text: "#065F46" },
  rejected: { bg: "#FEE2E2", text: "#991B1B" },
};

export default function CoopDashboard({ profile, setPage }) {
  const [currentTab, setCurrentTab] = useState("members");
  const [cooperative, setCooperative] = useState(null);
  const [members, setMembers] = useState([]);
  const [demands, setDemands] = useState([]);
  const [myPitches, setMyPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState(profile?.county || "");
  const [variety, setVariety] = useState("Hass");
  const [expectedKg, setExpectedKg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCooperativeData(); }, [profile]);

  useEffect(() => {
    if (currentTab === "demands") fetchBuyerDemands();
    if (currentTab === "pitches") fetchMyPitches();
  }, [currentTab]);

  async function loadCooperativeData() {
    if (!profile) return;
    setLoading(true);
    const { data: coopData } = await supabase
      .from("cooperatives").select("*").eq("admin_id", profile.id).maybeSingle();
    if (coopData) {
      setCooperative(coopData);
      const { data: memData } = await supabase
        .from("cooperative_members").select("*").eq("cooperative_id", coopData.id).order("created_at", { ascending: false });
      setMembers(memData || []);
    }
    setLoading(false);
  }

  async function fetchBuyerDemands() {
    try {
      setLoadingDemands(true);
      const { data, error: demandErr } = await supabase
  .from("buyer_requirements")
  .select("id, variety, delivery_location, quantity_required_kg, target_price_per_kg, company_name, additional_notes, buyer_id")
  .eq("is_active", true);
      if (demandErr) throw demandErr;
      setDemands(data || []);
    } catch (err) {
      console.error("Error fetching buyer requirements:", err);
    } finally {
      setLoadingDemands(false);
    }
  }

  async function fetchMyPitches() {
    try {
      setLoadingPitches(true);
      const { data, error } = await supabase
        .from("pitches")
        .select("*, listings(variety, quantity_kg, price_per_kg, harvest_date), profiles!pitches_buyer_id_fkey(name, phone), buyer_requirements(variety, delivery_location, quantity_required_kg)")
        .eq("farmer_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyPitches(data || []);
    } catch (err) {
      console.error("Error fetching pitches:", err);
    } finally {
      setLoadingPitches(false);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!name || !phone) { setError("Please enter name and phone."); return; }
    setSaving(true); setError("");
    const { data: foundCoop, error: coopErr } = await supabase
      .from("cooperatives").select("id").eq("admin_id", profile.id).maybeSingle();
    if (coopErr || !foundCoop) { setError("Could not find your cooperative."); setSaving(false); return; }
    const { data, error: insertErr } = await supabase
      .from("cooperative_members")
      .insert({ name, phone, county: county || profile.county, variety, expected_kg: Number(expectedKg) || 0, cooperative_id: foundCoop.id })
      .select().single();
    setSaving(false);
    if (insertErr) { setError("Error: " + insertErr.message); return; }
    setMembers(prev => [data, ...prev]);
    setName(""); setPhone(""); setCounty(profile?.county || "");
    setVariety("Hass"); setExpectedKg(""); setError(""); setShowForm(false);
  }

  async function deleteMember(id) {
    if (!confirm("Remove this member from the cooperative?")) return;
    await supabase.from("cooperative_members").delete().eq("id", id);
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  const totalKg = members.reduce((s, m) => s + (m.expected_kg || 0), 0);
  const pendingPitches = myPitches.filter(p => p.status === "pending").length;

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading Cooperative Dashboard…</p>;

  if (!cooperative) return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 20, textAlign: "center", background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
      <h2 style={{ fontFamily: "Playfair Display, serif", marginBottom: 8 }}>No Cooperative Found</h2>
      <p style={{ color: t.textMuted, fontSize: 14 }}>Your account is not linked to a cooperative. Contact support.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, marginBottom: 4 }}>🤝 {cooperative.name}</h1>
          <p style={{ fontSize: 14, color: t.textMuted }}>Reg No: {cooperative.registration_number} · {cooperative.county} County</p>
          {!profile.verified && (
            <div style={{ marginTop: 8, padding: "6px 14px", background: "#FEF3C7", borderRadius: 8, display: "inline-block" }}>
              <span style={{ fontSize: 12, color: "#92400E" }}>⏳ Awaiting admin verification</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {currentTab === "members" && (
            <button onClick={() => setShowForm(!showForm)} style={btn(t.green, t.white)}>
              {showForm ? "← View Members" : "+ Add Member"}
            </button>
          )}
          {setPage && (
            <button onClick={() => setPage("list")} style={{ ...btn("none", t.green, `1px solid ${t.green}`) }}>
              List avocados
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${t.border}`, marginBottom: 24, paddingBottom: 2, flexWrap: "wrap" }}>
        {[
          { key: "members", label: "👥 Cooperative Members" },
          { key: "demands", label: "📋 Buyer Demand Feed" },
          { key: "pitches", label: "📤 My Pitches", badge: pendingPitches },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => { setCurrentTab(tab.key); setShowForm(false); }}
            style={{
              padding: "10px 14px", background: "none", border: "none",
              borderBottom: currentTab === tab.key ? `3px solid ${t.green}` : "3px solid transparent",
              color: currentTab === tab.key ? t.greenDark : t.textMuted,
              fontWeight: currentTab === tab.key ? 600 : 500, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            {tab.label}
            {tab.badge > 0 && <span style={{ background: t.brown, color: "#fff", fontSize: 10, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* MEMBERS TAB */}
      {currentTab === "members" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
            {[["👥", members.length, "Members"], ["🧺", totalKg.toLocaleString() + " kg", "Expected harvest"], ["📍", cooperative.county, "County"]].map(([icon, value, label]) => (
              <div key={label} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: t.shadow }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: t.green, marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{label}</div>
              </div>
            ))}
          </div>

          {showForm ? (
            <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 18, padding: 24, boxShadow: t.shadow, maxWidth: 500, margin: "0 auto" }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 20 }}>Add Cooperative Member</h3>
              {error && <p style={{ fontSize: 13, color: t.red, padding: 10, background: t.redLight, borderRadius: 8, marginBottom: 12 }}>{error}</p>}
              <form onSubmit={handleAddMember}>
                <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. DAVID MWENDA" style={inp} />
                <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Phone Number *</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0710701013" style={inp} />
                <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>County</label>
                <select value={county} onChange={e => setCounty(e.target.value)} style={inp}>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Variety</label>
                    <select value={variety} onChange={e => setVariety(e.target.value)} style={inp}>
                      {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Expected Yield (kg)</label>
                    <input type="number" value={expectedKg} onChange={e => setExpectedKg(e.target.value)} placeholder="e.g. 300" style={inp} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ ...btn(t.green, t.white), flex: 2, opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving..." : "Register Member"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, marginBottom: 16 }}>Registered Members ({members.length})</h3>
              {members.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                  <p style={{ color: t.textMuted, marginBottom: 16 }}>No members registered yet.</p>
                  <button onClick={() => setShowForm(true)} style={{ ...btn(t.green, t.white), padding: "10px 24px" }}>Add first member</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: t.shadow }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: t.text }}>{m.name}</div>
                        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>📞 {m.phone} · 📍 {m.county}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                          <span style={{ fontSize: 11, background: t.greenLight, color: t.greenDark, padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{m.variety}</span>
                          <span style={{ fontSize: 11, background: t.brownLight, color: t.brown, padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{m.expected_kg?.toLocaleString()} kg expected</span>
                        </div>
                      </div>
                      <button onClick={() => deleteMember(m.id)} style={{ ...btn("none", t.red, "1px solid #FCA5A5"), padding: "6px 12px", fontSize: 12 }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {members.length > 0 && (
                <div style={{ marginTop: 20, padding: 20, background: `linear-gradient(135deg, ${t.greenLight}, ${t.brownLight})`, borderRadius: 14, border: `1px solid ${t.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Ready to list as a cooperative?</div>
                  <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
                    You have <strong>{members.length} members</strong> with a combined <strong>{totalKg.toLocaleString()} kg</strong> expected.
                  </p>
                  {setPage && <button onClick={() => setPage("list")} style={{ ...btn(t.green, t.white), padding: "10px 24px" }}>Post combined listing →</button>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* BUYER DEMANDS TAB */}
      {currentTab === "demands" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 4 }}>B2B Contract Opportunities</h3>
            <p style={{ fontSize: 13, color: t.textMuted }}>Review live purchase orders requested directly by verified commercial crop buyers.</p>
          </div>
          {loadingDemands ? (
            <p style={{ textAlign: "center", color: t.textMuted, padding: 30 }}>Loading open requirements...</p>
          ) : demands.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <p style={{ color: t.textMuted }}>No commercial purchase requirements are active at this moment.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {demands.map(req => (
                <div key={req.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, boxShadow: t.shadow }}>
                  <div style={{ flex: "1 1 400px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, background: t.amberLight, color: t.amber, padding: "2px 10px", borderRadius: 6, fontWeight: 700 }}>Target: {req.variety}</span>
                      <span style={{ fontSize: 12, color: t.textMuted }}>{req.company_name || "Verified Buyer"}</span>
                    </div>
                    <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
                      📍 <strong>{req.delivery_location}</strong> · 📦 <strong>{req.quantity_required_kg?.toLocaleString()} kg</strong> · 💰 <strong>Ksh {req.target_price_per_kg}/kg</strong>
                    </p>
                    {req.additional_notes && (
                      <p style={{ fontSize: 12, color: t.textMuted, background: t.cream, padding: "8px 12px", borderRadius: 8, marginTop: 8, borderLeft: `3px solid ${t.green}` }}>
                        "{req.additional_notes}"
                      </p>
                    )}
                  </div>
                  <button onClick={() => setSelectedDemand(req)} style={btn(t.green, t.white)}>🤝 Pitch Supply</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY PITCHES TAB */}
      {currentTab === "pitches" && (
        <div>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 16 }}>My Pitches</h3>
          {loadingPitches ? (
            <p style={{ textAlign: "center", color: t.textMuted, padding: 30 }}>Loading pitches...</p>
          ) : myPitches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>📤</p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No pitches sent yet</p>
              <p style={{ color: t.textMuted, fontSize: 13 }}>Go to Buyer Demand Feed and pitch your supply to buyers.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {myPitches.map(p => {
                const col = STATUS_COLORS[p.status] || { bg: t.border, text: t.text };
                return (
                  <div key={p.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, boxShadow: t.shadow }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>🏪 {p.profiles?.name || "Buyer"}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, fontWeight: 500, textTransform: "capitalize" }}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: t.textMuted }}>📞 {p.profiles?.phone || "N/A"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: t.greenDark }}>Ksh {p.listings?.price_per_kg}/kg</div>
                        <div style={{ fontSize: 11, color: t.textMuted }}>{p.listings?.quantity_kg?.toLocaleString()} kg • {p.listings?.variety}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>📍 For: <strong>{p.buyer_requirements?.delivery_location || "—"}</strong></span>
                      <span>📦 Req: <strong>{p.buyer_requirements?.quantity_required_kg?.toLocaleString()} kg</strong></span>
                      <span>📅 Harvest: <strong>{p.listings?.harvest_date || "—"}</strong></span>
                    </div>
                    {p.status === "accepted" && (
                      <div style={{ marginTop: 10, fontSize: 13, color: t.greenDark, fontWeight: 600 }}>
                        ✅ Accepted! Contact buyer on {p.profiles?.phone} to arrange delivery.
                      </div>
                    )}
                    {p.status === "rejected" && (
                      <div style={{ marginTop: 10, fontSize: 13, color: t.red }}>
                        ❌ Declined — The buyer chose a different supplier.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedDemand && (
        <LinkListingModal
          requirement={selectedDemand}
          profile={profile}
          onClose={() => { setSelectedDemand(null); fetchBuyerDemands(); fetchMyPitches(); }}
        />
      )}
    </div>
  );
}