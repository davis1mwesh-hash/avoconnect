import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import FarmDiary from "./FarmDiary";
import AdminPage from "./AdminPage";
import ReviewModal from "./ReviewModal";
import Resources from "./Resources";
import CompanyDashboard from "./CompanyDashboard";
import CoopDashboard from "./CoopDashboard";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const t = {
  green: "#2D7A4F",
  greenDark: "#1A5C35",
  greenLight: "#EAF4EE",
  greenMid: "#4CAF78",
  brown: "#6B4C2A",
  brownLight: "#F5EFE6",
  brownMid: "#C4965A",
  cream: "#FDFAF5",
  white: "#FFFFFF",
  text: "#1C1C1A",
  textMuted: "#6B6B5F",
  border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  shadowHover: "0 8px 24px rgba(0,0,0,.10)",
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: ${t.cream}; color: ${t.text}; }
  input, select, textarea, button { font-family: 'Inter', sans-serif; }
  button { cursor: pointer; }
  .serif { font-family: 'Playfair Display', serif; }
  ::placeholder { color: #A8A39A; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${t.green} !important; box-shadow: 0 0 0 3px rgba(45,122,79,.1); }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
`;

const COUNTIES = ["Nakuru","Nairobi","Kiambu","Murang'a","Nyeri","Meru","Kirinyaga","Embu","Kisii","Bomet","Nandi","Uasin Gishu"];
const VARIETIES = ["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"];
const STATUS_COLORS = {
  pending:   { bg: "#FEF3C7", text: "#92400E" },
  accepted:  { bg: "#D1FAE5", text: "#065F46" },
  rejected:  { bg: "#FEE2E2", text: "#991B1B" },
  completed: { bg: "#E0E7FF", text: "#3730A3" },
};

const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text, transition: "border .15s, box-shadow .15s" };
const btn = (bg, color, border) => ({ padding: "11px 24px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "opacity .15s" });

// ── Notification Bell ─────────────────────────────────────────
function NotificationBell({ profile }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!profile) return;
    loadNotifications();
    const channel = supabase
      .channel("notifications:" + profile.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markOneRead(id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const typeIcon = (type) => ({ order: "📦", accepted: "✅", rejected: "❌", completed: "🎉" }[type] || "🔔");

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <style>{css}</style>

      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead(); }}
        style={{ position: "relative", background: "none", border: `1px solid ${t.border}`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, color: t.textMuted, fontSize: 18 }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#EF4444", color: "#fff",
            fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
            borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: `2px solid ${t.white}`,
            animation: "pulse 1.5s ease-in-out 3",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 340, background: t.white, border: `1px solid ${t.border}`,
          borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
          zIndex: 999, animation: "slideDown .15s ease",
          maxHeight: 480, overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, color: t.green, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <p style={{ fontSize: 13, color: t.textMuted }}>No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markOneRead(n.id)}
                style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${t.border}`,
                  background: n.is_read ? t.white : t.greenLight,
                  cursor: "default",
                  transition: "background .2s",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{typeIcon(n.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: 13, marginBottom: 3, color: t.text }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 5 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.green, flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────
function Nav({ setPage, profile, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function go(page) {
    setPage(page);
    setMenuOpen(false);
  }

  return (
    <>
      <nav style={{
        background: t.white, 
        borderBottom: `1px solid ${t.border}`,
        height: 62, 
        position: "sticky", 
        top: 0, 
        zIndex: 100,
        boxShadow: t.shadow, 
        display: "flex", 
        alignItems: "center",
        justifyContent: "space-between", 
        padding: "0 20px" 
      }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: 100 }}>
          {profile ? (
            <button onClick={() => setMenuOpen(true)}
              style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 18, color: t.text, display: "flex", alignItems: "center", gap: 8 }}>
              ☰
              {profile && <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>{profile.name?.split(" ")[0]}</span>}
            </button>
          ) : (
            <button onClick={() => go("login")}
              style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), padding: "7px 16px" }}>
              Log in
            </button>
          )}
        </div>

        <div onClick={() => go("home")} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${t.green}, ${t.greenDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>🥑</span>
            </div>
            <span className="serif" style={{ fontSize: 22, color: t.text, letterSpacing: "-.3px" }}>AvoConnect</span>
          </div>
          <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "1px", marginTop: -2 }}>KENYA'S AVOCADO MARKETPLACE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, minWidth: 100 }}>
          {profile ? (
            <NotificationBell profile={profile} />
          ) : (
            <button onClick={() => go("signup")}
              style={{ ...btn(t.green, t.white), padding: "7px 18px" }}>
              Join free
            </button>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200, transition: "opacity .2s" }} />
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
        background: t.white, zIndex: 201, boxShadow: "-8px 0 40px rgba(0,0,0,.12)",
        transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform .25s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {profile ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 16, color: t.text, marginBottom: 2 }}>👋 {profile.name}</div>
                <div style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500,
                    background: profile.role === "farmer" ? t.greenLight : profile.role === "cooperative" ? "#FEF3C7" : profile.role === "company" ? "#EDE9FE" : "#DBEAFE",
                    color: profile.role === "farmer" ? t.greenDark : profile.role === "cooperative" ? "#92400E" : profile.role === "company" ? "#5B21B6" : "#1E40AF",
                  }}>
                    {profile.role === "farmer" ? "🌱 Farmer" : profile.role === "cooperative" ? "🤝 Cooperative" : profile.role === "company" ? "🏢 Company" : "🏪 Buyer"}
                  </span>
                  <span>{profile.county}</span>
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 600, fontSize: 16, color: t.text }}>Menu</div>
            )}
          </div>
          <button onClick={() => setMenuOpen(false)}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: t.textMuted, padding: 4 }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: "12px 0" }}>
          <MenuItem icon="🏠" label="Marketplace" onClick={() => go("home")} />
          <MenuItem icon="🌿" label="Resources" onClick={() => go("resources")} />

          {profile?.role === "farmer" && (
            <>
              <SidebarSection label="FARMER" />
              <MenuItem icon="📊" label="My Dashboard" onClick={() => go("dashboard")} />
              <MenuItem icon="📓" label="Farm Diary" onClick={() => go("diary")} />
              {profile.verified && !profile.suspended && (
                <MenuItem icon="➕" label="List avocados" onClick={() => go("list")} highlight />
              )}
            </>
          )}

          {profile?.role === "cooperative" && (
            <>
              <SidebarSection label="COOPERATIVE" />
              <MenuItem icon="🤝" label="My Cooperative" onClick={() => go("coop-dashboard")} />
              {profile.verified && !profile.suspended && (
                <MenuItem icon="➕" label="List avocados" onClick={() => go("list")} highlight />
              )}
            </>
          )}

          {profile?.role === "buyer" && (
            <>
              <SidebarSection label="BUYER" />
              <MenuItem icon="🏪" label="Browse listings" onClick={() => go("home")} />
            </>
          )}

          {profile?.role === "company" && (
            <>
              <SidebarSection label="COMPANY" />
              <MenuItem icon="🏢" label="My Listings" onClick={() => go("company-dashboard")} />
            </>
          )}

          {profile?.phone === "0710701013" && (
            <>
              <SidebarSection label="ADMIN" />
              <MenuItem icon="⚙️" label="Admin Panel" onClick={() => go("admin")} />
            </>
          )}

          {!profile && (
            <>
              <SidebarSection label="ACCOUNT" />
              <MenuItem icon="🔑" label="Log in" onClick={() => go("login")} />
              <MenuItem icon="✨" label="Join free" onClick={() => go("signup")} highlight />
            </>
          )}
        </div>

        {profile && (
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${t.border}` }}>
            <button onClick={() => { onSignOut(); setMenuOpen(false); }}
              style={{ width: "100%", padding: "11px", background: t.brownLight, color: t.brown, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function MenuItem({ icon, label, onClick, highlight }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px", background: hover ? (highlight ? t.greenLight : t.brownLight) : highlight ? `${t.greenLight}80` : "none",
        border: "none", cursor: "pointer", textAlign: "left", fontFamily: "Inter, sans-serif",
        transition: "background .15s",
      }}>
      <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: highlight ? 600 : 400, color: highlight ? t.greenDark : t.text }}>{label}</span>
      {highlight && <span style={{ marginLeft: "auto", fontSize: 12, color: t.green }}>→</span>}
    </button>
  );
}

// ── Home ─────────────────────────────────────────────────────
function SidebarSection({ label }) {
  return (
    <div style={{ padding: "10px 20px 4px", fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: "1px" }}>
      {label}
    </div>
  );
}

function Home({ setPage }) {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [variety, setVariety] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("listings")
        .select("*, profiles!inner(name, phone, county, suspended, verified)")
        .eq("is_active", true)
        .eq("profiles.suspended", false)
        .eq("profiles.verified", true)
        .order("created_at", { ascending: false });
      if (variety !== "All") query = query.eq("variety", variety);
      const { data } = await query;
      setListings(data || []);
      setLoading(false);
    }
    load();
  }, [variety]);

  const filtered = listings.filter(l =>
    l.county?.toLowerCase().includes(search.toLowerCase()) ||
    l.variety?.toLowerCase().includes(search.toLowerCase()) ||
    l.profiles?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${t.greenDark} 0%, ${t.green} 60%, ${t.greenMid} 100%)`, padding: "56px 24px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "rgba(255,255,255,.15)", color: "#fff", padding: "5px 14px", borderRadius: 99, marginBottom: 20, letterSpacing: ".5px" }}>
            🌍 Connecting Kenya's avocado farmers & buyers
          </div>
          <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.15, color: "#fff", marginBottom: 14, letterSpacing: "-.5px" }}>
            From farm to buyer.<br/>Fair prices, direct.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.8)", marginBottom: 32, lineHeight: 1.7 }}>
            No middlemen. No price guessing. Just farmers and buyers connecting directly across Kenya.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by county, variety or farmer name…"
              style={{ flex: 1, minWidth: 240, padding: "13px 18px", border: "none", borderRadius: 12, fontSize: 14, background: "rgba(255,255,255,.95)", color: t.text, boxShadow: "0 4px 16px rgba(0,0,0,.15)" }} />
            <select value={variety} onChange={e => setVariety(e.target.value)}
              style={{ padding: "13px 16px", border: "none", borderRadius: 12, fontSize: 14, background: "rgba(255,255,255,.95)", color: t.text, boxShadow: "0 4px 16px rgba(0,0,0,.15)" }}>
              <option value="All">All varieties</option>
              {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ background: t.brownLight, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {[["🌱 1,240+", "Registered farmers"], ["🏪 84", "Verified buyers"], ["📈 Ksh 28–38", "Price range today /kg"]].map(([val, label]) => (
            <div key={label} style={{ padding: "16px 0", textAlign: "center", borderRight: `1px solid ${t.border}` }}>
              <div className="serif" style={{ fontSize: 18, color: t.brown, marginBottom: 2 }}>{val}</div>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: ".3px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="serif" style={{ fontSize: 22, color: t.text }}>Available now <span style={{ fontSize: 14, color: t.textMuted, fontFamily: "Inter" }}>({filtered.length} listings)</span></h2>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🥑</div>
            <p>Loading listings…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p style={{ color: t.textMuted, marginBottom: 16 }}>No listings yet. Be the first to post!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px,1fr))", gap: 16 }}>
            {filtered.map(l => (
              <div key={l.id} onClick={() => setPage({ name: "listing", data: l })}
                style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, cursor: "pointer", transition: "box-shadow .2s, transform .2s", boxShadow: t.shadow }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = t.shadowHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = t.shadow; e.currentTarget.style.transform = "none"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, background: t.greenLight, color: t.greenDark, padding: "3px 12px", borderRadius: 99, fontWeight: 500, letterSpacing: ".3px" }}>{l.variety}</span>
                  <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 3 }}>📍 {l.county}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: t.text }}>{l.profiles?.name}</div>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>🧺 {l.quantity_kg?.toLocaleString()} kg</span>
                  <span>📅 {l.harvest_date}</span>
                  <span>✅ {l.certification}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 700, color: t.greenDark }}>Ksh {l.price_per_kg}</span>
                    <span style={{ fontSize: 12, color: t.textMuted }}> /kg</span>
                  </div>
                  <button style={{ ...btn(t.greenLight, t.greenDark, "none"), padding: "8px 16px", fontSize: 13 }}>View & order →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Listing Detail ────────────────────────────────────────────
