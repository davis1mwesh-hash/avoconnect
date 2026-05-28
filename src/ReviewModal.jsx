import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const t = {
  green: "#2D7A4F", greenDark: "#1A5C35", greenLight: "#EAF4EE",
  cream: "#FDFAF5", white: "#FFFFFF",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6",
  shadow: "0 2px 12px rgba(0,0,0,.06)",
  amber: "#F59E0B", amberLight: "#FEF3C7",
  red: "#EF4444", redLight: "#FEE2E2",
};

const STAR_LABELS = ["", "Poor", "Below average", "Average", "Good", "Excellent"];

const FARMER_PROMPTS = [
  "Showed up on time",
  "Paid agreed amount",
  "Professional & respectful",
  "Good communication",
  "Would trade again",
];

const BUYER_PROMPTS = [
  "Quality matched listing",
  "Ready on time",
  "Honest & transparent",
  "Good communication",
  "Would buy again",
];

// Recalculate and update trust score for a user
async function recalculateTrustScore(userId) {
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", userId);

  if (!reviews || reviews.length === 0) return;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  await supabase.from("profiles").update({
    trust_score: Math.round(avg * 10) / 10,
    total_ratings: reviews.length,
  }).eq("id", userId);
}

// ── Star Picker ────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 2,
              fontSize: 32, transition: "transform .1s",
              transform: (hovered || value) >= star ? "scale(1.1)" : "scale(1)",
              filter: (hovered || value) >= star ? "none" : "grayscale(1) opacity(0.3)",
            }}
          >
            ⭐
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <div style={{ fontSize: 13, color: t.amber, fontWeight: 500 }}>
          {STAR_LABELS[hovered || value]}
        </div>
      )}
    </div>
  );
}

