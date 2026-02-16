/**
 * Daily Check Items Taxonomy
 *
 * Standard site safety checks performed by medics at shift start.
 * Ordered by priority for systematic daily inspection.
 */

export type DailyCheckItem = {
  id: string;
  label: string;
  order: number;
};

/**
 * DAILY_CHECK_ITEMS
 *
 * 10 essential site safety checks in priority order
 */
export const DAILY_CHECK_ITEMS: DailyCheckItem[] = [
  {
    id: 'first-aid-kit',
    label: 'First aid kit stocked and accessible',
    order: 1,
  },
  {
    id: 'aed',
    label: 'AED (Automated External Defibrillator) functional',
    order: 2,
  },
  {
    id: 'eyewash',
    label: 'Eyewash station functional',
    order: 3,
  },
  {
    id: 'welfare-facilities',
    label: 'Welfare facilities clean and accessible',
    order: 4,
  },
  {
    id: 'site-access-routes',
    label: 'Site access routes clear',
    order: 5,
  },
  {
    id: 'ppe',
    label: 'PPE (Personal Protective Equipment) available',
    order: 6,
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping (trip hazards cleared)',
    order: 7,
  },
  {
    id: 'weather',
    label: 'Weather conditions safe for work',
    order: 8,
  },
  {
    id: 'visible-hazards',
    label: 'Visible hazards identified and reported',
    order: 9,
  },
  {
    id: 'emergency-vehicle-access',
    label: 'Emergency vehicle access clear',
    order: 10,
  },
];
