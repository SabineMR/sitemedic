/**
 * ASG Services Page
 *
 * Detailed breakdown of Apex Safety Group's services across all industry verticals.
 * Each section covers what we provide, compliance requirements, and booking options.
 *
 * Route: /services
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Services',
  description: 'Professional paramedic services for construction, film & TV, festivals, motorsport, sporting events, and more. HCPC-registered medics with industry-specific compliance.',
  openGraph: {
    title: 'Services',
    description: 'Professional paramedic services for construction, film & TV, festivals, motorsport, sporting events, and more.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Services',
    description: 'Professional paramedic services for construction, film & TV, festivals, motorsport, sporting events, and more.',
  },
};

const verticals = [
  {
    id: 'tv-film',
    tag: 'Core vertical',
    title: 'TV & Film Productions',
    subtitle: 'On-set medical cover for film, TV, commercials & music videos',
    icon: '🎬',
    color: 'blue',
    description:
      'Film sets are high-risk environments — pyrotechnics, stunt work, extreme locations, and long hours. Productions carry a legal duty to have qualified medical cover on set. Our HCPC-registered paramedics integrate with your production schedule, understand set terminology, and can respond to everything from a minor injury to a full cardiac event.',
    services: [
      'On-set HCPC paramedic (half-day and full-day)',
      'Stunt coordination medical support',
      'Location filming (remote & international-adjacent)',
      'Continuous set medical presence during filming',
      'Post-incident documentation & reporting',
      'Production company H&S compliance records',
    ],
    compliance: ['HSE Health & Safety at Work Act 1974', 'Production company duty of care', 'RIDDOR 2013 where applicable', 'UK GDPR (incident records)'],
    price: 'From £320/day',
    cta: '/book',
  },
  {
    id: 'motorsport',
    tag: 'Core vertical',
    title: 'Motorsport & Extreme Sports',
    subtitle: 'Circuit medical teams for motocross, rallying, karting, BMX & track days',
    icon: '🏁',
    color: 'red',
    description:
      'Motorsport UK and the MSA require qualified medical personnel at all permitted events. Our paramedics are experienced in high-speed trauma, extraction protocols, and the specific risks of circuit environments. Whether it\'s a track day with 20 drivers or a full motocross championship round, we provide the medical team your permit requires.',
    services: [
      'Circuit medical officer (Motorsport UK compliant)',
      'Motocross, rallying & karting events',
      'Track days & time attack events',
      'BMX, mountain biking & downhill events',
      'Trauma response & vehicle extraction support',
      'Post-incident reporting & documentation',
    ],
    compliance: ['Motorsport UK medical regulations', 'MSA circuit medical requirements', 'HASAWA 1974', 'HSE sporting event guidance'],
    price: 'From £380/day',
    cta: '/book',
  },
  {
    id: 'construction',
    tag: 'Core vertical',
    title: 'Construction & Industrial',
    subtitle: 'Full occupational health on site — health surveillance, D&A, fitness-to-work',
    icon: '🏗️',
    color: 'orange',
    description:
      'The original worksite vertical — and still a significant part of what we do. UK law requires health surveillance, drug & alcohol testing, and fitness-to-work medicals for most construction workers. Our HCPC paramedics deliver all four compliance layers on site, during normal working hours, replacing four separate providers with one medic and one invoice.',
    services: [
      'Audiometry (hearing) & spirometry (lung function)',
      'HAVS screening (Tier 1, 2, 3)',
      'Skin assessments (dermatitis, COSHH)',
      'Drug & alcohol testing (random, pre-induction, post-incident)',
      'Fitness-to-work assessments (plant operators, WAH, confined space)',
      'Mental health & wellbeing check-ins',
    ],
    compliance: ['CDM 2015', 'COSHH Regulations 2002', 'Control of Noise at Work 2005', 'RIDDOR 2013', 'HAVS Regulations', 'HASAWA 1974'],
    price: 'From £149/day',
    cta: '/book',
  },
  {
    id: 'festivals',
    tag: 'Core vertical',
    title: 'Music Festivals & Concerts',
    subtitle: 'Purple Guide compliant event medical for festivals, gigs & outdoor concerts',
    icon: '🎵',
    color: 'purple',
    description:
      'Music festivals and large concerts require a dedicated medical plan as part of the local authority licensing process. The Purple Guide sets the standard. Our paramedics are experienced in crowd medicine, triage systems, and the specific medical presentations that festival environments produce — heat illness, drug/alcohol emergencies, crush injuries, and more.',
    services: [
      'Festival site medical officer (Purple Guide compliant)',
      'Crowd medicine & mass casualty triage',
      'Medical tent setup & management',
      'Drug & alcohol emergency treatment',
      'Heat illness & environmental exposure management',
      'LA licensing medical documentation',
    ],
    compliance: ['Purple Guide (Event Industry Forum)', 'Licensing Act 2003 (event conditions)', 'HASAWA 1974', 'HSE Crowd Management guidance', 'UK GDPR (patient records)'],
    price: 'From £320/day',
    cta: '/book',
  },
  {
    id: 'sporting-events',
    tag: 'Core vertical',
    title: 'Sporting Events',
    subtitle: 'Paramedic cover for marathons, triathlons, rugby, football, boxing & MMA',
    icon: '🏆',
    color: 'green',
    description:
      'Most national sporting bodies mandate paramedic or doctor presence at sanctioned events. We provide event medical officers for amateur and semi-professional competitions — from local park runs to county rugby leagues. Our medics understand sports medicine presentations including cardiac events, head injuries, musculoskeletal trauma, and sports-specific emergencies.',
    services: [
      'Marathon, triathlon & endurance event cover',
      'Rugby union & league match medical officer',
      'Football tournament & match-day cover',
      'Boxing & MMA ringside paramedic',
      'Amateur league & grassroots competition cover',
      'Sports-specific incident documentation',
    ],
    compliance: ['FA medical requirements', 'British Triathlon medical standards', 'World Athletics medical guidance', 'British Boxing Board medical regulations', 'HASAWA 1974'],
    price: 'From £280/day',
    cta: '/book',
  },
  {
    id: 'fairs-shows',
    tag: 'Core vertical',
    title: 'Fairs, Shows & Public Events',
    subtitle: 'Crowd cover for county fairs, agricultural shows, fireworks & markets',
    icon: '🎡',
    color: 'amber',
    description:
      'Public events — particularly those with fairground rides, fireworks, livestock, or large crowds — carry significant medical risk. Local authorities increasingly require event organisers to demonstrate qualified medical provision as part of TENs and full premises licences. Our paramedics provide full crowd cover for all public event types.',
    services: [
      'County fairs & agricultural shows',
      'Fireworks displays & bonfire events',
      'Christmas markets & food festivals',
      'Carnival & funfair events',
      'Public gatherings & outdoor markets',
      'Event safety documentation & reporting',
    ],
    compliance: ['Licensing Act 2003 (TENs & premises)', 'Health & Safety at Work Act 1974', 'HSE Event Safety Guide', 'Local authority event requirements', 'UK GDPR'],
    price: 'From £280/day',
    cta: '/book',
  },
  {
    id: 'corporate',
    tag: 'Add-on',
    title: 'Corporate Events',
    subtitle: 'Medical cover for team building, retreats & product launches',
    icon: '💼',
    color: 'slate',
    description:
      'Corporate events increasingly involve physical activity — team building days with obstacle courses, off-site retreats with adventure elements, product launches with demonstrations. Where physical risk is present, a qualified medical presence is both a legal obligation and a reputational necessity.',
    services: [
      'Team building days & away days',
      'Corporate outdoor retreats',
      'Product launches with physical activity',
      'Executive health screenings',
      'Onsite first response for office events',
      'Event risk assessment support',
    ],
    compliance: ['HASAWA 1974 (employer duty)', 'HSE management regulations', 'ISO 45001 occupational safety', 'UK GDPR'],
    price: 'From £280/day',
    cta: '/book',
  },
  {
    id: 'private-events',
    tag: 'Add-on',
    title: 'Private Events',
    subtitle: 'Discreet cover for weddings, parties & charity galas',
    icon: '💍',
    color: 'pink',
    description:
      'Outdoor festival-style weddings, large private parties, and charity galas regularly see 200–500+ guests in environments without immediate NHS access. Our paramedics provide discreet, professional cover — indistinguishable from other event staff if required — ensuring that the event host has proper medical provision without making guests feel like they\'re at a high-risk venue.',
    services: [
      'Outdoor & festival-style weddings',
      'Large private parties (100+ guests)',
      'Charity galas & black-tie events',
      'Discreet, plain-clothes medical presence (on request)',
      'Venue site assessment',
      'Immediate response & escalation to NHS',
    ],
    compliance: ['HASAWA 1974 (event organiser duty)', 'Licensing Act 2003 (where applicable)', 'UK GDPR (patient records)'],
    price: 'From £280/day',
    cta: '/book',
  },
  {
    id: 'education-youth',
    tag: 'Add-on',
    title: 'Education & Youth',
    subtitle: 'DBS-checked paramedics for school events, Duke of Ed & university activities',
    icon: '🎓',
    color: 'cyan',
    description:
      "Schools, universities, and youth organisations have a heightened duty of care when organising events involving young people. All Apex Safety Group paramedics are DBS-checked. We cover school sports days, Duke of Edinburgh expeditions, scout and guide events, university sports days, and freshers' week activities.",
    services: [
      'School sports days & inter-school competitions',
      'Duke of Edinburgh Award expeditions',
      'Scout & guide outdoor events',
      "University sports & freshers' week cover",
      'Youth activity days & adventure programmes',
      'DBS-certified medics as standard',
    ],
    compliance: ['Education Act (duty of care for minors)', 'HASAWA 1974', 'Safeguarding requirements (DBS-checked)', 'UK GDPR', 'HSE school trips guidance'],
    price: 'From £280/day',
    cta: '/book',
  },
  {
    id: 'outdoor-adventure',
    tag: 'Add-on',
    title: 'Outdoor Adventure & Endurance',
    subtitle: 'Remote & wilderness medical cover for Tough Mudder, fell running & wild swimming',
    icon: '⛰️',
    color: 'teal',
    description:
      'Adventure races, fell running events, wild swimming competitions, and endurance challenges take place in environments where NHS response may be 30+ minutes away. Our paramedics are trained for remote and austere environments — carrying extended equipment and capable of providing definitive pre-hospital treatment in the field.',
    services: [
      'Obstacle course races (OCR / Tough Mudder style)',
      'Wild swimming & open water events',
      'Fell running & mountain marathons',
      'Adventure races & orienteering',
      'Remote & wilderness event cover',
      'Extended equipment carry (IV, airway, trauma)',
    ],
    compliance: ['HASAWA 1974', 'HSE adventure activities guidance', 'AALS licensing (where applicable)', 'Mountain Rescue coordination protocols'],
    price: 'From £320/day',
    cta: '/book',
  },
];

const colorMap: Record<string, Record<string, string>> = {
  blue:   { badge: 'bg-blue-100 text-blue-700',   icon: 'bg-blue-50 border-blue-200',   heading: 'text-blue-700',   bullet: 'bg-blue-500' },
  red:    { badge: 'bg-red-100 text-red-700',     icon: 'bg-red-50 border-red-200',     heading: 'text-red-700',    bullet: 'bg-red-500' },
  orange: { badge: 'bg-orange-100 text-orange-700', icon: 'bg-orange-50 border-orange-200', heading: 'text-orange-700', bullet: 'bg-orange-500' },
  purple: { badge: 'bg-purple-100 text-purple-700', icon: 'bg-purple-50 border-purple-200', heading: 'text-purple-700', bullet: 'bg-purple-500' },
  green:  { badge: 'bg-green-100 text-green-700', icon: 'bg-green-50 border-green-200', heading: 'text-green-700',  bullet: 'bg-green-500' },
  amber:  { badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-50 border-amber-200', heading: 'text-amber-700',  bullet: 'bg-amber-500' },
  slate:  { badge: 'bg-slate-100 text-slate-700', icon: 'bg-slate-50 border-slate-200', heading: 'text-slate-700',  bullet: 'bg-slate-400' },
  pink:   { badge: 'bg-pink-100 text-pink-700',   icon: 'bg-pink-50 border-pink-200',   heading: 'text-pink-700',   bullet: 'bg-pink-500' },
  cyan:   { badge: 'bg-cyan-100 text-cyan-700',   icon: 'bg-cyan-50 border-cyan-200',   heading: 'text-cyan-700',   bullet: 'bg-cyan-500' },
  teal:   { badge: 'bg-teal-100 text-teal-700',   icon: 'bg-teal-50 border-teal-200',   heading: 'text-teal-700',   bullet: 'bg-teal-500' },
};

const tagColor: Record<string, string> = {
  'Core vertical': 'bg-blue-100 text-blue-700',
  'Add-on': 'bg-slate-100 text-slate-600',
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
            One Medic. Every Industry.
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            HCPC-registered paramedics deployed across 10+ industries — from film sets and festivals to motorsport circuits and construction sites. One supplier, all your compliance obligations, one invoice.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition text-sm shadow-lg shadow-blue-900/30"
            >
              Book a Medic
            </Link>
            <Link
              href="/contact"
              className="bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 active:scale-95 transition text-sm"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Jump links */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2 min-w-max sm:min-w-0 sm:flex-wrap">
            {verticals.map((v) => (
              <a
                key={v.id}
                href={`#${v.id}`}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition whitespace-nowrap"
              >
                {v.icon} {v.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Verticals */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {verticals.map((vertical) => {
          const c = colorMap[vertical.color];
          return (
            <div key={vertical.id} id={vertical.id} className={`border ${c.icon.split(' ')[1]} rounded-2xl overflow-hidden scroll-mt-20`}>
              {/* Header */}
              <div className={`${c.icon} border-b px-8 py-6`}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{vertical.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tagColor[vertical.tag]}`}>
                        {vertical.tag}
                      </span>
                    </div>
                    <h2 className={`text-2xl font-bold ${c.heading}`}>{vertical.title}</h2>
                    <p className="text-slate-600 text-sm mt-0.5">{vertical.subtitle}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-slate-500 text-xs">Starting from</p>
                    <p className="text-slate-900 font-bold text-lg">{vertical.price}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-8 py-6 grid sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-slate-700 leading-relaxed mb-6">{vertical.description}</p>
                  <h3 className="text-slate-900 font-semibold text-sm mb-3">What&apos;s included:</h3>
                  <ul className="space-y-2">
                    {vertical.services.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.bullet} flex-shrink-0 mt-1.5`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold text-sm mb-3">Relevant compliance:</h3>
                  <ul className="space-y-2 mb-6">
                    {vertical.compliance.map((law) => (
                      <li key={law} className="flex items-start gap-2 text-sm text-slate-500">
                        <span className="text-slate-400 flex-shrink-0">⚖️</span>
                        {law}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Delivered via SiteMedic platform:</p>
                  <ul className="space-y-1.5 text-sm text-slate-500">
                    <li>✓ Incident records logged digitally on site</li>
                    <li>✓ Auto-RIDDOR detection where applicable</li>
                    <li>✓ Compliance records downloadable anytime</li>
                    <li>✓ Audit-ready PDF reports</li>
                  </ul>
                  <div className="mt-6 flex items-center gap-3">
                    <Link
                      href={vertical.cta}
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 active:scale-95 transition"
                    >
                      Book this service
                    </Link>
                    <span className="text-slate-400 text-sm">{vertical.price}</span>
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
          <h2 className="text-3xl font-bold text-white mb-4">Don&apos;t see your event type?</h2>
          <p className="text-slate-400 mb-8">
            We cover almost any environment where an HCPC-registered paramedic is needed. Contact us to discuss your specific requirements and we&apos;ll scope the right cover.
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
