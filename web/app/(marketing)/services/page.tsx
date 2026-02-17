/**
 * ASG Services Page
 *
 * Detailed breakdown of Apex Safety Group's four occupational health service layers
 * for UK construction sites. Each section links to pricing and the booking flow.
 *
 * Route: /services
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services — Apex Safety Group',
  description:
    'On-site occupational health services for UK construction — health surveillance, drug & alcohol testing, fitness-to-work assessments, and mental health support. Delivered by HCPC-registered paramedics.',
};

const services = [
  {
    id: 'health-surveillance',
    layer: 'Layer 1',
    title: 'Health Surveillance',
    subtitle: 'Legally mandatory under COSHH, Control of Noise at Work, HAVS regulations',
    icon: '🩺',
    color: 'blue',
    description:
      'Regular monitoring of workers exposed to occupational hazards — noise, vibration, hazardous substances, and more. Our HCPC-registered paramedics conduct baseline and periodic assessments on site, with results recorded in your SiteMedic compliance dashboard.',
    tests: [
      'Audiometry (hearing) — BS EN ISO 8253-1',
      'Spirometry (lung function) — ATS/ERS standards',
      'HAVS (hand-arm vibration) screening — Tier 1, 2, 3',
      'Skin checks — contact dermatitis, COSHH exposure',
      'Blood pressure & musculoskeletal screen',
      'Baseline health assessments for new starters',
    ],
    legal: ['Control of Noise at Work Regulations 2005', 'COSHH Regulations 2002', 'HAVS Regulations (CLAW 2002)', 'HASAWA 1974'],
    price: 'From £45/worker',
    cta: '/book',
  },
  {
    id: 'drug-alcohol',
    layer: 'Layer 2',
    title: 'Drug & Alcohol Testing',
    subtitle: 'Contractually required on most major UK construction sites',
    icon: '🧪',
    color: 'orange',
    description:
      'Random, pre-induction, post-incident, and for-cause drug and alcohol testing using certified 12-panel oral fluid and breathalyser tests. Full chain-of-custody documentation. Results recorded digitally with immediate site notification.',
    tests: [
      'Pre-employment / induction screening',
      'Random testing — scheduled and unannounced',
      'Post-incident / reasonable suspicion testing',
      'Return-to-work testing',
      '12-panel oral fluid drug screen',
      'Evidential breath alcohol (Lion Intoxilyzer)',
    ],
    legal: ['CDM Regulations 2015', 'Construction (Design and Management)', 'Major contractor D&A policies', 'ISO 45001 occupational safety standard'],
    price: 'From £35/test',
    cta: '/book',
  },
  {
    id: 'fitness-to-work',
    layer: 'Layer 3',
    title: 'Fitness-to-Work Assessments',
    subtitle: 'Specialist assessments for safety-critical roles',
    icon: '🏗️',
    color: 'green',
    description:
      'Comprehensive fitness assessments for workers in safety-critical roles — crane operators, scaffolders, confined space workers, working at height. Certificates issued on site; DVLA Group 2 medicals arranged with our OH physician partners.',
    tests: [
      'Plant operator medicals (CPCS / NPORS)',
      'Confined space entry fitness checks',
      'Working at height assessments',
      'Asbestos supervisor medicals',
      'DVLA Group 2 / HGV driver medicals',
      'COSHH-specific role assessments',
    ],
    legal: ['Lifting Operations & Lifting Equipment Regulations 1998', 'Work at Height Regulations 2005', 'Control of Asbestos Regulations 2012', 'DVLA Medical Standards of Fitness to Drive'],
    price: 'From £65/worker',
    cta: '/book',
  },
  {
    id: 'mental-health',
    layer: 'Layer 4',
    title: 'Mental Health & Wellbeing',
    subtitle: 'Growing requirement under ISO 45003 and CDM duty of care',
    icon: '🧠',
    color: 'purple',
    description:
      'Structured mental health check-ins and wellbeing pulse scores, anonymised and aggregated per site. Meets the ISO 45003 psychosocial risk standard. Medics trained in Mental Health First Aid (MHFA) conduct brief wellbeing checks as part of their site attendance.',
    tests: [
      'MHFA-trained wellbeing check-ins',
      'PHQ-9 / GAD-7 screening tools',
      'Site wellbeing pulse score (anonymised)',
      'Referral pathways to EAP / IAPT',
      'Stress risk assessment support',
      'Suicide prevention awareness',
    ],
    legal: ['ISO 45003:2021 Psychosocial hazards', 'CDM 2015 duty of care', 'Equality Act 2010 (mental health as disability)', 'Management of Health & Safety at Work Regulations 1999'],
    price: 'Included in site medic attendance',
    cta: '/book',
  },
];

const colorMap: Record<string, Record<string, string>> = {
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-50 border-blue-200',
    border: 'border-blue-200',
    heading: 'text-blue-700',
    bullet: 'bg-blue-500',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-700',
    icon: 'bg-orange-50 border-orange-200',
    border: 'border-orange-200',
    heading: 'text-orange-700',
    bullet: 'bg-orange-500',
  },
  green: {
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-50 border-green-200',
    border: 'border-green-200',
    heading: 'text-green-700',
    bullet: 'bg-green-500',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700',
    icon: 'bg-purple-50 border-purple-200',
    border: 'border-purple-200',
    heading: 'text-purple-700',
    bullet: 'bg-purple-500',
  },
};

export default function ServicesPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            <span className="text-blue-300 text-sm font-medium">Apex Safety Group Services</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            One Medic. Every Compliance Need.
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            We replace 4 separate occupational health providers with a single HCPC-registered
            paramedic on your site — delivering all four compliance layers under one contract.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition text-sm shadow-lg shadow-blue-900/30"
            >
              Book a Site Medic
            </Link>
            <Link
              href="/pricing"
              className="bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 active:scale-95 transition text-sm"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {services.map((service) => {
          const c = colorMap[service.color];
          return (
            <div key={service.id} id={service.id} className={`border ${c.border} rounded-2xl overflow-hidden`}>
              {/* Header */}
              <div className={`${c.icon} border-b ${c.border} px-8 py-6`}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{service.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>
                        {service.layer}
                      </span>
                    </div>
                    <h2 className={`text-2xl font-bold ${c.heading}`}>{service.title}</h2>
                    <p className="text-slate-600 text-sm mt-0.5">{service.subtitle}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-slate-500 text-xs">Starting from</p>
                    <p className="text-slate-900 font-bold text-lg">{service.price}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-8 py-6 grid sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-slate-700 leading-relaxed mb-6">{service.description}</p>
                  <h3 className="text-slate-900 font-semibold text-sm mb-3">What's included:</h3>
                  <ul className="space-y-2">
                    {service.tests.map((test) => (
                      <li key={test} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.bullet} flex-shrink-0 mt-1.5`} />
                        {test}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold text-sm mb-3">Relevant legislation:</h3>
                  <ul className="space-y-2 mb-6">
                    {service.legal.map((law) => (
                      <li key={law} className="flex items-start gap-2 text-sm text-slate-500">
                        <span className="text-slate-400 flex-shrink-0">⚖️</span>
                        {law}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Delivered via SiteMedic platform:</p>
                  <ul className="space-y-1.5 text-sm text-slate-500">
                    <li>✓ Results logged digitally on site</li>
                    <li>✓ Auto-RIDDOR detection where applicable</li>
                    <li>✓ Compliance records downloadable anytime</li>
                    <li>✓ Audit-ready PDF reports</li>
                  </ul>
                  <div className="mt-6 flex items-center gap-3">
                    <Link
                      href={service.cta}
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 active:scale-95 transition"
                    >
                      Book this service
                    </Link>
                    <span className="text-slate-400 text-sm">{service.price}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-900 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Replace 4 providers. One invoice.</h2>
          <p className="text-slate-400 mb-8">
            All four service layers delivered by a single medic on your site. Powered by the SiteMedic digital platform — automatic compliance records, RIDDOR detection, and weekly payout management.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition text-sm"
            >
              Book a Medic
            </Link>
            <Link
              href="/contact"
              className="bg-white/10 border border-white/20 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition text-sm"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
