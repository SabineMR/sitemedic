import type { MetadataRoute } from 'next';

/**
 * robots.txt generation
 *
 * Allows search engines to index marketing pages while blocking
 * admin, client, medic, and API routes from crawling.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitemedic.co.uk';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/client/',
          '/medic/',
          '/platform/',
          '/api/',
          '/setup/',
          '/book/payment',
          '/book/confirmation',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
