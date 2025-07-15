'use client';

import { useState } from 'react';
import MazayaOffers, { CategoryFilter, CompanyFilter } from '@/components/mazaya-offers';
import { GlassmorphismContainer } from '@/components/glassmorphism-container';

// Metadata needs to be in a separate layout.tsx file when using client components

export default function MazayaPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <GlassmorphismContainer className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Mazaya Offers</h1>
          <p className="text-gray-600">Exclusive offers and discounts for employees</p>
        </GlassmorphismContainer>
      </div>

      {/* Filters */}
      {companies.length > 0 && (
        <div className="mb-6">
          <GlassmorphismContainer className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
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
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
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
          onCategoriesLoaded={setCategories}
          onCompaniesLoaded={setCompanies}
        />
      </GlassmorphismContainer>
    </div>
  );
}
