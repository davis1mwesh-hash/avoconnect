import { supabase } from './App'; // Assumes your supabase client instance is exported from App.jsx

/**
 * 1. Broadcasts a buyer demand requirement to the marketplace
 */
export async function publishRequirement({ buyerId, variety, location, targetPrice, minQty, notes }) {
  const { data, error } = await supabase
    .from('buyer_requirements')
    .insert([
      {
        buyer_id: buyerId,
        variety: variety,
        delivery_location: location,
        target_price_per_kg: parseFloat(targetPrice),
        quantity_required_kg: parseFloat(minQty),
        additional_notes: notes,
        status: 'open'
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error publishing buyer requirement:", error);
    throw error;
  }
  return data;
}

/**
 * 2. Fetches all farmer pitch offers linked to this specific buyer's requirements
 */
export async function fetchOffersForBuyer(buyerId) {
  const { data, error } = await supabase
    .from('buyer_offers')
    .select(`
      id,
      status,
      created_at,
      requirement_id,
      farmer_id,
      listings (
        id,
        variety,
        county,
        quantity_kg,
        price_per_kg,
        certification
      ),
      profiles (
        name,
        phone
      )
    `)
    .eq('buyer_id', buyerId); // Checks junction rows directed to this buyer

  if (error) {
    console.error("Error fetching incoming offers:", error);
    throw error;
  }
  return data || [];
}