import { useState } from "react";

const theme = {
  green: "#1D9E75",
  greenDark: "#0F6E56",
  greenLight: "#E1F5EE",
  greenMid: "#5DCAA5",
  amber: "#EF9F27",
  text: "#1a1a1a",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  bg: "#fafaf8",
  white: "#ffffff",
  card: "#ffffff",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${theme.bg}; color: ${theme.text}; }
  input, select, textarea { font-family: 'DM Sans', sans-serif; }
  button { font-family: 'DM Sans', sans-serif; cursor: pointer; }
  .serif { font-family: 'DM Serif Display', serif; }
`;

const COUNTIES = ["Nakuru","Nairobi","Kiambu","Murang'a","Nyeri","Meru","Kirinyaga","Embu","Kisii","Bomet","Nandi","Uasin Gishu"];
const VARIETIES = ["Hass","Fuerte","Jumbo","Pinkerton","Reed","Kienyeji"];
const BUYER_TYPES = ["Local trader","Packhouse","Exporter","Supermarket","International importer"];

const SAMPLE_LISTINGS = [
  { id:1, farmer:"Jane Wanjiku", county:"Nakuru", variety:"Hass", qty:500, unit:"kg", price:32, harvest:"2026-06-01", cert:"GlobalG.A.P", phone:"0712345678", desc:"Mature Hass from high-altitude farm. Consistent size." },
  { id:2, farmer:"Peter Kamau", county:"Murang'a", variety:"Fuerte", qty:2000, unit:"kg", price:18, harvest:"2026-06-05", cert:"Organic", phone:"0723456789", desc:"Bulk lot of Fuerte. Farm-gate pickup available." },
  { id:3, farmer:"Mary Auma", county:"Kisii", variety:"Kienyeji", qty:800, unit:"kg", price:12, harvest:"2026-05-28", cert:"None", phone:"0734567890", desc:"Local variety, good for domestic market." },
  { id:4, farmer:"Samuel Njoroge", county:"Meru", variety:"Hass", qty:1200, unit:"kg", price:35, harvest:"2026-06-10", cert:"KEPHIS", phone:"0745678901", desc:"Export-grade Hass. KEPHIS certified. Packhouse ready." },
];

function Nav({ page, setPage, user, setUser }) {
  return (
    <nav style={{ background: theme.white, borderBottom: `1px solid ${theme.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
      <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="13" rx="6" ry="9" fill="white" opacity=".9"/><ellipse cx="12" cy="10" rx="4" ry="6" fill="white" opacity=".5"/></svg>
        </div>
        <span className="serif" style={{ fontSize: 18, color: theme.text }}>AvoConnect</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: 13, color: theme.textMuted }}>Hi, {user.name.split(" ")[0]}</span>
            {user.role === "farmer" && (
              <button onClick={() => setPage("list")} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.green}`, color: theme.green, borderRadius: 8, background: "none" }}>+ List</button>
            )}
            <button onClick={() => { setUser(null); setPage("home"); }} style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${theme.border}`, borderRadius: 8, background: "none", color: theme.textMuted }}>Sign out</button>
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

function Home({ setPage, listings }) {
  const [search, setSearch] = useState("");
  const [variety, setVariety] = useState("All");
  const filtered = listings.filter(l =>
    (variety === "All" || l.variety === variety) &&
    (l.county.toLowerCase().includes(search.toLowerCase()) || l.variety.toLowerCase().includes(search.toLowerCase()) || l.farmer.toLowerCase().includes(search.toLowerCase()))
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, borderBottom: `1px solid ${theme.border}`, background: theme.white }}>
        {[["1,240","Farmers"],["84","Verified buyers"],["Ksh 28","Avg price today / kg"]].map(([n,l]) => (
          <div key={l} style={{ padding: "14px 0", textAlign: "center", borderRight: `1px solid ${theme.border}` }}>
            <div className="serif" style={{ fontSize: 22, color: theme.green }}>{n}</div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>Available now ({filtered.length})</span>
        </div>
        {filtered.length === 0 && <p style={{ color: theme.textMuted, fontSize: 14, textAlign: "center", padding: 32 }}>No listings match your search.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 12 }}>
          {filtered.map(l => <ListingCard key={l.id} listing={l} setPage={setPage} />)}
        </div>
      </div>
    </div>
  );
}

function ListingCard({ listing: l, setPage, onSelect }) {
  return (
    <div onClick={() => onSelect ? onSelect(l) : setPage({ name: "listing", data: l })}
      style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16, cursor: "pointer", transition: "box-shadow .15s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, background: theme.greenLight, color: theme.greenDark, padding: "2px 10px", borderRadius: 99 }}>{l.variety}</span>
        <span style={{ fontSize: 11, color: theme.textMuted }}>📍 {l.county}</span>
      </div>
      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{l.farmer}</div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
        {l.qty.toLocaleString()} kg · Harvest {l.harvest} · {l.cert}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 500, color: theme.greenDark }}>Ksh {l.price}</span>
          <span style={{ fontSize: 12, color: theme.textMuted }}> /kg</span>
        </div>
        <button style={{ fontSize: 12, padding: "6px 14px", border: `1px solid ${theme.green}`, color: theme.green, borderRadius: 8, background: "none" }}>View & order</button>
      </div>
    </div>
  );
}

