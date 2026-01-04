import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, ArrowLeft } from 'lucide-react';

const PhoneIntakePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Load Tally embed script
    const loadTallyScript = () => {
      if (typeof window.Tally !== 'undefined') {
        window.Tally.loadEmbeds();
      } else {
        const existingScript = document.querySelector('script[src="https://tally.so/widgets/embed.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://tally.so/widgets/embed.js';
          script.onload = () => {
            if (typeof window.Tally !== 'undefined') {
              window.Tally.loadEmbeds();
            }
          };
          script.onerror = () => {
            // Fallback: set iframe src directly
            const iframes = document.querySelectorAll('iframe[data-tally-src]:not([src])');
            iframes.forEach((iframe) => {
              iframe.src = iframe.dataset.tallySrc;
            });
          };
          document.body.appendChild(script);
        } else {
          // Script exists, just load embeds
          const iframes = document.querySelectorAll('iframe[data-tally-src]:not([src])');
          iframes.forEach((iframe) => {
            iframe.src = iframe.dataset.tallySrc;
          });
        }
      }
    };

    loadTallyScript();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="phone-intake-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Phone className="w-7 h-7 inline-block mr-3 text-[#2E7DA1]" />
            Phone Call Intake
          </h1>
          <p className="text-slate-500 mt-1">Record new phone call information</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <iframe
          data-tally-src="https://tally.so/embed/wM90gA?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
          loading="lazy"
          width="100%"
          height="807"
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
          title="Call Intake"
          className="w-full"
        />
      </div>
    </div>
  );
};

export default PhoneIntakePage;
