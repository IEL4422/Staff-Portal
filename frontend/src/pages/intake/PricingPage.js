import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRICING_DATA = [
  {
    category: 'Estate Planning Packages',
    items: [
      {
        name: 'Trust Package',
        price: 'Individual: $3,500 | Joint: $5,000',
        priceValue: 3500,
        includes: [
          'Revocable Living Trust',
          'Pour-Over Will',
          'Power of Attorney for Healthcare and Property',
          'Healthcare Directive (Living Will)',
          'Remembrance & Services Memorandum',
          'Personal Property Memorandum',
          '(1) Deed Transfer of Real Estate to Trust',
          'Online or Mobile Notarization',
          'Physical & Digital Portfolio',
          'Access to Client Portal',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'Probate Avoidance Package',
        price: 'Individual: $1,250 | Joint: $1,750',
        priceValue: 1250,
        includes: [
          'Last Will & Testament',
          'Power of Attorney for Healthcare and Property',
          'Transfer-on-Death Instrument',
          'Healthcare Directive (Living Will)',
          'Remembrance & Services Memorandum',
          'Personal Property Memorandum',
          'Online or Mobile Notarization',
          'Physical & Digital Portfolio',
          'Access to Client Portal',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'Will Package',
        price: 'Individual: $1,250 | Joint: $1,750',
        priceValue: 1250,
        includes: [
          'Last Will & Testament',
          'Power of Attorney for Healthcare and Property',
          'Healthcare Directive (Living Will)',
          'Remembrance & Services Memorandum',
          'Personal Property Memorandum',
          'Online or Mobile Notarization',
          'Physical & Digital Portfolio',
          'Access to Client Portal',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'DIY Estate Plan Review',
        price: 'Individual: $750 | Joint: $1,000',
        priceValue: 750,
        includes: [
          'Comprehensive review and redlining of previously drafted estate planning documents',
          'One (1) hour attorney review session',
        ],
      },
    ],
  },
  {
    category: 'Probate Packages',
    items: [
      {
        name: 'Uncontested Probate',
        price: '$7,500',
        priceValue: 7500,
        description: 'Full representation of the estate representative from start to finish for uncontested matters.',
        includes: [
          'Preparation and Filing of All Necessary Documents',
          'Notification of Heirs and Creditors',
          'Heirship Research',
          'Asset Search',
          'Representation at All Court Hearings',
          'Filing Fees',
          'Creditor Notification Publication Fees',
          'Preparation of Final Accounting',
          'Access to Client Portal',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'Contested Probate',
        price: 'Varies',
        priceValue: 0,
        description: 'Full representation for contested probate matters. Pricing determined after initial consultation based on case complexity.',
        includes: [
          'Preparation and Filing of All Necessary Documents',
          'Notification of Heirs and Creditors',
          'Heirship Research',
          'Asset Search',
          'Representation at All Court Hearings',
          'Filing Fees',
          'Creditor Notification Publication Fees',
          'Preparation of Final Accounting',
          'Access to Client Portal',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'Heir Representation',
        price: 'Varies',
        priceValue: 0,
        description: 'Full representation of heirs who are not the estate representative, from start of case to finish.',
        includes: [
          'Review of All Probate Filings',
          'Protection of Heir Rights and Interests',
          'Representation at All Court Hearings',
          'Asset and Distribution Oversight',
          'Communication with Estate Representative and Counsel',
          'Access to Client Portal',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'Partial Probate',
        price: '$3,500',
        priceValue: 3500,
        description: 'Representation of the representative and estate for probate cases that have already been filed.',
        includes: [
          'Preparation and Filing of All Necessary Documents',
          'Notification of Heirs and Creditors',
          'Heirship Research',
          'Asset Search',
          'Representation at All Court Hearings',
          'Preparation of Final Accounting',
          'Unlimited Attorney Consultation',
        ],
      },
      {
        name: 'Small Estate Probate',
        price: '$1,000',
        priceValue: 1000,
        description: 'For estates with less than $100,000 in assets and no real estate.',
        includes: [
          'Preparation of Small Estate Affidavit',
          'Asset Search',
          'Online Notarization',
          'Unlimited Attorney Consultation',
        ],
      },
    ],
  },
  {
    category: 'Prenuptial Agreement Services',
    items: [
      {
        name: 'Prenuptial Agreement Drafting & Negotiation',
        price: '$5,000',
        priceValue: 5000,
        includes: [
          'Initial consultation with both parties',
          'Full financial disclosure review',
          'Custom drafting tailored to your situation',
          'Negotiation between parties',
          'Finalization and execution',
        ],
      },
      {
        name: 'Prenuptial Agreement Review & Negotiation',
        price: '$3,000',
        priceValue: 3000,
        includes: [
          'Comprehensive legal review',
          'Analysis of fairness and enforceability',
          'Negotiation on your behalf',
          'Recommendations for modifications',
          'Protection of your interests',
        ],
      },
      {
        name: 'Prenuptial Agreement Drafting',
        price: '$3,000',
        priceValue: 3000,
        includes: [
          'Initial consultation',
          'Custom agreement drafting',
          'Legal compliance review',
          'Finalization and execution guidance',
        ],
      },
      {
        name: 'Prenuptial Agreement Review',
        price: '$2,000',
        priceValue: 2000,
        includes: [
          'Detailed legal analysis',
          'Identification of unfair provisions',
          'Consultation on implications',
          'Recommendations for protection',
        ],
      },
    ],
  },
  {
    category: 'A La Carte & Add-Ons',
    items: [
      { name: 'Revocable Living Trust', price: '$2,500 / $3,500', priceValue: 2500, includes: [] },
      { name: 'Last Will and Testament', price: '$750 / $1,250', priceValue: 750, includes: [] },
      { name: 'Power of Attorney', price: 'Financial & Medical - $500', priceValue: 500, includes: [] },
      { name: 'Healthcare Directive / Living Will', price: '$500', priceValue: 500, includes: [] },
      { name: 'Quit Claim Deed', price: '$500', priceValue: 500, includes: [] },
      { name: 'Transfer-on-Death Instrument', price: '$500', priceValue: 500, includes: [] },
      { name: 'Life Estate Deed', price: '$500', priceValue: 500, includes: [] },
      { name: 'Small Estate Affidavit', price: '$500', priceValue: 500, includes: [] },
      { name: 'Trust Funding', price: '$100 per asset', priceValue: 100, includes: [] },
      { name: 'Special Needs Planning', price: '$2,500', priceValue: 2500, includes: [] },
      { name: 'Estate Tax Planning', price: '$5,000', priceValue: 5000, includes: [] },
      { name: 'Trust Restatement', price: '$2,000', priceValue: 2000, includes: [] },
      { name: 'Will Amendment', price: '$500', priceValue: 500, includes: [] },
    ],
  },
];

const CATEGORY_COLORS = {
  'Estate Planning Packages': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Probate Packages': 'bg-blue-50 border-blue-200 text-blue-700',
  'Prenuptial Agreement Services': 'bg-amber-50 border-amber-200 text-amber-700',
  'A La Carte & Add-Ons': 'bg-slate-50 border-slate-200 text-slate-700',
};

const CATEGORY_HEADER_COLORS = {
  'Estate Planning Packages': 'from-emerald-600 to-emerald-700',
  'Probate Packages': 'from-blue-600 to-blue-700',
  'Prenuptial Agreement Services': 'from-amber-600 to-amber-700',
  'A La Carte & Add-Ons': 'from-slate-600 to-slate-700',
};

const PricingPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...PRICING_DATA.map((c) => c.category)];

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return PRICING_DATA.map((category) => {
      if (selectedCategory !== 'all' && category.category !== selectedCategory) {
        return { ...category, items: [] };
      }
      const filtered = category.items.filter((item) => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.price.toLowerCase().includes(query) ||
          item.includes.some((inc) => inc.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          category.category.toLowerCase().includes(query)
        );
      });
      return { ...category, items: filtered };
    }).filter((c) => c.items.length > 0);
  }, [searchQuery, selectedCategory]);

  const totalResults = filteredData.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="pricing-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Services & Pricing</h1>
        <p className="text-slate-500 mt-1">All pricing from illinoisestatelaw.com. Payment plans available for all services.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search services, prices, or features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="pricing-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'bg-[#1e3a5f] hover:bg-[#2a4a6f]' : ''}
            >
              {cat === 'all' ? 'All' : cat}
            </Button>
          ))}
        </div>
      </div>

      {searchQuery && (
        <p className="text-sm text-slate-500">
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </p>
      )}

      <div className="space-y-8">
        {filteredData.map((category) => (
          <div key={category.category}>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${CATEGORY_HEADER_COLORS[category.category]} text-white text-sm font-semibold mb-4`}>
              <DollarSign className="w-4 h-4" />
              {category.category}
            </div>

            {category.category === 'A La Carte & Add-Ons' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.items.map((item) => (
                  <Card key={item.name} className={`border ${CATEGORY_COLORS[category.category]} transition-all hover:shadow-md`}>
                    <CardContent className="p-4">
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      <p className="text-lg font-bold text-[#1e3a5f] mt-1">{item.price}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {category.items.map((item) => (
                  <Card key={item.name} className={`border ${CATEGORY_COLORS[category.category]} transition-all hover:shadow-md`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold text-slate-900">{item.name}</CardTitle>
                      </div>
                      <p className="text-lg font-bold text-[#1e3a5f]">{item.price}</p>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                      )}
                    </CardHeader>
                    {item.includes.length > 0 && (
                      <CardContent className="pt-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Includes</p>
                        <ul className="space-y-1.5">
                          {item.includes.map((inc, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7DA1] mt-1.5 flex-shrink-0" />
                              {inc}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="text-center py-16">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No services match your search</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search terms or filters</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
