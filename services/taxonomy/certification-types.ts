/**
 * Certification Types Taxonomy (Mobile)
 *
 * Mirrors web/types/certification.types.ts for use in the React Native app.
 * Used by the medic profile screen, certification expiry warnings, and
 * RIDDOR certification validation on the treatment form.
 *
 * Categories:
 *   medical       — pre-hospital care qualifications (all verticals)
 *   construction  — CSCS, CPCS, IPAF, PASMA, Gas Safe
 *   dbs           — Disclosure and Barring Service checks
 *   motorsport    — FIA / Motorsport UK grades
 *   events        — SIA, Purple Guide, Event Safety
 *   education     — Paediatric First Aid, safeguarding
 *   outdoor       — Mountain First Aid, Wilderness First Aid
 */

export const CERT_TYPES = [
  // ── Medical / Clinical (all verticals) ──────────────────────────────────
  'FREC 3',
  'FREC 4',
  'PHEC',
  'PHTLS',
  'HCPC Paramedic',
  'EMT',
  'ALS Provider',
  'PALS Provider',
  'ATLS',
  'BLS Instructor',
  'AED Trained',

  // ── Construction ────────────────────────────────────────────────────────
  'CSCS',
  'CPCS',
  'IPAF',
  'PASMA',
  'Gas Safe',

  // ── DBS / Safeguarding ──────────────────────────────────────────────────
  'Enhanced DBS (Children)',
  'Enhanced DBS (Adults)',
  'Enhanced DBS (Barred Lists)',

  // ── Motorsport ──────────────────────────────────────────────────────────
  'FIA Grade 1',
  'FIA Grade 2',
  'FIA Grade 3',
  'Motorsport UK CMO Letter',
  'MSA First Aider',

  // ── Events & Festivals ──────────────────────────────────────────────────
  'SIA Door Supervisor',
  'Purple Guide Certificate',
  'Event Safety Awareness',
  'NEBOSH General Certificate',

  // ── Education ───────────────────────────────────────────────────────────
  'Paediatric First Aid',
  'Child Safeguarding Level 2',
  'Child Safeguarding Level 3',

  // ── Outdoor & Adventure ─────────────────────────────────────────────────
  'Mountain First Aid',
  'Wilderness First Aid',

  // ── Film / TV Production ────────────────────────────────────────────────
  'ScreenSkills Production Safety Passport',
  'EFR',
] as const;

export type CertType = typeof CERT_TYPES[number];

export type CertCategory =
  | 'medical'
  | 'construction'
  | 'dbs'
  | 'motorsport'
  | 'events'
  | 'education'
  | 'outdoor';

export interface CertTypeInfo {
  label: string;
  category: CertCategory;
  description: string;
}

