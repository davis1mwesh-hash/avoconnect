import { useState } from "react";
import { supabase } from "./App";

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  red: "#EF4444", redLight: "#FEE2E2",
  amber: "#F59E0B",
};

const inp = {
  width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`,
  borderRadius: 10, fontSize: 14, background: t.white, color: t.text,
  fontFamily: "Inter, sans-serif", transition: "border .15s",
};

const btn = (bg, color, border) => ({
  padding: "10px 22px", background: bg, color,
  border: border || "none", borderRadius: 10, fontSize: 14,
  fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
});

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 36, padding: 0, lineHeight: 1,
              filter: (hovered || value) >= star ? "none" : "grayscale(1) opacity(0.3)",
              transform: hovered === star ? "scale(1.2)" : "scale(1)",
              transition: "transform .1s, filter .1s",
            }}
          >
            ⭐
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <div style={{ fontSize: 13, color: t.greenDark, fontWeight: 500 }}>
          {labels[hovered || value]}
        </div>
      )}
    </div>
  );
}

export default function ReviewModal({ order, profile, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const buyerName = order?.profiles?.name || "the buyer";

  async function submit() {
    if (!rating) { setError("Please select a star rating."); return; }
    setSaving(true); setError("");

    // Check if already reviewed
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("order_id", order.id)
      .eq("reviewer_id", profile.id)
      .maybeSingle();

    if (existing) {
      setError("You have already reviewed this order.");
      setSaving(false);
      return;
    }

    const { error: err } = await supabase.from("reviews").insert({
      order_id: order.id,
      reviewer_id: profile.id,
      reviewee_id: order.buyer_id,
      rating,
      comment: comment.trim() || null,
      reviewer_role: profile.role,
    });

    setSaving(false);
    if (err) { setError("Failed to save review: " + err.message); return; }

    // Notify buyer
    await supabase.from("notifications").insert({
      user_id: order.buyer_id,
      type: "completed",
      title: "You received a review ⭐",
      message: `${profile.name} rated their experience with you ${rating}/5 stars${comment ? `: "${comment}"` : "."}`,
    });

    setDone(true);
    if (onSaved) onSaved();
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: t.white, borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.2)" }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, marginBottom: 8 }}>Review submitted!</h3>
            <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 24 }}>
              Thank you for rating your experience with {buyerName}.
            </p>
            <button onClick={onClose} style={{ ...btn(t.green, t.white), width: "100%", padding: 13 }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20 }}>Rate this buyer</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: t.textMuted }}>✕</button>
            </div>

            <div style={{ background: t.cream, borderRadius: 12, padding: "12px 16px", marginBottom: 20, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 2 }}>Reviewing</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{buyerName}</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                Order: {order?.listings?.variety || "avocados"} · {order?.quantity_kg} kg · Ksh {(order?.quantity_kg * order?.price_per_kg)?.toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 10, fontWeight: 500 }}>
                How was your experience with this buyer? *
              </label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 5, fontWeight: 500 }}>
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="e.g. Paid on time, collected promptly, good communication…"
                style={{ ...inp, resize: "none" }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: t.red, marginBottom: 12, padding: "10px 12px", background: t.redLight, borderRadius: 8 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ ...btn("none", t.textMuted, `1px solid ${t.border}`), flex: 1 }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{ ...btn(t.green, t.white), flex: 2, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Submit review"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}