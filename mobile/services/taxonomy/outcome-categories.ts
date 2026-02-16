/**
 * Outcome Categories Taxonomy
 *
 * Standard post-treatment outcomes for injury severity tracking.
 * Severity levels guide escalation decisions and compliance reporting.
 */

export type OutcomeCategory = {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
};

/**
 * OUTCOME_CATEGORIES
 *
 * 7 outcome categories from minor (returned to work) to critical (hospitalized)
 */
export const OUTCOME_CATEGORIES: OutcomeCategory[] = [
  {
    id: 'returned-to-work-same-duties',
    label: 'Returned to work - same duties',
    severity: 'low',
  },
  {
    id: 'returned-to-work-light-duties',
    label: 'Returned to work - light duties',
    severity: 'medium',
  },
  {
    id: 'sent-home',
    label: 'Sent home',
    severity: 'medium',
  },
  {
    id: 'referred-gp',
    label: 'Referred to GP',
    severity: 'medium',
  },
  {
    id: 'referred-ae',
    label: 'Referred to A&E',
    severity: 'high',
  },
  {
    id: 'ambulance-called',
    label: 'Ambulance called',
    severity: 'high',
  },
  {
    id: 'hospitalized',
    label: 'Hospitalized',
    severity: 'high',
  },
];