export const CERT_TYPE_INFO: Record<CertType, CertTypeInfo> = {
  'FREC 3':            { label: 'FREC Level 3', category: 'medical', description: 'First Response Emergency Care Level 3' },
  'FREC 4':            { label: 'FREC Level 4', category: 'medical', description: 'First Response Emergency Care Level 4' },
  'PHEC':              { label: 'PHEC', category: 'medical', description: 'Pre-Hospital Emergency Care' },
  'PHTLS':             { label: 'PHTLS', category: 'medical', description: 'Pre-Hospital Trauma Life Support' },
  'HCPC Paramedic':    { label: 'HCPC Paramedic', category: 'medical', description: 'HCPC registered paramedic' },
  'EMT':               { label: 'EMT', category: 'medical', description: 'Emergency Medical Technician' },
  'ALS Provider':      { label: 'ALS Provider', category: 'medical', description: 'Advanced Life Support (Resuscitation Council UK)' },
  'PALS Provider':     { label: 'PALS Provider', category: 'medical', description: 'Paediatric Advanced Life Support' },
  'ATLS':              { label: 'ATLS', category: 'medical', description: 'Advanced Trauma Life Support' },
  'BLS Instructor':    { label: 'BLS Instructor', category: 'medical', description: 'Basic Life Support Instructor' },
  'AED Trained':       { label: 'AED Trained', category: 'medical', description: 'AED trained' },

  'CSCS':              { label: 'CSCS', category: 'construction', description: 'Construction Skills Certification Scheme' },
  'CPCS':              { label: 'CPCS', category: 'construction', description: 'Construction Plant Competence Scheme' },
  'IPAF':              { label: 'IPAF', category: 'construction', description: 'International Powered Access Federation' },
  'PASMA':             { label: 'PASMA', category: 'construction', description: 'MEWP / Scaffolding access' },
  'Gas Safe':          { label: 'Gas Safe', category: 'construction', description: 'Gas Safe Register' },

  'Enhanced DBS (Children)':     { label: 'Enhanced DBS (Children)', category: 'dbs', description: 'DBS Enhanced — working with children' },
  'Enhanced DBS (Adults)':       { label: 'Enhanced DBS (Adults)', category: 'dbs', description: 'DBS Enhanced — working with vulnerable adults' },
  'Enhanced DBS (Barred Lists)': { label: 'Enhanced DBS + Barred Lists', category: 'dbs', description: 'DBS Enhanced including barred lists' },

  'FIA Grade 1':              { label: 'FIA Grade 1', category: 'motorsport', description: 'Circuit Medical Officer (F1/WEC)' },
  'FIA Grade 2':              { label: 'FIA Grade 2', category: 'motorsport', description: 'Medical Car / Track Doctor' },
  'FIA Grade 3':              { label: 'FIA Grade 3', category: 'motorsport', description: 'First Responder — national circuit events' },
  'Motorsport UK CMO Letter': { label: 'Motorsport UK CMO Letter', category: 'motorsport', description: 'Chief Medical Officer approval letter' },
  'MSA First Aider':          { label: 'MSA First Aider', category: 'motorsport', description: 'Motor Sports Association First Aider' },

  'SIA Door Supervisor':        { label: 'SIA Door Supervisor', category: 'events', description: 'Security Industry Authority Door Supervisor' },
  'Purple Guide Certificate':   { label: 'Purple Guide Certificate', category: 'events', description: 'Event safety per Purple Guide framework' },
  'Event Safety Awareness':     { label: 'Event Safety Awareness', category: 'events', description: 'Event Safety Awareness certificate' },
  'NEBOSH General Certificate': { label: 'NEBOSH General', category: 'events', description: 'NEBOSH Health, Safety & Risk Management' },

  'Paediatric First Aid':       { label: 'Paediatric First Aid', category: 'education', description: 'Ofsted-recognised Paediatric First Aid' },
  'Child Safeguarding Level 2': { label: 'Child Safeguarding L2', category: 'education', description: 'LSCB Level 2 safeguarding awareness' },
  'Child Safeguarding Level 3': { label: 'Child Safeguarding L3', category: 'education', description: 'Designated Safeguarding Lead training' },

  'Mountain First Aid':   { label: 'Mountain First Aid', category: 'outdoor', description: 'Mountain First Aid certificate' },
  'Wilderness First Aid': { label: 'Wilderness First Aid', category: 'outdoor', description: 'Wilderness / remote environment first aid' },

  'ScreenSkills Production Safety Passport': {
    label: 'ScreenSkills Production Safety Passport',
    category: 'medical',
    description: 'ScreenSkills Production Safety Passport (CPD-based, no fixed expiry)',
  },
  'EFR': {
    label: 'Emergency First Responder (EFR)',
    category: 'medical',
    description: 'Emergency First Responder — basic pre-hospital first aid',
  },
};

/** Cert types recommended per vertical (ordered by relevance) */
export const VERTICAL_CERT_TYPES: Record<string, CertType[]> = {
  construction: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'CSCS', 'CPCS', 'IPAF', 'PASMA', 'Gas Safe', 'ALS Provider', 'PHTLS'],
  tv_film:      ['HCPC Paramedic', 'ScreenSkills Production Safety Passport', 'FREC 4', 'EFR', 'PHEC', 'PHTLS', 'ALS Provider', 'ATLS', 'FREC 3'],
  corporate:    ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'AED Trained', 'NEBOSH General Certificate'],
  festivals:    ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'PHTLS', 'AED Trained', 'SIA Door Supervisor', 'Purple Guide Certificate', 'Event Safety Awareness'],
  motorsport:   ['FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'ATLS', 'PHTLS', 'FIA Grade 1', 'FIA Grade 2', 'FIA Grade 3', 'Motorsport UK CMO Letter', 'MSA First Aider'],
  sporting_events: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'AED Trained', 'SIA Door Supervisor', 'Event Safety Awareness'],
  fairs_shows:  ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'AED Trained', 'SIA Door Supervisor', 'Event Safety Awareness', 'Purple Guide Certificate'],
  private_events: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'AED Trained', 'Event Safety Awareness'],
  education:    ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'PALS Provider', 'AED Trained', 'Paediatric First Aid', 'Enhanced DBS (Children)', 'Enhanced DBS (Barred Lists)', 'Child Safeguarding Level 2', 'Child Safeguarding Level 3'],
  outdoor_adventure: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'PHTLS', 'AED Trained', 'Mountain First Aid', 'Wilderness First Aid', 'Enhanced DBS (Adults)'],
  general:      ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'AED Trained'],
};

/** Get recommended certs for a vertical, most relevant first */
export function getRecommendedCertTypes(verticalId: string): CertType[] {
  const recommended = VERTICAL_CERT_TYPES[verticalId] ?? VERTICAL_CERT_TYPES.general;
  const remaining = CERT_TYPES.filter((c) => !recommended.includes(c));
  return [...recommended, ...remaining];
}
