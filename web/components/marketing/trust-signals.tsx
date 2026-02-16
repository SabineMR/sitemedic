import { Shield, FileCheck, HardHat, Lock, ClipboardCheck } from 'lucide-react';

export default function TrustSignals() {
  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
          Fully compliant, audit-ready
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <Shield className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">HCPC-Registered</h3>
            <p className="text-xs text-slate-600">All paramedics verified</p>
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <FileCheck className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">RIDDOR 2013</h3>
            <p className="text-xs text-slate-600">Auto-flagging & reporting</p>
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <HardHat className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">CDM 2015</h3>
            <p className="text-xs text-slate-600">Construction compliance</p>
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <Lock className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">UK GDPR</h3>
            <p className="text-xs text-slate-600">Secure data handling</p>
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <ClipboardCheck className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">HSE Audit-Ready</h3>
            <p className="text-xs text-slate-600">Inspection-ready records</p>
          </div>
        </div>
      </div>
    </section>
  );
}
