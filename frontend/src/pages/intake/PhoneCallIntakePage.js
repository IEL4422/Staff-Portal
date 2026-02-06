import React, { useEffect } from 'react';
import { Phone } from 'lucide-react';

const PhoneCallIntakePage = () => {
  useEffect(() => {
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
            const iframes = document.querySelectorAll('iframe[data-tally-src]:not([src])');
            iframes.forEach((iframe) => {
              iframe.src = iframe.dataset.tallySrc;
            });
          };
          document.body.appendChild(script);
        } else {
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="phone-call-intake-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Phone className="w-5 h-5 text-blue-600" />
          </div>
          Phone Call Intake
        </h1>
        <p className="text-slate-500 mt-1">Complete this form during or after a phone call with a potential client.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
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

export default PhoneCallIntakePage;
