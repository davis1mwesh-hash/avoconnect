import React, { useState, useEffect } from "react";
import { supabase } from "./App";

const t = {
  green: "#2D7A4F",
  greenDark: "#1A5C35",
  greenLight: "#EAF4EE",
  brown: "#6B4C2A",
  brownLight: "#F5EFE6",
  cream: "#FDFAF5",
  white: "#FFFFFF",
  text: "#1C1C1A",
  textMuted: "#6B6B5F",
  border: "#E2DDD6",
  shadow: "0 12px 40px rgba(0,0,0,0.14)",
  red: "#EF4444",
  redLight: "#FEE2E2"
};

const btn = (bg, color, border) => ({
  padding: "10px 22px",
  background: bg,
  color,
  border: border || "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif"
});

export default function LinkListingModal({ requirement, profile, onClose }) {
  const [myListings, setMyListings] = useState([]);
  const [existingOfferIds, setExistingOfferIds] = useState(new Set());
  const [selectedListingId, setSelectedListingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadMatchingLots();
  }, [requirement]);

  async function loadMatchingLots() {
  try {
    setLoading(true);
    setError("");

    const { data: listings, error: listErr } = await supabase
      .from("listings")
      .select("*")
      .eq("farmer_id", profile.id)
      .eq("variety", requirement.variety)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (listErr) throw listErr;
    setMyListings(listings || []);
  } catch (err) {
    console.error("Error loading lots:", err);
    setError("Failed to fetch matching farm lots.");
  } finally {
    setLoading(false);
  }
}

  async function handlePitch(e) {
    e.preventDefault();
    if (!selectedListingId) {
      setError("Please pick a harvest lot configuration to pitch.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const chosenListing = myListings.find(l => l.id === selectedListingId);

     const { error: insertErr } = await supabase
  .from("pitches")
  .insert({
    farmer_id: profile.id,
    buyer_id: requirement.buyer_id,
    requirement_id: requirement.id,
    listing_id: chosenListing.id,
    message: "",
    status: "pending"
  });

if (!insertErr) {
  await supabase.from("notifications").insert({
    user_id: requirement.buyer_id,
    type: "pitch",
    title: "New Harvest Pitch 🥑",
    message: `${profile.name} pitched ${chosenListing.quantity_kg?.toLocaleString()} kg of ${chosenListing.variety} at Ksh ${chosenListing.price_per_kg}/kg for your ${requirement.variety} requirement.`,
  });
}

      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error submitting commercial pitch lot:", err);
      setError(err.message || "Failed to publish offer pitch row.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div style={{
        background: t.white, border: `1px solid ${t.border}`, borderRadius: 20,
        boxShadow: t.shadow, maxWidth: 480, width: "100%", padding: 24, position: "relative"
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: t.textMuted }}
        >
          ✕
        </button>

        <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, marginBottom: 6, color: t.text }}>
          Pitch Supply Lot Match
        </h3>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
          Link your active crop volume lot to this buyer's matching <strong>{requirement.variety}</strong> tender request.
        </p>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: t.greenDark, marginBottom: 4 }}>Pitch Sent Successfully!</h4>
            <p style={{ fontSize: 13, color: t.textMuted }}>The buyer has been notified of your matching lot.</p>
          </div>
        ) : loading ? (
          <p style={{ textAlign: "center", fontSize: 14, color: t.textMuted, padding: "20px 0" }}>
            Scanning your active matching lots…
          </p>
        ) : (
          <form onSubmit={handlePitch}>
            {error && (
              <p style={{ fontSize: 13, color: t.red, padding: 10, background: t.redLight, borderRadius: 8, marginBottom: 16 }}>
                {error}
              </p>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 8, fontWeight: 600 }}>
                SELECT MATCHING LOT VOLUME
              </label>

              {myListings.length === 0 ? (
                <div style={{ padding: 16, background: t.cream, borderRadius: 12, border: `1px solid ${t.border}`, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: t.textMuted, margin: "0 0 10px 0" }}>
                    No active <strong>{requirement.variety}</strong> listings found.
                  </p>
                  <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
                    Please add or activate a matching harvest lot from your dashboard grid configuration first.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto" }}>
                  {myListings.map(l => {
                    const alreadyPitched = existingOfferIds.has(l.id);
                    return (
                      <label 
                        key={l.id} 
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: 12,
                          background: selectedListingId === l.id ? t.greenLight : t.white,
                          border: `1.5px solid ${selectedListingId === l.id ? t.green : t.border}`,
                          borderRadius: 12, cursor: alreadyPitched ? "not-allowed" : "pointer",
                          opacity: alreadyPitched ? 0.6 : 1
                        }}
                      >
                        <input
                          type="radio"
                          name="listingMatch"
                          value={l.id}
                          disabled={alreadyPitched}
                          checked={selectedListingId === l.id}
                          onChange={() => setSelectedListingId(l.id)}
                          style={{ accentColor: t.green }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                            📦 {l.quantity_kg?.toLocaleString()} KG Lot
                          </div>
                          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                            KES {l.price_per_kg}/KG · Harvest: {l.harvest_date} {l.certification !== "None" && `· 🛡️ ${l.certification}`}
                          </div>
                        </div>
                        {alreadyPitched && (
                          <span style={{ fontSize: 11, background: t.brownLight, color: t.brown, padding: "2px 8px", borderRadius: 6, fontWeight: 500 }}>
                            Pitched
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
              <button 
                type="button" 
                onClick={onClose} 
                style={{ ...btn("none", t.textMuted, `1.5px solid ${t.border}`), flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedListingId}
                style={{ ...btn(t.green, t.white), flex: 2, opacity: (submitting || !selectedListingId) ? 0.6 : 1 }}
              >
                {submitting ? "Linking Lot..." : "Confirm Pitch Supply"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}