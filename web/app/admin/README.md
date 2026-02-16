# Admin Dashboard Development Guide

This guide ensures consistency across all admin pages in `/app/admin`.

---

## 💱 Currency Display Standard

**All GBP amounts in admin pages MUST show USD conversion on hover.**

### ✅ Correct Usage

Use the `CurrencyWithTooltip` component for all currency amounts:

```tsx
import CurrencyWithTooltip from '../../components/CurrencyWithTooltip';

// In your component
<CurrencyWithTooltip amount={3500} />
// Displays: £3,500
// Hover shows: ≈ $4,445.00 USD

// With custom styling
<CurrencyWithTooltip
  amount={weeklyRevenue}
  className="text-2xl font-bold text-green-400"
/>
```

### ❌ Incorrect Usage

**Do NOT** manually format currency like this:

```tsx
// ❌ BAD - No USD conversion
<span>£{amount.toLocaleString()}</span>

// ❌ BAD - Hardcoded currency
<div className="text-xl">£3,500</div>
```

---

## 📊 Component Patterns

### Stat Cards

When creating stat cards, use the `currency` prop:

```tsx
<StatCard
  label="Revenue (MTD)"
  value={stats.totalRevenue}  // Pass raw number
  icon="💰"
  color="purple"
  currency={true}  // ← This enables USD conversion
/>
```

### Data Tables

For tables with currency columns:

```tsx
<td>
  <CurrencyWithTooltip amount={row.amount} />
</td>
```

### Charts/Graphs

For chart tooltips and labels, use the `formatCurrency` utility:

```tsx
import { formatCurrency } from '../utils/currency';

const chartData = revenue.map(r => ({
  ...r,
  displayValue: <CurrencyWithTooltip amount={r.value} />
}));
```

---

## 🎨 Styling Guidelines

### Dark Theme
Admin pages use a consistent dark theme:
- Background: `bg-gray-900`
- Cards: `bg-gray-800`
- Borders: `border-gray-700`
- Text: `text-white` (headings), `text-gray-400` (labels)

### Color-Coded Stats
Use these colors consistently:
- Blue: Active/current metrics
- Green: Positive/completed items
- Yellow: Pending/awaiting action
- Red: Issues/errors requiring attention
- Purple: Financial metrics
- Cyan: Notifications/communications

---

## 🔄 Real-Time Data

### Exchange Rates
- Exchange rates auto-refresh every **1 hour**
- Cached in localStorage to minimize API calls
- Graceful fallback to ~$1.27 if API unavailable

### Data Refresh
When implementing Supabase queries:
```tsx
useEffect(() => {
  const loadData = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('amount')
      .eq('status', 'completed');

    // ✅ Pass raw numbers to currency components
    setRevenue(data.reduce((sum, b) => sum + b.amount, 0));
  };

  loadData();
}, []);
```

---

## 📁 File Structure

```
web/app/admin/
├── README.md                 ← You are here
├── layout.tsx               ← Sidebar navigation
├── page.tsx                 ← Dashboard overview
├── command-center/
│   └── page.tsx            ← Live medic tracking
├── analytics/
│   └── page.tsx            ← Reports & insights
└── utils/
    └── currency.ts         ← Currency utilities (if needed)
```

---

## 🧪 Testing Currency Display

Before committing, verify:
1. ✅ All £ amounts show USD on hover
2. ✅ Exchange rate loads (check browser console)
3. ✅ Tooltip appears with proper formatting
4. ✅ No hardcoded currency symbols

---

## 🚀 Quick Start Checklist

When creating a new admin page:

- [ ] Import `CurrencyWithTooltip` for all currency amounts
- [ ] Use dark theme colors (gray-900/800/700)
- [ ] Add to sidebar navigation in `layout.tsx`
- [ ] Test currency hover tooltips work
- [ ] Update FEATURES.md with new page details

---

## 💡 Questions?

- Currency component not working? Check `web/hooks/useExchangeRate.ts`
- Tooltip not appearing? Verify Tailwind `fadeIn` animation exists
- Need help? Check `web/app/admin/page.tsx` for reference implementation
