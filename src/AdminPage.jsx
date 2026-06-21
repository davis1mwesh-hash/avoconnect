import { useState, useEffect } from "react";
import { supabase } from "./App";

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
  { key: "pools",     label: "🤝 Pool Orders", color: t.purple },
  { key: "visits",    label: "🚜 Visit Requests", color: t.amber },
  { key: "stats",     label: "📊 Stats",       color: t.purple },
];

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: t.white, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: "18px 20px", boxShadow: t.shadow,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .2s, transform .2s",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = t.shadow; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontFamily: "Playfair Display, serif", color: color || t.green, marginBottom: 2 }}>{value ?? 0}</div>
      <div style={{ fontSize: 13, color: t.textMuted }}>{label}</div>
      {onClick && <div style={{ fontSize: 11, color: t.green, marginTop: 4, fontWeight: 500 }}>Click to view →</div>}
    </div>
  );
}

function Badge({ label, bg, color }) {
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: bg, color, fontWeight: 500 }}>{label}</span>;
}

function RoleBadge({ role }) {
  const map = {
    farmer:      { label: "🌱 Farmer",      bg: t.greenLight,  color: t.greenDark },
    buyer:       { label: "🏪 Buyer",       bg: "#DBEAFE",     color: "#1E40AF"   },
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

// ── All Users Tab ──────────────────────────────────────────────
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
        ? "Your AvoConnect account has been suspended by admin."
        : "Your AvoConnect account has been reinstated.",
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
                  <button onClick={() => toggleSuspend(u)} disabled={acting === u.id}
                    style={{ ...btn(u.suspended ? t.green : "none", u.suspended ? t.white : t.red, u.suspended ? "none" : `1px solid #FCA5A5`), opacity: acting === u.id ? 0.6 : 1 }}>
                    {u.suspended ? "✓ Reinstate" : "⛔ Suspend"}
                  </button>
                  {u.strikes > 0 && (
                    <button onClick={() => clearStrikes(u.id)} style={btn("none", t.amber, `1px solid #FCD34D`)}>
                      Clear strikes
                    </button>
                  )}
                  {!u.verified && (
                    <button onClick={() => changeVerification(u, "approved")} disabled={acting === u.id} style={{ ...btn(t.green, t.white), opacity: acting === u.id ? 0.6 : 1 }}>
                      ✓ Verify now
                    </button>
                  )}
                  {u.verified && (
                    <button onClick={() => changeVerification(u, "pending")} disabled={acting === u.id} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), opacity: acting === u.id ? 0.6 : 1 }}>
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
                  : <Badge label={`⚠️ ${ns.buyer?.strikes || 0} strike${ns.buyer?.strikes !== 1 ? "s" : ""}`} bg={t.amberLight} color={t.amber} />
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
        ? `Your resource "${resource.title}" has been approved.`
        : `Your resource "${resource.title}" was not approved. ${notes[resource.id] ? "Reason: " + notes[resource.id] : ""}`,
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

// ── Stats Tab ──────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null); 
  const [drillLoading, setDrillLoading] = useState(false);
  const [expandedPool, setExpandedPool] = useState(null);
  const [contributors, setContributors] = useState({});
  const [contributorsLoading, setContributorsLoading] = useState(false);

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
      { count: activePools },
      { count: pendingPoolOrders },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "farmer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cooperative"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "company"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verified", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("suspended", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("no_shows").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("reviews").select("id", { count: "exact", head: true }),
      supabase.from("constituency_pools").select("id", { count: "exact", head: true }).gt("total_kg", 0),
      supabase.from("pool_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setStats({ totalUsers, farmers, buyers, cooperatives, companies, verified, suspended, pending, totalOrders, completedOrders, noShows, totalListings, reviews, activePools, pendingPoolOrders });
    setLoading(false);
  }

  async function drillDown(title, query) {
    setDrillLoading(true);
    setDrill({ title, data: [] });
    setExpandedPool(null);
    setContributors({});
    const { data } = await query;
    setDrill({ title, data: data || [] });
    setDrillLoading(false);
  }

  async function toggleContributors(poolId) {
    if (expandedPool === poolId) { setExpandedPool(null); return; }
    setExpandedPool(poolId);
    if (contributors[poolId]) return;
    setContributorsLoading(true);
    const { data } = await supabase
      .from("pool_contributions")
      .select("id, quantity_kg, variety, price_per_kg, harvest_date, status, created_at, profiles!pool_contributions_farmer_id_fkey(name, phone, county)")
      .eq("pool_id", poolId)
      .order("created_at", { ascending: false });
    setContributors(prev => ({ ...prev, [poolId]: data || [] }));
    setContributorsLoading(false);
  }

  const DRILLS = {
    farmers:      () => drillDown("Farmers", supabase.from("profiles").select("id, name, phone, county, verified, created_at").eq("role", "farmer").order("created_at", { ascending: false })),
    buyers:       () => drillDown("Buyers", supabase.from("profiles").select("id, name, phone, county, verified, created_at").eq("role", "buyer").order("created_at", { ascending: false })),
    cooperatives: () => drillDown("Cooperatives", supabase.from("profiles").select("id, name, phone, county, verified, created_at").eq("role", "cooperative").order("created_at", { ascending: false })),
    companies:    () => drillDown("Companies", supabase.from("profiles").select("id, name, phone, county, verified, created_at").eq("role", "company").order("created_at", { ascending: false })),
    verified:     () => drillDown("Verified Users", supabase.from("profiles").select("id, name, phone, county, role, created_at").eq("verified", true).order("created_at", { ascending: false })),
    suspended:    () => drillDown("Suspended Users", supabase.from("profiles").select("id, name, phone, county, role, strikes").eq("suspended", true)),
    pending:      () => drillDown("Pending Verification", supabase.from("profiles").select("id, name, phone, county, role, created_at").eq("verification_status", "pending").order("created_at", { ascending: true })),
    orders:       () => drillDown("All Orders", supabase.from("orders").select("id, quantity_kg, price_per_kg, status, created_at, profiles!orders_buyer_id_fkey(name), listings(variety)").order("created_at", { ascending: false }).limit(50)),
    completed:    () => drillDown("Completed Orders", supabase.from("orders").select("id, quantity_kg, price_per_kg, status, created_at, profiles!orders_buyer_id_fkey(name), listings(variety)").eq("status", "completed").order("created_at", { ascending: false })),
    listings:     () => drillDown("Active Listings", supabase.from("listings").select("id, variety, county, price_per_kg, quantity_kg, profiles(name)").eq("is_active", true).order("created_at", { ascending: false })),
    reviews:      () => drillDown("Reviews Written", supabase.from("reviews").select("id, rating, comment, reviewer:profiles!reviews_reviewer_id_fkey(name), reviewee:profiles!reviews_reviewee_id_fkey(name)").order("created_at", { ascending: false })),
    pools:        () => drillDown("Active Constituency Pools", supabase.from("constituency_pools").select("id, constituency, county, variety, total_kg, price_per_kg").gt("total_kg", 0).order("total_kg", { ascending: false })),
    poolOrders:   () => drillDown("Pending Pool Orders", supabase.from("pool_orders").select("id, quantity_kg, price_per_kg, status, created_at, profiles!pool_orders_buyer_id_fkey(name), constituency_pools(constituency)").eq("status", "pending").order("created_at", { ascending: false })),
  };

  if (loading || !stats) return <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>;

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
              <div key={row.id || i} style={{ background: t.cream, borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: `1px solid ${t.border}`, fontSize: 13 }}>
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
                {row.quantity_kg && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.profiles?.name} · {row.listings?.variety}</div>
                    <div style={{ color: t.textMuted }}>{row.quantity_kg} kg · Ksh {(row.quantity_kg * row.price_per_kg).toLocaleString()} · <span style={{ textTransform: "capitalize" }}>{row.status}</span></div>
                  </div>
                )}
                {row.variety && !row.quantity_kg && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.profiles?.name} · {row.variety}</div>
                    <div style={{ color: t.textMuted }}>📍 {row.county} · {row.quantity_kg_listing || row.quantity_kg || 0} kg · Ksh {row.price_per_kg}/kg</div>
                  </div>
                )}
                {row.rating && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{"⭐".repeat(row.rating)} {row.rating}/5</div>
                    <div style={{ color: t.textMuted }}>By: {row.reviewer?.name} → {row.reviewee?.name}</div>
                    {row.comment && <div style={{ color: t.text, marginTop: 4, fontStyle: "italic" }}>"{row.comment}"</div>}
                  </div>
                )}
                {row.constituency && (
                  <div>
                    <div
                      onClick={() => toggleContributors(row.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>🤝 {row.constituency}</div>
                        <div style={{ color: t.textMuted }}>📍 {row.county} · {row.variety}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 600, color: t.greenDark }}>{row.total_kg?.toLocaleString()} kg</div>
                        <div style={{ color: t.textMuted, fontSize: 12 }}>Ksh {row.price_per_kg || "TBD"}/kg</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: t.purple, marginTop: 6, fontWeight: 500 }}>
                      {expandedPool === row.id ? "▲ Hide farmers" : "▼ Show contributing farmers"}
                    </div>
                    {expandedPool === row.id && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}` }}>
                        {contributorsLoading && !contributors[row.id] ? (
                          <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 10 }}>Loading farmers…</p>
                        ) : (contributors[row.id] || []).length === 0 ? (
                          <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 10 }}>No farmer contributions found.</p>
                        ) : (contributors[row.id] || []).map(c => (
                          <div key={c.id} style={{ background: t.white, borderRadius: 8, padding: "8px 10px", marginBottom: 6, border: `1px solid ${t.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{c.profiles?.name || "Unknown farmer"}</div>
                                <div style={{ fontSize: 11, color: t.textMuted }}>📞 {c.profiles?.phone}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 600, fontSize: 12, color: t.greenDark }}>{c.quantity_kg} kg</div>
                                <div style={{ fontSize: 10, color: t.textMuted }}>{c.harvest_date}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {row.constituency_pools && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.profiles?.name} → {row.constituency_pools?.constituency}</div>
                    <div style={{ color: t.textMuted }}>{row.quantity_kg} kg · Ksh {(row.quantity_kg * row.price_per_kg).toLocaleString()} · <span style={{ textTransform: "capitalize" }}>{row.status}</span></div>
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
        <StatCard icon="🤝" label="Active pools" value={stats.activePools} color={t.purple} onClick={DRILLS.pools} />
        <StatCard icon="📬" label="Pending pool orders" value={stats.pendingPoolOrders} color={t.amber} onClick={DRILLS.poolOrders} />
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