// ── Review Card (display) ──────────────────────────────────────
export function ReviewCard({ review }) {
  return (
    <div style={{ background: t.cream, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{review.reviewer_name || "Anonymous"}</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>{review.reviewer_role === "farmer" ? "🌱 Farmer" : "🏪 Buyer"}</div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} style={{ fontSize: 14, filter: review.rating >= s ? "none" : "grayscale(1) opacity(0.3)" }}>⭐</span>
          ))}
        </div>
      </div>
      {review.comment && (
        <p style={{ fontSize: 13, color: t.text, lineHeight: 1.6, fontStyle: "italic" }}>"{review.comment}"</p>
      )}
      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
        {new Date(review.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

// ── Trust Score Badge ──────────────────────────────────────────
export function TrustBadge({ score, totalRatings, size = "normal" }) {
  if (!score || totalRatings === 0) return (
    <span style={{ fontSize: size === "small" ? 11 : 12, color: t.textMuted, background: "#F3F4F6", padding: "3px 10px", borderRadius: 99 }}>
      No ratings yet
    </span>
  );

  const color = score >= 4 ? t.green : score >= 2.5 ? t.amber : t.red;
  const bg = score >= 4 ? t.greenLight : score >= 2.5 ? t.amberLight : t.redLight;

  return (
    <span style={{
      fontSize: size === "small" ? 11 : 13,
      background: bg, color, padding: size === "small" ? "2px 8px" : "4px 12px",
      borderRadius: 99, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      ⭐ {Number(score).toFixed(1)} <span style={{ fontWeight: 400, opacity: 0.8 }}>({totalRatings})</span>
    </span>
  );
}

// ── Main ReviewModal ───────────────────────────────────────────
export default function ReviewModal({ order, profile, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);

  // Who are we reviewing?
  const isFarmer = profile.role === "farmer";
  const revieweeId = isFarmer ? order.buyer_id : order.farmer_id;
  const revieweeName = isFarmer ? order.buyer_name : order.farmer_name;
  const prompts = isFarmer ? FARMER_PROMPTS : BUYER_PROMPTS;

  useEffect(() => {
    checkExisting();
  }, []);

  async function checkExisting() {
    const { data } = await supabase
      .from("reviews")
      .select("id")
      .eq("order_id", order.id)
      .eq("reviewer_id", profile.id)
      .single();
    setAlreadyReviewed(!!data);
    setCheckingReview(false);
  }

  function toggleTag(tag) {
    setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  }

  async function submit() {
    if (rating === 0) { setError("Please select a star rating."); return; }
    setLoading(true);

    const fullComment = [
      tags.length ? `✓ ${tags.join("  ✓ ")}` : "",
      comment,
    ].filter(Boolean).join("\n");

    const { error: err } = await supabase.from("reviews").insert({
      order_id: order.id,
      reviewer_id: profile.id,
      reviewee_id: revieweeId,
      rating,
      comment: fullComment || null,
      reviewer_role: profile.role,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Recalculate trust score for the person being reviewed
    await recalculateTrustScore(revieweeId);

    // Notify reviewee
    await supabase.from("notifications").insert({
      user_id: revieweeId,
      type: "order",
      title: "New review received ⭐",
      message: `${profile.name} left you a ${rating}-star review. Your trust score has been updated.`,
    });

    setLoading(false);
    onSubmitted?.();
    onClose();
  }

  // Overlay
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: "20px 16px",
    }}>
      <div style={{
        background: t.white, borderRadius: 20, padding: 28,
        width: "100%", maxWidth: 480,
        boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
        animation: "slideUp .2s ease",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, marginBottom: 4 }}>
              Leave a review
            </h2>
            <p style={{ fontSize: 13, color: t.textMuted }}>
              {isFarmer ? "Rate this buyer" : "Rate this farmer"} — <strong>{revieweeName}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: t.textMuted, lineHeight: 1 }}>✕</button>
        </div>

        {checkingReview ? (
          <p style={{ textAlign: "center", color: t.textMuted, padding: 20 }}>Checking…</p>
        ) : alreadyReviewed ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Already reviewed</p>
            <p style={{ fontSize: 13, color: t.textMuted }}>You've already left a review for this order.</p>
            <button onClick={onClose} style={{ marginTop: 16, padding: "10px 24px", background: t.green, color: t.white, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Order summary */}
            <div style={{ background: t.cream, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 2 }}>Order summary</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {order.quantity_kg} kg {order.variety || "avocados"} · Ksh {(order.quantity_kg * order.price_per_kg).toLocaleString()}
              </div>
            </div>

            {/* Star rating */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 10 }}>
                Overall rating *
              </label>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* Quick tags */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 10 }}>
                What went well? (optional)
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {prompts.map(p => (
                  <button
                    key={p}
                    onClick={() => toggleTag(p)}
                    style={{
                      padding: "6px 14px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                      fontFamily: "Inter, sans-serif", transition: "all .15s",
                      background: tags.includes(p) ? t.greenLight : t.cream,
                      border: `1.5px solid ${tags.includes(p) ? t.green : t.border}`,
                      color: tags.includes(p) ? t.greenDark : t.textMuted,
                      fontWeight: tags.includes(p) ? 600 : 400,
                    }}
                  >
                    {tags.includes(p) ? "✓ " : ""}{p}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                Written review (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder={isFarmer
                  ? "e.g. Buyer arrived on time, paid full amount, very professional…"
                  : "e.g. Excellent quality Hass, well sorted, matched the listing exactly…"
                }
                style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, resize: "none", fontFamily: "Inter, sans-serif", background: t.cream }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: t.red, marginBottom: 12, padding: "10px 12px", background: t.redLight, borderRadius: 8 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, border: `1px solid ${t.border}`, borderRadius: 10, background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.textMuted }}>
                Cancel
              </button>
              <button onClick={submit} disabled={loading || rating === 0}
                style={{ flex: 2, padding: 12, background: rating === 0 ? "#ccc" : t.green, color: t.white, border: "none", borderRadius: 10, cursor: rating === 0 ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Submitting…" : "Submit review ⭐"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}