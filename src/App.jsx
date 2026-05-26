import { useState, useEffect } from "react";
import FarmDiary from "./FarmDiary";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const theme = {
  green: "#1D9E75", greenDark: "#0F6E56", greenLight: "#E1F5EE",
  text: "#1a1a1a", textMuted: "#6b7280", border: "#e5e7eb",
  bg: "#fafaf8", white: "#ffffff",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #fafaf8; color: #1a1a1a; }
  input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
  button { cursor: pointer; }
  .serif { font-family: 'DM Serif Display', serif; }
`;

const COUNTIES = ["Nakuru","Nairobi","Kiambu","Murang'a","Nyeri","Meru","Kirinyaga","Embu","Kisii","Bomet","Nandi","Uasin Gishu"];
const VARIETIES = ["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"];
const BUYER_TYPES = ["Local trader","Packhouse","Exporter","Supermarket","International importer"];

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  accepted: { bg: "#D1FAE5", text: "#065F46" },
  rejected: { bg: "#FEE2E2", text: "#991B1B" },
  completed: { bg: "#E0E7FF", text: "#3730A3" },
};

function Nav({ setPage, profile, onSignOut }) {
  return (
    <nav style={{ background: theme.white, borderBottom: `1px solid ${theme.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
      <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="13" rx="6" ry="9" fill="white" opacity=".9"/><ellipse cx="12" cy="10" rx="4" ry="6" fill="white" opacity=".5"/></svg>
        </div>
        <span className="serif" style={{ fontSize: 18, color: theme.text }}>AvoConnect</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {profile ? (
          <>
            <span style={{ fontSize: 13, color: theme.textMuted }}>Hi, {profile.name.split(" ")[0]}</span>
            {profile.role === "farmer" && (
              <>
                <button onClick={() => setPage("dashboard")} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.border}`, borderRadius: 8, background: "none", color: theme.textMuted }}>My Dashboard</button>
<button onClick={() => setPage("diary")} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.border}`, borderRadius: 8, background: "none", color: theme.textMuted }}>Farm Diary</button>
                <button onClick={() => setPage("list")} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.green}`, color: theme.green, borderRadius: 8, background: "none" }}>+ List</button>
              </>
            )}
            <button onClick={onSignOut} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.border}`, borderRadius: 8, background: "none", color: theme.textMuted }}>Sign out</button>
          </>
        ) : (
          <>
            <button onClick={() => setPage("login")} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.border}`, borderRadius: 8, background: "none", color: theme.textMuted }}>Log in</button>
            <button onClick={() => setPage("signup")} style={{ fontSize: 13, padding: "6px 14px", border: "none", borderRadius: 8, background: theme.green, color: "#fff" }}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}

// ── Farmer Dashboard ─────────────────────────────────────────
function FarmerDashboard({ setPage, profile }) {
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editListing, setEditListing] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: myListings } = await supabase
      .from("listings")
      .select("*")
      .eq("farmer_id", profile.id)
      .order("created_at", { ascending: false });

    const { data: myOrders } = await supabase
      .from("orders")
      .select("*, listings(variety, quantity_kg, price_per_kg), profiles!orders_buyer_id_fkey(name, phone)")
      .eq("farmer_id", profile.id)
      .order("created_at", { ascending: false });

    setListings(myListings || []);
    setOrders(myOrders || []);
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
    await supabase.from("orders").update({ status }).eq("id", orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }

  async function saveEdit() {
    await supabase.from("listings").update({
      variety: editListing.variety,
      quantity_kg: Number(editListing.quantity_kg),
      price_per_kg: Number(editListing.price_per_kg),
      harvest_date: editListing.harvest_date,
      certification: editListing.certification,
      description: editListing.description,
    }).eq("id", editListing.id);
    setListings(prev => prev.map(l => l.id === editListing.id ? { ...l, ...editListing } : l));
    setEditListing(null);
  }

  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const totalRevenue = orders.filter(o => o.status === "accepted" || o.status === "completed")
    .reduce((sum, o) => sum + (o.quantity_kg * o.price_per_kg), 0);

  if (editListing) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <button onClick={() => setEditListing(null)} style={{ fontSize: 13, color: theme.textMuted, background: "none", border: "none", marginBottom: 20 }}>← Back to dashboard</button>
      <h2 className="serif" style={{ fontSize: 24, marginBottom: 20 }}>Edit listing</h2>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Variety</label>
            <select value={editListing.variety} onChange={e => setEditListing({ ...editListing, variety: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              {VARIETIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Certification</label>
            <select value={editListing.certification} onChange={e => setEditListing({ ...editListing, certification: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              {["None", "GlobalG.A.P", "KEPHIS", "Organic", "KS EAS 12"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Quantity (kg)</label>
            <input type="number" value={editListing.quantity_kg} onChange={e => setEditListing({ ...editListing, quantity_kg: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Price (Ksh/kg)</label>
            <input type="number" value={editListing.price_per_kg} onChange={e => setEditListing({ ...editListing, price_per_kg: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Harvest date</label>
          <input type="date" value={editListing.harvest_date} onChange={e => setEditListing({ ...editListing, harvest_date: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={editListing.description} onChange={e => setEditListing({ ...editListing, description: e.target.value })} rows={3}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, resize: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditListing(null)} style={{ flex: 1, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 10, background: "none", fontSize: 14, color: theme.textMuted }}>Cancel</button>
          <button onClick={saveEdit} style={{ flex: 2, padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Save changes</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 28, marginBottom: 4 }}>My Dashboard</h1>
          <p style={{ fontSize: 14, color: theme.textMuted }}>{profile.name} · {profile.county}</p>
        </div>
        <button onClick={() => setPage("list")} style={{ padding: "9px 20px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>+ New listing</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
        {[
          ["Listings", listings.length, "total"],
          ["Pending orders", pendingOrders, "need action"],
          ["Revenue", `Ksh ${totalRevenue.toLocaleString()}`, "accepted orders"],
        ].map(([label, value, sub]) => (
          <div key={label} style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{label}</div>
            <div className="serif" style={{ fontSize: 22, color: theme.green, marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}`, marginBottom: 20 }}>
        {["listings", "orders"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 20px", fontSize: 14, background: "none", border: "none", borderBottom: `2px solid ${tab === t ? theme.green : "transparent"}`, color: tab === t ? theme.green : theme.textMuted, textTransform: "capitalize", fontWeight: tab === t ? 500 : 400 }}>
            {t === "orders" && pendingOrders > 0 ? `Orders (${pendingOrders} new)` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: theme.textMuted, padding: 40 }}>Loading…</p>
      ) : tab === "listings" ? (
        <div>
          {listings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: theme.textMuted, marginBottom: 16 }}>No listings yet.</p>
              <button onClick={() => setPage("list")} style={{ padding: "10px 24px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Post your first listing</button>
            </div>
          ) : listings.map(l => (
            <div key={l.id} style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, background: theme.greenLight, color: theme.greenDark, padding: "2px 10px", borderRadius: 99 }}>{l.variety}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: l.is_active ? "#D1FAE5" : "#F3F4F6", color: l.is_active ? "#065F46" : theme.textMuted }}>
                      {l.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{l.quantity_kg?.toLocaleString()} kg · Ksh {l.price_per_kg}/kg</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>Harvest: {l.harvest_date} · {l.certification}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  <button onClick={() => toggleActive(l)}
                    style={{ fontSize: 12, padding: "5px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, background: "none", color: theme.textMuted }}>
                    {l.is_active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => setEditListing(l)}
                    style={{ fontSize: 12, padding: "5px 12px", border: `1px solid ${theme.green}`, borderRadius: 8, background: "none", color: theme.green }}>
                    Edit
                  </button>
                  <button onClick={() => deleteListing(l.id)}
                    style={{ fontSize: 12, padding: "5px 12px", border: "1px solid #FCA5A5", borderRadius: 8, background: "none", color: "#EF4444" }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {orders.length === 0 ? (
            <p style={{ textAlign: "center", color: theme.textMuted, padding: 40 }}>No orders received yet.</p>
          ) : orders.map(o => (
            <div key={o.id} style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{o.profiles?.name}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>📞 {o.profiles?.phone}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.text, textTransform: "capitalize" }}>
                  {o.status}
                </span>
              </div>
              <div style={{ background: theme.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}><strong>{o.listings?.variety}</strong> · {o.quantity_kg} kg · Ksh {o.price_per_kg}/kg</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: theme.greenDark }}>Total: Ksh {(o.quantity_kg * o.price_per_kg).toLocaleString()}</div>
                {o.message && <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>"{o.message}"</div>}
              </div>
              {o.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => updateOrderStatus(o.id, "rejected")}
                    style={{ flex: 1, padding: "8px", border: "1px solid #FCA5A5", borderRadius: 8, background: "none", color: "#EF4444", fontSize: 13 }}>
                    Decline
                  </button>
                  <button onClick={() => updateOrderStatus(o.id, "accepted")}
                    style={{ flex: 2, padding: "8px", background: theme.green, color: "#fff", border: "none", borderRadius: 8, fontSize: 13 }}>
                    Accept order
                  </button>
                </div>
              )}
              {o.status === "accepted" && (
                <button onClick={() => updateOrderStatus(o.id, "completed")}
                  style={{ width: "100%", padding: "8px", background: "#6366F1", color: "#fff", border: "none", borderRadius: 8, fontSize: 13 }}>
                  Mark as completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
      let query = supabase.from("listings").select("*, profiles(name, phone, county)").eq("is_active", true).order("created_at", { ascending: false });
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
      <div style={{ background: theme.white, borderBottom: `1px solid ${theme.border}`, padding: "32px 24px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "inline-block", fontSize: 12, background: theme.greenLight, color: theme.greenDark, padding: "3px 12px", borderRadius: 99, marginBottom: 14 }}>Kenya's avocado marketplace</div>
          <h1 className="serif" style={{ fontSize: 34, lineHeight: 1.2, marginBottom: 8 }}>Connect directly.<br/>Get fair prices.</h1>
          <p style={{ fontSize: 15, color: theme.textMuted, marginBottom: 20 }}>Farmers and buyers — no middlemen, no guesswork on price.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search county, variety, farmer…" style={{ flex: 1, padding: "10px 14px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, background: theme.bg }} />
            <select value={variety} onChange={e => setVariety(e.target.value)} style={{ padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, background: theme.bg }}>
              <option>All</option>
              {VARIETIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 16, fontWeight: 500, fontSize: 15 }}>Available now ({filtered.length})</div>
        {loading ? (
          <p style={{ textAlign: "center", color: theme.textMuted, padding: 40 }}>Loading listings…</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: theme.textMuted, padding: 40 }}>No listings yet. Be the first to post!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 12 }}>
            {filtered.map(l => (
              <div key={l.id} onClick={() => setPage({ name: "listing", data: l })}
                style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.07)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, background: theme.greenLight, color: theme.greenDark, padding: "2px 10px", borderRadius: 99 }}>{l.variety}</span>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>📍 {l.county}</span>
                </div>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{l.profiles?.name}</div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>{l.quantity_kg?.toLocaleString()} kg · {l.harvest_date} · {l.certification}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontSize: 20, fontWeight: 500, color: theme.greenDark }}>Ksh {l.price_per_kg}</span><span style={{ fontSize: 12, color: theme.textMuted }}> /kg</span></div>
                  <button style={{ fontSize: 12, padding: "6px 14px", border: `1px solid ${theme.green}`, color: theme.green, borderRadius: 8, background: "none" }}>View & order</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingDetail({ listing: l, setPage, profile }) {
  const [qty, setQty] = useState(100);
  const [msg, setMsg] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function placeOrder() {
    if (!profile) { setPage("signup"); return; }
    setLoading(true);
    const { error } = await supabase.from("orders").insert({
      listing_id: l.id, farmer_id: l.farmer_id, buyer_id: profile.id,
      quantity_kg: qty, price_per_kg: l.price_per_kg, message: msg,
    });
    setLoading(false);
    if (error) { setError("Failed to place order. Try again."); return; }
    setOrdered(true);
  }

  if (ordered) return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 32, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={theme.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Order sent!</h2>
      <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 24 }}>Total: <strong>Ksh {(qty * l.price_per_kg).toLocaleString()}</strong></p>
      <button onClick={() => setPage("home")} style={{ padding: "10px 24px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Back to marketplace</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <button onClick={() => setPage("home")} style={{ fontSize: 13, color: theme.textMuted, background: "none", border: "none", marginBottom: 20 }}>← Back</button>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20 }}>
        <h2 className="serif" style={{ fontSize: 22, marginBottom: 4 }}>{l.variety} avocados</h2>
        <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>{l.profiles?.name} · {l.county}</p>
        <p style={{ fontSize: 14, color: theme.textMuted, marginBottom: 16, lineHeight: 1.6 }}>{l.description}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[["Available", `${l.quantity_kg?.toLocaleString()} kg`], ["Harvest", l.harvest_date], ["Price", `Ksh ${l.price_per_kg}/kg`], ["Contact", l.profiles?.phone]].map(([k, v]) => (
            <div key={k} style={{ background: theme.bg, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Quantity (kg)</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))}
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, marginBottom: 10 }} />
        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Message (optional)</label>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="e.g. Can you deliver to Nakuru?"
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, resize: "none", marginBottom: 14 }} />
        {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 12, color: theme.textMuted }}>Total</div><div style={{ fontSize: 20, fontWeight: 500, color: theme.greenDark }}>Ksh {(qty * l.price_per_kg).toLocaleString()}</div></div>
          <button onClick={placeOrder} disabled={loading} style={{ padding: "11px 28px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, opacity: loading ? .7 : 1 }}>
            {loading ? "Sending…" : profile ? "Place order" : "Sign up to order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Signup({ setPage, setProfile }) {
  const [role, setRole] = useState("farmer");
  const [form, setForm] = useState({ name: "", phone: "", county: "", password: "", buyerType: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.name || !form.phone || !form.county || !form.password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    const email = `u${form.phone.replace(/\s/g, "").replace(/\+/g, "")}@avoconnect.ke`;
    const { data, error: e1 } = await supabase.auth.signUp({ email, password: form.password });
    if (e1) { setError(e1.message); setLoading(false); return; }
    const { error: e2 } = await supabase.from("profiles").insert({
      id: data.user.id, name: form.name, phone: form.phone,
      county: form.county, role, buyer_type: form.buyerType || null,
    });
    if (e2) { setError(e2.message); setLoading(false); return; }
    setProfile({ id: data.user.id, name: form.name, phone: form.phone, county: form.county, role });
    setPage(role === "farmer" ? "dashboard" : "home");
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Join AvoConnect</h1>
        <p style={{ fontSize: 14, color: theme.textMuted }}>Free to join. Start trading in minutes.</p>
      </div>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {["farmer", "buyer"].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ padding: 12, border: `2px solid ${role === r ? theme.green : theme.border}`, borderRadius: 10, background: role === r ? theme.greenLight : "none", color: role === r ? theme.greenDark : theme.textMuted, fontSize: 14, fontWeight: 500 }}>
              {r === "farmer" ? "🌱 Farmer" : "🏪 Buyer"}
            </button>
          ))}
        </div>
        {[["Full name", "name", "text"], ["Phone number", "phone", "tel"], ["Password", "password", "password"]].map(([label, key, type]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={label}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>County</label>
          <select value={form.county} onChange={e => setForm({ ...form, county: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
            <option value="">Select county</option>
            {COUNTIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10 }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, opacity: loading ? .7 : 1 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: theme.textMuted, marginTop: 12 }}>
          Already have an account? <span onClick={() => setPage("login")} style={{ color: theme.green, cursor: "pointer" }}>Log in</span>
        </p>
      </div>
    </div>
  );
}

function Login({ setPage, setProfile }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    if (!phone || !password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    const email = `u${phone.replace(/\s/g, "").replace(/\+/g, "")}@avoconnect.ke`;
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) { setError("Wrong phone or password."); setLoading(false); return; }
    const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    setProfile(p);
    setPage(p.role === "farmer" ? "dashboard" : "home");
  }

  return (
    <div style={{ maxWidth: 380, margin: "60px auto", padding: "0 16px" }}>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 28 }}>
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 6 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 20 }}>Log in with your phone number.</p>
        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Phone number</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX"
          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, marginBottom: 12 }} />
        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, marginBottom: 16 }} />
        {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10 }}>{error}</p>}
        <button onClick={login} disabled={loading} style={{ width: "100%", padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, marginBottom: 12, opacity: loading ? .7 : 1 }}>
          {loading ? "Logging in…" : "Log in"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: theme.textMuted }}>
          No account? <span onClick={() => setPage("signup")} style={{ color: theme.green, cursor: "pointer" }}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}

