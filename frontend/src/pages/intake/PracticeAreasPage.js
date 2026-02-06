import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Scale, FileText, Shield, Home, Heart, Users, Briefcase,
  ScrollText, Building2, Landmark
} from 'lucide-react';

const PRACTICE_AREAS = [
  {
    name: 'Probate',
    icon: Scale,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    description: 'Full-service probate representation for uncontested and contested matters, including filing, court hearings, creditor notification, and final accounting.',
    services: [
      'Probate Package (Full Representation)',
      'Partial Probate (Already Filed Cases)',
      'Small Estate Probate (Under $100K)',
      'Heirship Research',
      'Asset Search',
      'Creditor Notification',
      'Final Accounting',
    ],
    tags: ['Court Representation', 'Filing', 'Estate Administration'],
  },
  {
    name: 'Estate Planning',
    icon: FileText,
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    description: 'Comprehensive estate planning services including trusts, wills, powers of attorney, and healthcare directives to protect your family and assets.',
    services: [
      'Trust Package (Revocable Living Trust)',
      'Probate Avoidance Package',
      'Will Package',
      'DIY Estate Plan Review',
      'Power of Attorney (Healthcare & Property)',
      'Healthcare Directive / Living Will',
      'Personal Property Memorandum',
    ],
    tags: ['Trusts', 'Wills', 'Power of Attorney', 'Healthcare Directive'],
  },
  {
    name: 'Trust Administration & Funding',
    icon: Shield,
    color: 'bg-teal-50 border-teal-200',
    iconColor: 'text-teal-600',
    description: 'Assistance with trust funding, transferring assets into trusts, and ongoing trust administration services.',
    services: [
      'Trust Funding ($100 per asset)',
      'Deed Transfer to Trust',
      'Trust Restatement',
      'Beneficiary Designations',
      'Asset Retitling',
    ],
    tags: ['Trust Funding', 'Asset Transfer', 'Restatement'],
  },
  {
    name: 'Real Estate & Deeds',
    icon: Home,
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    description: 'Preparation and recording of deeds including quit claim deeds, life estate deeds, and transfer-on-death instruments.',
    services: [
      'Quit Claim Deed',
      'Life Estate Deed',
      'Transfer-on-Death Instrument',
      'Deed Transfer to Trust',
      'Additional Deed Recording ($250)',
    ],
    tags: ['Deeds', 'Property Transfer', 'Recording'],
  },
  {
    name: 'Prenuptial Agreements',
    icon: Heart,
    color: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
    description: 'Full-service prenuptial agreement services including drafting, review, negotiation, and execution.',
    services: [
      'Prenuptial Agreement Drafting & Negotiation',
      'Prenuptial Agreement Review & Negotiation',
      'Prenuptial Agreement Drafting',
      'Prenuptial Agreement Review',
    ],
    tags: ['Drafting', 'Review', 'Negotiation'],
  },
  {
    name: 'Special Needs & Tax Planning',
    icon: Users,
    color: 'bg-violet-50 border-violet-200',
    iconColor: 'text-violet-600',
    description: 'Specialized planning for families with disabled or minor beneficiaries, and estate tax planning for high-value estates.',
    services: [
      'Special Needs Planning',
      'Estate Tax Planning',
      'Blended Family Planning',
      'Business Owner Estate Planning',
    ],
    tags: ['Special Needs', 'Tax Planning', 'Blended Families'],
  },
];

const PracticeAreasPage = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="practice-areas-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Practice Areas</h1>
        <p className="text-slate-500 mt-1">Overview of all legal services offered by Illinois Estate Law.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PRACTICE_AREAS.map((area) => (
          <Card key={area.name} className={`border ${area.color} transition-all hover:shadow-md`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${area.color}`}>
                  <area.icon className={`w-5 h-5 ${area.iconColor}`} />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-900">{area.name}</CardTitle>
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{area.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {area.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Services</p>
              <ul className="space-y-1.5">
                {area.services.map((service, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E7DA1] mt-1.5 flex-shrink-0" />
                    {service}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PracticeAreasPage;
