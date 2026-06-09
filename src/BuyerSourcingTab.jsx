import React, { useState, useEffect } from 'react';
import { publishRequirement, fetchOffersForBuyer } from "./buyerService.jsx";

export default function BuyerSourcingTab({ userProfile }) {
  // Form State
  const [formData, setFormData] = useState({
    variety: 'Hass',
    location: '',
    targetPrice: '',
    minQty: '',
    notes: ''
  });

  // UI & Data State
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load incoming farmer offers when tab opens
  useEffect(() => {
    if (userProfile?.id) {
      loadIncomingOffers();
    }
  }, [userProfile]);

  const loadIncomingOffers = async () => {
    try {
      setLoading(true);
      const data = await fetchOffersForBuyer(userProfile.id);
      setOffers(data);
    } catch (error) {
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location || !formData.targetPrice || !formData.minQty) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      await publishRequirement({
        buyerId: userProfile.id,
        companyName: userProfile.name || 'Registered Buyer',
        variety: formData.variety,
        location: formData.location,
        targetPrice: formData.targetPrice,
        minQty: formData.minQty,
        notes: formData.notes
      });

      setMessage({ type: 'success', text: ' Sourcing requirement published successfully to the Market!' });
      
      // Reset form options
      setFormData({
        variety: 'Hass',
        location: '',
        targetPrice: '',
        minQty: '',
        notes: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to publish requirement.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-4">
      {/* SECTION 1: POST REQUIREMENT FORM */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Broadcast Sourcing Requirement</h2>
        <p className="text-sm text-gray-500 mb-6">
          Post what crop varieties and quantities your company needs. Farmers will view this on their dashboards and pitch matching harvests.
        </p>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Avocado Variety *</label>
            <select
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-sm"
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
            >
              <option value="Hass">Hass</option>
              <option value="Fuerte">Fuerte</option>
              <option value="Jumbo">Jumbo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Target Buying Location (County) *</label>
            <input
              type="text"
              placeholder="e.g. Meru, Murang'a, Kisii"
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-sm"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Target Price (KES / KG) *</label>
            <input
              type="number"
              placeholder="e.g. 120"
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-sm"
              value={formData.targetPrice}
              onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Minimum Accepted Volume (KG) *</label>
            <input
              type="number"
              placeholder="e.g. 2000"
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-sm"
              value={formData.minQty}
              onChange={(e) => setFormData({ ...formData, minQty: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Quality Specifications / Notes</label>
            <textarea
              rows="3"
              placeholder="e.g. Must be GlobalG.A.P certified, dry matter 21% minimum, sizing preferences..."
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-sm"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Publishing...' : 'Broadcast to Marketplace'}
            </button>
          </div>
        </form>
      </div>

      <hr className="border-gray-100" />

      {/* SECTION 2: INCOMING OFFERS DECK */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Incoming Harvest Pitch Offers</h2>
        <p className="text-sm text-gray-500 mb-4">Review crops that farmers have linked specifically to match your open purchase requirements.</p>

        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading incoming pitches...</div>
        ) : offers.length === 0 ? (
          <div className="bg-gray-50 text-center py-12 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
            No farmer pitch offers received yet for your active requirements.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-1 rounded-full">
                      Pitch Match: {offer.listings?.variety}
                    </span>
                    <span className="text-xs text-gray-400">
                      Offered {new Date(offer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm font-semibold text-gray-800">
                    Farmer: <span className="text-gray-600 font-normal">{offer.profiles?.name || 'AvoConnect Farmer'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    📍 Location: {offer.listings?.county} | 📦 Volume: {offer.listings?.quantity_kg?.toLocaleString()} KG | 💰 Price: KES {offer.listings?.price_per_kg}/KG
                  </p>
                  {offer.listings?.certification && (
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      🛡️ Certifications: {offer.listings.certification}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                  <a
                    href={`tel:${offer.profiles?.phone}`}
                    className="flex-1 md:flex-none border border-gray-200 hover:border-gray-300 text-center text-gray-700 font-medium text-xs px-4 py-2.5 rounded-lg transition"
                  >
                    📞 Call Farmer
                  </a>
                  <button className="flex-1 md:flex-none bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition">
                    View Complete Harvest Listing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}