/**
 * Public Contract Signing Layout
 *
 * Minimal layout for client-facing contract signing page.
 * No authentication required - accessed via shareable token.
 */

export default function ContractSigningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">SiteMedic</h1>
              <p className="text-sm text-slate-600">Service Agreement</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-600">
          <p>&copy; {new Date().getFullYear()} SiteMedic Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
