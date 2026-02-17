import Link from 'next/link';
import QuoteButton from './quote-button';

export default function Hero() {
  return (
    <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
          HCPC-Registered Paramedics
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          Professional medics for
          <br />
          <span className="text-blue-600">every event &amp; worksite</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Film sets, festivals, motorsport circuits, construction sites, sporting events and more — HCPC-registered paramedics deployed with full compliance records automatically generated.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/book"
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            Book a Medic
          </Link>
          <QuoteButton />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-slate-500">
          {['HCPC-Registered', 'Purple Guide', 'RIDDOR 2013', 'UK GDPR'].map((badge) => (
            <span key={badge} className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
