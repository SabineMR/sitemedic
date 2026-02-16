/**
 * Auth layout
 *
 * Simple centered layout for login page without dashboard shell.
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
