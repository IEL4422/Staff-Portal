import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Phone } from 'lucide-react';

const PhoneIntakePage = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="phone-intake-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          <Phone className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
          Phone Call Intake
        </h1>
        <p className="text-slate-500 mt-1">Record new phone call information</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="tally-container min-h-[700px]">
            <iframe
              data-tally-src="https://tally.so/embed/wM90gA?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              loading="lazy"
              width="100%"
              height="700"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              title="Phone Call Intake Form"
              className="w-full"
              data-testid="tally-iframe"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Initialize Tally embed
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://tally.so/widgets/embed.js';
  script.async = true;
  document.head.appendChild(script);
}

export default PhoneIntakePage;
