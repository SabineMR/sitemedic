import { Shield, FileCheck, HardHat, Lock, ClipboardCheck, Music, Gauge, Trophy } from 'lucide-react';

export default function TrustSignals() {
  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
          Compliant across every industry
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
          {[
            { Icon: Shield, title: 'HCPC-Registered', desc: 'All paramedics verified' },
            { Icon: Music, title: 'Purple Guide', desc: 'Festival & event standard' },
            { Icon: Gauge, title: 'Motorsport UK', desc: 'MSA circuit medical' },
            { Icon: Trophy, title: 'FA Governance', desc: 'Football event medical' },
            { Icon: FileCheck, title: 'RIDDOR 2013', desc: 'Auto-flagging & reporting' },
            { Icon: HardHat, title: 'CDM 2015', desc: 'Construction compliance' },
            { Icon: Lock, title: 'UK GDPR', desc: 'Secure data handling' },
            { Icon: ClipboardCheck, title: 'HSE Audit-Ready', desc: 'Inspection-ready records' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
              <Icon className="h-8 w-8 text-blue-600 mb-2.5" />
              <h3 className="text-xs font-semibold text-slate-900 mb-1">{title}</h3>
              <p className="text-[11px] text-slate-600 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
