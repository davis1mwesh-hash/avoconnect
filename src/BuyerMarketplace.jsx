import React from 'react';

// Added "= []" to provide a safe default value if the data is currently null or undefined
export default function BuyerMarketplace({ buyerRequirements = [], theme, onContactBuyer }) {
  // Gracefully fallback to your main design token object palette if 'theme' or 't' is passed
  const t = theme || {
    green: "#2D7A4F",
    white: "#FFFFFF",
    text: "#1C1C1A",
    textMuted: "#6B6B5F",
    border: "#E2DDD6",
    cream: "#FDFAF5",
    greenLight: "#EAF4EE"
  };
  return (
    <div style={{ padding: "24px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: t.text }}>
        Active Buyer Requests
      </h2>
      
      {buyerRequirements.length === 0 ? (
        <p style={{ color: t.textMuted, fontSize: 14 }}>No active commercial sourcing requirements found.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {buyerRequirements.map((req) => (
            <div 
              key={req.id} 
              style={{ 
                background: t.white, border: `1px solid ${t.border}`, borderRadius: 16, 
                padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                display: "flex", flexDirection: "column", justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    {/* Fallback to profiles / company details joined from database */}
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>
                      {req.profiles?.company_name || req.profiles?.name || "Enterprise Buyer"}
                    </h3>
                    <span style={{ fontSize: 12, color: t.textMuted, textTransform: "capitalize" }}>
                      📍 Destination: {req.delivery_location || "Not Specified"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: t.green }}>
                      KES {req.target_price_per_kg?.toLocaleString()}
                    </span>
                    <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>per KG</p>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${t.border}`, margin: "12px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: t.text }}>
                    <strong>Variety Required:</strong> {req.variety || "Hass"}
                  </div>
                  <div style={{ fontSize: 13, color: t.text }}>
                    <strong>Target Volume:</strong> {req.quantity_required_kg?.toLocaleString() || "0"} KG
                  </div>
                  
                  {req.additional_notes && (
                    <div style={{ fontSize: 12, color: t.textMuted, background: t.cream, padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${t.green}` }}>
                      📋 <strong>Notes:</strong> "{req.additional_notes}"
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => onContactBuyer(req)}
                style={{ width: "100%", background: t.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
              >
                🤝 Pitch Supply Lot
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}