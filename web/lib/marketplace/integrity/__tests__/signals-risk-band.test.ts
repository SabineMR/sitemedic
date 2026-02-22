import { describe, expect, it } from 'vitest';
import { riskBandForScore } from '@/lib/marketplace/integrity/signals';

describe('integrity risk band thresholds', () => {
  it('maps low scores correctly', () => {
    expect(riskBandForScore(0)).toBe('low');
    expect(riskBandForScore(34)).toBe('low');
  });

  it('maps medium scores correctly', () => {
    expect(riskBandForScore(35)).toBe('medium');
    expect(riskBandForScore(69)).toBe('medium');
  });

  it('maps high scores correctly', () => {
    expect(riskBandForScore(70)).toBe('high');
    expect(riskBandForScore(200)).toBe('high');
  });
});
