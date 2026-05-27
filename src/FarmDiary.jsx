import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import FarmInsights from "./FarmInsights";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const theme = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  brown: "#6B4C2A", brownLight: "#F5EFE6", cream: "#FDFAF5",
  white: "#FFFFFF", text: "#1C1C1A", textMuted: "#6B6B5F",
  border: "#E2DDD6", shadow: "0 2px 12px rgba(0,0,0,.06)",
};

const ACTIVITY_TYPES = [
  { value: "spraying", label: "🧴 Spraying", color: "#FEF3C7", textColor: "#92400E" },
  { value: "fertilizer", label: "🌱 Fertilizer", color: "#D1FAE5", textColor: "#065F46" },
  { value: "irrigation", label: "💧 Irrigation", color: "#DBEAFE", textColor: "#1E40AF" },
  { value: "harvest", label: "🥑 Harvest", color: "#E1F5EE", textColor: "#0F6E56" },
  { value: "maturity", label: "📏 Maturity Check", color: "#EDE9FE", textColor: "#5B21B6" },
  { value: "other", label: "📝 Other", color: "#F3F4F6", textColor: "#374151" },
];

const VARIETIES = ["Hass", "Fuerte", "Jumbo", "Pinkerton", "Reed", "Kienyeji"];

const AGE_RANGES = [
  "0–2 yrs (pre-bearing)",
  "3–5 yrs (early bearing)",
  "6–9 yrs (peak bearing)",
  "10–20 yrs (full bearing)",
  "21–40 yrs (mature)",
  "40+ yrs (old)",
];

const AGE_COLORS = {
  "0–2 yrs (pre-bearing)": { bg: "#FEF3C7", text: "#92400E" },
  "3–5 yrs (early bearing)": { bg: "#DBEAFE", text: "#1E40AF" },
  "6–9 yrs (peak bearing)": { bg: "#D1FAE5", text: "#065F46" },
  "10–20 yrs (full bearing)": { bg: "#E1F5EE", text: "#0F6E56" },
  "21–40 yrs (mature)": { bg: "#EDE9FE", text: "#5B21B6" },
  "40+ yrs (old)": { bg: "#F3F4F6", text: "#374151" },
};

function getActivity(value) {
  return ACTIVITY_TYPES.find(a => a.value === value) || ACTIVITY_TYPES[5];
}

