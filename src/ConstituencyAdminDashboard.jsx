import { useState, useEffect } from "react";
import { supabase } from "./App";

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  brown: "#6B4C2A", brownLight: "#F5EFE6",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  red: "#EF4444", redLight: "#FEE2E2",
  amber: "#F59E0B", amberLight: "#FEF3C7", amberDark: "#92400E",
  blue: "#3B82F6", blueLight: "#DBEAFE",
  purple: "#8B5CF6", purpleLight: "#EDE9FE",
};

const btn = (bg, color, border) => ({
  padding: "9px 20px", background: bg, color, border: border || "none",
  borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
  fontFamily: "Inter, sans-serif", transition: "opacity .15s",
});

const TABS = [
  { key: "pool",     label: "🤝 Pool Overview",        color: t.green },
  { key: "visits",   label: "🚜 Visit Requests",        color: t.amber },
  { key: "pending",  label: "⏳ Farmer Registrations",  color: t.blue },
  { key: "contribs", label: "📦 Pool Contributions",     color: t.purple },
];

function Badge({ label, bg, color }) {
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: bg, color, fontWeight: 500 }}>{label}</span>;
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: t.shadow }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontFamily: "Playfair Display, serif", color: color || t.green, marginBottom: 2 }}>{value ?? 0}</div>
      <div style={{ fontSize: 13, color: t.textMuted }}>{label}</div>
    </div>
  );
}

function timeRemaining(expiresAt) {
  if (!expiresAt) return "—";
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  return `${hours}h left`;
}

