import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import FarmDiary from "./FarmDiary";
import AdminPage from "./AdminPage";
import ReviewModal from "./ReviewModal";
import Resources from "./Resources";
import CompanyDashboard from "./CompanyDashboard";
import CoopDashboard from "./CoopDashboard";
import LinkListingModal from "./LinkListingModal"; 
import FarmerDashboard from "./FarmerDashboard";
import BuyerDashboard from "./BuyerDashboard";

// THIS IS THE ONLY GENERATOR IN THE PROJECT
export const supabase = createClient(
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

  const typeIcon = (type) => ({ order: "📦", accepted: "✅", rejected: "❌", completed: "🎉", pitch: "🥑" }[type] || "🔔");

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
                    {profile.role === "farmer" ? "🌱 Farmer" : profile.role === "cooperative" ? "🤝 Cooperative" : profile.role === "company" ? "🧪 Input Supplier" : "🏪 Buyer"}
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
              <SidebarSection label="BUYER / EXPORTER" />
              <MenuItem icon="🏪" label="Browse listings" onClick={() => go("home")} />
              <MenuItem icon="💼" label="Buyer Dashboard Portal" onClick={() => go("buyer-dashboard")} highlight />
            </>
          )}

          {profile?.role === "company" && (
            <>
              <SidebarSection label="AGRICULTURAL SUPPLIER" />
              <MenuItem icon="🧪" label="Supplier Dashboard" onClick={() => go("company-dashboard")} />
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

function SidebarSection({ label }) {
  return (
    <div style={{ padding: "10px 20px 4px", fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: "1px" }}>
      {label}
    </div>
  );
}

// ── Home Marketplace ───────────────────────────────────────────
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

function Signup({ setPage, setProfile }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
const [confirmPin, setConfirmPin] = useState("");
  const [county, setCounty] = useState("Nakuru");
  const [role, setRole] = useState("farmer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    if (!name || !phone || !pin) { setError("Fill in all fields including PIN."); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError("PIN must be exactly 4 digits."); return; }
if (pin !== confirmPin) { setError("PINs do not match. Please try again."); return; }
    setLoading(true); setError("");
    const { data: exists } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (exists) { setError("An account with this phone number already exists."); setLoading(false); return; }
    const { data, error: err } = await supabase.from("profiles").insert({ name, phone, pin, county, role, verified: true }).select().single();
    setLoading(false);
    if (err) { console.error("Signup error:", err); setError("Signup failed: " + err.message); return; }
    setProfile(data);
    if (data.role === "company") setPage("company-dashboard");
    else if (data.role === "cooperative") setPage("coop-dashboard");
    else if (data.role === "buyer") setPage("home");
    else setPage("dashboard");
  }

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 16px" }}>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 6, textAlign: "center" }}>Create account</h2>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 24, textAlign: "center" }}>Direct digital integration into Kenya's avocado grid.</p>
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Full Name / Corporate Title</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., David Kariuki" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 0712345678" style={inp} /></div>
         <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Set 4-Digit PIN</label>
  <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="e.g., 1234" style={inp} /></div>
<div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Confirm PIN</label>
  <input type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Re-enter PIN" style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>County Base</label>
              <select value={county} onChange={e => setCounty(e.target.value)} style={inp}>
                {COUNTIES.map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Platform Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={inp}>
                <option value="farmer">🌱 Farmer</option>
                <option value="cooperative">🤝 Cooperative</option>
                <option value="buyer">🏪 Local Buyer / Exporter</option>
                <option value="company">🏢 Input / Product Supplier</option>
              </select></div>
          </div>
          {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btn(t.green, t.white), marginTop: 8 }}>
            {loading ? "Registering account…" : "Open account"}
          </button>
        </form>
        <p style={{ fontSize: 13, color: t.textMuted, marginTop: 20, textAlign: "center" }}>
          Already signed up? <button onClick={() => setPage("login")} style={{ background: "none", border: "none", color: t.green, fontWeight: 600, fontSize: 13 }}>Log in</button>
        </p>
      </div>
    </div>
  );
}

// ── Login Form Component ──────────────────────────────────────
function Login({ setPage, setProfile }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!phone || !pin) { setError("Enter your phone number and PIN."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.from("profiles").select("*").eq("phone", phone).maybeSingle();
    setLoading(false);
    if (err || !data) { setError("No active profile found matching that number."); return; }
    if (data.pin && data.pin !== pin) { setError("Incorrect PIN. Please try again."); return; }
    setProfile(data);
    if (data.role === "company") setPage("company-dashboard");
    else if (data.role === "cooperative") setPage("coop-dashboard");
    else if (data.role === "buyer") setPage("home");
    else setPage("dashboard");
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 6, textAlign: "center" }}>Log back in</h2>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 24, textAlign: "center" }}>Access your farm configurations and active tenders.</p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Registered Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 0712345678" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Your 4-Digit PIN</label>
            <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" style={inp} /></div>
          {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btn(t.green, t.white), marginTop: 8 }}>
            {loading ? "Authorizing…" : "Log in"}
          </button>
        </form>
        <p style={{ fontSize: 13, color: t.textMuted, marginTop: 20, textAlign: "center" }}>
          New to AvoConnect? <button onClick={() => setPage("signup")} style={{ background: "none", border: "none", color: t.green, fontWeight: 600, fontSize: 13 }}>Join free</button>
        </p>
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#E7F9EE", borderRadius: 10, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>Forgot your PIN?</p>
          
          <a
          href="https://wa.me/254710701013?text=Hi%20AvoConnect%20Support%2C%20I%20need%20help%20resetting%20my%20PIN.%20My%20phone%20number%20is%3A%20"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            <span>💬</span> Contact Support on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
