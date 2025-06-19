'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Offer {
  id: string;
  title: string;
  description: string;
  category: string;
  image_path: string;
  website_url: string;
  offer_name_ar: string;
  contact_number: string;
  effective_date: string;
  discontinue_date: string;
  is_unlimited: number;
  status: string;
  category_id: string;
  offer_type: string;
  created_at: string;
  updated_at: string;
}

export default function NewOffersGrid() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/mazaya/new');

        if (!response.ok) {
          throw new Error(`Error fetching offers: ${response.status}`);
        }

        const data = await response.json();
        const allOffers = data.offers || [];

        // Take only the last 9 offers
        const limitedOffers = allOffers.slice(0, 9);
        setOffers(limitedOffers);
      } catch (err) {
        console.error('Failed to fetch offers:', err);
        setError('Failed to load offers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-4">Loading offers...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (offers.length === 0) {
    return <div className="p-4">No new offers available at this time.</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {offers.map((offer) => (
        <div key={offer.id} className="aspect-square w-full">
          <Link 
            href={`/mazaya/${offer.id}`}
            className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer text-center h-full w-full flex items-center justify-center no-underline"
          >
            <div className="text-sm font-medium text-gray-800 overflow-hidden break-words line-clamp-3">{offer.title}</div>
          </Link>
        </div>
      ))}
    </div>
  );
}
