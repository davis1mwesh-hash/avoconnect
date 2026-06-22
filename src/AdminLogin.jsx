import { useState } from "react";
import { supabase } from "./App";

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35",
  brown: "#6B4C2A", brownLight: "#F5EFE6",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
};

const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text };
const btn = (bg, color, border) => ({ padding: "11px 24px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer" });

export function AdminSetPin({ userData, setPage, setProfile }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSetPin(e) {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError("PIN must be exactly 4 digits."); return; }
    if (pin !== confirmPin) { setError("PINs do not match. Please try again."); return; }
    setLoading(true);
    const { error: err } = await supabase.from("profiles").update({ pin, must_reset_pin: false }).eq("id", userData.id);
    setLoading(false);
    if (err) { setError("Failed to set PIN. Try again."); return; }
    const updatedProfile = { ...userData, pin, must_reset_pin: false };
    setProfile(updatedProfile);
    if (updatedProfile.admin_role === "super") setPage("admin");
    else if (updatedProfile.admin_role === "constituency") setPage("constituency-dashboard");
    else setPage("admin-login");
  }

  return (
    <div style={{ minHeight: "calc(100vh - 62px)", background: t.cream, display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "0 16px", width: "100%" }}>
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
            <h2 className="serif" style={{ fontSize: 22, marginBottom: 4 }}>Set Your Admin PIN</h2>
            <p style={{ fontSize: 12, color: t.textMuted }}>Welcome {userData.name}. Please set a new private PIN to continue.</p>
          </div>
          <form onSubmit={handleSetPin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>New 4-Digit PIN</label>
              <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Confirm PIN</label>
              <input type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="••••" style={inp} />
            </div>
            {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 2 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ ...btn(t.greenDark, t.white), marginTop: 6 }}>
              {loading ? "Saving…" : "Set PIN & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin({ setPage, setProfile }) {
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
    if (err || !data) { setError("No account found matching that number."); return; }
    if (data.role !== "admin") { setError("This account is not authorized for admin access."); return; }
    if (!data.pin || data.pin !== pin) { setError("Incorrect PIN. Please try again."); return; }
    if (data.must_reset_pin) { setPage({ name: "admin-set-pin", data }); return; }
    setProfile(data);
    if (data.admin_role === "super") setPage("admin");
    else if (data.admin_role === "constituency") setPage("constituency-dashboard");
    else { setError("Admin role not configured. Contact super admin."); }
  }

  return (
    <div style={{ minHeight: "calc(100vh - 62px)", background: t.cream, display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "0 16px", width: "100%" }}>
        <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
            <h2 className="serif" style={{ fontSize: 22, marginBottom: 4 }}>Admin Access</h2>
            <p style={{ fontSize: 12, color: t.textMuted }}>Restricted — authorized personnel only</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>Admin Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 0710701099" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4, fontWeight: 500 }}>PIN</label>
              <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" style={inp} />
            </div>
            {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 2 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ ...btn(t.greenDark, t.white), marginTop: 6 }}>
              {loading ? "Verifying…" : "Sign in"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 12, color: t.textMuted, marginTop: 18, cursor: "pointer" }}
             onClick={() => setPage("login")}>
            ← Back to main site
          </p>
        </div>
      </div>
    </div>
  );
}