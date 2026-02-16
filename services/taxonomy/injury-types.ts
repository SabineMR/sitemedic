/**
 * Injury Types Taxonomy
 *
 * Based on UK HSE RIDDOR regulations and construction industry standards.
 * Critical for Phase 6 auto-flagging of reportable incidents.
 */

export type InjuryType = {
  id: string;
  label: string;
  category: 'riddor_specified' | 'minor_first_aid';
  isRiddorReportable: boolean;
};

/**
 * INJURY_TYPES
 *
 * 8 RIDDOR Specified Injuries (reportable to HSE within 15 days)
 * 12 Minor Injuries (first aid only, not RIDDOR reportable)
 */
export const INJURY_TYPES: InjuryType[] = [
  // RIDDOR Specified Injuries (8 items)
  {
    id: 'fracture',
    label: 'Fracture (any bone except fingers/thumbs/toes)',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'amputation',
    label: 'Amputation of hand/foot/finger/thumb/toe',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'loss-of-sight',
    label: 'Loss of sight (temporary or permanent)',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'crush-injury',
    label: 'Crush injury to head/torso causing internal damage',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'serious-burn',
    label: 'Serious burn (covering >10% of body or damaging eyes/respiratory system)',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'loss-of-consciousness',
    label: 'Loss of consciousness caused by head injury/asphyxia',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'scalping',
    label: 'Scalping requiring hospital treatment',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },
  {
    id: 'hypothermia-asphyxia',
    label: 'Hypothermia/heat-induced illness/asphyxia requiring resuscitation',
    category: 'riddor_specified',
    isRiddorReportable: true,
  },

  // Minor Injuries (12 items)
  {
    id: 'laceration',
    label: 'Laceration (cut)',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'abrasion',
    label: 'Abrasion (graze/scrape)',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'contusion',
    label: 'Contusion (bruise)',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'sprain-strain',
    label: 'Sprain/Strain',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'puncture-wound',
    label: 'Puncture wound',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'minor-burn',
    label: 'Minor burn (<10% of body)',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'foreign-body-eye',
    label: 'Foreign body in eye',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'headache',
    label: 'Headache',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'nausea-dizziness',
    label: 'Nausea/Dizziness',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'insect-bite-sting',
    label: 'Insect bite/sting',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'splinter',
    label: 'Splinter',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
  {
    id: 'blister',
    label: 'Blister',
    category: 'minor_first_aid',
    isRiddorReportable: false,
  },
];
