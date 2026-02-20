import MarketplaceHeader from '@/components/marketplace-marketing/marketplace-header';
import MarketplaceFooter from '@/components/marketplace-marketing/marketplace-footer';

export default function MarketplaceMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketplaceHeader />
      <main id="main-content">
        {children}
      </main>
      <MarketplaceFooter />
    </>
  );
}