function ListForm({ setPage, profile }) {
  const [form, setForm] = useState({ variety: "Hass", quantity_kg: "", price_per_kg: "", harvest_date: "", certification: "None", description: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.quantity_kg || !form.price_per_kg || !form.harvest_date) { setError("Please fill quantity, price, and harvest date."); return; }
    setLoading(true);
    const { error } = await supabase.from("listings").insert({
      ...form, quantity_kg: Number(form.quantity_kg), price_per_kg: Number(form.price_per_kg),
      farmer_id: profile.id, county: profile.county, is_active: true,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 32, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={theme.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Listing published!</h2>
      <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 24 }}>Your {form.variety} avocados are now visible to buyers across Kenya.</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setPage("dashboard")} style={{ padding: "10px 20px", border: `1px solid ${theme.border}`, borderRadius: 10, background: "none", fontSize: 14, color: theme.textMuted }}>View dashboard</button>
        <button onClick={() => { setForm({ variety: "Hass", quantity_kg: "", price_per_kg: "", harvest_date: "", certification: "None", description: "" }); setDone(false); }}
          style={{ padding: "10px 20px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Add another</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <h2 className="serif" style={{ fontSize: 26, marginBottom: 4 }}>List your avocados</h2>
      <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 24 }}>Buyers across Kenya will see this immediately.</p>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Variety</label>
            <select value={form.variety} onChange={e => setForm({ ...form, variety: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              {VARIETIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Certification</label>
            <select value={form.certification} onChange={e => setForm({ ...form, certification: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              {["None", "GlobalG.A.P", "KEPHIS", "Organic", "KS EAS 12"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Quantity (kg)</label>
            <input type="number" value={form.quantity_kg} onChange={e => setForm({ ...form, quantity_kg: e.target.value })} placeholder="e.g. 500"
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Price (Ksh/kg)</label>
            <input type="number" value={form.price_per_kg} onChange={e => setForm({ ...form, price_per_kg: e.target.value })} placeholder="e.g. 32"
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Harvest / ready date</label>
          <input type="date" value={form.harvest_date} onChange={e => setForm({ ...form, harvest_date: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
            placeholder="Describe your avocados — altitude, farm practices, delivery options…"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, resize: "none" }} />
        </div>
        {form.quantity_kg && form.price_per_kg && (
          <div style={{ background: theme.greenLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: theme.greenDark }}>Total value: <strong>Ksh {(Number(form.quantity_kg) * Number(form.price_per_kg)).toLocaleString()}</strong></span>
          </div>
        )}
        {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10 }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: 13, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, opacity: loading ? .7 : 1 }}>
          {loading ? "Publishing…" : "Publish listing"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
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
      <div style={{ minHeight: "calc(100vh - 56px)" }}>
        {pageName === "home" && <Home setPage={setPage} />}
        {pageName === "signup" && <Signup setPage={setPage} setProfile={setProfile} />}
        {pageName === "login" && <Login setPage={setPage} setProfile={setProfile} />}
        {pageName === "list" && profile && <ListForm setPage={setPage} profile={profile} />}
        {pageName === "dashboard" && profile && <FarmerDashboard setPage={setPage} profile={profile} />}
{pageName === "diary" && profile?.role === "farmer" && <FarmDiary profile={profile} setPage={setPage} />}
        {pageName === "listing" && <ListingDetail listing={pageData} setPage={setPage} profile={profile} />}
      </div>
    </>
  );
}