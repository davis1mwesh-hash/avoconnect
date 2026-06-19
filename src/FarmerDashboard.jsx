import { useState, useEffect } from "react";
import { supabase } from "./App";

const VARIETIES = ["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"];
const STATUS_COLORS = {
  pending:   { bg: "#FEF3C7", text: "#92400E" },
  accepted:  { bg: "#D1FAE5", text: "#065F46" },
  rejected:  { bg: "#FEE2E2", text: "#991B1B" },
  completed: { bg: "#E0E7FF", text: "#3730A3" },
};

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE", greenMid: "#4CAF78",
  brown: "#6B4C2A", brownLight: "#F5EFE6", brownMid: "#C4965A", cream: "#FDFAF5",
  white: "#FFFFFF", text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)", shadowHover: "0 8px 24px rgba(0,0,0,.10)",
  amberLight: "#FEF3C7", amberDark: "#92400E",
};

const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text };
const btn = (bg, color, border) => ({ padding: "11px 24px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer" });

export default function FarmerDashboard({ setPage, profile }) {
  const [tab, setTab] = useState("listings");
  const [, forceUpdate] = useState(0);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [demands, setDemands] = useState([]);
  const [myPitches, setMyPitches] = useState([]);
  const [myPoolContributions, setMyPoolContributions] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [editListing, setEditListing] = useState(null);

  const [pitchTarget, setPitchTarget] = useState(null);
  const [selectedListing, setSelectedListing] = useState("");
  const [pitchMessage, setPitchMessage] = useState("");
  const [pitching, setPitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadAll();
    fetchBuyerDemands();
    fetchMyPitches();
    const interval = setInterval(() => { loadAll(); fetchMyPitches(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    setLoading(true);
    const { data: myListings } = await supabase.from("listings").select("*").eq("farmer_id", profile.id).order("created_at", { ascending: false });
    const { data: myOrders } = await supabase.from("orders").select("*, listings(variety, quantity_kg, price_per_kg), profiles!orders_buyer_id_fkey(name, phone)").eq("farmer_id", profile.id).order("created_at", { ascending: false });
    setListings(myListings || []);
    setOrders(myOrders || []);
    setLoading(false);
  }

  async function fetchBuyerDemands() {
    try {
      setLoadingDemands(true);
     const { data, error } = await supabase
  .from("buyer_requirements")
  .select("id, variety, delivery_location, quantity_required_kg, target_price_per_kg, company_name, additional_notes, buyer_id")
  .eq("is_active", true);
      if (error) throw error;
      setDemands(data || []);
    } catch (err) {
      console.error("Error fetching buyer requirements:", err);
    } finally {
      setLoadingDemands(false);
    }
  }

  async function fetchMyPoolContributions() {
    try {
      setLoadingPool(true);
      const { data, error } = await supabase
        .from("pool_contributions")
        .select("*, constituency_pools(constituency, county)")
        .eq("farmer_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyPoolContributions(data || []);
    } catch (err) {
      console.error("Error fetching pool contributions:", err);
    } finally {
      setLoadingPool(false);
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

  async function submitPitch() {
    if (!selectedListing) return alert("Please select a crop listing to pitch.");
    setPitching(true);
    const listing = listings.find(l => l.id === selectedListing);
    const { error } = await supabase.from("pitches").insert({
      farmer_id: profile.id,
      buyer_id: pitchTarget.buyer_id,
      requirement_id: pitchTarget.id,
      listing_id: selectedListing,
      message: pitchMessage,
      status: "pending"
    });
    if (error) {
      alert("Pitch failed: " + error.message);
    } else {
      await supabase.from("notifications").insert({
        user_id: pitchTarget.buyer_id,
        type: "pitch",
        title: "New Harvest Pitch 🥑",
        message: `${profile.name} pitched ${listing?.quantity_kg?.toLocaleString()} kg of ${listing?.variety} at Ksh ${listing?.price_per_kg}/kg for your ${pitchTarget.variety} requirement.`,
      });
      alert("Pitch sent successfully!");
      setPitchTarget(null);
      setPitchMessage("");
      setSelectedListing("");
      fetchMyPitches();
    }
    setPitching(false);
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
      await supabase.from("notifications").insert({ user_id: order.buyer_id, type: "accepted", title: "Order accepted! ✅", message: `${profile.name} accepted your order for ${order.quantity_kg} kg of ${varietyName} (Ksh ${totalKsh}). They will contact you shortly.` });
    }
    if (status === "rejected") {
      const varietyName = order.listings?.variety || "avocados";
      await supabase.from("notifications").insert({ user_id: order.buyer_id, type: "rejected", title: "Order declined ❌", message: `${profile.name} was unable to fulfil your order for ${order.quantity_kg} kg of ${varietyName}.` });
    }
    if (status === "completed") {
      const varietyName = order.listings?.variety || "avocados";
      await supabase.from("notifications").insert({ user_id: order.buyer_id, type: "completed", title: "Order completed 🎉", message: `Your order of ${order.quantity_kg} kg of ${varietyName} from ${profile.name} has been marked as completed.` });
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

  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const pendingPitches = myPitches.filter(p => p.status === "pending").length;
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
          <div><label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Price per kg (Ksh)</label>
            <input type="number" value={editListing.price_per_kg} onChange={e => setEditListing({ ...editListing, price_per_kg: e.target.value })} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Estimated harvest date</label>
          <input type="date" value={editListing.harvest_date} onChange={e => setEditListing({ ...editListing, harvest_date: e.target.value })} style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Description / Notes</label>
          <textarea value={editListing.description || ""} onChange={e => setEditListing({ ...editListing, description: e.target.value })} rows={3} style={{ ...inp, resize: "none" }} />
        </div>
        <button onClick={saveEdit} style={{ ...btn(t.green, t.white), width: "100%" }}>Save changes</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 48px" }}>

      {/* PITCH MODAL */}
      {pitchTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: t.white, borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Pitch Your Harvest 🥑</h2>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
              Pitching to <strong>{pitchTarget.company_name || "Buyer"}</strong> — {pitchTarget.variety} • {pitchTarget.delivery_location} • Ksh {pitchTarget.target_price_per_kg}/kg
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Select Crop Listing to Pitch</label>
              {listings.filter(l => l.is_active && l.quantity_kg >= pitchTarget.quantity_required_kg).length === 0 ? (
                <p style={{ fontSize: 13, color: "#EF4444" }}>None of your active listings meet the minimum volume of {pitchTarget.quantity_required_kg?.toLocaleString()} kg required.</p>
              ) : (
                <select value={selectedListing} onChange={e => setSelectedListing(e.target.value)} style={inp}>
                  <option value="">-- Choose a listing --</option>
                  {listings.filter(l => l.is_active && l.quantity_kg >= pitchTarget.quantity_required_kg).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.variety} — {l.quantity_kg?.toLocaleString()} kg @ Ksh {l.price_per_kg}/kg
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Pitch Message (optional)</label>
              <textarea rows={3} placeholder="e.g. My avocados are ready for harvest in 2 weeks, GlobalG.A.P certified, can deliver to Nakuru..." value={pitchMessage} onChange={e => setPitchMessage(e.target.value)} style={{ ...inp, resize: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setPitchTarget(null); setPitchMessage(""); setSelectedListing(""); }} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), flex: 1 }}>Cancel</button>
              <button onClick={submitPitch} disabled={pitching} style={{ ...btn(t.green, t.white), flex: 2 }}>
                {pitching ? "Sending Pitch..." : "Send Pitch to Buyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="serif" style={{ fontSize: 28, color: t.text, marginBottom: 4 }}>Farmer Dashboard</h1>
          <p style={{ fontSize: 13, color: t.textMuted }}>Manage your active harvests and field crop contracts.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", background: t.white, borderRadius: 12, padding: 4, border: `1px solid ${t.border}`, gap: 2 }}>
          <button onClick={() => setTab("listings")} style={{ background: tab === "listings" ? t.greenLight : "none", color: tab === "listings" ? t.greenDark : t.textMuted, border: "none", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
            My Listings ({listings.length})
          </button>
          <button onClick={() => setTab("orders")} style={{ background: tab === "orders" ? t.greenLight : "none", color: tab === "orders" ? t.greenDark : t.textMuted, border: "none", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            Incoming Orders
            {pendingOrders > 0 && <span style={{ background: t.green, color: "#fff", fontSize: 10, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{pendingOrders}</span>}
          </button>
          <button onClick={() => { setTab("demands"); fetchBuyerDemands(); }} style={{ background: tab === "demands" ? t.greenLight : "none", color: tab === "demands" ? t.greenDark : t.textMuted, border: "none", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
            📋 Buyer Tenders ({demands.length})
          </button>
          <button onClick={() => { setTab("pitches"); fetchMyPitches(); }} style={{ background: tab === "pitches" ? t.greenLight : "none", color: tab === "pitches" ? t.greenDark : t.textMuted, border: "none", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            📤 My Pitches
            {pendingPitches > 0 && <span style={{ background: t.brown, color: "#fff", fontSize: 10, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{pendingPitches}</span>}
          </button>
          <button onClick={() => { setTab("mypool"); fetchMyPoolContributions(); }} style={{ background: tab === "mypool" ? t.greenLight : "none", color: tab === "mypool" ? t.greenDark : t.textMuted, border: "none", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
            🤝 My Pool
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Total Revenue (Delivered)</div>
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: t.greenDark }}>Ksh {totalRevenue.toLocaleString()}</div>
        </div>
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Active Crop Listings</div>
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: t.text }}>{listings.filter(l => l.is_active).length} lots</div>
        </div>
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Total Contracts Order volume</div>
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: t.brown }}>{orders.reduce((sum, o) => sum + o.quantity_kg, 0).toLocaleString()} kg</div>
        </div>
      </div>

      {loading && tab !== "demands" && tab !== "pitches" ? (
        <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading panel metrics...</div>
      ) : tab === "listings" ? (
        listings.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <p style={{ color: t.textMuted, marginBottom: 16 }}>You haven't posted any avocado lots yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {listings.map(l => (
              <div key={l.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: t.shadow }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>{l.variety} Variety</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: l.is_active ? t.greenLight : t.brownLight, color: l.is_active ? t.greenDark : t.textMuted, fontWeight: 500 }}>
                      {l.is_active ? "🟢 Active on Market" : "⚫ Paused"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>📦 Volume: <strong>{l.quantity_kg?.toLocaleString()} kg</strong></span>
                    <span>💰 Price: <strong>Ksh {l.price_per_kg}/kg</strong></span>
                    <span>📅 Harvest: {l.harvest_date}</span>
                    <span>🛡️ Certification: {l.certification}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => toggleActive(l)} style={{ ...btn("none", t.text, `1px solid ${t.border}`), padding: "8px 14px", fontSize: 12 }}>
                    {l.is_active ? "Pause Listing" : "Activate"}
                  </button>
                  <button onClick={() => setEditListing(l)} style={{ ...btn("none", t.text, `1px solid ${t.border}`), padding: "8px 14px", fontSize: 12 }}>
                    Edit Crop
                  </button>
                  <button onClick={() => deleteListing(l.id)} style={{ ...btn("none", "#EF4444", "none"), padding: "8px 14px", fontSize: 12 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "orders" ? (
        orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <p style={{ color: t.textMuted }}>No buyers have placed orders on your crop lots yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {orders.map(o => {
              const col = STATUS_COLORS[o.status] || { bg: t.border, text: t.text };
              return (
                <div key={o.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>Order from {o.profiles?.name || "Verified Buyer"}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, fontWeight: 500, textTransform: "capitalize" }}>{o.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>📞 Buyer Line: {o.profiles?.phone || "N/A"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: t.greenDark }}>Ksh {(o.quantity_kg * o.price_per_kg).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{o.quantity_kg} kg @ Ksh {o.price_per_kg}</div>
                    </div>
                  </div>
                  {o.message && (
                    <div style={{ padding: "10px 12px", background: t.cream, borderRadius: 8, fontSize: 13, color: t.text, marginBottom: 14, borderLeft: `3px solid ${t.brownMid}` }}>
                      " {o.message} "
                    </div>
                  )}
                  {o.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => updateOrderStatus(o.id, "rejected")} style={{ ...btn("none", "#EF4444", `1px solid #FCA5A5`), padding: "6px 14px", fontSize: 12 }}>Decline Match</button>
                      <button onClick={() => updateOrderStatus(o.id, "accepted")} style={{ ...btn(t.green, t.white), padding: "7px 16px", fontSize: 12 }}>Accept & Unlock Contacts</button>
                    </div>
                  )}
                  {o.status === "accepted" && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: t.textMuted }}>Crop in fulfillment. Completed trading?</span>
                      <button onClick={() => updateOrderStatus(o.id, "completed")} style={{ ...btn(t.brown, t.white), padding: "6px 14px", fontSize: 12 }}>Mark as Completed Order</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : tab === "demands" ? (
        loadingDemands ? (
          <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading active market requirements...</div>
        ) : demands.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <p style={{ color: t.textMuted }}>No commercial export requirements or sourcing tenders are open today.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {demands.map(req => (
              <div key={req.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: t.shadow }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{req.company_name || "Verified Buyer"}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: t.amberLight, color: t.amberDark, fontWeight: 600 }}>Target: {req.variety}</span>
                  </div>
                  <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>📍 Destination: <strong>{req.delivery_location}</strong></span>
                    <span>📦 Desired Volume: <strong>{req.quantity_required_kg?.toLocaleString()} kg</strong></span>
                    <span>💰 Offer Price: <strong>Ksh {req.target_price_per_kg}/kg</strong></span>
                    <span>📝 Specs: <strong>{req.additional_notes || "—"}</strong></span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => {
                      const canMeet = listings.filter(l => l.is_active).some(l => l.quantity_kg >= req.quantity_required_kg);
                      if (!canMeet) {
                        alert(`You cannot pitch for this requirement. The buyer needs a minimum of ${req.quantity_required_kg?.toLocaleString()} kg but your active listings don't meet this volume.`);
                        return;
                      }
                      setPitchTarget(req);
                    }}
                    style={{ ...btn(t.green, t.white), padding: "8px 16px", fontSize: 13 }}
                  >
                    Pitch Harvest
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // MY PITCHES TAB
        loadingPitches ? (
          <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading your pitches...</div>
        ) : myPitches.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>📤</p>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No pitches sent yet</p>
            <p style={{ color: t.textMuted, fontSize: 13 }}>Go to Buyer Tenders and pitch your harvest to buyers.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myPitches.map(p => {
              const col = STATUS_COLORS[p.status] || { bg: t.border, text: t.text };
              return (
                <div key={p.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
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
                  <div style={{ fontSize: 13, color: t.textMuted, display: "flex", gap: 16, flexWrap: "wrap", marginBottom: p.message ? 10 : 0 }}>
                    <span>📍 For: <strong>{p.buyer_requirements?.delivery_location || "—"}</strong></span>
                    <span>📦 Req: <strong>{p.buyer_requirements?.quantity_required_kg?.toLocaleString()} kg</strong></span>
                    <span>📅 Harvest: <strong>{p.listings?.harvest_date || "—"}</strong></span>
                  </div>
                  {p.message && (
                    <div style={{ padding: "10px 12px", background: t.cream, borderRadius: 8, fontSize: 13, color: t.text, marginTop: 10, borderLeft: `3px solid ${t.brownMid}` }}>
                      "{p.message}"
                    </div>
                  )}
                  {p.status === "accepted" && (
                    <div style={{ marginTop: 10, fontSize: 13, color: t.greenDark, fontWeight: 600 }}>
                      ✅ Accepted! Contact buyer on {p.profiles?.phone} to arrange delivery.
                    </div>
                  )}
                  {p.status === "rejected" && (
                    <div style={{ marginTop: 10, fontSize: 13, color: "#EF4444" }}>
                      ❌ Declined — The buyer chose a different supplier.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : tab === "mypool" ? (
        loadingPool ? (
          <div style={{ textAlign: "center", padding: 48, color: t.textMuted }}>Loading your pool contributions...</div>
        ) : myPoolContributions.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>🤝</p>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No pool contributions yet</p>
            <p style={{ color: t.textMuted, fontSize: 13 }}>List under 500kg and it'll automatically join your constituency pool here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myPoolContributions.map(c => {
              const gradeColors = { A: { bg: "#D1FAE5", text: "#065F46" }, B: { bg: "#FEF3C7", text: "#92400E" }, C: { bg: "#FEE2E2", text: "#991B1B" } };
              const gc = gradeColors[c.quality_grade] || gradeColors.A;
              return (
                <div key={c.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, boxShadow: t.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>🤝 {c.constituency_pools?.constituency} Pool</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: gc.bg, color: gc.text, fontWeight: 600 }}>Grade {c.quality_grade || "A"}</span>
                      </div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>📍 {c.constituency_pools?.county} · {c.variety} · Harvest {c.harvest_date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: t.greenDark }}>{c.quantity_kg} kg</div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>@ Ksh {c.price_per_kg}/kg</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}` }}>
                    {c.status === "withdrawn" ? (
                      <span style={{ fontSize: 12, color: t.textMuted }}>⤴️ Moved to cooperative registration</span>
                    ) : c.delivered === true ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.green }}>✅ Delivered — sold to buyer</span>
                    ) : c.delivered === false ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>❌ Marked as no-show by admin</span>
                    ) : (
                      <span style={{ fontSize: 12, color: t.amberDark }}>⏳ Pooled — waiting for a buyer order</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}