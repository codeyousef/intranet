'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

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

export default function OfferDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mazaya/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Offer not found');
          }
          throw new Error(`Error fetching offer: ${response.status}`);
        }

        const data = await response.json();
        setOffer(data.offer);
      } catch (err) {
        console.error('Failed to fetch offer:', err);
        setError(err instanceof Error ? err.message : 'Failed to load offer details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOffer();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center p-8">Loading offer details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-500 p-4">{error}</div>
        <Link href="/mazaya" className="text-flyadeal-purple hover:underline flex items-center mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to all offers
        </Link>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="container mx-auto py-8">
        <div className="p-4">Offer not found</div>
        <Link href="/mazaya" className="text-flyadeal-purple hover:underline flex items-center mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to all offers
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Link href="/mazaya" className="text-flyadeal-purple hover:underline flex items-center mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to all offers
      </Link>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Content section */}
          <div className="p-6 md:w-1/2">
            <div className="flex flex-col mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{offer.title}</h1>
              <span className="inline-block bg-flyadeal-yellow text-gray-800 px-3 py-1 rounded-full text-sm font-medium self-start">
                {offer.category}
              </span>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <div className="text-gray-700 whitespace-pre-line">{offer.description}</div>
            </div>

            {/* Additional details section */}
            <div className="mt-6 border-t pt-4">
              <h2 className="text-lg font-semibold mb-2">Offer Details</h2>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <span className="font-medium">Offer ID:</span> {offer.id}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {offer.category}
                </div>
                {offer.category_id && (
                  <div>
                    <span className="font-medium">Category ID:</span> {offer.category_id}
                  </div>
                )}
                {offer.offer_name_ar && (
                  <div>
                    <span className="font-medium">Arabic Name:</span> {offer.offer_name_ar}
                  </div>
                )}
                {offer.website_url && (
                  <div>
                    <span className="font-medium">Website:</span> <a href={offer.website_url} target="_blank" rel="noopener noreferrer" className="text-flyadeal-purple hover:underline">{offer.website_url}</a>
                  </div>
                )}
                {offer.contact_number && (
                  <div>
                    <span className="font-medium">Contact:</span> {offer.contact_number}
                  </div>
                )}
                {offer.effective_date && (
                  <div>
                    <span className="font-medium">Effective Date:</span> {new Date(offer.effective_date).toLocaleDateString()}
                  </div>
                )}
                {offer.discontinue_date && (
                  <div>
                    <span className="font-medium">Discontinue Date:</span> {new Date(offer.discontinue_date).toLocaleDateString()}
                  </div>
                )}
                {offer.is_unlimited !== undefined && (
                  <div>
                    <span className="font-medium">Unlimited:</span> {offer.is_unlimited ? 'Yes' : 'No'}
                  </div>
                )}
                {offer.status && (
                  <div>
                    <span className="font-medium">Status:</span> {offer.status}
                  </div>
                )}
                {offer.offer_type && (
                  <div>
                    <span className="font-medium">Offer Type:</span> {offer.offer_type}
                  </div>
                )}
                <div>
                  <span className="font-medium">Created:</span> {new Date(offer.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Last updated:</span> {new Date(offer.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Image section */}
          {offer.image_path && (
            <div className="md:w-1/2 relative">
              <div className="relative h-full" style={{ minHeight: '100%' }}>
                <Image
                  src={offer.image_path}
                  alt={offer.title}
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
