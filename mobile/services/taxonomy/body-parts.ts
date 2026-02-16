/**
 * Body Parts Taxonomy
 *
 * Based on US BLS OIICS (Occupational Injury and Illness Classification System)
 * Standard body part classifications for injury documentation.
 */

export type BodyPart = {
  id: string;
  label: string;
};

/**
 * BODY_PARTS
 *
 * 15 anatomical regions commonly used in construction injury reporting
 */
export const BODY_PARTS: BodyPart[] = [
  {
    id: 'head-face',
    label: 'Head/Face',
  },
  {
    id: 'eye',
    label: 'Eye',
  },
  {
    id: 'neck',
    label: 'Neck',
  },
  {
    id: 'shoulder',
    label: 'Shoulder',
  },
  {
    id: 'arm-elbow',
    label: 'Arm/Elbow',
  },
  {
    id: 'wrist-hand',
    label: 'Wrist/Hand',
  },
  {
    id: 'finger-thumb',
    label: 'Finger/Thumb',
  },
  {
    id: 'chest-ribs',
    label: 'Chest/Ribs',
  },
  {
    id: 'back-spine',
    label: 'Back/Spine',
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
  },
  {
    id: 'hip-pelvis',
    label: 'Hip/Pelvis',
  },
  {
    id: 'leg-knee',
    label: 'Leg/Knee',
  },
  {
    id: 'ankle-foot',
    label: 'Ankle/Foot',
  },
  {
    id: 'toe',
    label: 'Toe',
  },
  {
    id: 'multiple-body-parts',
    label: 'Multiple body parts',
  },
];
