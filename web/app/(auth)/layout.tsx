/**
 * Auth layout
 *
 * Simple centered layout for login page without dashboard shell.
 * CSS custom property --org-primary is injected at root level by BrandingProvider
 * in the root layout — no need to read headers here.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  );
}
