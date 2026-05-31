import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  brown: "#6B4C2A", brownLight: "#F5EFE6",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  amber: "#F59E0B", amberLight: "#FEF3C7",
  red: "#EF4444", redLight: "#FEE2E2",
};

const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text, fontFamily: "Inter, sans-serif", transition: "border .15s" };
const btn = (bg, color, border) => ({ padding: "10px 22px", background: bg, color, border: border || "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" });

const TYPE_OPTIONS = [
  { value: "input", label: "🧪 Input / Product", desc: "Fertilizers, pesticides, seeds, tools, irrigation" },
  { value: "guide", label: "📖 Guide / Education", desc: "How-to guides, best practices, educational content" },
  { value: "link",  label: "🔗 External Link",    desc: "Articles, research papers, websites, videos" },
];

const CATEGORIES = {
  input: ["Fertilizer","Pesticide","Fungicide","Seeds","Irrigation","Tools","Packaging","Other"],
  guide: ["Pest management","Disease control","Harvesting","Post-harvest","Export","Soil health","Irrigation","General"],
  link:  ["Research","News","Market prices","Export guides","Government","Other"],
};

const STATUS_STYLES = {
  pending:  { bg: t.amberLight, color: "#92400E", label: "⏳ Pending review" },
  approved: { bg: t.greenLight, color: t.greenDark, label: "✅ Approved" },
  rejected: { bg: t.redLight,   color: t.red,       label: "❌ Rejected" },
};

