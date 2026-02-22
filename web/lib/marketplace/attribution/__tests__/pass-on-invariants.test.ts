import { describe, expect, it } from 'vitest';
import {
  assertPassOnPreservesIntegrity,
  isFeePolicyAllowedForProvenance,
} from '@/lib/marketplace/attribution/invariants';

describe('pass-on integrity invariants', () => {
  it('allows self_sourced only with subscription policy', () => {
    expect(isFeePolicyAllowedForProvenance('self_sourced', 'subscription')).toBe(true);
    expect(isFeePolicyAllowedForProvenance('self_sourced', 'marketplace_commission')).toBe(false);
    expect(isFeePolicyAllowedForProvenance('self_sourced', 'co_share_blended')).toBe(false);
  });

  it('allows marketplace_sourced with marketplace_commission and co_share_blended', () => {
    expect(isFeePolicyAllowedForProvenance('marketplace_sourced', 'marketplace_commission')).toBe(true);
    expect(isFeePolicyAllowedForProvenance('marketplace_sourced', 'co_share_blended')).toBe(true);
    expect(isFeePolicyAllowedForProvenance('marketplace_sourced', 'subscription')).toBe(false);
  });

  it('throws when pass-on transition attempts integrity drift', () => {
    expect(() =>
      assertPassOnPreservesIntegrity({
        sourceProvenance: 'self_sourced',
        feePolicy: 'marketplace_commission',
      })
    ).toThrow(/mismatch/i);
  });

  it('does not throw when pass-on transition preserves valid mapping', () => {
    expect(() =>
      assertPassOnPreservesIntegrity({
        sourceProvenance: 'marketplace_sourced',
        feePolicy: 'marketplace_commission',
      })
    ).not.toThrow();
  });
});
