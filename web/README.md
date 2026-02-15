# SiteMedic Marketing Website

Next.js marketing website for SiteMedic - automatic compliance for construction site medics.

## Running the Site

```bash
# Install dependencies
pnpm install

# Start development server on port 30500
pnpm dev
```

The site will be available at **http://localhost:30500**

## Pages

- **Homepage** (`/`) - Hero, value proposition, key benefits, trust signals
- **Pricing** (`/pricing`) - Tier comparison, value calculator, FAQ

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Port**: 30500 (configured to avoid conflicts with other projects)

## Performance

- Target: <2s load time
- Target: Lighthouse score >90
- Static Site Generation (SSG) for fast performance
- Optimized images and minimal JavaScript

## Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
web/
├── app/
│   ├── page.tsx          # Homepage
│   ├── pricing/
│   │   └── page.tsx      # Pricing page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── public/               # Static assets
└── package.json
```
