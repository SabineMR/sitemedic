/**
 * Treatment Types Taxonomy
 *
 * Standard first aid and emergency response treatments for construction injuries.
 * Used to document what treatment was provided on-site.
 */

export type TreatmentType = {
  id: string;
  label: string;
};

/**
 * TREATMENT_TYPES
 *
 * 14 common treatments from basic first aid to emergency response
 */
export const TREATMENT_TYPES: TreatmentType[] = [
  {
    id: 'cleaned-dressed',
    label: 'Cleaned and dressed',
  },
  {
    id: 'applied-antiseptic',
    label: 'Applied antiseptic',
  },
  {
    id: 'bandage-dressing',
    label: 'Bandage/dressing',
  },
  {
    id: 'ice-pack',
    label: 'Ice pack',
  },
  {
    id: 'pressure-stop-bleeding',
    label: 'Pressure to stop bleeding',
  },
  {
    id: 'removed-foreign-body',
    label: 'Removed foreign body',
  },
  {
    id: 'eye-wash',
    label: 'Eye wash',
  },
  {
    id: 'rest-welfare',
    label: 'Rest in welfare',
  },
  {
    id: 'paracetamol',
    label: 'Paracetamol',
  },
  {
    id: 'water-rehydration',
    label: 'Water/rehydration',
  },
  {
    id: 'monitored',
    label: 'Monitored',
  },
  {
    id: 'referred-gp',
    label: 'Referred GP',
  },
  {
    id: 'referred-ae',
    label: 'Referred A&E',
  },
  {
    id: 'called-ambulance',
    label: 'Called ambulance',
  },
];
