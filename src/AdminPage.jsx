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
  amber: "#F59E0B", amberLight: "#FEF3C7",
  blue: "#3B82F6", blueLight: "#DBEAFE",
  purple: "#8B5CF6", purpleLight: "#EDE9FE",
};

const btn = (bg, color, border) => ({
  padding: "9px 20px", background: bg, color, border: border || "none",
  borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
  fontFamily: "Inter, sans-serif", transition: "opacity .15s",
});

const TABS = [
  { key: "pending",   label: "⏳ Pending",    color: t.amber },
  { key: "users",     label: "👥 All Users",   color: t.blue },
  { key: "no_shows",  label: "⚠️ No-shows",   color: t.red },
  { key: "resources", label: "🌿 Resources",   color: t.green },
  { key: "stats",     label: "📊 Stats",       color: t.purple },
];
 

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: t.shadow }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontFamily: "Playfair Display, serif", color: color || t.green, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 13, color: t.textMuted }}>{label}</div>
    </div>
  );
}

function Badge({ label, bg, color }) {
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: bg, color, fontWeight: 500 }}>{label}</span>;
}
function RoleBadge({ role }) {
  const map = {
    farmer:      { label: "🌱 Farmer",      bg: t.greenLight,  color: t.greenDark },
    buyer:       { label: "🏪 Buyer",        bg: "#DBEAFE",     color: "#1E40AF"   },
    cooperative: { label: "🤝 Cooperative",  bg: t.amberLight,  color: "#92400E"   },
    company:     { label: "🏢 Company",      bg: t.purpleLight, color: t.purple    },
  };
  const r = map[role] || { label: role, bg: "#f0f0f0", color: t.textMuted };
  return <Badge label={r.label} bg={r.bg} color={r.color} />;
}

function TrustBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 4 ? t.green : pct >= 2.5 ? t.amber : t.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${(pct / 5) * 100}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{Number(score || 0).toFixed(1)}</span>
    </div>
  );
}