// ── Pool Orders Tab ────────────────────────────────────────────
function PoolOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [contributors, setContributors] = useState({});
  const [contributorsLoading, setContributorsLoading] = useState(false);

  useEffect(() => { load(); setExpandedOrder(null); }, [filter]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("pool_orders")
      .select("*, constituency_pools(id, constituency, county, variety), profiles!pool_orders_buyer_id_fkey(name, phone)")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function toggleContributors(order) {
    if (expandedOrder === order.id) { setExpandedOrder(null); return; }
    setExpandedOrder(order.id);
    if (contributors[order.id]) return;
    setContributorsLoading(true);
    const { data } = await supabase
      .from("pool_contributions")
      .select("id, farmer_id, quantity_kg, variety, harvest_date, quality_grade, delivered, profiles!pool_contributions_farmer_id_fkey(name, phone)")
      .eq("pool_id", order.constituency_pools?.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setContributors(prev => ({ ...prev, [order.id]: data || [] }));
    setContributorsLoading(false);
  }

  async function markFarmerDelivery(order, contribution, delivered) {
    await supabase.from("pool_contributions").update({ delivered, delivery_marked_at: new Date().toISOString() }).eq("id", contribution.id);

    setContributors(prev => ({
      ...prev,
      [order.id]: (prev[order.id] || []).map(c => c.id === contribution.id ? { ...c, delivered } : c)
    }));

    if (!delivered) {
      const farmerId = contribution.farmer_id;
      const { data: farmerProfile } = await supabase.from("profiles").select("strikes").eq("id", farmerId).maybeSingle();
      const newStrikes = (farmerProfile?.strikes || 0) + 1;
      const suspend = newStrikes >= 2;
      await supabase.from("profiles").update({ strikes: newStrikes, suspended: suspend }).eq("id", farmerId);
      await supabase.from("notifications").insert({
        user_id: farmerId, type: "rejected",
        title: suspend ? "Account suspended ⛔" : "Pool delivery missed ⚠️",
        message: suspend
          ? "You've been suspended after 2 missed pool deliveries. Contact admin to appeal."
          : `You were marked as a no-show for a pool delivery (${contribution.quantity_kg}kg). One more missed delivery will suspend your account.`,
      });
    }
  }

  function buildWhatsAppLink(farmerPhone, farmerName, order) {
    const pool = order.constituency_pools;
    const cleanPhone = farmerPhone.replace(/\D/g, "").replace(/^0/, "254");
    const message =
`Habari ${farmerName?.split(" ")[0] || ""}! 🥑

Kuna mnunuzi (buyer) ameagiza avocados ${order.quantity_kg}kg za ${pool?.variety} kutoka kwenye pool ya ${pool?.constituency}.

Bei: Ksh ${order.price_per_kg}/kg
Buyer: ${order.profiles?.name}

Tafadhali jiandae kuleta avocados zako. Tutawasiliana na maelezo zaidi ya mahali pa kukutana.

— AvoConnect Admin`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  async function updateStatus(order, status) {
    await supabase.from("pool_orders").update({ status }).eq("id", order.id);

    if (status === "accepted") {
      const pool = order.constituency_pools;
      const { data: poolRow } = await supabase.from("constituency_pools").select("*").eq("constituency", pool.constituency).single();
      if (poolRow) {
        const remaining = Math.max(0, (poolRow.total_kg || 0) - (order.quantity_kg || 0));
        await supabase.from("constituency_pools").update({ total_kg: remaining }).eq("id", poolRow.id);
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("pool_orders").update({ expires_at: expiresAt }).eq("id", order.id);
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "accepted",
        title: "Pool order accepted! ✅",
        message: `Your order for ${order.quantity_kg}kg from the ${pool.constituency} pool has been accepted. Admin will coordinate pickup with contributing farmers.`,
      });
      // Auto-expand contributors so admin can immediately notify farmers
      setExpandedOrder(order.id);
      toggleContributors({ ...order, id: order.id, constituency_pools: pool });
    }
    if (status === "rejected") {
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "rejected",
        title: "Pool order declined ❌",
        message: `Your order from the ${order.constituency_pools?.constituency} pool could not be fulfilled. Browse other listings on the marketplace.`,
      });
    }
    if (status === "completed") {
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "completed",
        title: "Pool order completed 🎉",
        message: `Your order from the ${order.constituency_pools?.constituency} pool is complete. Thank you for trading on AvoConnect!`,
      });
    }
    load();
  }

  const STATUS_COLORS_LOOKUP = {
    pending: { bg: "#FEF3C7", text: "#92400E" },
    accepted: { bg: "#D1FAE5", text: "#065F46" },
    rejected: { bg: "#FEE2E2", text: "#991B1B" },
    completed: { bg: "#E0E7FF", text: "#3730A3" },
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["pending","accepted","completed","rejected"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "7px 16px", borderRadius: 99, fontSize: 13, cursor: "pointer", border: "none", fontFamily: "Inter, sans-serif", fontWeight: filter === s ? 600 : 400, background: filter === s ? t.purple : t.brownLight, color: filter === s ? t.white : t.textMuted }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <p style={{ color: t.textMuted }}>No {filter} pool orders.</p>
        </div>
      ) : orders.map(o => (
        <div key={o.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 10, boxShadow: t.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>🤝 {o.constituency_pools?.constituency} Pool</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>Buyer: {o.profiles?.name} · 📞 {o.profiles?.phone}</div>
            </div>
            <Badge label={o.status} bg={STATUS_COLORS_LOOKUP[o.status]?.bg} color={STATUS_COLORS_LOOKUP[o.status]?.text} />
          </div>
          <div style={{ background: t.cream, borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13 }}>
            {o.quantity_kg}kg {o.constituency_pools?.variety} · Ksh {o.price_per_kg}/kg · Total: Ksh {(o.quantity_kg * o.price_per_kg).toLocaleString()}
            {o.message && <div style={{ fontStyle: "italic", color: t.textMuted, marginTop: 6 }}>"{o.message}"</div>}
          </div>
          {o.status === "pending" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => updateStatus(o, "rejected")} style={btn("none", t.red, "1px solid #FCA5A5")}>Decline</button>
              <button onClick={() => updateStatus(o, "accepted")} style={{ ...btn(t.green, t.white), flex: 1 }}>Accept</button>
            </div>
          )}
          {o.status === "accepted" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => toggleContributors(o)} style={{ ...btn("none", t.purple, `1px solid ${t.purple}`), flex: 1 }}>
                  {expandedOrder === o.id ? "▲ Hide farmers" : "📲 Manage contributing farmers"}
                </button>
              </div>
              {expandedOrder === o.id && (
                <div style={{ background: t.cream, borderRadius: 10, padding: 12, border: `1px solid ${t.border}`, marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>
                    Notify each farmer on WhatsApp, then mark Delivered or No-show once pickup is done.
                  </p>
                  {contributorsLoading && !contributors[o.id] ? (
                    <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 10 }}>Loading farmers…</p>
                  ) : (contributors[o.id] || []).length === 0 ? (
                    <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 10 }}>No contributing farmers found for this pool.</p>
                  ) : (contributors[o.id] || []).map(c => (
                    <div key={c.id} style={{ background: t.white, borderRadius: 8, padding: "8px 10px", marginBottom: 6, border: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{c.profiles?.name || "Unknown farmer"} <span style={{ fontSize: 10, color: t.purple, background: t.purpleLight || "#EDE9FE", padding: "1px 6px", borderRadius: 6, marginLeft: 4 }}>Grade {c.quality_grade || "A"}</span></div>
                          <div style={{ fontSize: 11, color: t.textMuted }}>📞 {c.profiles?.phone} · {c.quantity_kg}kg contributed</div>
                        </div>
                        {c.profiles?.phone && (
                          <a href={buildWhatsAppLink(c.profiles.phone, c.profiles.name, o)} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#25D366", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                            💬
                          </a>
                        )}
                      </div>
                      {c.delivered === null || c.delivered === undefined ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => markFarmerDelivery(o, c, false)} style={{ flex: 1, padding: "6px", background: "none", border: "1px solid #FCA5A5", borderRadius: 6, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>❌ No-show</button>
                          <button onClick={() => markFarmerDelivery(o, c, true)} style={{ flex: 1, padding: "6px", background: t.green, border: "none", borderRadius: 6, color: t.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✅ Delivered</button>
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: c.delivered ? t.green : t.red, padding: 4 }}>
                          {c.delivered ? "✅ Delivered" : "❌ Marked no-show — strike applied"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => updateStatus(o, "completed")} style={{ ...btn("#6366F1", t.white), width: "100%" }}>Mark order completed</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Visit Requests Tab ─────────────────────────────────────────
function VisitRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_visit");
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [visitFarmers, setVisitFarmers] = useState({});
  const [farmersLoading, setFarmersLoading] = useState(false);

  useEffect(() => { load(); setExpandedRequest(null); }, [filter]);

  async function load() {
    setLoading(true);
    // Auto-expire any requests past their expiry before showing the list
    await autoExpireOld();
    const { data } = await supabase
      .from("pool_visit_requests")
      .select("*, constituency_pools(constituency, county, variety), profiles!pool_visit_requests_buyer_id_fkey(name, phone)")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  async function autoExpireOld() {
    const { data: overdue } = await supabase
      .from("pool_visit_requests")
      .select("id, pool_id")
      .eq("status", "pending_visit")
      .lt("expires_at", new Date().toISOString());

    if (!overdue || overdue.length === 0) return;

    for (const req of overdue) {
      await supabase.from("pool_visit_requests").update({ status: "expired", resolved_at: new Date().toISOString() }).eq("id", req.id);

      const { data: linkedFarmers } = await supabase
        .from("pool_visit_farmers").select("contribution_id").eq("visit_request_id", req.id);
      const contributionIds = (linkedFarmers || []).map(f => f.contribution_id);
      if (contributionIds.length > 0) {
        await supabase.from("pool_contributions").update({ status: "active" }).in("id", contributionIds);
        const { data: remaining } = await supabase
          .from("pool_contributions").select("quantity_kg").eq("pool_id", req.pool_id).eq("status", "active");
        const newTotal = (remaining || []).reduce((s, c) => s + (c.quantity_kg || 0), 0);
        await supabase.from("constituency_pools").update({ total_kg: newTotal }).eq("id", req.pool_id);
      }
    }
  }

  async function toggleFarmers(request) {
    if (expandedRequest === request.id) { setExpandedRequest(null); return; }
    setExpandedRequest(request.id);
    if (visitFarmers[request.id]) return;
    setFarmersLoading(true);
    const { data } = await supabase
      .from("pool_visit_farmers")
      .select("*, profiles!pool_visit_farmers_farmer_id_fkey(name, phone, county)")
      .eq("visit_request_id", request.id);
    setVisitFarmers(prev => ({ ...prev, [request.id]: data || [] }));
    setFarmersLoading(false);
  }

  async function notifyFarmerInApp(visitFarmer, request) {
    const pool = request.constituency_pools;
    await supabase.from("notifications").insert({
      user_id: visitFarmer.farmer_id,
      type: "order",
      title: "Buyer interested in your avocados 🚜",
      message: `A buyer (${request.profiles?.name || "verified buyer"}) wants to visit and inspect your ${visitFarmer.quantity_kg}kg in the ${pool?.constituency} pool. Admin will contact you on WhatsApp with the visit date.`,
    });
    await supabase.from("pool_visit_farmers").update({ notified: true }).eq("id", visitFarmer.id);
    setVisitFarmers(prev => ({
      ...prev,
      [request.id]: (prev[request.id] || []).map(f => f.id === visitFarmer.id ? { ...f, notified: true } : f)
    }));
  }

  function buildVisitWhatsAppLink(farmerPhone, farmerName, request) {
    const pool = request.constituency_pools;
    const cleanPhone = farmerPhone.replace(/\D/g, "").replace(/^0/, "254");
    const message =
`Habari ${farmerName?.split(" ")[0] || ""}! 🥑

Mnunuzi (buyer) anataka kuja kuangalia avocados zako za ${pool?.variety} katika pool ya ${pool?.constituency}.

Buyer: ${request.profiles?.name}
📞 Watakupigia simu kupanga siku ya kuja.

Tafadhali jiandae — avocados zako zikiwa tayari na nzuri kuonyeshwa.

— AvoConnect Admin`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  async function confirmSold(request) {
    if (!confirm(`Confirm buyer ${request.profiles?.name} is buying ${request.total_selected_kg}kg from this visit?`)) return;

    await supabase.from("pool_visit_requests").update({ status: "confirmed_sold", resolved_at: new Date().toISOString() }).eq("id", request.id);

    const { data: linkedFarmers } = await supabase
      .from("pool_visit_farmers").select("*, profiles!pool_visit_farmers_farmer_id_fkey(name, phone)").eq("visit_request_id", request.id);

    const contributionIds = (linkedFarmers || []).map(f => f.contribution_id);
    if (contributionIds.length > 0) {
      await supabase.from("pool_contributions").update({ status: "sold", delivered: true, delivery_marked_at: new Date().toISOString() }).in("id", contributionIds);
    }

    for (const f of linkedFarmers || []) {
      await supabase.from("notifications").insert({
        user_id: f.farmer_id, type: "completed",
        title: "Your avocados were sold! 🎉",
        message: `${request.profiles?.name} confirmed buying your ${f.quantity_kg}kg from the ${request.constituency_pools?.constituency} pool. Admin will coordinate payment and pickup.`,
      });
    }

    load();
  }

  async function cancelRequest(request) {
    if (!confirm("Cancel this visit request and return farmers to the general pool?")) return;
    await supabase.from("pool_visit_requests").update({ status: "expired", resolved_at: new Date().toISOString() }).eq("id", request.id);

    const { data: linkedFarmers } = await supabase
      .from("pool_visit_farmers").select("contribution_id").eq("visit_request_id", request.id);
    const contributionIds = (linkedFarmers || []).map(f => f.contribution_id);
    if (contributionIds.length > 0) {
      await supabase.from("pool_contributions").update({ status: "active" }).in("id", contributionIds);
      const { data: remaining } = await supabase
        .from("pool_contributions").select("quantity_kg").eq("pool_id", request.pool_id).eq("status", "active");
      const newTotal = (remaining || []).reduce((s, c) => s + (c.quantity_kg || 0), 0);
      await supabase.from("constituency_pools").update({ total_kg: newTotal }).eq("id", request.pool_id);
    }
    load();
  }

  async function extendRequest(request) {
    if (request.extended) { alert("This request has already been extended once."); return; }
    const newExpiry = new Date(new Date(request.expires_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("pool_visit_requests").update({ expires_at: newExpiry, extended: true }).eq("id", request.id);
    load();
  }

  function timeRemaining(expiresAt) {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h left`;
  }

  const STATUS_LOOKUP = {
    pending_visit:  { bg: t.amberLight, text: "#92400E", label: "Pending visit" },
    confirmed_sold: { bg: t.greenLight, text: t.greenDark, label: "Confirmed sold" },
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
          <p style={{ color: t.textMuted }}>No {STATUS_LOOKUP[filter]?.label.toLowerCase()} visit requests.</p>
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
              <div style={{ marginTop: 6, fontWeight: 600, color: timeRemaining(r.expires_at) === "Expired" ? t.red : t.amberDark || "#92400E" }}>
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

// ── Main AdminPage ─────────────────────────────────────────────
export default function AdminPage({ profile }) {
  const [tab, setTab] = useState("pending");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => { loadPendingCount(); }, []);

  async function loadPendingCount() {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
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
      {tab === "pools"     && <PoolOrdersTab />}
      {tab === "visits"    && <VisitRequestsTab />}
      {tab === "stats"     && <StatsTab />}
    </div>
  );
}