function ListingDetail({ listing: l, setPage, user }) {
  const [ordered, setOrdered] = useState(false);
  const [qty, setQty] = useState(100);
  const [msg, setMsg] = useState("");

  function placeOrder() {
    if (!user) { setPage("signup"); return; }
    setOrdered(true);
  }

  if (ordered) return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 32, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={theme.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Order request sent!</h2>
      <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 24 }}>{l.farmer} will contact you on <strong>{l.phone}</strong> to confirm. Total: <strong>Ksh {(qty * l.price).toLocaleString()}</strong></p>
      <button onClick={() => setPage("home")} style={{ padding: "10px 24px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Back to marketplace</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <button onClick={() => setPage("home")} style={{ fontSize: 13, color: theme.textMuted, background: "none", border: "none", marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: theme.greenLight, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="60" height="60" viewBox="0 0 60 60"><ellipse cx="30" cy="34" rx="16" ry="22" fill={theme.green} opacity=".7"/><ellipse cx="30" cy="26" rx="11" ry="16" fill={theme.greenDark} opacity=".6"/></svg>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h2 className="serif" style={{ fontSize: 22, marginBottom: 2 }}>{l.variety} avocados</h2>
              <p style={{ fontSize: 13, color: theme.textMuted }}>{l.farmer} · {l.county} County</p>
            </div>
            <span style={{ fontSize: 11, background: theme.greenLight, color: theme.greenDark, padding: "3px 10px", borderRadius: 99 }}>{l.cert}</span>
          </div>
          <p style={{ fontSize: 14, color: theme.textMuted, marginBottom: 16, lineHeight: 1.6 }}>{l.desc}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[["Available",`${l.qty.toLocaleString()} kg`],["Harvest date",l.harvest],["Price",`Ksh ${l.price}/kg`],["Contact",l.phone]].map(([k,v]) => (
              <div key={k} style={{ background: theme.bg, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
            <label style={{ fontSize: 13, color: theme.textMuted, display: "block", marginBottom: 6 }}>Order quantity (kg)</label>
            <input type="number" min="1" max={l.qty} value={qty} onChange={e => setQty(Number(e.target.value))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, marginBottom: 10 }} />
            <label style={{ fontSize: 13, color: theme.textMuted, display: "block", marginBottom: 6 }}>Message to farmer (optional)</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="e.g. Can you deliver to Nakuru packhouse?"
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, resize: "none", marginBottom: 14 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 12, color: theme.textMuted }}>Total estimate</span>
                <div style={{ fontSize: 20, fontWeight: 500, color: theme.greenDark }}>Ksh {(qty * l.price).toLocaleString()}</div>
              </div>
              <button onClick={placeOrder} style={{ padding: "11px 28px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>
                {user ? "Place order" : "Sign up to order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Signup({ setPage, setUser }) {
  const [role, setRole] = useState("farmer");
  const [form, setForm] = useState({ name: "", phone: "", county: "", buyerType: "" });
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  function next() {
    if (!form.name || !form.phone || !form.county) { setError("Please fill all fields."); return; }
    setError("");
    setStep(2);
  }

  function finish() {
    setUser({ ...form, role });
    setPage(role === "farmer" ? "list" : "home");
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Join AvoConnect</h1>
        <p style={{ fontSize: 14, color: theme.textMuted }}>Free to join. Start trading in minutes.</p>
      </div>

      {step === 1 && (
        <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {["farmer","buyer"].map(r => (
              <button key={r} onClick={() => setRole(r)}
                style={{ padding: "12px", border: `2px solid ${role===r ? theme.green : theme.border}`, borderRadius: 10, background: role===r ? theme.greenLight : "none", color: role===r ? theme.greenDark : theme.textMuted, fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>
                {r === "farmer" ? "🌱 Farmer" : "🏪 Buyer"}
              </button>
            ))}
          </div>
          {[["Full name","name","text"],["Phone number","phone","tel"]].map(([label,key,type]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})} placeholder={label}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>County</label>
            <select value={form.county} onChange={e => setForm({...form,county:e.target.value})}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              <option value="">Select county</option>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10 }}>{error}</p>}
          <button onClick={next} style={{ width: "100%", padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Continue →</button>
          <p style={{ textAlign: "center", fontSize: 12, color: theme.textMuted, marginTop: 12 }}>
            Already have an account? <span onClick={() => setPage("login")} style={{ color: theme.green, cursor: "pointer" }}>Log in</span>
          </p>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>
            {role === "farmer" ? "Tell us about your farm" : "Tell us about your business"}
          </h3>
          {role === "buyer" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Buyer type</label>
              <select value={form.buyerType} onChange={e => setForm({...form,buyerType:e.target.value})}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
                <option value="">Select type</option>
                {BUYER_TYPES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          )}
          <div style={{ background: theme.greenLight, borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: theme.greenDark, lineHeight: 1.6 }}>
              {role === "farmer"
                ? "✅ After signing up you can list your avocados, set your price, and receive orders directly."
                : "✅ After signing up you can browse listings, post demand notices, and place orders with farmers."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: 12, border: `1px solid ${theme.border}`, background: "none", borderRadius: 10, fontSize: 14, color: theme.textMuted }}>← Back</button>
            <button onClick={finish} style={{ flex: 2, padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Create account</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ setPage, setUser }) {
  const [phone, setPhone] = useState("");
  function login() {
    if (!phone) return;
    setUser({ name: "Demo User", phone, role: "farmer", county: "Nakuru" });
    setPage("home");
  }
  return (
    <div style={{ maxWidth: 380, margin: "60px auto", padding: "0 16px" }}>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 28 }}>
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 6 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 20 }}>Log in with your phone number.</p>
        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Phone number</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX"
          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, marginBottom: 14 }} />
        <button onClick={login} style={{ width: "100%", padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, marginBottom: 12 }}>Log in</button>
        <p style={{ textAlign: "center", fontSize: 12, color: theme.textMuted }}>
          No account? <span onClick={() => setPage("signup")} style={{ color: theme.green, cursor: "pointer" }}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}

function ListForm({ setPage, user, onAdd }) {
  const [form, setForm] = useState({ variety: "Hass", qty: "", price: "", harvest: "", cert: "None", desc: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    if (!form.qty || !form.price || !form.harvest) { setError("Please fill quantity, price, and harvest date."); return; }
    onAdd({ ...form, id: Date.now(), farmer: user.name, county: user.county, phone: user.phone, qty: Number(form.qty), price: Number(form.price) });
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
        <button onClick={() => setPage("home")} style={{ padding: "10px 20px", border: `1px solid ${theme.border}`, borderRadius: 10, background: "none", fontSize: 14, color: theme.textMuted }}>View marketplace</button>
        <button onClick={() => { setForm({ variety:"Hass",qty:"",price:"",harvest:"",cert:"None",desc:"" }); setDone(false); }} style={{ padding: "10px 20px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14 }}>Add another listing</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <h2 className="serif" style={{ fontSize: 26, marginBottom: 4 }}>List your avocados</h2>
      <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 24 }}>Buyers across Kenya will see this listing immediately.</p>
      <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Variety</label>
            <select value={form.variety} onChange={e => setForm({...form,variety:e.target.value})}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              {VARIETIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Certification</label>
            <select value={form.cert} onChange={e => setForm({...form,cert:e.target.value})}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
              {["None","GlobalG.A.P","KEPHIS","Organic","KS EAS 12"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Quantity (kg)</label>
            <input type="number" value={form.qty} onChange={e => setForm({...form,qty:e.target.value})} placeholder="e.g. 500"
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Price (Ksh/kg)</label>
            <input type="number" value={form.price} onChange={e => setForm({...form,price:e.target.value})} placeholder="e.g. 32"
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Harvest / ready date</label>
          <input type="date" value={form.harvest} onChange={e => setForm({...form,harvest:e.target.value})}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={form.desc} onChange={e => setForm({...form,desc:e.target.value})} rows={3} placeholder="Describe your avocados — altitude, farm practices, delivery options…"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, resize: "none" }} />
        </div>
        {form.qty && form.price && (
          <div style={{ background: theme.greenLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: theme.greenDark }}>
              Total value: <strong>Ksh {(Number(form.qty) * Number(form.price)).toLocaleString()}</strong>
            </span>
          </div>
        )}
        {error && <p style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10 }}>{error}</p>}
        <button onClick={submit} style={{ width: "100%", padding: 13, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 15 }}>Publish listing</button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState(SAMPLE_LISTINGS);

  function addListing(l) {
    setListings(prev => [l, ...prev]);
  }

  const pageName = typeof page === "string" ? page : page.name;
  const pageData = typeof page === "object" ? page.data : null;

  return (
    <>
      <style>{css}</style>
      <Nav page={pageName} setPage={setPage} user={user} setUser={setUser} />
      <div style={{ minHeight: "calc(100vh - 56px)" }}>
        {pageName === "home" && <Home setPage={setPage} listings={listings} />}
        {pageName === "signup" && <Signup setPage={setPage} setUser={setUser} />}
        {pageName === "login" && <Login setPage={setPage} setUser={setUser} />}
        {pageName === "list" && user && <ListForm setPage={setPage} user={user} onAdd={addListing} />}
        {pageName === "listing" && <ListingDetail listing={pageData} setPage={setPage} user={user} />}
      </div>
    </>
  );
}