function ListingDetail({ listing: l, setPage, profile }) {
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
    if (buyerProfile?.suspended) { setError("Your account is suspended. Contact support."); setLoading(false); return; }
    if (!buyerProfile?.verified) { setError("Your account is pending verification. You can place orders once approved."); setLoading(false); return; }
    const { error } = await supabase.from("orders").insert({
      listing_id: l.id, farmer_id: l.farmer_id, buyer_id: profile.id,
      quantity_kg: qty, price_per_kg: l.price_per_kg, message: msg,
    });
    setLoading(false);
    if (error) { setError("Failed to place order. Try again."); return; }
    setOrdered(true);
  }

  if (ordered) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 32, textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: t.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✅</div>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 10 }}>Order sent!</h2>
      <p style={{ color: t.textMuted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
        {l.profiles?.name} will contact you on <strong>{l.profiles?.phone}</strong> to confirm.<br/>
        Total: <strong style={{ color: t.greenDark }}>Ksh {(qty * l.price_per_kg).toLocaleString()}</strong>
      </p>
      <button onClick={() => setPage("home")} style={{ ...btn(t.green, t.white), padding: "12px 32px" }}>Back to marketplace</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 580, margin: "0 auto", padding: "28px 16px" }}>
      <button onClick={() => setPage("home")} style={{ fontSize: 13, color: t.textMuted, background: "none", border: "none", marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Back to listings</button>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, overflow: "hidden", boxShadow: t.shadow }}>
        <div style={{ background: `linear-gradient(135deg, ${t.greenLight}, ${t.brownLight})`, padding: "28px 24px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, background: t.greenLight, color: t.greenDark, padding: "3px 12px", borderRadius: 99, fontWeight: 500, display: "inline-block", marginBottom: 10 }}>{l.variety}</span>
              <h2 className="serif" style={{ fontSize: 26, marginBottom: 4 }}>{l.variety} Avocados</h2>
              <p style={{ fontSize: 14, color: t.textMuted }}>{l.profiles?.name} · {l.county} County</p>
            </div>
            <div style={{ fontSize: 40 }}>🥑</div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {l.description && <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 20, lineHeight: 1.7, padding: "14px 16px", background: t.cream, borderRadius: 10 }}>{l.description}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[["🧺 Available", `${l.quantity_kg?.toLocaleString()} kg`], ["📅 Harvest", l.harvest_date], ["✅ Certification", l.certification], ["📞 Contact", l.profiles?.phone]].map(([k, v]) => (
              <div key={k} style={{ background: t.cream, borderRadius: 10, padding: "12px 14px", border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
            {profile?.role === "farmer" && (
              <div style={{ background: t.amberLight, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: t.amberDark, fontWeight: 500 }}>🌱 You are logged in as a farmer. Only buyers can place orders.</p>
              </div>
            )}
            <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 6, fontWeight: 500 }}>Order quantity (kg)</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} style={{ ...inp, marginBottom: 12 }} />
            <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 6, fontWeight: 500 }}>Message to farmer (optional)</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="e.g. Can you deliver to Nakuru packhouse?"
              style={{ ...inp, resize: "none", marginBottom: 20 }} />
            {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>Total estimate</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: t.greenDark }}>Ksh {(qty * l.price_per_kg).toLocaleString()}</div>
              </div>
              <button onClick={placeOrder} disabled={loading} style={{ ...btn(t.green, t.white), padding: "13px 32px", opacity: loading ? .7 : 1 }}>
                {loading ? "Sending…" : profile ? "Place order" : "Sign up to order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FarmerDashboard ───────────────────────────────────────────
function FarmerDashboard({ setPage, profile }) {
  const [tab, setTab] = useState("listings");
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editListing, setEditListing] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);

  // Unified Buyer Requirements Tracking State
  const [buyerRequirements, setBuyerRequirements] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: myListings } = await supabase.from("listings").select("*").eq("farmer_id", profile.id).order("created_at", { ascending: false });
    const { data: myOrders } = await supabase.from("orders").select("*, listings(variety, quantity_kg, price_per_kg), profiles!orders_buyer_id_fkey(name, phone)").eq("farmer_id", profile.id).order("created_at", { ascending: false });
    
    // Fetch target requirements posted by buyers
    const { data: requirements } = await supabase.from("buyer_requirements").select("*").order("created_at", { ascending: false });

    setListings(myListings || []);
    setOrders(myOrders || []);
    setBuyerRequirements(requirements || []);
    setLoading(false);
  }

  async function deleteListing(id) {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    setListings(prev => prev.filter(l => l.id !== id));
  }

  async function toggleActive(listing) {
    await supabase.from("listings").update({ is_active: !listing.is_active }).eq("id", listing.id);
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, is_active: !l.is_active } : l));
  }

  async function updateOrderStatus(orderId, status) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    await supabase.from("orders").update({ status }).eq("id", orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

    if (status === "accepted") {
      const listing = listings.find(l => l.id === order.listing_id);
      if (listing) {
        const remaining = (listing.quantity_kg || 0) - (order.quantity_kg || 0);
        const shouldDeactivate = remaining <= 0;
        const newQty = Math.max(0, remaining);
        await supabase.from("listings").update({ quantity_kg: newQty, is_active: !shouldDeactivate }).eq("id", listing.id);
        setListings(prev => prev.map(l => l.id === listing.id ? { ...l, quantity_kg: newQty, is_active: !shouldDeactivate } : l));
      }
      const varietyName = order.listings?.variety || "avocados";
      const totalKsh = (order.quantity_kg * order.price_per_kg).toLocaleString();
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "accepted", title: "Order accepted! ✅",
        message: `${profile.name} accepted your order for ${order.quantity_kg} kg of ${varietyName} (Ksh ${totalKsh}). They will contact you shortly.`,
      });
    }
    if (status === "rejected") {
      const varietyName = order.listings?.variety || "avocados";
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "rejected", title: "Order declined ❌",
        message: `${profile.name} was unable to fulfil your order for ${order.quantity_kg} kg of ${varietyName}. You can browse other listings on the marketplace.`,
      });
    }
    if (status === "completed") {
      const varietyName = order.listings?.variety || "avocados";
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "completed", title: "Order completed 🎉",
        message: `Your order of ${order.quantity_kg} kg of ${varietyName} from ${profile.name} has been marked as completed. Thank you for trading on AvoConnect!`,
      });
    }
  }

  async function saveEdit() {
    await supabase.from("listings").update({
      variety: editListing.variety, quantity_kg: Number(editListing.quantity_kg),
      price_per_kg: Number(editListing.price_per_kg), harvest_date: editListing.harvest_date,
      certification: editListing.certification, description: editListing.description,
    }).eq("id", editListing.id);
    setListings(prev => prev.map(l => l.id === editListing.id ? { ...l, ...editListing } : l));
    setEditListing(null);
  }

  // Saves the linked match to Supabase and pings the buyer's bell icon
  async function handleSendOfferToSupabase(requirementId, listingId) {
    const selectedReq = buyerRequirements.find(r => r.id === requirementId);
    const selectedList = listings.find(l => l.id === listingId);
    
    const { error } = await supabase.from("buyer_offers").insert({
      requirement_id: requirementId,
      listing_id: listingId,
      farmer_id: profile.id,
      status: 'pending'
    });

    if (error) {
      alert("You have already linked a listing to this specific buyer request!");
      return;
    }

    await supabase.from("notifications").insert({
      user_id: selectedReq.buyer_id,
      type: "pending",
      title: "New Farm Offer! 🥑",
      message: `${profile.name} offered ${selectedList.quantity_kg} kg of ${selectedList.variety} to satisfy your purchase requirement for ${selectedReq.company_name}.`
    });

    alert("Your farm listing has been cleanly linked to the buyer's request!");
  }

  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const totalRevenue = orders.filter(o => o.status === "accepted" || o.status === "completed").reduce((sum, o) => sum + (o.quantity_kg * o.price_per_kg), 0);

  if (editListing) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 16px" }}>
      <button onClick={() => setEditListing(null)} style={{ fontSize: 13, color: t.textMuted, background: "none", border: "none", marginBottom: 20 }}>← Back</button>
      <h2 className="serif" style={{ fontSize: 24, marginBottom: 20 }}>Edit listing</h2>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, boxShadow: t.shadow }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Variety</label>
            <select value={editListing.variety} onChange={e => setEditListing({ ...editListing, variety: e.target.value })} style={inp}>
              {VARIETIES.map(v => <option key={v}>{v}</option>)}
            </select></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Certification</label>
            <select value={editListing.certification} onChange={e => setEditListing({ ...editListing, certification: e.target.value })} style={inp}>
              {["None","GlobalG.A.P","KEPHIS","Organic","KS EAS 12"].map(c => <option key={c}>{c}</option>)}
            </select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Quantity (kg)</label>
            <input type="number" value={editListing.quantity_kg} onChange={e => setEditListing({ ...editListing, quantity_kg: e.target.value })} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Price (Ksh/kg)</label>
            <input type="number" value={editListing.price_per_kg} onChange={e => setEditListing({ ...editListing, price_per_kg: e.target.value })} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Harvest date</label>
          <input type="date" value={editListing.harvest_date} onChange={e => setEditListing({ ...editListing, harvest_date: e.target.value })} style={inp} /></div>
        <div style={{ marginBottom: 20 }}><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
          <textarea value={editListing.description} onChange={e => setEditListing({ ...editListing, description: e.target.value })} rows={3} style={{ ...inp, resize: "none" }} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditListing(null)} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), flex: 1 }}>Cancel</button>
          <button onClick={saveEdit} style={{ ...btn(t.green, t.white), flex: 2 }}>Save changes</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Tab Navigation Menu Header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: `1px solid ${t.border}`, paddingBottom: 12 }}>
        <button 
          onClick={() => setTab("listings")} 
          style={{ background: "none", border: "none", fontSize: 15, fontWeight: tab === "listings" ? 600 : 400, color: tab === "listings" ? t.green : t.textMuted, cursor: "pointer", borderBottom: tab === "listings" ? `2px solid ${t.green}` : "none", paddingBottom: 12 }}
        >
          My Listings ({listings.length})
        </button>
        <button 
          onClick={() => setTab("orders")} 
          style={{ background: "none", border: "none", fontSize: 15, fontWeight: tab === "orders" ? 600 : 400, color: tab === "orders" ? t.green : t.textMuted, cursor: "pointer", borderBottom: tab === "orders" ? `2px solid ${t.green}` : "none", paddingBottom: 12 }}
        >
          Incoming Orders {pendingOrders > 0 && `(${pendingOrders})`}
        </button>
        <button 
          onClick={() => setTab("buyer_requests")} 
          style={{ background: "none", border: "none", fontSize: 15, fontWeight: tab === "buyer_requests" ? 600 : 400, color: tab === "buyer_requests" ? t.green : t.textMuted, cursor: "pointer", borderBottom: tab === "buyer_requests" ? `2px solid ${t.green}` : "none", paddingBottom: 12 }}
        >
          💼 Browse Buyer Requirements ({buyerRequirements.length})
        </button>
      </div>

      {/* VIEW PANEL 1: Active Farmer Listings */}
      {tab === "listings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <h1 className="serif" style={{ fontSize: 30, marginBottom: 4 }}>My Dashboard</h1>
              <p style={{ fontSize: 14, color: t.textMuted }}>{profile.name} · {profile.county} County</p>
            </div>
            <button onClick={() => setPage("list")} style={{ ...btn(t.green, t.white), padding: "10px 20px" }}>+ New listing</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
            {[["Listings", listings.length, "total posted", "🌿"], ["New Orders", pendingOrders, "awaiting action", "📦"], ["Revenue", `Ksh ${totalRevenue.toLocaleString()}`, "from accepted orders", "💰"]].map(([label, value, sub, icon]) => (
              <div key={label} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: t.shadow }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div className="serif" style={{ fontSize: 26, color: t.green, marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{sub}</div>
              </div>
            ))}
          </div>

          {loading ? <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p> :
            listings.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                <p style={{ color: t.textMuted, marginBottom: 16 }}>No listings yet.</p>
                <button onClick={() => setPage("list")} style={{ ...btn(t.green, t.white), padding: "10px 24px" }}>Post your first listing</button>
              </div>
            ) : listings.map(l => (
              <div key={l.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 10, boxShadow: t.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, background: t.greenLight, color: t.greenDark, padding: "2px 10px", borderRadius: 99, fontWeight: 500 }}>{l.variety}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: l.is_active ? "#D1FAE5" : "#F3F4F6", color: l.is_active ? "#065F46" : t.textMuted }}>{l.is_active ? "● Active" : "● Hidden"}</span>
                      {l.quantity_kg === 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#FEE2E2", color: "#991B1B" }}>● Sold out</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{l.quantity_kg?.toLocaleString()} kg · Ksh {l.price_per_kg}/kg</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>Harvest: {l.harvest_date} · {l.certification}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => toggleActive(l)} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), padding: "6px 12px", fontSize: 12 }}>{l.is_active ? "Hide" : "Show"}</button>
                    <button onClick={() => setEditListing(l)} style={{ ...btn("none", t.green, `1px solid ${t.green}`), padding: "6px 12px", fontSize: 12 }}>Edit</button>
                    <button onClick={() => deleteListing(l.id)} style={{ ...btn("none", "#EF4444", "1px solid #FCA5A5"), padding: "6px 12px", fontSize: 12 }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* VIEW PANEL 2: Incoming Orders */}
      {tab === "orders" && (
        <div>
          {loading ? <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p> :
            orders.length === 0 ? (
              <p style={{ textAlign: "center", color: t.textMuted, padding: 48 }}>No orders received yet.</p>
            ) : orders.map(o => (
              <div key={o.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 10, boxShadow: t.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{o.profiles?.name}</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>📞 {o.profiles?.phone}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.text, fontWeight: 500, textTransform: "capitalize" }}>{o.status}</span>
                </div>
                <div style={{ background: t.cream, borderRadius: 10, padding: "12px 14px", marginBottom: 12, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><strong>{o.listings?.variety}</strong> · {o.quantity_kg} kg · Ksh {o.price_per_kg}/kg</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.greenDark }}>Total: Ksh {(o.quantity_kg * o.price_per_kg).toLocaleString()}</div>
                  {o.message && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6, fontStyle: "italic" }}>"{o.message}"</div>}
                </div>
                {o.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => updateOrderStatus(o.id, "rejected")} style={{ ...btn("none", "#EF4444", "1px solid #FCA5A5"), flex: 1, padding: "9px" }}>Decline</button>
                    <button onClick={() => updateOrderStatus(o.id, "accepted")} style={{ ...btn(t.green, t.white), flex: 2, padding: "9px" }}>Accept order ✓</button>
                  </div>
                )}
                {o.status === "accepted" && o.expires_at && (() => {
                  const remaining = Math.max(0, new Date(o.expires_at) - Date.now());
                  const hrs = Math.floor(remaining / 3600000);
                  const mins = Math.floor((remaining % 3600000) / 60000);
                  return remaining > 0 ? (
                    <div style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                      ⏱ Buyer has {hrs}h {mins}m to confirm pickup
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#991B1B", background: "#FEE2E2", padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                      ⛔ Order expired — mark as no-show if buyer didn't arrive
                    </div>
                  );
                })()}
                {o.status === "accepted" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => updateOrderStatus(o.id, "no_show")} style={{ ...btn("none", "#F59E0B", "1px solid #FCD34D"), flex: 1, padding: "9px", fontSize: 13 }}>⚠️ No-show</button>
                    <button onClick={() => updateOrderStatus(o.id, "completed")} style={{ ...btn("#6366F1", t.white), flex: 2, padding: "9px" }}>✓ Mark completed</button>
                  </div>
                )}
                {o.status === "completed" && (
                  <button onClick={() => setReviewOrder(o)} style={{ ...btn(t.greenLight, t.greenDark, "none"), width: "100%", padding: "9px", fontSize: 13, marginTop: 8 }}>
                    ⭐ Leave review for buyer
                  </button>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* VIEW PANEL 3: Active Buyer Requests Board */}
      {tab === "buyer_requests" && (
        <div style={{ padding: "12px 0" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: t.text }}>Active Buyer Demands</h2>
          {buyerRequirements.length === 0 ? (
            <p style={{ fontSize: 13, color: t.textMuted }}>No companies are currently listing buying targets.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {buyerRequirements.map((req) => (
                <div key={req.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>{req.company_name}</h3>
                        <span style={{ fontSize: 12, color: t.textMuted }}>📍 {req.preferred_location}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: t.green }}>Ksh {req.target_price_per_kg}</span>
                        <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>per kg</p>
                      </div>
                    </div>
                    <hr style={{ border: "none", borderTop: `1px solid ${t.border}`, margin: "12px 0" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: t.text }}><strong>Variety Needed:</strong> {req.variety}</div>
                      <div style={{ fontSize: 13, color: t.text }}><strong>Min Volume:</strong> {req.min_quantity_kg ? req.min_quantity_kg.toLocaleString() : 0} kg</div>
                      {req.specifications && (
                        <div style={{ fontSize: 12, color: t.textMuted, background: t.greenLight, padding: "8px 12px", borderRadius: 8, marginTop: 4 }}>
                          📋 {req.specifications}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                    style={{ width: "100%", background: t.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Fulfill this Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* POPUP MODAL COMPONENT: Link Selection Box Overlay */}
      {isModalOpen && selectedRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: t.white, width: "100%", maxWidth: 440, borderRadius: 16, padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: t.text }}>Link Your Listing</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: t.textMuted }}>×</button>
            </div>
            <div style={{ background: t.greenLight, padding: 12, borderRadius: 10, fontSize: 13, color: t.text }}>
              Matching requirement from <strong>{selectedRequest.company_name}</strong>:<br />
              🌾 Looking for <strong>{selectedRequest.variety}</strong> (Min requirement: {selectedRequest.min_quantity_kg} kg)
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: t.text }}>Choose an available harvest lot:</label>
              {listings.filter(l => l.variety.toLowerCase() === selectedRequest.variety.toLowerCase() && l.is_active).length === 0 ? (
                <p style={{ fontSize: 13, color: "#EF4444" }}>⚠️ You don't have any active farm listings matching {selectedRequest.variety} right now.</p>
              ) : (
                <select 
                  id="listingSelectDropdown"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.white, color: t.text }}
                >
                  <option value="">-- Choose matching listing --</option>
                  {listings
                    .filter(l => l.variety.toLowerCase() === selectedRequest.variety.toLowerCase() && l.is_active)
                    .map(l => (
                      <option key={l.id} value={l.id}>{l.quantity_kg} kg Lot — (Ksh {l.price_per_kg}/kg)</option>
                    ))
                  }
                </select>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${t.border}`, background: "none", color: t.textMuted }}>Cancel</button>
              <button 
                onClick={async () => {
                  const el = document.getElementById("listingSelectDropdown");
                  if(!el || !el.value) return;
                  await handleSendOfferToSupabase(selectedRequest.id, el.value);
                  setIsModalOpen(false);
                }} 
                style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: t.green, color: "#fff", fontWeight: 600, cursor: "pointer" }}
              >
                Send Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          profile={profile}
          onClose={() => setReviewOrder(null)}
          onSaved={() => setReviewOrder(null)}
        />
      )}
    </div>
  );
}

// ── Signup ────────────────────────────────────────────────────
function Signup({ setPage, setProfile }) {
  const [role, setRole] = useState("farmer");
  const [form, setForm] = useState({ name: "", phone: "", county: "", password: "", email: "", buyerType: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.name || !form.phone || !form.county || !form.password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    const authEmail = form.email
      ? form.email.trim().toLowerCase()
      : `u${form.phone.replace(/\s/g, "").replace(/\+/g, "")}@avoconnect.ke`;
    const { data, error: e1 } = await supabase.auth.signUp({ email: authEmail, password: form.password });
    if (e1) { setError(e1.message); setLoading(false); return; }
    const { error: e2 } = await supabase.from("profiles").insert({
      id: data.user.id, name: form.name, phone: form.phone, county: form.county, role,
      email: form.email || null,
      buyer_type: form.buyerType || null, reg_number: form.reg_number || null,
      kra_pin: form.kra_pin || null, member_count: Number(form.member_count) || null,
      verified: role === "farmer" ? true : false,
    });
    if (e2) { setError(e2.message); setLoading(false); return; }
    setProfile({ id: data.user.id, name: form.name, phone: form.phone, county: form.county, role });
    setPage(role === "farmer" ? "dashboard" : role === "cooperative" ? "coop-dashboard" : "home");
  }

  return (
    <div style={{ maxWidth: 440, margin: "48px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🥑</div>
        <h1 className="serif" style={{ fontSize: 30, marginBottom: 6 }}>Join AvoConnect</h1>
        <p style={{ fontSize: 14, color: t.textMuted }}>Free to join. Start trading in minutes.</p>
      </div>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, boxShadow: t.shadow }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
          {[["farmer","🌱 I'm a Farmer"],["buyer","🏪 I'm a Buyer"],["company","🏢 I'm a Company"],["cooperative","🤝 I'm a Cooperative"]].map(([r, label]) => (
            <button key={r} onClick={() => setRole(r)}
              style={{ padding: 14, border: `2px solid ${role === r ? t.green : t.border}`, borderRadius: 12, background: role === r ? t.greenLight : "none", color: role === r ? t.greenDark : t.textMuted, fontSize: 13, fontWeight: 600, transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>
        {[["Full name", "name", "text"], ["Phone number", "phone", "tel"], ["Password", "password", "password"]].map(([label, key, type]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={label} style={inp} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Email address <span style={{ color: t.textMuted, fontWeight: 400 }}>(for password reset)</span></label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>County</label>
          <select value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} style={inp}>
            <option value="">Select your county</option>
            {COUNTIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {role === "cooperative" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Cooperative Registration Number</label>
              <input value={form.reg_number || ""} onChange={e => setForm({ ...form, reg_number: e.target.value })} placeholder="e.g. CPO/2019/001234" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>KRA PIN</label>
              <input value={form.kra_pin || ""} onChange={e => setForm({ ...form, kra_pin: e.target.value })} placeholder="e.g. P051234567T" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Number of members</label>
              <input type="number" value={form.member_count || ""} onChange={e => setForm({ ...form, member_count: e.target.value })} placeholder="e.g. 45" style={inp} />
            </div>
            <div style={{ marginBottom: 14, padding: "12px 14px", background: t.greenLight, borderRadius: 10, border: `1px solid ${t.green}30` }}>
              <p style={{ fontSize: 13, color: t.greenDark, lineHeight: 1.6 }}>
                🤝 Your cooperative will be reviewed and verified before going live. This usually takes 1–2 business days.
              </p>
            </div>
          </>
        )}
        {error && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{ ...btn(t.green, t.white), width: "100%", padding: 13, fontSize: 15, opacity: loading ? .7 : 1 }}>
          {loading ? "Creating your account…" : "Create account →"}
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: t.textMuted, marginTop: 16 }}>
          Already have an account? <span onClick={() => setPage("login")} style={{ color: t.green, cursor: "pointer", fontWeight: 500 }}>Log in</span>
        </p>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────
function Login({ setPage, setProfile }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function login() {
    if (!phone || !password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");

    const { data: p } = await supabase
      .from("profiles")
      .select("email")
      .eq("phone", phone.trim())
      .maybeSingle();

    const authEmail = p?.email 
      ? p.email 
      : `u${phone.replace(/\s/g, "").replace(/\+/g, "")}@avoconnect.ke`;

    const { data, error: e } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (e) { setError("Wrong phone or password. Please try again."); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    setProfile(profile);
    if (profile.role === "farmer") setPage("dashboard");
    else if (profile.role === "cooperative") setPage("coop-dashboard");
    else if (profile.role === "company") setPage("company-dashboard");
    else setPage("home");
  }

  async function sendReset() {
    if (!resetPhone) { setError("Please enter your phone number."); return; }
    setResetLoading(true); setError("");
    const { data: p } = await supabase
      .from("profiles")
      .select("email, phone")
      .eq("phone", resetPhone.trim())
      .maybeSingle();

    if (!p) { setError("No account found with that phone number."); setResetLoading(false); return; }

    const resetEmail = p.email || `u${resetPhone.replace(/\s/g, "").replace(/\+/g, "")}@avoconnect.ke`;
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "https://avoconnect.vercel.app",
    });
    setResetLoading(false);
    setResetSent(true);
  }

  if (forgot) return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
        <h2 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Reset password</h2>
        <p style={{ fontSize: 14, color: t.textMuted }}>Enter your phone number and we'll send a reset link to your email.</p>
      </div>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, boxShadow: t.shadow }}>
        {resetSent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <p style={{ fontSize: 15, color: t.text, marginBottom: 8, fontWeight: 500 }}>Reset link sent!</p>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 24, lineHeight: 1.6 }}>Check your email inbox for the password reset link. It may take a minute to arrive.</p>
            <button onClick={() => { setForgot(false); setResetSent(false); setResetPhone(""); }} style={{ ...btn(t.green, t.white), width: "100%", padding: 13 }}>Back to login</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Phone number</label>
              <input type="tel" value={resetPhone} onChange={e => setResetPhone(e.target.value)} placeholder="07XXXXXXXX" style={inp} />
            </div>
            {error && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</p>}
            <button onClick={sendReset} disabled={resetLoading} style={{ ...btn(t.green, t.white), width: "100%", padding: 13, marginBottom: 12, opacity: resetLoading ? .7 : 1 }}>
              {resetLoading ? "Sending…" : "Send reset link"}
            </button>
            <button onClick={() => { setForgot(false); setError(""); }} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), width: "100%", padding: 13 }}>
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
        <h2 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Welcome back</h2>
        <p style={{ fontSize: 14, color: t.textMuted }}>Log in to your AvoConnect account</p>
      </div>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, boxShadow: t.shadow }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Phone number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" style={inp} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" style={inp} />
        </div>
        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <span onClick={() => { setForgot(true); setError(""); }} style={{ fontSize: 12, color: t.green, cursor: "pointer", fontWeight: 500 }}>
            Forgot password?
          </span>
        </div>
        {error && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</p>}
        <button onClick={login} disabled={loading} style={{ ...btn(t.green, t.white), width: "100%", padding: 13, fontSize: 15, opacity: loading ? .7 : 1, marginBottom: 16 }}>
          {loading ? "Logging in…" : "Log in →"}
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: t.textMuted }}>
          No account? <span onClick={() => setPage("signup")} style={{ color: t.green, cursor: "pointer", fontWeight: 500 }}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}

// ── List Form ─────────────────────────────────────────────────
function ListForm({ setPage, profile }) {
  const [form, setForm] = useState({ variety: "Hass", quantity_kg: "", price_per_kg: "", harvest_date: "", certification: "None", description: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.quantity_kg || !form.price_per_kg || !form.harvest_date) {
      setError("Please fill quantity, price, and harvest date.");
      return;
    }
    const { data: p } = await supabase.from("profiles").select("verified, suspended").eq("id", profile.id).single();
    if (p?.suspended) { setError("Your account is suspended. Contact support."); return; }
    if (!p?.verified) { setError("Your account is pending verification. You can list once approved."); return; }
    setLoading(true);
    const { error } = await supabase.from("listings").insert({
      ...form,
      quantity_kg: Number(form.quantity_kg),
      price_per_kg: Number(form.price_per_kg),
      farmer_id: profile.id,
      county: profile.county,
      is_active: true,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) return (
    <div style={{ maxWidth: 440, margin: "80px auto", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🥑</div>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 10 }}>Listing published!</h2>
      <p style={{ color: t.textMuted, fontSize: 15, marginBottom: 28 }}>Your {form.variety} avocados are now visible to buyers across Kenya.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => setPage("dashboard")} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), padding: "10px 20px" }}>View dashboard</button>
        <button onClick={() => { setForm({ variety: "Hass", quantity_kg: "", price_per_kg: "", harvest_date: "", certification: "None", description: "" }); setDone(false); }} style={{ ...btn(t.green, t.white), padding: "10px 20px" }}>Add another listing</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "28px 16px" }}>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 4 }}>List your avocados</h2>
      <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 28 }}>Buyers across Kenya will see this immediately.</p>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, boxShadow: t.shadow }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Variety</label>
            <select value={form.variety} onChange={e => setForm({ ...form, variety: e.target.value })} style={inp}>
              {VARIETIES.map(v => <option key={v}>{v}</option>)}
            </select></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Certification</label>
            <select value={form.certification} onChange={e => setForm({ ...form, certification: e.target.value })} style={inp}>
              {["None","GlobalG.A.P","KEPHIS","Organic","KS EAS 12"].map(c => <option key={c}>{c}</option>)}
            </select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Quantity (kg)</label>
            <input type="number" value={form.quantity_kg} onChange={e => setForm({ ...form, quantity_kg: e.target.value })} placeholder="e.g. 500" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Price (Ksh/kg)</label>
            <input type="number" value={form.price_per_kg} onChange={e => setForm({ ...form, price_per_kg: e.target.value })} placeholder="e.g. 32" style={inp} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Harvest / ready date</label>
          <input type="date" value={form.harvest_date} onChange={e => setForm({ ...form, harvest_date: e.target.value })} style={inp} /></div>
        <div style={{ marginBottom: 20 }}><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe your avocados — altitude, farm practices, delivery options…" style={{ ...inp, resize: "none" }} /></div>
        {form.quantity_kg && form.price_per_kg && (
          <div style={{ background: t.greenLight, borderRadius: 10, padding: "12px 16px", marginBottom: 16, border: `1px solid ${t.green}20` }}>
            <span style={{ fontSize: 14, color: t.greenDark, fontWeight: 500 }}>💰 Total value: Ksh {(Number(form.quantity_kg) * Number(form.price_per_kg)).toLocaleString()}</span>
          </div>
        )}
        {error && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{ ...btn(t.green, t.white), width: "100%", padding: 14, fontSize: 15, opacity: loading ? .7 : 1 }}>
          {loading ? "Publishing…" : "Publish listing 🥑"}
        </button>
      </div>
    </div>
  );
}

// ── Reset Password ────────────────────────────────────────────
function ResetPassword({ setPage }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!password || !confirm) { setError("Please fill both fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setDone(true);
    setTimeout(() => setPage("login"), 2500);
  }

  if (done) return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Password updated!</h2>
      <p style={{ fontSize: 14, color: t.textMuted }}>Redirecting you to login…</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
        <h2 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Set new password</h2>
        <p style={{ fontSize: 14, color: t.textMuted }}>Choose a strong password for your account.</p>
      </div>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, boxShadow: t.shadow }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" style={inp} />
        </div>
        {error && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{ ...btn(t.green, t.white), width: "100%", padding: 13, fontSize: 15, opacity: loading ? .7 : 1 }}>
          {loading ? "Updating…" : "Update password →"}
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setPage("reset-password");
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (data) setProfile(data);
      }
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setPage("home");
  }

  const pageName = typeof page === "string" ? page : page.name;
  const pageData = typeof page === "object" ? page.data : null;

  return (
    <>
      <style>{css}</style>
      <Nav setPage={setPage} profile={profile} onSignOut={signOut} />
      <div style={{ minHeight: "calc(100vh - 62px)" }}>
        {pageName === "home" && <Home setPage={setPage} />}
        {pageName === "signup" && <Signup setPage={setPage} setProfile={setProfile} />}
        {pageName === "login" && <Login setPage={setPage} setProfile={setProfile} />}
        {pageName === "list" && profile && <ListForm setPage={setPage} profile={profile} />}
        {pageName === "dashboard" && profile && <FarmerDashboard setPage={setPage} profile={profile} />}
        {pageName === "diary" && profile?.role === "farmer" && <FarmDiary profile={profile} setPage={setPage} />}
        {pageName === "coop-dashboard" && profile?.role === "cooperative" && <CoopDashboard profile={profile} setPage={setPage} />}
        {pageName === "admin" && profile?.phone === "0710701013" && <AdminPage profile={profile} />}
        {pageName === "resources" && <Resources setPage={setPage} profile={profile} />}
        {pageName === "company-dashboard" && profile?.role === "company" && <CompanyDashboard profile={profile} setPage={setPage} />}
        {pageName === "reset-password" && <ResetPassword setPage={setPage} />}
        {pageName === "listing" && <ListingDetail listing={pageData} setPage={setPage} profile={profile} />}
      </div>
    </>
  );
}