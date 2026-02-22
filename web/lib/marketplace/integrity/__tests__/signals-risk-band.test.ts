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

  it('supports calibrated custom thresholds', () => {
    expect(riskBandForScore(49, { medium: 50, high: 90 })).toBe('low');
    expect(riskBandForScore(50, { medium: 50, high: 90 })).toBe('medium');
    expect(riskBandForScore(90, { medium: 50, high: 90 })).toBe('high');
  });
});