// ── Create/Post Listing Form ──────────────────────────────────
function ListForm({ setPage, profile }) {
  const [variety, setVariety] = useState("Hass");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [cert, setCert] = useState("None");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!qty || !price || !date) { setError("Fill in volume, target price and harvest date."); return; }
    setLoading(true);
    const { error: err } = await supabase.from("listings").insert({
      farmer_id: profile.id, variety, quantity_kg: Number(qty), price_per_kg: Number(price),
      harvest_date: date, certification: cert, description: desc, county: profile.county, is_active: true
    });
    setLoading(false);
    if (err) { setError("Failed to list crop lot. Try again."); return; }
    setPage(profile.role === "cooperative" ? "coop-dashboard" : "dashboard");
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 6 }}>List your harvest</h2>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 24 }}>Broadcast your available avocado yields directly to verified domestic exporters.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Crop Variety</label>
              <select value={variety} onChange={e => setVariety(e.target.value)} style={inp}>
                {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
              </select></div>
            <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Farm Certification</label>
              <select value={cert} onChange={e => setCert(e.target.value)} style={inp}>
                {["None","GlobalG.A.P","KEPHIS","Organic","KS EAS 12"].map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Est. Volume (kg)</label>
              <input type="number" placeholder="e.g. 3500" value={qty} onChange={e => setQty(e.target.value)} style={inp} /></div>
            <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Target Price per kg (Ksh)</label>
              <input type="number" placeholder="e.g. 35" value={price} onChange={e => setPrice(e.target.value)} style={inp} /></div>
          </div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Estimated Harvest Window</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Quality details / Field notes (optional)</label>
            <textarea rows={3} placeholder="e.g., Average fruit sizes 16-22, oil content testing optimal. High tree hygiene." value={desc} onChange={e => setDesc(e.target.value)} style={{ ...inp, resize: "none" }} /></div>
          {error && <p style={{ fontSize: 12, color: "#EF4444" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btn(t.green, t.white), marginTop: 8 }}>
            {loading ? "Publishing harvest..." : "Publish active listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Root Wrapper ──────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [profile, setProfile] = useState(null);

  const signOut = () => {
    setProfile(null);
    setPage("home");
  };

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
        {pageName === "listing" && pageData && <ListingDetail listing={pageData} setPage={setPage} profile={profile} />}
        {pageName === "dashboard" && profile && <FarmerDashboard setPage={setPage} profile={profile} />}
        {pageName === "diary" && profile?.role === "farmer" && <FarmDiary profile={profile} setPage={setPage} />}
        {pageName === "coop-dashboard" && profile?.role === "cooperative" && <CoopDashboard profile={profile} setPage={setPage} />}
        {pageName === "admin" && profile?.phone === "0710701013" && <AdminPage profile={profile} />}
        {pageName === "resources" && <Resources setPage={setPage} profile={profile} />}
        {pageName === "company-dashboard" && profile?.role === "company" && <CompanyDashboard profile={profile} setPage={setPage} />}
        {pageName === "buyer-dashboard" && profile?.role === "buyer" && (
  <BuyerDashboard profile={profile} setPage={setPage} />
)}
      </div>
    </>
  );
}