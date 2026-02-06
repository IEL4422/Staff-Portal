import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Building2 } from 'lucide-react';
import LOCATIONS from './locationsData';

const COUNTY_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' },
  { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600', badge: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-600', badge: 'bg-sky-100 text-sky-700' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
];

const PracticeAreasPage = () => {
  const [search, setSearch] = useState('');

  const filteredLocations = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return LOCATIONS;

    return LOCATIONS.map((loc) => {
      const countyMatch = loc.county.toLowerCase().includes(query);
      const matchingCities = loc.cities.filter((city) =>
        city.toLowerCase().includes(query)
      );

      if (countyMatch) return loc;
      if (matchingCities.length > 0) return { ...loc, cities: matchingCities };
      return null;
    }).filter(Boolean);
  }, [search]);

  const totalCities = useMemo(() => {
    return filteredLocations.reduce((sum, loc) => sum + loc.cities.length, 0);
  }, [filteredLocations]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="practice-areas-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Locations We Serve</h1>
        <p className="text-slate-500 mt-1">
          Illinois Estate Law serves clients across {LOCATIONS.length} counties in the greater Chicagoland area.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by county or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {search && (
        <p className="text-sm text-slate-500">
          {filteredLocations.length === 0
            ? 'No locations match your search.'
            : `Showing ${filteredLocations.length} ${filteredLocations.length === 1 ? 'county' : 'counties'} with ${totalCities} ${totalCities === 1 ? 'city' : 'cities'}`}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLocations.map((loc, idx) => {
          const color = COUNTY_COLORS[idx % COUNTY_COLORS.length];
          const originalIndex = LOCATIONS.indexOf(
            LOCATIONS.find((l) => l.county === loc.county)
          );
          const stableColor = COUNTY_COLORS[originalIndex % COUNTY_COLORS.length];

          return (
            <Card
              key={loc.county}
              className={`border ${stableColor.border} ${stableColor.bg} transition-all hover:shadow-md`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${stableColor.bg} border ${stableColor.border}`}>
                      <MapPin className={`w-5 h-5 ${stableColor.icon}`} />
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      {loc.county}
                    </CardTitle>
                  </div>
                  <Badge className={`${stableColor.badge} border-0 font-medium`}>
                    {loc.cities.length} {loc.cities.length === 1 ? 'city' : 'cities'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {loc.cities.map((city) => {
                    const isHighlighted =
                      search &&
                      city.toLowerCase().includes(search.toLowerCase().trim());
                    return (
                      <span
                        key={city}
                        className={`inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-md transition-colors ${
                          isHighlighted
                            ? 'bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium ring-1 ring-[#2E7DA1]/20'
                            : 'bg-white/70 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-3 h-3 flex-shrink-0 opacity-50" />
                        {city}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PracticeAreasPage;
