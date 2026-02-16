/**
 * Near Miss Categories Taxonomy
 *
 * Standard near-miss incident types for construction safety.
 * Used for proactive hazard identification and prevention.
 */

export type NearMissCategory = {
  id: string;
  label: string;
  icon: string;
};

/**
 * NEAR_MISS_CATEGORIES
 *
 * 13 common construction near-miss scenarios with visual icons
 */
export const NEAR_MISS_CATEGORIES: NearMissCategory[] = [
  {
    id: 'fall-from-height',
    label: 'Fall from height',
    icon: '⬇️',
  },
  {
    id: 'struck-by-moving',
    label: 'Struck by moving object',
    icon: '🚧',
  },
  {
    id: 'struck-by-falling',
    label: 'Struck by falling object',
    icon: '⚠️',
  },
  {
    id: 'slip-trip-fall',
    label: 'Slip/Trip/Fall',
    icon: '🚶',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: '⚡',
  },
  {
    id: 'fire-explosion',
    label: 'Fire/Explosion',
    icon: '🔥',
  },
  {
    id: 'confined-space',
    label: 'Confined space',
    icon: '🚪',
  },
  {
    id: 'lifting-manual-handling',
    label: 'Lifting/Manual handling',
    icon: '📦',
  },
  {
    id: 'plant-vehicle',
    label: 'Plant/Vehicle',
    icon: '🚜',
  },
  {
    id: 'structural-collapse',
    label: 'Structural collapse',
    icon: '🏗️',
  },
  {
    id: 'chemical-hazardous',
    label: 'Chemical/Hazardous material',
    icon: '☣️',
  },
  {
    id: 'environmental',
    label: 'Environmental (weather/flooding)',
    icon: '🌧️',
  },
  {
    id: 'other',
    label: 'Other',
    icon: '❓',
  },
];