function buildVisitWhatsAppLink(phone, name, request) {
  const cleanPhone = phone?.replace(/^0/, "254") || "";
  const msg = `Hi ${name}, a buyer wants to visit your avocado pool in ${request.constituency_pools?.constituency || ""}. Target: ${request.target_kg}kg. Please confirm your availability.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

// ── Pool Overview Tab ────────────────────────────────────────────
function PoolOverviewTab({ constituency }) {
  const [pool, setPool] = useState(null);
  const [contribCount, setContribCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [constituency]);

  async function load() {
    setLoading(true);
    const { data: poolData } = await supabase
      .from("constituency_pools")
      .select("*")
      .eq("constituency", constituency)
      .maybeSingle();
    setPool(poolData);

    if (poolData) {
      const { count } = await supabase
        .from("pool_contributions")
        .select("id", { count: "exact", head: true })
        .eq("pool_id", poolData.id)
        .eq("is_active", true);
      setContribCount(count || 0);
    }
    setLoading(false);
  }

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  if (!pool) return (
    <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
      <p style={{ color: t.textMuted }}>No pool found for {constituency} yet.</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard icon="🧺" label="Total kg pooled" value={pool.total_kg?.toLocaleString() || 0} color={t.green} />
        <StatCard icon="👥" label="Active contributors" value={contribCount} color={t.blue} />
        <StatCard icon="🥑" label="Variety" value={pool.variety || "—"} color={t.purple} />
      </div>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
        <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, marginBottom: 12 }}>{constituency} Pool Details</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: t.textMuted }}>
          <div>💰 Price per kg: <strong style={{ color: t.text }}>Ksh {pool.price_per_kg || "—"}</strong></div>
          <div>🕒 Last updated: <strong style={{ color: t.text }}>{pool.updated_at ? new Date(pool.updated_at).toLocaleString("en-KE") : "—"}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ── Pending Farmer Registrations Tab ─────────────────────────────
function PendingFarmersTab({ constituency }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [acting, setActing] = useState(null);

  useEffect(() => { load(); }, [constituency]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "farmer")
      .eq("constituency", constituency)
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true });
    setPending(data || []);
    setLoading(false);
  }

  async function decide(user, decision) {
    setActing(user.id);
    await supabase.from("profiles").update({
      verification_status: decision,
      verified: decision === "approved",
      verification_note: notes[user.id] || "",
    }).eq("id", user.id);

    await supabase.from("notifications").insert({
      user_id: user.id,
      type: decision === "approved" ? "accepted" : "rejected",
      title: decision === "approved" ? "Account verified ✅" : "Verification rejected ❌",
      message: decision === "approved"
        ? `Welcome to AvoConnect, ${user.name ? user.name.split(" ")[0] : "User"}! Your account is verified.`
        : `Your verification was not approved. Reason: ${notes[user.id] || "Does not meet requirements"}.`,
    });

    setPending(p => p.filter(u => u.id !== user.id));
    setActing(null);
  }

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  if (pending.length === 0) return (
    <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <p style={{ color: t.textMuted }}>No pending registrations in {constituency}. All caught up!</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>{pending.length} farmer{pending.length > 1 ? "s" : ""} waiting for review in {constituency}</p>
      {pending.map(u => (
        <div key={u.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: t.shadow }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{u.name}</div>
            <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>📞 {u.phone}</span>
              <span>🆔 {u.national_id || "—"}</span>
              <span>📍 {u.county} County</span>
              <span>🗓 Joined {new Date(u.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>
              Note (shown to user if rejected)
            </label>
            <input
              type="text"
              value={notes[u.id] || ""}
              onChange={e => setNotes(p => ({ ...p, [u.id]: e.target.value }))}
              placeholder="e.g. ID not clear, resubmit with clearer photo"
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, fontFamily: "Inter, sans-serif" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => decide(u, "rejected")} disabled={acting === u.id}
              style={{ ...btn("none", t.red, "1px solid #FCA5A5"), flex: 1 }}>
              ✕ Reject
            </button>
            <button onClick={() => decide(u, "approved")} disabled={acting === u.id}
              style={{ ...btn(t.green, t.white), flex: 2 }}>
              {acting === u.id ? "Processing…" : "✓ Approve & verify"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pool Contributions Tab ───────────────────────────────────────
function ContributionsTab({ constituency }) {
  const [contribs, setContribs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [constituency]);

  async function load() {
    setLoading(true);
    const { data: pool } = await supabase
      .from("constituency_pools")
      .select("id")
      .eq("constituency", constituency)
      .maybeSingle();

    if (!pool) { setContribs([]); setLoading(false); return; }

    const { data } = await supabase
      .from("pool_contributions")
      .select("*, profiles(name, phone)")
      .eq("pool_id", pool.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setContribs(data || []);
    setLoading(false);
  }

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  if (contribs.length === 0) return (
    <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
      <p style={{ color: t.textMuted }}>No active pool contributions in {constituency} yet.</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>{contribs.length} active contribution{contribs.length > 1 ? "s" : ""}</p>
      {contribs.map(c => (
        <div key={c.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 10, boxShadow: t.shadow, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.profiles?.name || "Unknown farmer"}</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>📞 {c.profiles?.phone || "—"} · 🥑 {c.variety} · Grade {c.quality_grade}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: t.greenDark }}>{c.quantity_kg?.toLocaleString()} kg</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>Ksh {c.price_per_kg}/kg</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Visit Requests Tab (constituency-scoped) ─────────────────────
function VisitRequestsTab({ constituency }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_visit");
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [visitFarmers, setVisitFarmers] = useState({});
  const [farmersLoading, setFarmersLoading] = useState(false);

  useEffect(() => { load(); }, [filter, constituency]);

  async function load() {
    setLoading(true);
    const { data: pool } = await supabase
      .from("constituency_pools")
      .select("id, constituency, variety")
      .eq("constituency", constituency)
      .maybeSingle();

    if (!pool) { setRequests([]); setLoading(false); return; }

    const { data } = await supabase
      .from("pool_visit_requests")
      .select("*, profiles(name, phone), constituency_pools(constituency, variety)")
      .eq("pool_id", pool.id)
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  async function toggleFarmers(r) {
    if (expandedRequest === r.id) { setExpandedRequest(null); return; }
    setExpandedRequest(r.id);
    if (!visitFarmers[r.id]) {
      setFarmersLoading(true);
      const { data } = await supabase
        .from("pool_visit_request_items")
        .select("*, profiles(name, phone, county)")
        .eq("visit_request_id", r.id);
      setVisitFarmers(prev => ({ ...prev, [r.id]: data || [] }));
      setFarmersLoading(false);
    }
  }

  async function notifyFarmerInApp(f, r) {
    await supabase.from("notifications").insert({
      user_id: f.farmer_id,
      type: "order",
      title: "Buyer visit request 🚜",
      message: `A buyer wants to visit your pool contribution in ${r.constituency_pools?.constituency}. Target: ${r.target_kg}kg.`,
    });
    setVisitFarmers(prev => ({
      ...prev,
      [r.id]: prev[r.id].map(x => x.id === f.id ? { ...x, notified: true } : x),
    }));
  }

  async function cancelRequest(r) {
    if (!confirm("Cancel this visit request? Pooled kg will return to the pool.")) return;
    await supabase.from("pool_visit_requests").update({ status: "expired" }).eq("id", r.id);
    setRequests(prev => prev.filter(x => x.id !== r.id));
  }

  async function extendRequest(r) {
    const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("pool_visit_requests").update({ expires_at: newExpiry, extended: true }).eq("id", r.id);
    setRequests(prev => prev.map(x => x.id === r.id ? { ...x, expires_at: newExpiry, extended: true } : x));
  }

  async function confirmSold(r) {
    await supabase.from("pool_visit_requests").update({ status: "confirmed_sold" }).eq("id", r.id);
    setRequests(prev => prev.filter(x => x.id !== r.id));
  }

  const STATUS_LOOKUP = {
    pending_visit:  { bg: t.amberLight, text: t.amberDark, label: "Pending visit" },
    confirmed_sold: { bg: "#D1FAE5",    text: "#065F46",   label: "Confirmed sold" },
    expired:        { bg: t.redLight,   text: t.red,       label: "Expired/returned" },
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["pending_visit","confirmed_sold","expired"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "7px 16px", borderRadius: 99, fontSize: 13, cursor: "pointer", border: "none", fontFamily: "Inter, sans-serif", fontWeight: filter === s ? 600 : 400, background: filter === s ? t.amber : t.brownLight, color: filter === s ? t.white : t.textMuted }}>
            {STATUS_LOOKUP[s]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚜</div>
          <p style={{ color: t.textMuted }}>No {STATUS_LOOKUP[filter]?.label.toLowerCase()} visit requests in {constituency}.</p>
        </div>
      ) : requests.map(r => (
        <div key={r.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 10, boxShadow: t.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>🚜 {r.constituency_pools?.constituency} Pool</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>Buyer: {r.profiles?.name} · 📞 {r.profiles?.phone}</div>
            </div>
            <Badge label={STATUS_LOOKUP[r.status]?.label} bg={STATUS_LOOKUP[r.status]?.bg} color={STATUS_LOOKUP[r.status]?.text} />
          </div>

          <div style={{ background: t.cream, borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13 }}>
            Target: {r.target_kg}kg · Selected: {r.total_selected_kg}kg · {r.constituency_pools?.variety}
            {r.status === "pending_visit" && (
              <div style={{ marginTop: 6, fontWeight: 600, color: timeRemaining(r.expires_at) === "Expired" ? t.red : t.amberDark }}>
                ⏱ {timeRemaining(r.expires_at)} {r.extended && "(extended once)"}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={() => toggleFarmers(r)} style={{ ...btn("none", t.purple, `1px solid ${t.purple}`), flex: 1 }}>
              {expandedRequest === r.id ? "▲ Hide farmers" : "📲 View & notify farmers"}
            </button>
          </div>

          {expandedRequest === r.id && (
            <div style={{ background: t.cream, borderRadius: 10, padding: 12, border: `1px solid ${t.border}`, marginBottom: 10 }}>
              {farmersLoading && !visitFarmers[r.id] ? (
                <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 10 }}>Loading farmers…</p>
              ) : (visitFarmers[r.id] || []).length === 0 ? (
                <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 10 }}>No farmers linked to this request.</p>
              ) : (visitFarmers[r.id] || []).map(f => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.white, borderRadius: 8, padding: "8px 10px", marginBottom: 6, border: `1px solid ${t.border}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{f.profiles?.name || "Unknown farmer"}</div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>📞 {f.profiles?.phone} · {f.quantity_kg}kg · 📍 {f.profiles?.county}</div>
                  </div>
                  {r.status === "pending_visit" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => notifyFarmerInApp(f, r)} disabled={f.notified}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: f.notified ? "#D1FAE5" : t.purpleLight,
                          color: f.notified ? t.greenDark : t.purple,
                          border: "none", padding: "6px 10px", borderRadius: 8,
                          fontSize: 11, fontWeight: 600, cursor: f.notified ? "default" : "pointer",
                          fontFamily: "Inter, sans-serif",
                        }}>
                        {f.notified ? "✓ Notified" : "🔔 Notify in-app"}
                      </button>
                      {f.profiles?.phone && (
                        <a href={buildVisitWhatsAppLink(f.profiles.phone, f.profiles.name, r)} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#25D366", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                          💬
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {r.status === "pending_visit" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => cancelRequest(r)} style={{ ...btn("none", t.red, "1px solid #FCA5A5"), flex: 1 }}>Cancel & return</button>
              {!r.extended && (
                <button onClick={() => extendRequest(r)} style={{ ...btn("none", t.amber, "1px solid #FCD34D"), flex: 1 }}>+3 days</button>
              )}
              <button onClick={() => confirmSold(r)} style={{ ...btn(t.green, t.white), flex: 2 }}>✅ Confirm sold</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Constituency Admin Dashboard ─────────────────────────────
export default function ConstituencyAdminDashboard({ profile }) {
  const [tab, setTab] = useState("pool");
  const constituency = profile?.assigned_constituency;

  if (!constituency) {
    return (
      <div style={{ maxWidth: 500, margin: "60px auto", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontFamily: "Playfair Display, serif", marginBottom: 8 }}>No Constituency Assigned</h2>
        <p style={{ color: t.textMuted, fontSize: 14 }}>Contact the super admin to assign your constituency.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, marginBottom: 4 }}>{constituency} Admin</h1>
          <p style={{ fontSize: 14, color: t.textMuted }}>Constituency Admin · Logged in as {profile?.name}</p>
        </div>
        <div style={{ fontSize: 11, background: t.brownLight, color: t.brown, padding: "6px 14px", borderRadius: 99, fontWeight: 500 }}>
          🔐 Constituency access
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            style={{
              padding: "11px 20px", fontSize: 14, background: "none", border: "none", cursor: "pointer",
              fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
              borderBottom: `2px solid ${tab === tb.key ? tb.color : "transparent"}`,
              color: tab === tb.key ? tb.color : t.textMuted,
              fontWeight: tab === tb.key ? 600 : 400,
            }}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "pool"     && <PoolOverviewTab constituency={constituency} />}
      {tab === "visits"   && <VisitRequestsTab constituency={constituency} />}
      {tab === "pending"  && <PendingFarmersTab constituency={constituency} />}
      {tab === "contribs" && <ContributionsTab constituency={constituency} />}
    </div>
  );
}