export default function FarmDiary({ profile, setPage }) {
  const [orchards, setOrchards] = useState([]);
  const [selectedOrchard, setSelectedOrchard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [treeGroups, setTreeGroups] = useState([]);
  const [tab, setTab] = useState("diary");
  const [showAddOrchard, setShowAddOrchard] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [orchardForm, setOrchardForm] = useState({
    name: "", location: "", size_acres: "", total_trees: "", variety: "Hass", year_planted: ""
  });

  const [entryForm, setEntryForm] = useState({
    activity_type: "spraying", date: new Date().toISOString().split("T")[0],
    notes: "", quantity: "", product_used: "", photo_url: ""
  });

  const [groupForm, setGroupForm] = useState({
    variety: "Hass", age_range: AGE_RANGES[0], tree_count: "", year_planted: ""
  });

  useEffect(() => { loadOrchards(); }, []);
  useEffect(() => {
    if (selectedOrchard) {
      loadEntries(selectedOrchard.id);
      loadTreeGroups(selectedOrchard.id);
    }
  }, [selectedOrchard]);

  async function loadOrchards() {
    const { data } = await supabase.from("orchards").select("*").eq("farmer_id", profile.id).order("created_at", { ascending: false });
    setOrchards(data || []);
    if (data?.length > 0) setSelectedOrchard(data[0]);
    setLoading(false);
  }

  async function loadEntries(orchardId) {
    const { data } = await supabase.from("diary_entries").select("*").eq("orchard_id", orchardId).order("date", { ascending: false });
    setEntries(data || []);
  }

  async function loadTreeGroups(orchardId) {
    const { data } = await supabase.from("tree_groups").select("*").eq("orchard_id", orchardId).order("created_at", { ascending: true });
    setTreeGroups(data || []);
  }

  async function addOrchard() {
    if (!orchardForm.name) return;
    const { data, error } = await supabase.from("orchards").insert({
      ...orchardForm,
      size_acres: Number(orchardForm.size_acres) || null,
      total_trees: Number(orchardForm.total_trees) || null,
      year_planted: Number(orchardForm.year_planted) || null,
      farmer_id: profile.id,
    }).select().single();
    if (error) { alert(error.message); return; }
    setOrchards(prev => [data, ...prev]);
    setSelectedOrchard(data);
    setOrchardForm({ name: "", location: "", size_acres: "", total_trees: "", variety: "Hass", year_planted: "" });
    setShowAddOrchard(false);
  }

  async function addTreeGroup() {
    if (!groupForm.tree_count || !selectedOrchard) return;
    const { data, error } = await supabase.from("tree_groups").insert({
      ...groupForm,
      tree_count: Number(groupForm.tree_count),
      year_planted: Number(groupForm.year_planted) || null,
      orchard_id: selectedOrchard.id,
      farmer_id: profile.id,
    }).select().single();
    if (error) { alert(error.message); return; }
    setTreeGroups(prev => [...prev, data]);
    setGroupForm({ variety: "Hass", age_range: AGE_RANGES[0], tree_count: "", year_planted: "" });
    setShowAddGroup(false);
  }

  async function deleteTreeGroup(id) {
    if (!confirm("Delete this group?")) return;
    await supabase.from("tree_groups").delete().eq("id", id);
    setTreeGroups(prev => prev.filter(g => g.id !== id));
  }

  async function uploadPhoto(file) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("farm-photos").upload(path, file);
    if (error) { alert("Photo upload failed"); setUploading(false); return null; }
    const { data } = supabase.storage.from("farm-photos").getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  }

  async function addEntry() {
    if (!selectedOrchard) return;
    const { data, error } = await supabase.from("diary_entries").insert({
      ...entryForm,
      orchard_id: selectedOrchard.id,
      farmer_id: profile.id,
    }).select().single();
    if (error) { alert(error.message); return; }
    setEntries(prev => [data, ...prev]);
    setEntryForm({ activity_type: "spraying", date: new Date().toISOString().split("T")[0], notes: "", quantity: "", product_used: "", photo_url: "" });
    setShowAddEntry(false);
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("diary_entries").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function downloadReport() {
    if (!selectedOrchard) return;
    const lines = [];
    lines.push("AVOCONNECT FARM DIARY REPORT");
    lines.push("=".repeat(50));
    lines.push(`Farm: ${selectedOrchard.name}`);
    lines.push(`Farmer: ${profile.name} | Phone: ${profile.phone}`);
    lines.push(`County: ${profile.county}`);
    lines.push(`Location: ${selectedOrchard.location || "N/A"}`);
    lines.push(`Size: ${selectedOrchard.size_acres || "N/A"} acres`);
    lines.push(`Report Generated: ${new Date().toLocaleDateString()}`);
    lines.push("");
    lines.push("TREE CENSUS");
    lines.push("-".repeat(30));
    if (treeGroups.length === 0) {
      lines.push("No tree groups recorded.");
    } else {
      const total = treeGroups.reduce((s, g) => s + g.tree_count, 0);
      treeGroups.forEach(g => {
        lines.push(`${g.variety} | ${g.age_range} | ${g.tree_count} trees${g.year_planted ? ` | Planted: ${g.year_planted}` : ""}`);
      });
      lines.push(`TOTAL TREES: ${total}`);
    }
    lines.push("");
    lines.push("ACTIVITY LOG");
    lines.push("-".repeat(30));
    if (entries.length === 0) {
      lines.push("No entries recorded.");
    } else {
      entries.forEach(e => {
        const act = getActivity(e.activity_type);
        lines.push(`\n[${e.date}] ${act.label.replace(/[^\w\s]/g, "").trim()}`);
        if (e.product_used) lines.push(`  Product: ${e.product_used}`);
        if (e.quantity) lines.push(`  Quantity: ${e.quantity}`);
        if (e.notes) lines.push(`  Notes: ${e.notes}`);
      });
    }
    lines.push("");
    lines.push("=".repeat(50));
    lines.push("Generated by AvoConnect — Kenya's Avocado Marketplace");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedOrchard.name.replace(/\s/g, "_")}_farm_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalTrees = treeGroups.reduce((s, g) => s + g.tree_count, 0);

  if (loading) return <p style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>Loading farm diary…</p>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 4 }}>Farm Diary</h1>
          <p style={{ fontSize: 14, color: theme.textMuted }}>Track your orchard activities and share with buyers</p>
        </div>
        <button onClick={() => setShowAddOrchard(true)}
          style={{ padding: "9px 18px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
          + New orchard
        </button>
      </div>

      {orchards.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {orchards.map(o => (
            <button key={o.id} onClick={() => setSelectedOrchard(o)}
              style={{ padding: "8px 16px", borderRadius: 99, fontSize: 13, border: `1px solid ${selectedOrchard?.id === o.id ? theme.green : theme.border}`, background: selectedOrchard?.id === o.id ? theme.greenLight : theme.white, color: selectedOrchard?.id === o.id ? theme.greenDark : theme.textMuted, whiteSpace: "nowrap", cursor: "pointer" }}>
              🌳 {o.name}
            </button>
          ))}
        </div>
      )}

      {orchards.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: theme.white, borderRadius: 16, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌳</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No orchards yet</h3>
          <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 20 }}>Add your first orchard to start logging farm activities.</p>
          <button onClick={() => setShowAddOrchard(true)}
            style={{ padding: "10px 24px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
            Add orchard
          </button>
        </div>
      ) : selectedOrchard && (
        <>
          <div style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 2 }}>{selectedOrchard.name}</h2>
                <p style={{ fontSize: 13, color: theme.textMuted }}>📍 {selectedOrchard.location || profile.county}</p>
              </div>
              <button onClick={downloadReport}
                style={{ padding: "7px 14px", border: `1px solid ${theme.green}`, color: theme.green, borderRadius: 8, background: "none", fontSize: 12, cursor: "pointer" }}>
                ⬇ Download report
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[
                ["Variety", selectedOrchard.variety],
                ["Total Trees", totalTrees || selectedOrchard.total_trees || "—"],
                ["Size", selectedOrchard.size_acres ? `${selectedOrchard.size_acres} ac` : "—"],
                ["Planted", selectedOrchard.year_planted || "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: theme.cream, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}`, marginBottom: 16 }}>
            {["diary", "census", "insights"].map(tb => (
              <button key={tb} onClick={() => setTab(tb)}
                style={{ padding: "10px 20px", fontSize: 14, background: "none", border: "none", borderBottom: `2px solid ${tab === tb ? theme.green : "transparent"}`, color: tab === tb ? theme.green : theme.textMuted, fontWeight: tab === tb ? 500 : 400, cursor: "pointer" }}>
                {tb === "diary" ? "📓 Activity Log" : tb === "census" ? "🌳 Tree Census" : "✨ Insights"}
              </button>
            ))}
          </div>

          {/* Insights */}
          {tab === "insights" && (
            <FarmInsights profile={profile} orchards={orchards} entries={entries} />
          )}

          {/* Activity Log */}
          {tab === "diary" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={() => setShowAddEntry(true)}
                  style={{ padding: "8px 18px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
                  + Log activity
                </button>
              </div>
              {entries.length === 0 ? (
                <p style={{ textAlign: "center", color: theme.textMuted, padding: 40 }}>No activities logged yet.</p>
              ) : entries.map(e => {
                const act = getActivity(e.activity_type);
                return (
                  <div key={e.id} style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: act.color, color: act.textColor }}>{act.label}</span>
                          <span style={{ fontSize: 12, color: theme.textMuted }}>{e.date}</span>
                        </div>
                        {e.product_used && <div style={{ fontSize: 13, marginBottom: 4 }}>🧪 <strong>Product:</strong> {e.product_used}</div>}
                        {e.quantity && <div style={{ fontSize: 13, marginBottom: 4 }}>⚖️ <strong>Quantity:</strong> {e.quantity}</div>}
                        {e.notes && <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>{e.notes}</div>}
                        {e.photo_url && <img src={e.photo_url} alt="Farm" style={{ width: "100%", maxWidth: 300, borderRadius: 8, marginTop: 8 }} />}
                      </div>
                      <button onClick={() => deleteEntry(e.id)}
                        style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #FCA5A5", borderRadius: 8, background: "none", color: "#EF4444", marginLeft: 12, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tree Census */}
          {tab === "census" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 500 }}>🌳 Tree Census — {selectedOrchard.name}</h3>
                <button onClick={() => setShowAddGroup(true)}
                  style={{ padding: "7px 16px", background: theme.green, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  + Add group
                </button>
              </div>

              {treeGroups.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, background: theme.white, borderRadius: 14, border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
                  <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 16 }}>No tree groups yet. Add groups to build your census.</p>
                  <button onClick={() => setShowAddGroup(true)}
                    style={{ padding: "9px 20px", background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
                    Add first group
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                    {[
                      ["Total Trees", totalTrees.toLocaleString()],
                      ["Varieties", [...new Set(treeGroups.map(g => g.variety))].join(", ")],
                      ["Age Groups", treeGroups.length],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: theme.greenLight, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: theme.greenDark, marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: theme.greenDark }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tree groups list */}
                  {treeGroups.map(g => {
                    const colors = AGE_COLORS[g.age_range] || { bg: "#F3F4F6", text: "#374151" };
                    return (
                      <div key={g.id} style={{ background: theme.white, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🌳</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, background: theme.greenLight, color: theme.greenDark, padding: "2px 10px", borderRadius: 99 }}>{g.variety}</span>
                            <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 99, background: colors.bg, color: colors.text }}>{g.age_range}</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 2 }}>
                            {g.tree_count.toLocaleString()} trees
                          </div>
                          {g.year_planted && (
                            <div style={{ fontSize: 12, color: theme.textMuted }}>
                              Planted: {g.year_planted} · Age: {new Date().getFullYear() - g.year_planted} yrs
                            </div>
                          )}
                        </div>
                        <button onClick={() => deleteTreeGroup(g.id)}
                          style={{ fontSize: 12, padding: "5px 12px", border: "1px solid #FCA5A5", borderRadius: 8, background: "none", color: "#EF4444", cursor: "pointer", flexShrink: 0 }}>
                          Delete
                        </button>
                      </div>
                    );
                  })}

                  <div style={{ background: theme.brownLight, borderRadius: 10, padding: 14, marginTop: 8 }}>
                    <p style={{ fontSize: 13, color: theme.brown, lineHeight: 1.6 }}>
                      📋 This census is included in your downloadable farm report. Buyers can verify your tree ages and varieties before placing an order.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Orchard Modal */}
      {showAddOrchard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: theme.white, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Add new orchard</h3>
            {[["Orchard name", "name", "text"], ["Location / village", "location", "text"], ["Year planted", "year_planted", "number"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>{label}</label>
                <input type={type} value={orchardForm[key]} onChange={e => setOrchardForm({ ...orchardForm, [key]: e.target.value })} placeholder={label}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Total trees</label>
                <input type="number" value={orchardForm.total_trees} onChange={e => setOrchardForm({ ...orchardForm, total_trees: e.target.value })} placeholder="e.g. 200"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Size (acres)</label>
                <input type="number" value={orchardForm.size_acres} onChange={e => setOrchardForm({ ...orchardForm, size_acres: e.target.value })} placeholder="e.g. 5"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Main variety</label>
              <select value={orchardForm.variety} onChange={e => setOrchardForm({ ...orchardForm, variety: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
                {VARIETIES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddOrchard(false)} style={{ flex: 1, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 10, background: "none", fontSize: 14, color: theme.textMuted, cursor: "pointer" }}>Cancel</button>
              <button onClick={addOrchard} style={{ flex: 2, padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Save orchard</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tree Group Modal */}
      {showAddGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: theme.white, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Add tree group</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Variety</label>
              <select value={groupForm.variety} onChange={e => setGroupForm({ ...groupForm, variety: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
                {VARIETIES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Age range</label>
              <select value={groupForm.age_range} onChange={e => setGroupForm({ ...groupForm, age_range: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }}>
                {AGE_RANGES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Number of trees</label>
                <input type="number" value={groupForm.tree_count} onChange={e => setGroupForm({ ...groupForm, tree_count: e.target.value })} placeholder="e.g. 50"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Year planted</label>
                <input type="number" value={groupForm.year_planted} onChange={e => setGroupForm({ ...groupForm, year_planted: e.target.value })} placeholder="e.g. 2018"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddGroup(false)} style={{ flex: 1, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 10, background: "none", fontSize: 14, color: theme.textMuted, cursor: "pointer" }}>Cancel</button>
              <button onClick={addTreeGroup} style={{ flex: 2, padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Save group</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: theme.white, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Log farm activity</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Activity type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ACTIVITY_TYPES.map(a => (
                  <button key={a.value} onClick={() => setEntryForm({ ...entryForm, activity_type: a.value })}
                    style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${entryForm.activity_type === a.value ? theme.green : theme.border}`, background: entryForm.activity_type === a.value ? theme.greenLight : "none", fontSize: 12, color: entryForm.activity_type === a.value ? theme.greenDark : theme.textMuted, cursor: "pointer" }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Product used</label>
                <input value={entryForm.product_used} onChange={e => setEntryForm({ ...entryForm, product_used: e.target.value })} placeholder="e.g. NPK fertilizer"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Quantity</label>
                <input value={entryForm.quantity} onChange={e => setEntryForm({ ...entryForm, quantity: e.target.value })} placeholder="e.g. 50kg"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Notes</label>
              <textarea value={entryForm.notes} onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })} rows={3} placeholder="What did you do? Any observations?"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14, resize: "none" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 4 }}>Photo (optional)</label>
              <input type="file" accept="image/*" onChange={async e => {
                const file = e.target.files[0];
                if (!file) return;
                const url = await uploadPhoto(file);
                if (url) setEntryForm({ ...entryForm, photo_url: url });
              }} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14 }} />
              {uploading && <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Uploading photo…</p>}
              {entryForm.photo_url && <img src={entryForm.photo_url} alt="preview" style={{ width: "100%", borderRadius: 8, marginTop: 8 }} />}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddEntry(false)} style={{ flex: 1, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 10, background: "none", fontSize: 14, color: theme.textMuted, cursor: "pointer" }}>Cancel</button>
              <button onClick={addEntry} disabled={uploading} style={{ flex: 2, padding: 12, background: theme.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, opacity: uploading ? .7 : 1, cursor: "pointer" }}>Save entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}