function ResourceForm({ profile, onSave, onCancel, editing }) {
  const [form, setForm] = useState(editing || {
    type: "input", title: "", description: "", category: "",
    price: "", phone: "", whatsapp: "", external_url: "", photo_url: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(editing?.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const pdfRef = useRef();
const [pdfFile, setPdfFile] = useState(null);
const [pdfName, setPdfName] = useState(editing?.pdf_url ? "Existing file" : "");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function pickPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function pickPdf(e) {
  const file = e.target.files[0];
  if (!file) return;
  setPdfFile(file);
  setPdfName(file.name);
}

  async function save() {
    if (!form.title) { setError("Title is required."); return; }
    if (form.type === "link" && !form.external_url) { setError("URL is required for link type."); return; }
    setSaving(true);
    let photo_url = form.photo_url || "";

    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop();
      const path = `resources/${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("resources").upload(path, photoFile, { upsert: true });
      setUploading(false);
      if (upErr) { setError("Photo upload failed: " + upErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    let pdf_url = form.pdf_url || "";
if (pdfFile) {
  const ext = pdfFile.name.split(".").pop();
  const path = `resources/${profile.id}/docs/${Date.now()}.${ext}`;
  const { error: pdfErr } = await supabase.storage.from("resources").upload(path, pdfFile, { upsert: true });
  if (pdfErr) { setError("PDF upload failed: " + pdfErr.message); setSaving(false); return; }
  const { data: pdfUrlData } = supabase.storage.from("resources").getPublicUrl(path);
  pdf_url = pdfUrlData.publicUrl;
}

    const payload = { ...form, photo_url, pdf_url, company_id: profile.id, status: "pending" };
    let error;
    if (editing?.id) {
      ({ error } = await supabase.from("resources").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("resources").insert(payload));
    }
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSave();
  }

  const cats = CATEGORIES[form.type] || [];

  return (
    <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 18, padding: 24, boxShadow: t.shadow }}>
      <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 20 }}>
        {editing ? "Edit resource" : "Submit new resource"}
      </h3>

      {/* Type selector */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 8, fontWeight: 500 }}>Resource type *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => f("type", opt.value)}
              style={{ padding: 12, border: `2px solid ${form.type === opt.value ? t.green : t.border}`, borderRadius: 12, background: form.type === opt.value ? t.greenLight : "none", cursor: "pointer", textAlign: "left", fontFamily: "Inter, sans-serif" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.type === opt.value ? t.greenDark : t.text, marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Title *</label>
        <input value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Dithane M45 Fungicide 1kg" style={inp} />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Description</label>
        <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3}
          placeholder="Describe your product, guide, or link. What will farmers get from this?"
          style={{ ...inp, resize: "vertical", minHeight: 80 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Category */}
        <div>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Category</label>
          <select value={form.category} onChange={e => f("category", e.target.value)} style={inp}>
            <option value="">Select category</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {/* Price (inputs only) */}
        {form.type === "input" && (
          <div>
            <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Price</label>
            <input value={form.price} onChange={e => f("price", e.target.value)} placeholder="e.g. Ksh 850 per kg" style={inp} />
          </div>
        )}
        {/* External URL (links only) */}
        {form.type === "link" && (
          <div>
            <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>URL *</label>
            <input value={form.external_url} onChange={e => f("external_url", e.target.value)} placeholder="https://…" style={inp} />
          </div>
        )}
      </div>

      {/* Contact */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Phone number</label>
          <input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="07XXXXXXXXX" style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>WhatsApp number</label>
          <input value={form.whatsapp} onChange={e => f("whatsapp", e.target.value)} placeholder="2547XXXXXXXX" style={inp} />
        </div>
      </div>

      {/* Photo upload */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>Photo (optional)</label>
        <div onClick={() => fileRef.current.click()}
          style={{ border: `2px dashed ${photoPreview ? t.green : t.border}`, borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "center", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", background: t.cream }}>
          {photoPreview ? (
            <img src={photoPreview} alt="preview" style={{ maxHeight: 160, borderRadius: 8, objectFit: "cover" }} />
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>Click to upload product photo</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>JPG or PNG, max 10MB</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />
        {photoPreview && (
          <button onClick={() => { setPhotoFile(null); setPhotoPreview(""); f("photo_url", ""); }}
            style={{ fontSize: 12, color: t.textMuted, background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
            ✕ Remove photo
          </button>
        )}
      </div>


{/* PDF / Book upload */}
<div style={{ marginBottom: 20 }}>
  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>
    PDF / Book (optional)
  </label>
  <div onClick={() => pdfRef.current.click()}
    style={{ border: `2px dashed ${pdfName ? t.green : t.border}`, borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "center", background: t.cream }}>
    {pdfName ? (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 28 }}>📄</span>
        <span style={{ fontSize: 13, color: t.greenDark, fontWeight: 500 }}>{pdfName}</span>
      </div>
    ) : (
      <div>
        <div style={{ fontSize: 28, marginBottom: 4 }}>📄</div>
        <div style={{ fontSize: 13, color: t.textMuted }}>Click to upload PDF or book</div>
        <div style={{ fontSize: 11, color: t.textMuted }}>PDF, max 20MB</div>
      </div>
    )}
  </div>
  <input ref={pdfRef} type="file" accept=".pdf,.doc,.docx,.epub" onChange={pickPdf} style={{ display: "none" }} />
  {pdfName && (
    <button onClick={() => { setPdfFile(null); setPdfName(""); }}
      style={{ fontSize: 12, color: t.textMuted, background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
      ✕ Remove file
    </button>
  )}
</div>
      {/* Admin note preview */}
      <div style={{ background: t.amberLight, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
          ⏳ Your submission will be reviewed by AvoConnect admin before it appears publicly. You'll receive a notification once reviewed.
        </p>
      </div>

      {error && <p style={{ fontSize: 13, color: t.red, marginBottom: 12, padding: "10px 12px", background: t.redLight, borderRadius: 8 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={saving || uploading}
          style={{ ...btn(t.green, t.white), flex: 2, opacity: (saving || uploading) ? 0.7 : 1 }}>
          {uploading ? "Uploading photo…" : saving ? "Submitting…" : editing ? "Save changes" : "Submit for review"}
        </button>
      </div>
    </div>
  );
}

export default function CompanyDashboard({ profile, setPage }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editResource, setEditResource] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select("*")
      .eq("company_id", profile.id)
      .order("created_at", { ascending: false });
    setResources(data || []);
    setLoading(false);
  }

  async function deleteResource(id) {
    if (!confirm("Delete this resource?")) return;
    await supabase.from("resources").delete().eq("id", id);
    setResources(p => p.filter(r => r.id !== id));
  }

  function handleSave() {
    setShowForm(false);
    setEditResource(null);
    load();
  }

  const stats = {
    total: resources.length,
    approved: resources.filter(r => r.status === "approved").length,
    pending: resources.filter(r => r.status === "pending").length,
    rejected: resources.filter(r => r.status === "rejected").length,
  };

  if (showForm || editResource) return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 16px" }}>
      <button onClick={() => { setShowForm(false); setEditResource(null); }}
        style={{ fontSize: 13, color: t.textMuted, background: "none", border: "none", cursor: "pointer", marginBottom: 20 }}>
        ← Back to dashboard
      </button>
      <ResourceForm
        profile={profile}
        editing={editResource}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditResource(null); }}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, marginBottom: 4 }}>Company Dashboard</h1>
          <p style={{ fontSize: 14, color: t.textMuted }}>{profile.company_name || profile.name} · {profile.county}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ ...btn(t.green, t.white), padding: "10px 20px" }}>
          + Submit resource
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 28 }}>
        {[["Total", stats.total, "🌿", t.green], ["Approved", stats.approved, "✅", t.greenDark], ["Pending", stats.pending, "⏳", t.amber], ["Rejected", stats.rejected, "❌", t.red]].map(([label, val, icon, color]) => (
          <div key={label} style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: t.shadow }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 24, color, marginBottom: 2 }}>{val}</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Resources list */}
      {loading ? (
        <p style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>Loading…</p>
      ) : resources.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: t.white, borderRadius: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <p style={{ color: t.textMuted, marginBottom: 16 }}>No resources yet. Submit your first one.</p>
          <button onClick={() => setShowForm(true)} style={{ ...btn(t.green, t.white), padding: "10px 24px" }}>+ Submit resource</button>
        </div>
      ) : resources.map(r => {
        const ss = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
        return (
          <div key={r.id} style={{ background: t.white, border: `1px solid ${r.status === "rejected" ? "#FCA5A5" : t.border}`, borderRadius: 14, padding: 18, marginBottom: 10, boxShadow: t.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: ss.bg, color: ss.color, fontWeight: 500 }}>{ss.label}</span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: t.brownLight, color: t.brown, fontWeight: 500 }}>{r.type}</span>
                  {r.category && <span style={{ fontSize: 11, color: t.textMuted }}>· {r.category}</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.title}</div>
                {r.description && <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 4 }}>{r.description.substring(0, 100)}{r.description.length > 100 ? "…" : ""}</p>}
                {r.admin_note && r.status === "rejected" && (
                  <div style={{ background: t.redLight, borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: t.red }}>Admin note: {r.admin_note}</span>
                  </div>
                )}
              </div>
              {r.photo_url && (
                <img src={r.photo_url} alt={r.title} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, marginLeft: 12, flexShrink: 0 }} />
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setEditResource(r)} style={{ ...btn("none", t.green, `1px solid ${t.green}`), padding: "6px 14px", fontSize: 12 }}>Edit</button>
              <button onClick={() => deleteResource(r.id)} style={{ ...btn("none", t.red, "1px solid #FCA5A5"), padding: "6px 14px", fontSize: 12 }}>Delete</button>
              <button onClick={() => setPage("resources")} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), padding: "6px 14px", fontSize: 12 }}>View page →</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}