import type { FeePolicy, SourceProvenance } from './types';

export function isFeePolicyAllowedForProvenance(
  sourceProvenance: SourceProvenance,
  feePolicy: FeePolicy
): boolean {
  if (sourceProvenance === 'self_sourced') {
    return feePolicy === 'subscription';
  }

  return feePolicy === 'marketplace_commission' || feePolicy === 'co_share_blended';
}

export function assertPassOnPreservesIntegrity(input: {
  sourceProvenance: SourceProvenance;
  feePolicy: FeePolicy;
}) {
  if (!isFeePolicyAllowedForProvenance(input.sourceProvenance, input.feePolicy)) {
    throw new Error('Provenance/fee policy mismatch');
  }
}
