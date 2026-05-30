import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  brown: "#6B4C2A", brownLight: "#F5EFE6",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  red: "#EF4444", redLight: "#FEE2E2",
};

const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text, fontFamily: "Inter, sans-serif", marginBottom: 12 };
const btn = (bg, color, border) => ({ padding: "10px 22px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" });

const COUNTIES = ["Nakuru","Nairobi","Kiambu","Murang'a","Nyeri","Meru","Kirinyaga","Embu","Kisii","Bomet","Nandi","Uasin Gishu"];
const VARIETIES = ["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"];

export default function CoopDashboard({ profile, setPage }) {
  const [cooperative, setCooperative] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState(profile?.county || "");
  const [variety, setVariety] = useState("Hass");
  const [expectedKg, setExpectedKg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCooperativeData();
  }, [profile]);

  async function loadCooperativeData() {
    if (!profile) return;
    setLoading(true);
    const { data: coopData } = await supabase
      .from("cooperatives")
      .select("*")
      .eq("admin_id", profile.id)
      .maybeSingle();

    if (coopData) {
      setCooperative(coopData);
      const { data: memData } = await supabase
        .from("cooperative_members")
        .select("*")
        .eq("cooperative_id", coopData.id)
        .order("created_at", { ascending: false });
      setMembers(memData || []);
    }
    setLoading(false);
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!name || !phone) { setError("Please enter name and phone."); return; }
    setSaving(true); setError("");

    // Always fetch cooperative ID fresh from DB
    const { data: foundCoop, error: coopErr } = await supabase
      .from("cooperatives")
      .select("id")
      .eq("admin_id", profile.id)
      .maybeSingle();

    if (coopErr || !foundCoop) {
      setError("Could not find your cooperative. Contact support.");
      setSaving(false);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("cooperative_members")
      .insert({
        name,
        phone,
        county: county || profile.county,
        variety,
        expected_kg: Number(expectedKg) || 0,
        cooperative_id: foundCoop.id,
      })
      .select()
      .single();

    setSaving(false);
    if (insertErr) { setError("Error: " + insertErr.message); return; }

    setMembers(prev => [data, ...prev]);
    setName(""); setPhone(""); setCounty(profile?.county || "");
    setVariety("Hass"); setExpectedKg(""); setError("");
    setShowForm(false);
  }

  async function deleteMember(id) {
    if (!confirm("Remove this member from the cooperative?")) return;
    await supabase.from("cooperative_members").delete().eq("id", id);
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  const totalKg = members.reduce((s, m) => s + (m.expected_kg || 0), 0);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
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
          <button onClick={() => setShowForm(!showForm)} style={btn(t.green, t.white)}>
            {showForm ? "← View Members" : "+ Add Member"}
          </button>
          {setPage && (
            <button onClick={() => setPage("list")} style={{ ...btn("none", t.green, `1px solid ${t.green}`) }}>
              List avocados
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
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
    </div>
  );
}