'use client';

import { useState } from 'react';
import MazayaOffers, { CategoryFilter, CompanyFilter } from '@/components/mazaya-offers';
import { GlassmorphismContainer } from '@/components/glassmorphism-container';
import { Search } from 'lucide-react';

// Metadata needs to be in a separate layout.tsx file when using client components

export default function MazayaPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <GlassmorphismContainer className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Mazaya Offers</h1>
          <p className="text-gray-600 dark:text-gray-300">Exclusive offers and discounts for employees</p>
        </GlassmorphismContainer>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <GlassmorphismContainer className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Search Offers
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search offers by title, description, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         placeholder-gray-500 dark:placeholder-gray-400
                         focus:ring-2 focus:ring-[#00539f] focus:border-transparent
                         transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
        </GlassmorphismContainer>
      </div>

      {/* Filters */}
      {companies.length > 0 && (
        <div className="mb-6">
          <GlassmorphismContainer className="p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              Filter by Company
            </h2>
            <CompanyFilter 
              companies={companies} 
              selectedCompany={selectedCompany} 
              onCompanyChange={setSelectedCompany} 
            />
          </GlassmorphismContainer>
        </div>
      )}

      {categories.length > 0 && (
        <div className="mb-8">
          <GlassmorphismContainer className="p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              Filter by Category
            </h2>
            <CategoryFilter 
              categories={categories} 
              selectedCategory={selectedCategory} 
              onCategoryChange={setSelectedCategory} 
            />
          </GlassmorphismContainer>
        </div>
      )}

      {/* Offers */}
      <GlassmorphismContainer className="p-6">
        <MazayaOffers 
          selectedCategory={selectedCategory}
          selectedCompany={selectedCompany}
          searchQuery={searchQuery}
          onCategoriesLoaded={setCategories}
          onCompaniesLoaded={setCompanies}
        />
      </GlassmorphismContainer>
    </div>
  );
}