// ── Pending Verification Queue ─────────────────────────────────
function PendingTab({ onAction }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [acting, setActing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
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

    // Notify user
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: decision === "approved" ? "accepted" : "rejected",
      title: decision === "approved" ? "Account verified ✅" : "Verification rejected ❌",
      message: decision === "approved"
        ? `Welcome to AvoConnect, ${user.name.split(" ")[0]}! Your account is verified and you can now ${user.role === "farmer" ? "list avocados and receive orders" : "place orders"}.`
        : `Your verification was not approved. Reason: ${notes[user.id] || "Does not meet requirements"}. Contact support to reapply.`,
    });

    setPending(p => p.filter(u => u.id !== user.id));
    setActing(null);
    onAction();
  }

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  if (pending.length === 0) return (
    <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <p style={{ color: t.textMuted }}>No pending verifications. All caught up!</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>{pending.length} account{pending.length > 1 ? "s" : ""} waiting for review</p>
      {pending.map(u => (
        <div key={u.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: t.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{u.name}</span>
<RoleBadge role={u.role} />
              </div>
              <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>📞 {u.phone}</span>
                <span>📍 {u.county} County</span>
                <span>🗓 Joined {new Date(u.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {u.buyer_type && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Buyer type: <strong>{u.buyer_type}</strong></div>}
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
              style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 13, background: t.cream, fontFamily: "Inter, sans-serif" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => decide(u, "rejected")}
              disabled={acting === u.id}
              style={{ ...btn("none", t.red, `1px solid #FCA5A5`), flex: 1, opacity: acting === u.id ? 0.6 : 1 }}
            >
              ✕ Reject
            </button>
            <button
              onClick={() => decide(u, "approved")}
              disabled={acting === u.id}
              style={{ ...btn(t.green, t.white), flex: 2, opacity: acting === u.id ? 0.6 : 1 }}
            >
              ✓ Approve & verify
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── All Users ──────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [acting, setActing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*, reviews_received:reviews!reviews_reviewee_id_fkey(rating)")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function toggleSuspend(user) {
    setActing(user.id);
    const suspended = !user.suspended;
    await supabase.from("profiles").update({ suspended }).eq("id", user.id);
    setUsers(p => p.map(u => u.id === user.id ? { ...u, suspended } : u));

    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "rejected",
      title: suspended ? "Account suspended ⛔" : "Account reinstated ✅",
      message: suspended
        ? "Your AvoConnect account has been suspended by admin. Contact support to appeal."
        : "Your AvoConnect account has been reinstated. You can now trade normally.",
    });
    setActing(null);
  }

  async function clearStrikes(userId) {
    await supabase.from("profiles").update({ strikes: 0, suspended: false }).eq("id", userId);
    setUsers(p => p.map(u => u.id === userId ? { ...u, strikes: 0, suspended: false } : u));
  }

  async function changeVerification(user, status) {
    setActing(user.id);
    await supabase.from("profiles").update({
      verification_status: status,
      verified: status === "approved",
    }).eq("id", user.id);
    setUsers(p => p.map(u => u.id === user.id ? { ...u, verification_status: status, verified: status === "approved" } : u));
    setActing(null);
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) || u.county?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "verified" && u.verified) ||
      (filterStatus === "pending" && u.verification_status === "pending") ||
      (filterStatus === "suspended" && u.suspended);
    return matchSearch && matchRole && matchStatus;
  });

  const verificationBadge = (u) => {
    if (u.suspended) return <Badge label="⛔ Suspended" bg={t.redLight} color={t.red} />;
    if (u.verified) return <Badge label="✅ Verified" bg={t.greenLight} color={t.greenDark} />;
    if (u.verification_status === "rejected") return <Badge label="❌ Rejected" bg={t.redLight} color={t.red} />;
    return <Badge label="⏳ Pending" bg={t.amberLight} color={t.amber} />;
  };

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, county…"
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 13, background: t.white, fontFamily: "Inter, sans-serif" }}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding: "9px 12px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 13, background: t.white, fontFamily: "Inter, sans-serif" }}>
          <option value="all">All roles</option>
          <option value="farmer">Farmers</option>
          <option value="buyer">Buyers</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "9px 12px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 13, background: t.white, fontFamily: "Inter, sans-serif" }}>
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.map(u => {
        const avgRating = u.reviews_received?.length
          ? (u.reviews_received.reduce((s, r) => s + r.rating, 0) / u.reviews_received.length).toFixed(1)
          : null;
        const isExpanded = expandedId === u.id;

        return (
          <div key={u.id} style={{ background: t.white, border: `1px solid ${u.suspended ? "#FCA5A5" : t.border}`, borderRadius: 14, padding: 16, marginBottom: 10, boxShadow: t.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</span>
                 <RoleBadge role={u.role} />
                  {verificationBadge(u)}
                  {u.strikes > 0 && <Badge label={`⚠️ ${u.strikes} strike${u.strikes > 1 ? "s" : ""}`} bg={t.amberLight} color={t.amber} />}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span>📞 {u.phone}</span>
                  <span>📍 {u.county}</span>
                  {avgRating && <span>⭐ {avgRating} ({u.reviews_received.length} reviews)</span>}
                </div>
              </div>
              <button onClick={() => setExpandedId(isExpanded ? null : u.id)}
                style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), padding: "5px 12px", fontSize: 12 }}>
                {isExpanded ? "▲ Less" : "▼ More"}
              </button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
                {avgRating && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Trust score</div>
                    <TrustBar score={parseFloat(avgRating)} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Suspend / Reinstate */}
                  <button onClick={() => toggleSuspend(u)} disabled={acting === u.id}
                    style={{ ...btn(u.suspended ? t.green : "none", u.suspended ? t.white : t.red, u.suspended ? "none" : `1px solid #FCA5A5`), opacity: acting === u.id ? 0.6 : 1 }}>
                    {u.suspended ? "✓ Reinstate" : "⛔ Suspend"}
                  </button>
                  {/* Clear strikes */}
                  {u.strikes > 0 && (
                    <button onClick={() => clearStrikes(u.id)}
                      style={btn("none", t.amber, `1px solid #FCD34D`)}>
                      Clear strikes
                    </button>
                  )}
                  {/* Re-verify */}
                  {!u.verified && (
                    <button onClick={() => changeVerification(u, "approved")} disabled={acting === u.id}
                      style={{ ...btn(t.green, t.white), opacity: acting === u.id ? 0.6 : 1 }}>
                      ✓ Verify now
                    </button>
                  )}
                  {u.verified && (
                    <button onClick={() => changeVerification(u, "pending")} disabled={acting === u.id}
                      style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), opacity: acting === u.id ? 0.6 : 1 }}>
                      Revoke verification
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── No-shows Tab ───────────────────────────────────────────────
function NoShowsTab() {
  const [noShows, setNoShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("no_shows")
      .select("*, buyer:profiles!no_shows_buyer_id_fkey(name, phone, county, strikes, suspended), farmer:profiles!no_shows_farmer_id_fkey(name, county), orders(quantity_kg, price_per_kg, listings(variety))")
      .order("created_at", { ascending: false });
    setNoShows(data || []);
    setLoading(false);
  }

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  if (noShows.length === 0) return (
    <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <p style={{ color: t.textMuted }}>No no-shows recorded yet.</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>{noShows.length} no-show{noShows.length !== 1 ? "s" : ""} recorded</p>
      {noShows.map(ns => (
        <div key={ns.id} style={{ background: t.white, border: `1px solid #FCA5A5`, borderRadius: 14, padding: 16, marginBottom: 10, boxShadow: t.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{ns.buyer?.name}</span>
                {ns.buyer?.suspended
                  ? <Badge label="⛔ Suspended" bg={t.redLight} color={t.red} />
                  : <Badge label={`⚠️ ${ns.buyer?.strikes} strike${ns.buyer?.strikes > 1 ? "s" : ""}`} bg={t.amberLight} color={t.amber} />
                }
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                📞 {ns.buyer?.phone} · 📍 {ns.buyer?.county}
              </div>
            </div>
            <span style={{ fontSize: 11, color: t.textMuted }}>{new Date(ns.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div style={{ background: t.cream, borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
            <span style={{ color: t.textMuted }}>Farmer: </span><strong>{ns.farmer?.name}</strong>
            {ns.orders && (
              <span style={{ color: t.textMuted, marginLeft: 12 }}>
                · {ns.orders.quantity_kg} kg {ns.orders.listings?.variety} · Ksh {(ns.orders.quantity_kg * ns.orders.price_per_kg).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stats Tab ──────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null); // { title, data, columns }
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [
      { count: totalUsers },
      { count: farmers },
      { count: buyers },
      { count: cooperatives },
      { count: companies },
      { count: verified },
      { count: suspended },
      { count: pending },
      { count: totalOrders },
      { count: completedOrders },
      { count: noShows },
      { count: totalListings },
      { count: reviews },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "farmer"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "buyer"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "cooperative"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "company"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verified", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("suspended", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("no_shows").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
    ]);

    setStats({ totalUsers, farmers, buyers, cooperatives, companies, verified, suspended, pending, totalOrders, completedOrders, noShows, totalListings, reviews });
    setLoading(false);
  }

  async function drillDown(title, query) {
    setDrillLoading(true);
    setDrill({ title, data: [], loading: true });
    const { data } = await query;
    setDrill({ title, data: data || [] });
    setDrillLoading(false);
  }

  const DRILLS = {
    farmers:      () => drillDown("Farmers", supabase.from("profiles").select("name, phone, county, verified, created_at").eq("role", "farmer").order("created_at", { ascending: false })),
    buyers:       () => drillDown("Buyers", supabase.from("profiles").select("name, phone, county, verified, created_at").eq("role", "buyer").order("created_at", { ascending: false })),
    cooperatives: () => drillDown("Cooperatives", supabase.from("profiles").select("name, phone, county, verified, created_at").eq("role", "cooperative").order("created_at", { ascending: false })),
    companies:    () => drillDown("Companies", supabase.from("profiles").select("name, phone, county, verified, created_at").eq("role", "company").order("created_at", { ascending: false })),
    verified:     () => drillDown("Verified Users", supabase.from("profiles").select("name, phone, county, role, created_at").eq("verified", true).order("created_at", { ascending: false })),
    suspended:    () => drillDown("Suspended Users", supabase.from("profiles").select("name, phone, county, role, strikes").eq("suspended", true)),
    pending:      () => drillDown("Pending Verification", supabase.from("profiles").select("name, phone, county, role, created_at").eq("verification_status", "pending").order("created_at", { ascending: true })),
    orders:       () => drillDown("All Orders", supabase.from("orders").select("*, profiles!orders_buyer_id_fkey(name), listings(variety)").order("created_at", { ascending: false }).limit(50)),
    completed:    () => drillDown("Completed Orders", supabase.from("orders").select("*, profiles!orders_buyer_id_fkey(name), listings(variety)").eq("status", "completed").order("created_at", { ascending: false })),
    listings:     () => drillDown("Active Listings", supabase.from("listings").select("*, profiles(name, county)").eq("is_active", true).order("created_at", { ascending: false })),
    reviews:      () => drillDown("Reviews Written", supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(name), reviewee:profiles!reviews_reviewee_id_fkey(name)").order("created_at", { ascending: false })),
  };

  if (loading) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

  return (
    <div>
      {/* Drill-down modal */}
      {drill && (
        <div onClick={() => setDrill(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.white, borderRadius: 20, padding: 24, maxWidth: 640, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20 }}>{drill.title}</h3>
              <button onClick={() => setDrill(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: t.textMuted }}>✕</button>
            </div>
            {drillLoading ? (
              <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>
            ) : drill.data.length === 0 ? (
              <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>No records found.</p>
            ) : drill.data.map((row, i) => (
              <div key={i} style={{ background: t.cream, borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: `1px solid ${t.border}`, fontSize: 13 }}>
                {/* Profile rows */}
                {row.name && !row.rating && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.name}</div>
                      <div style={{ color: t.textMuted }}>📞 {row.phone} · 📍 {row.county} {row.role && `· ${row.role}`}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {row.verified !== undefined && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: row.verified ? t.greenLight : t.amberLight, color: row.verified ? t.greenDark : "#92400E" }}>
                          {row.verified ? "✅ Verified" : "⏳ Pending"}
                        </span>
                      )}
                      {row.strikes > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#FEF3C7", color: "#92400E" }}>⚠️ {row.strikes} strikes</span>}
                    </div>
                  </div>
                )}
                {/* Order rows */}
                {row.quantity_kg && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.profiles?.name} · {row.listings?.variety}</div>
                    <div style={{ color: t.textMuted }}>{row.quantity_kg} kg · Ksh {(row.quantity_kg * row.price_per_kg).toLocaleString()} · <span style={{ textTransform: "capitalize" }}>{row.status}</span></div>
                  </div>
                )}
                {/* Listing rows */}
                {row.variety && !row.quantity_kg && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.profiles?.name} · {row.variety}</div>
                    <div style={{ color: t.textMuted }}>📍 {row.county} · {row.quantity_kg_listing || row.quantity_kg} kg · Ksh {row.price_per_kg}/kg</div>
                  </div>
                )}
                {/* Review rows */}
                {row.rating && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{"⭐".repeat(row.rating)} {row.rating}/5</div>
                    <div style={{ color: t.textMuted }}>By: {row.reviewer?.name} → {row.reviewee?.name}</div>
                    {row.comment && <div style={{ color: t.text, marginTop: 4, fontStyle: "italic" }}>"{row.comment}"</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon="👥" label="Total users" value={stats.totalUsers} color={t.blue} />
        <StatCard icon="🌱" label="Farmers" value={stats.farmers} color={t.green} onClick={DRILLS.farmers} />
        <StatCard icon="🏪" label="Buyers" value={stats.buyers} color={t.brown} onClick={DRILLS.buyers} />
        <StatCard icon="🤝" label="Cooperatives" value={stats.cooperatives} color={t.green} onClick={DRILLS.cooperatives} />
        <StatCard icon="🏢" label="Companies" value={stats.companies} color={t.purple} onClick={DRILLS.companies} />
        <StatCard icon="✅" label="Verified" value={stats.verified} color={t.green} onClick={DRILLS.verified} />
        <StatCard icon="⏳" label="Pending review" value={stats.pending} color={t.amber} onClick={DRILLS.pending} />
        <StatCard icon="⛔" label="Suspended" value={stats.suspended} color={t.red} onClick={DRILLS.suspended} />
        <StatCard icon="📦" label="Total orders" value={stats.totalOrders} color={t.blue} onClick={DRILLS.orders} />
        <StatCard icon="🎉" label="Completed" value={stats.completedOrders} color={t.green} onClick={DRILLS.completed} />
        <StatCard icon="⚠️" label="No-shows" value={stats.noShows} color={t.amber} />
        <StatCard icon="🥑" label="Active listings" value={stats.totalListings} color={t.green} onClick={DRILLS.listings} />
        <StatCard icon="⭐" label="Reviews written" value={stats.reviews} color={t.purple} onClick={DRILLS.reviews} />
      </div>

      {/* Platform health */}
      {stats.totalOrders > 0 && (
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Platform health</div>
          {[
            ["Order completion rate", stats.completedOrders, stats.totalOrders, t.green],
            ["Verification rate", stats.verified, stats.totalUsers, t.blue],
            ["No-show rate", stats.noShows, stats.totalOrders, t.red],
          ].map(([label, num, den, color]) => {
            const pct = den > 0 ? Math.round((num / den) * 100) : 0;
            return (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Resources Admin Tab ────────────────────────────────────────
function ResourcesTab() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});
  const [acting, setActing] = useState(null);
 
  useEffect(() => { load(); }, [filter]);
 
  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select("*, profiles!resources_company_id_fkey(name, company_name, phone)")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setResources(data || []);
    setLoading(false);
  }
 
  async function decide(resource, status) {
    setActing(resource.id);
    await supabase.from("resources").update({
      status,
      admin_note: notes[resource.id] || "",
    }).eq("id", resource.id);
 
    await supabase.from("notifications").insert({
      user_id: resource.company_id,
      type: status === "approved" ? "accepted" : "rejected",
      title: status === "approved" ? "Resource approved ✅" : "Resource rejected ❌",
      message: status === "approved"
        ? `Your resource "${resource.title}" has been approved and is now live on AvoConnect.`
        : `Your resource "${resource.title}" was not approved. ${notes[resource.id] ? "Reason: " + notes[resource.id] : "Please review and resubmit."}`,
    });
 
    setResources(p => p.filter(r => r.id !== resource.id));
    setActing(null);
  }
 
  const TYPE_LABELS = { input: "🌿 Input", guide: "📖 Guide", link: "🔗 Link" };
 
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["pending","approved","rejected"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "7px 16px", borderRadius: 99, fontSize: 13, cursor: "pointer", border: "none", fontFamily: "Inter, sans-serif", fontWeight: filter === s ? 600 : 400, background: filter === s ? t.green : t.brownLight, color: filter === s ? t.white : t.textMuted }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
 
      {loading ? (
        <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>
      ) : resources.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ color: t.textMuted }}>No {filter} resources.</p>
        </div>
      ) : resources.map(r => (
        <div key={r.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: t.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: t.greenLight, color: t.greenDark, fontWeight: 500 }}>{TYPE_LABELS[r.type]}</span>
                {r.category && <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: t.brownLight, color: t.brown, fontWeight: 500 }}>{r.category}</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                🏢 {r.profiles?.company_name || r.profiles?.name} · 📞 {r.profiles?.phone}
              </div>
              {r.description && <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 6 }}>{r.description}</p>}
              {r.price && <div style={{ fontSize: 13, color: t.greenDark, fontWeight: 500 }}>{r.price}</div>}
              {r.external_url && <a href={r.external_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: t.blue }}>{r.external_url}</a>}
            </div>
            {r.photo_url && (
              <img src={r.photo_url} alt={r.title} style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", marginLeft: 16, flexShrink: 0 }} />
            )}
          </div>
 
          {filter === "pending" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Admin note (shown if rejected)</label>
                <input type="text" value={notes[r.id] || ""} onChange={e => setNotes(p => ({ ...p, [r.id]: e.target.value }))}
                  placeholder="e.g. Missing product registration number"
                  style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 13, background: t.cream, fontFamily: "Inter, sans-serif" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => decide(r, "rejected")} disabled={acting === r.id}
                  style={{ flex: 1, padding: "9px", background: "none", border: "1px solid #FCA5A5", borderRadius: 10, color: t.red, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: acting === r.id ? 0.6 : 1 }}>
                  ✕ Reject
                </button>
                <button onClick={() => decide(r, "approved")} disabled={acting === r.id}
                  style={{ flex: 2, padding: "9px", background: t.green, border: "none", borderRadius: 10, color: t.white, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: acting === r.id ? 0.6 : 1 }}>
                  ✓ Approve & publish
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
 
// ── Main AdminPage ─────────────────────────────────────────────
export default function AdminPage({ profile }) {
  const [tab, setTab] = useState("pending");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => { loadPendingCount(); }, []);

  async function loadPendingCount() {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending");
    setPendingCount(count || 0);
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, marginBottom: 4 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 14, color: t.textMuted }}>AvoConnect · Logged in as {profile?.name}</p>
        </div>
        <div style={{ fontSize: 11, background: t.brownLight, color: t.brown, padding: "6px 14px", borderRadius: 99, fontWeight: 500 }}>
          🔐 Admin access
        </div>
      </div>

      {/* Tabs */}
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
            {tb.key === "pending" && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: t.amber, color: t.white, fontSize: 10, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "pending"   && <PendingTab onAction={loadPendingCount} />}
      {tab === "users"     && <UsersTab />}
      {tab === "no_shows"  && <NoShowsTab />}
      {tab === "resources" && <ResourcesTab />}
      {tab === "stats"     && <StatsTab />}
    </div>
  );
}