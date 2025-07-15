'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: { 
  categories: string[], 
  selectedCategory: string, 
  onCategoryChange: (category: string) => void 
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange('')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            selectedCategory === '' 
              ? 'bg-flyadeal-purple text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedCategory === category 
                ? 'bg-flyadeal-purple text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompanyFilter({ companies, selectedCompany, onCompanyChange }: { 
  companies: string[], 
  selectedCompany: string, 
  onCompanyChange: (company: string) => void 
}) {
  // Function to format company name (flyadeal should be lowercase)
  const formatCompanyName = (company: string) => {
    return company.toLowerCase() === 'flyadeal' ? 'flyadeal' : company;
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCompanyChange('')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            selectedCompany === '' 
              ? 'bg-flyadeal-purple text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Companies
        </button>
        {companies.map((company) => (
          <button
            key={company}
            onClick={() => onCompanyChange(company)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedCompany === company 
                ? 'bg-flyadeal-purple text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {formatCompanyName(company)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MazayaOffers({ 
  isNewOnly = false, 
  selectedCategory = '',
  selectedCompany = '',
  onCategoriesLoaded,
  onCompaniesLoaded
}: { 
  isNewOnly?: boolean, 
  selectedCategory?: string,
  selectedCompany?: string,
  onCategoriesLoaded?: (categories: string[]) => void,
  onCompaniesLoaded?: (companies: string[]) => void
}) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const endpoint = isNewOnly ? '/api/mazaya/new' : '/api/mazaya';
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Error fetching offers: ${response.status}`);
        }

        const data = await response.json();
        const allOffers = data.offers || [];
        setOffers(allOffers);

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(allOffers.map((offer: Offer) => offer.category)));
        setCategories(uniqueCategories as string[]);

        // Extract unique companies from offer_type
        const uniqueCompanies = Array.from(new Set(allOffers.map((offer: Offer) => offer.offer_type)));
        setCompanies(uniqueCompanies as string[]);

        // Notify parent component about categories
        if (onCategoriesLoaded) {
          onCategoriesLoaded(uniqueCategories as string[]);
        }

        // Notify parent component about companies
        if (onCompaniesLoaded) {
          onCompaniesLoaded(uniqueCompanies as string[]);
        }
      } catch (err) {
        console.error('Failed to fetch offers:', err);
        setError('Failed to load offers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [isNewOnly, onCategoriesLoaded, onCompaniesLoaded]);

  // Filter offers when selectedCategory or selectedCompany changes or offers change
  useEffect(() => {
    let filtered = offers;

    // Apply category filter if selected
    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(offer => offer.category === selectedCategory);
    }

    // Apply company filter if selected
    if (selectedCompany && selectedCompany !== '') {
      filtered = filtered.filter(offer => offer.offer_type === selectedCompany);
    }

    setFilteredOffers(filtered);
  }, [selectedCategory, selectedCompany, offers]);

  if (loading) {
    return <div className="flex justify-center p-8">Loading offers...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (offers.length === 0) {
    return <div className="p-4">No offers available at this time.</div>;
  }

  if (filteredOffers.length === 0 && (selectedCategory || selectedCompany)) {
    let message = "No offers available";
    if (selectedCategory && selectedCompany) {
      message += ` in the selected category and company`;
    } else if (selectedCategory) {
      message += ` in the selected category`;
    } else if (selectedCompany) {
      message += ` from the selected company`;
    }
    return <div className="p-4">{message}.</div>;
  }

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {filteredOffers.map((offer) => (
        <Link 
          key={offer.id} 
          href={`/mazaya/${offer.id}`}
          className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        >
          {offer.image_path && (
            <div className="relative h-48 w-full">
              <Image
                src={offer.image_path}
                alt={offer.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 hover:text-flyadeal-purple">{offer.title}</h3>
            <div className="text-sm text-gray-600 mb-2">{offer.category}</div>
            <p className="text-gray-700">{truncateText(offer.description, 100)}</p>
            <div className="mt-4 text-flyadeal-purple text-sm font-medium">View details</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
