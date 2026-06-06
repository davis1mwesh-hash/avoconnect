import React, { useState, useEffect } from 'react';

export default function LinkListingModal({ isOpen, onClose, selectedRequest, farmerListings, onSubmitOffer, theme }) {
  const t = theme;
  const [selectedListingId, setSelectedListingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter listings where the variety matches the buyer's requirement
  const matchingListings = farmerListings.filter(
    (l) => l.variety?.toLowerCase() === selectedRequest?.variety?.toLowerCase()
  );

  // Auto-select option if the farmer only has exactly one matching avocado lot
  useEffect(() => {
    if (matchingListings.length === 1) {
      setSelectedListingId(matchingListings[0].id);
    } else {
      setSelectedListingId('');
    }
  }, [selectedRequest, farmerListings]);

  if (!isOpen || !selectedRequest) return null;

  const handleSubmit = async () => {
    if (!selectedListingId) return;
    setIsSubmitting(true);
    try {
      await onSubmitOffer(selectedRequest.id, selectedListingId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: t.white, width: "100%", maxWidth: 440, borderRadius: 16, padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: t.text }}>Link Your Harvest Listing</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: t.textMuted }}>×</button>
        </div>

        {/* Selected Buyer Context Box */}
        <div style={{ background: t.greenLight, padding: 12, borderRadius: 10, fontSize: 13, color: t.text, lineHeight: "1.5" }}>
          Matching request from <strong>{selectedRequest.company_name}</strong>:<br />
          🌾 Looking for <strong>{selectedRequest.variety}</strong> (Min: {selectedRequest.min_quantity_kg?.toLocaleString()} kg)
        </div>

        {/* Dropdown Selection Logic */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: t.text }}>Select your matching farm listing:</label>
          {matchingListings.length === 0 ? (
            <div style={{ padding: "12px 14px", background: "#FEF2F2", borderRadius: 10, border: "1px solid #FEE2E2" }}>
              <p style={{ fontSize: 13, color: "#EF4444", margin: 0, fontWeight: 500 }}>⚠️ You don't have any active harvest listings for {selectedRequest.variety} avocados right now.</p>
            </div>
          ) : (
            <select 
              value={selectedListingId} 
              onChange={(e) => setSelectedListingId(e.target.value)} 
              style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.white, color: t.text, fontSize: 14 }}
            >
              <option value="">-- Choose an Available Listing --</option>
              {matchingListings.map((l) => (
                <option key={l.id} value={l.id}>
                  🧺 {l.quantity_kg?.toLocaleString()} kg — (Ksh {l.price_per_kg}/kg)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${t.border}`, background: "none", color: t.textMuted, fontSize: 14, fontWeight: 500 }}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!selectedListingId || isSubmitting} 
            style={{ 
              flex: 1, 
              padding: 11, 
              borderRadius: 10, 
              border: "none", 
              background: !selectedListingId || isSubmitting ? t.border : t.green, 
              color: "#fff", 
              fontWeight: 600,
              fontSize: 14,
              opacity: isSubmitting ? 0.8 : 1
            }}
          >
            {isSubmitting ? "Linking..." : "Send Offer"}
          </button>
        </div>

      </div>
    </div>
  );
}