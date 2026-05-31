import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE", greenMid: "#4CAF78",
  brown: "#6B4C2A", brownLight: "#F5EFE6", brownMid: "#C4965A",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)", shadowHover: "0 8px 24px rgba(0,0,0,.10)",
  amber: "#F59E0B", amberLight: "#FEF3C7",
  blue: "#3B82F6", blueLight: "#DBEAFE",
};

const TYPES = [
  { key: "all",   label: "All Resources", icon: "🌿" },
  { key: "input", label: "Inputs",        icon: "🧪" },
  { key: "guide", label: "Guides",        icon: "📖" },
  { key: "link",  label: "Links",         icon: "🔗" },
];

const TYPE_STYLES = {
  input: { bg: "#EAF4EE", color: "#1A5C35", icon: "🧪", label: "Input / Product" },
  guide: { bg: "#FEF3C7", color: "#92400E", icon: "📖", label: "Guide / Education" },
  link:  { bg: "#DBEAFE", color: "#1E40AF", icon: "🔗", label: "External Link"    },
};

function Tag({ label, bg, color }) {
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: bg, color, fontWeight: 500 }}>{label}</span>;
}

function ResourceCard({ resource, onClick }) {
  const ts = TYPE_STYLES[resource.type] || TYPE_STYLES.input;
  const [imgError, setImgError] = useState(false);
  const companyName = resource.profiles?.company_name || resource.company_name || "—";

  return (
    <div
      onClick={onClick}
      style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 18, overflow: "hidden", boxShadow: t.shadow, transition: "box-shadow .2s, transform .2s", display: "flex", flexDirection: "column", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = t.shadowHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = t.shadow; e.currentTarget.style.transform = "none"; }}>
      {resource.photo_url && !imgError ? (
        <div style={{ height: 180, overflow: "hidden", background: t.cream }}>
          <img src={resource.photo_url} alt={resource.title} onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ height: 110, background: `linear-gradient(135deg, ${ts.bg}, ${t.cream})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{ts.icon}</div>
      )}
      <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <Tag label={`${ts.icon} ${ts.label}`} bg={ts.bg} color={ts.color} />
          {resource.category && <Tag label={resource.category} bg={t.brownLight} color={t.brown} />}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: t.text, lineHeight: 1.3 }}>{resource.title}</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>🏢 {companyName}</div>
        {resource.description && (
          <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 12, flex: 1 }}>
            {resource.description.length > 120 ? resource.description.substring(0, 120) + "…" : resource.description}
          </p>
        )}
        {resource.price && (
          <div style={{ fontSize: 15, fontWeight: 700, color: t.greenDark, marginBottom: 12 }}>{resource.price}</div>
        )}
        {resource.type === "link" && resource.external_url && (
          <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 12, color: t.blue, marginBottom: 12, display: "block", wordBreak: "break-all" }}>
            🔗 {resource.external_url.replace(/^https?:\/\//, "").substring(0, 45)}
          </a>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
          {resource.whatsapp && (
            <a href={`https://wa.me/${resource.whatsapp.replace(/\D/g, "")}?text=Hi, I found your listing on AvoConnect: ${encodeURIComponent(resource.title)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, padding: "9px 0", background: "#25D366", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              💬 WhatsApp
            </a>
          )}
          {resource.phone && (
            <a href={`tel:${resource.phone}`}
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, padding: "9px 0", background: "none", color: t.green, border: `1.5px solid ${t.green}`, borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              📞 Call
            </a>
          )}
          {resource.type === "link" && resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, padding: "9px 0", background: "#DBEAFE", color: "#1E40AF", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              🔗 Open
            </a>
          )}
          {resource.pdf_url && (
            <a href={resource.pdf_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, padding: "9px 0", background: "#EDE9FE", color: "#6D28D9", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              📄 PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceModal({ resource, onClose }) {
  const ts = TYPE_STYLES[resource.type] || TYPE_STYLES.input;
  const companyName = resource.profiles?.company_name || resource.company_name || "—";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: t.white, borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.2)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Tag label={`${ts.icon} ${ts.label}`} bg={ts.bg} color={ts.color} />
            {resource.category && <Tag label={resource.category} bg={t.brownLight} color={t.brown} />}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: t.textMuted, lineHeight: 1 }}>✕</button>
        </div>

        {/* Photo */}
        {resource.photo_url && (
          <img src={resource.photo_url} alt={resource.title}
            style={{ width: "100%", borderRadius: 12, marginBottom: 16, maxHeight: 260, objectFit: "cover" }} />
        )}

        {/* Title & company */}
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, marginBottom: 6, color: t.text }}>{resource.title}</h2>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>🏢 {companyName}</p>

        {/* Description */}
        {resource.description && (
          <p style={{ fontSize: 14, color: t.text, lineHeight: 1.8, marginBottom: 16 }}>{resource.description}</p>
        )}

        {/* Price */}
        {resource.price && (
          <div style={{ fontSize: 20, fontWeight: 700, color: t.greenDark, marginBottom: 16 }}>{resource.price}</div>
        )}

        {/* External URL */}
        {resource.external_url && (
          <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", fontSize: 13, color: t.blue, marginBottom: 16, wordBreak: "break-all" }}>
            🔗 {resource.external_url}
          </a>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {resource.whatsapp && (
            <a href={`https://wa.me/${resource.whatsapp.replace(/\D/g, "")}?text=Hi, I found your listing on AvoConnect: ${encodeURIComponent(resource.title)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 120, padding: "12px 0", background: "#25D366", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              💬 WhatsApp
            </a>
          )}
          {resource.phone && (
            <a href={`tel:${resource.phone}`}
              style={{ flex: 1, minWidth: 120, padding: "12px 0", background: "none", color: t.green, border: `1.5px solid ${t.green}`, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              📞 Call
            </a>
          )}
          {resource.pdf_url && (
            <a href={resource.pdf_url} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 120, padding: "12px 0", background: "#EDE9FE", color: "#6D28D9", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              📄 Download PDF
            </a>
          )}
          {resource.type === "link" && resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 120, padding: "12px 0", background: "#DBEAFE", color: "#1E40AF", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              🔗 Open link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Resources({ setPage, profile }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select("*, profiles(company_name, phone)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setResources(data || []);
    setLoading(false);
  }

  const filtered = resources.filter(r => {
    const matchType = activeType === "all" || r.type === activeType;
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.profiles?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || r.category === category;
    return matchType && matchSearch && matchCategory;
  });

  const allCategories = ["All", ...new Set(resources.map(r => r.category).filter(Boolean))];
  const counts = {
    all: resources.length,
    input: resources.filter(r => r.type === "input").length,
    guide: resources.filter(r => r.type === "guide").length,
    link:  resources.filter(r => r.type === "link").length,
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${t.brown} 0%, ${t.brownMid} 100%)`, padding: "48px 24px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "rgba(255,255,255,.15)", color: "#fff", padding: "5px 14px", borderRadius: 99, marginBottom: 18 }}>
            🌿 Curated avocado resources
          </div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 38, lineHeight: 1.15, color: "#fff", marginBottom: 12 }}>
            Everything you need.<br />In one place.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.8)", marginBottom: 28, lineHeight: 1.7 }}>
            Verified inputs, expert guides, and curated links — all reviewed and approved for Kenya's avocado farmers.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search resources, companies, products…"
              style={{ flex: 1, minWidth: 220, padding: "12px 16px", border: "none", borderRadius: 12, fontSize: 14, background: "rgba(255,255,255,.95)", color: t.text, fontFamily: "Inter, sans-serif" }} />
            {profile?.role === "company" && (
              <button onClick={() => setPage("company-dashboard")}
                style={{ padding: "12px 20px", background: t.green, color: t.white, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                + Submit resource
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div style={{ background: t.white, borderBottom: `1px solid ${t.border}`, overflowX: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", padding: "0 16px" }}>
          {TYPES.map(tp => (
            <button key={tp.key} onClick={() => setActiveType(tp.key)}
              style={{ padding: "13px 20px", fontSize: 14, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap", borderBottom: `2px solid ${activeType === tp.key ? t.green : "transparent"}`, color: activeType === tp.key ? t.green : t.textMuted, fontWeight: activeType === tp.key ? 600 : 400 }}>
              {tp.icon} {tp.label}
              <span style={{ marginLeft: 6, fontSize: 11, background: activeType === tp.key ? t.greenLight : "#f3f4f6", color: activeType === tp.key ? t.greenDark : t.textMuted, padding: "1px 7px", borderRadius: 99 }}>
                {counts[tp.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      {allCategories.length > 1 && (
        <div style={{ background: t.cream, borderBottom: `1px solid ${t.border}`, padding: "10px 16px", overflowX: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 8 }}>
            {allCategories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding: "5px 14px", fontSize: 12, borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif", fontWeight: category === c ? 600 : 400, background: category === c ? t.green : t.white, color: category === c ? t.white : t.textMuted, border: `1px solid ${category === c ? t.green : t.border}` }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
            <p>Loading resources…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: t.textMuted, marginBottom: 6 }}>No resources found.</p>
            <p style={{ fontSize: 13, color: t.textMuted }}>Try a different filter or search term.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>{filtered.length} resource{filtered.length !== 1 ? "s" : ""}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 20 }}>
              {filtered.map(r => (
                <ResourceCard key={r.id} resource={r} onClick={() => setSelected(r)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Company CTA */}
      {(!profile || profile.role !== "company") && (
        <div style={{ background: t.brownLight, borderTop: `1px solid ${t.border}`, padding: "36px 24px", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, marginBottom: 8 }}>Are you a company?</h3>
          <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 20 }}>List your products, guides, or links and reach thousands of Kenyan avocado farmers.</p>
          <button onClick={() => setPage("signup")}
            style={{ padding: "12px 28px", background: t.brown, color: t.white, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Register your company →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && <ResourceModal resource={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}