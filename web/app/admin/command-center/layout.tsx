/**
 * Layout for admin command center
 * Ensures full-screen layout
 */

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-hidden">{children}</div>;
}
