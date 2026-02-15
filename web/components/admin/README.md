# Admin Command Center Components

## Overview

React components for the admin dashboard to view live medic tracking.

## Components

### MedicTrackingMap

Interactive map showing all active medics with color-coded markers.

**Features:**
- Real-time marker updates
- Color-coded status (green=on-site, blue=traveling, red=issue, gray=offline)
- GPS accuracy circles (shows how accurate the location is)
- Auto-zoom to fit all medics
- Click marker → Open details sidebar
- Popup with quick stats (battery, connection, last update)

**Props:**
```tsx
interface Props {
  medics: MedicLocation[];
  onMedicClick: (medic: MedicLocation) => void;
}
```

**Usage:**
```tsx
import MedicTrackingMap from '@/components/admin/MedicTrackingMap';

<MedicTrackingMap
  medics={activeMedics}
  onMedicClick={(medic) => setSelectedMedic(medic)}
/>
```

## Map Technology

Uses **React-Leaflet** (open-source, free):
- No API keys required
- OpenStreetMap tiles (free)
- Lightweight and fast
- Mobile-responsive

## Installation

```bash
cd web
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

## Next Steps

1. **Add Supabase client** to fetch real medic data
2. **Implement WebSocket** for real-time updates (Task #4)
3. **Build timeline view** (Task #6)
4. **Add alerts** (Task #8)
