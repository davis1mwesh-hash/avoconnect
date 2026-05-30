import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Assuming 't' contains your theme colors passed via props or imported
export function UserResourcesDisplay({ t }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'input', 'guide', 'link'

  useEffect(() => {
    fetchApprovedResources();
  }, []);

  async function fetchApprovedResources() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resources")
        .select("*, profiles(company_name, name, phone)")
        .eq("status", "approved") // 👈 CRITICAL: Only pulls items you clicked "Approve & publish" on
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error("Error loading resources:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const TYPE_LABELS = { input: "🌿 Input", guide: "📖 Guide", link: "🔗 Link" };
  
  // Filter resources locally based on sub-tabs
  const filteredResources = activeTab === "all" 
    ? resources 
    : resources.filter(r => r.type === activeTab);

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Category Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
        {["all", "input", "guide", "link"].map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            style={{
              padding: "8px 16px",
              borderRadius: "99px",
              fontSize: "13px",
              cursor: "pointer",
              border: "none",
              fontWeight: activeTab === type ? 600 : 400,
              background: activeTab === type ? t.green : t.brownLight,
              color: activeTab === type ? t.white : t.textMuted,
              whiteSpace: "nowrap"
            }}
          >
            {type === "all" ? "🌐 All Resources" : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Grid List */}
      {loading ? (
        <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading available marketplace resources...</p>
      ) : filteredResources.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
          <p style={{ color: t.textMuted }}>No active resources listed in this section yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filteredResources.map(r => (
            <div key={r.id} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.shadow, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: t.greenLight, color: t.greenDark, fontWeight: 500 }}>{TYPE_LABELS[r.type]}</span>
                  {r.category && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: t.brownLight, color: t.brown, fontWeight: 500 }}>{r.category}</span>}
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</div>
                  {r.photo_url && (
                    <img src={r.photo_url} alt={r.title} style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  )}
                </div>

                {r.description && <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5, marginBottom: 12 }}>{r.description}</p>}
              </div>

              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>Supplier</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{r.profiles?.company_name || r.profiles?.name}</div>
                  </div>
                  {r.price && <div style={{ fontSize: 14, color: t.greenDark, fontWeight: 600 }}>{r.price}</div>}
                </div>

                {r.external_url ? (
                  <a href={r.external_url} target="_blank" rel="noopener noreferrer" 
                     style={{ display: "block", textAlign: "center", marginTop: 12, padding: "8px", background: t.green, color: t.white, borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
                    Open Resource Link ↗
                  </a>
                ) : (
                  <a href={`tel:${r.profiles?.phone}`} 
                     style={{ display: "block", textAlign: "center", marginTop: 12, padding: "8px", background: t.brownLight, color: t.text, borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
                    📞 Call Supplier ({r.profiles?.phone})
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}