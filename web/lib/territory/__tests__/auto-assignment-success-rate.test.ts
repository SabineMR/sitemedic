/**
 * Auto-Assignment Success Rate Test
 *
 * Validates that the auto-assignment algorithm achieves 95%+ success rate
 * against 100 simulated bookings with varied postcodes, shift types, and medic profiles.
 *
 * Success Criteria #11: Auto-assignment successfully matches 95% of bookings.
 */

import { describe, it, expect } from 'vitest';
import { rankMedicsForBooking } from '../auto-assignment';
import type { MedicWithMetrics } from '@/lib/queries/admin/medics';
import type { BookingRequirements } from '../auto-assignment';

// =============================================================================
// TEST DATA GENERATION
// =============================================================================

/**
 * Generate 20 UK postcode sectors for test coverage
 */
const TEST_POSTCODES = [
  'E1 6', 'E2 7', 'N1 5', 'N7 8', 'NW1 3',
  'SE1 9', 'SE15 2', 'SW1 8', 'W1 2', 'WC1 6',
  'M1 4', 'M15 6', 'B1 1', 'B12 9', 'LS1 3',
  'LS9 8', 'BS1 5', 'CF10 3', 'EH1 2', 'G1 1',
];

/**
 * Generate 100 simulated bookings with realistic variation
 */
function generateSimulatedBookings(): BookingRequirements[] {
  const bookings: BookingRequirements[] = [];
  const today = new Date();

  // 5 bookings per postcode sector = 100 total
  for (const postcode of TEST_POSTCODES) {
    for (let i = 0; i < 5; i++) {
      // Spread shift dates across 2 weeks (weekdays only)
      const dayOffset = i * 3; // 0, 3, 6, 9, 12 days
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() + dayOffset);

      // Skip weekends
      const dayOfWeek = shiftDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        shiftDate.setDate(shiftDate.getDate() + (dayOfWeek === 0 ? 1 : 2));
      }

      // Determine shift type based on distribution
      const rand = Math.random();
      let confined_space_required = false;
      let trauma_specialist_required = false;

      if (rand < 0.15) {
        confined_space_required = true; // 15% confined space
      } else if (rand < 0.30) {
        trauma_specialist_required = true; // 15% trauma
      }
      // Remaining 70% are standard shifts

      // Random shift start time between 08:00-14:00
      const startHour = 8 + Math.floor(Math.random() * 7);
      const shift_start_time = `${startHour.toString().padStart(2, '0')}:00`;
      const shift_end_time = `${(startHour + 8).toString().padStart(2, '0')}:00`;

      bookings.push({
        postcode,
        confined_space_required,
        trauma_specialist_required,
        shift_date: shiftDate.toISOString().split('T')[0],
        shift_start_time,
        shift_end_time,
      });
    }
  }

  return bookings;
}

/**
 * Generate 30 simulated medics with realistic profiles
 */
function generateSimulatedMedics(): MedicWithMetrics[] {
  const medics: Partial<MedicWithMetrics>[] = [];

  for (let i = 0; i < 30; i++) {
    const medicId = `medic-${i + 1}`;

    // Assign 1-3 primary territories per medic
    const numTerritories = 1 + Math.floor(Math.random() * 3);
    const territory_assignments = [];
    for (let j = 0; j < numTerritories; j++) {
      const randomPostcodeIndex = Math.floor(Math.random() * TEST_POSTCODES.length);
      territory_assignments.push({
        territory_id: `territory-${randomPostcodeIndex}`,
        postcode_sector: TEST_POSTCODES[randomPostcodeIndex],
        role: 'primary' as const,
        region: 'Test Region',
      });
    }

    // Utilization: 20-90%
    const utilization_pct = 20 + Math.floor(Math.random() * 71);

    // Rating: 3.5-5.0
    const star_rating = 3.5 + Math.random() * 1.5;

    // Certifications: 60% confined space, 40% trauma
    const has_confined_space_cert = Math.random() < 0.6;
    const has_trauma_cert = Math.random() < 0.4;

    medics.push({
      id: medicId,
      first_name: `Medic`,
      last_name: `${i + 1}`,
      email: `medic${i + 1}@example.com`,
      phone: `+44700000${i.toString().padStart(4, '0')}`,
      available_for_work: true,
      unavailable_until: null,
      utilization_pct,
      star_rating,
      has_confined_space_cert,
      has_trauma_cert,
      riddor_compliance_rate: 90 + Math.floor(Math.random() * 11), // 90-100%
      territory_assignments,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return medics as MedicWithMetrics[];
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('Auto-Assignment Success Rate', () => {
  it('should achieve 95%+ success rate with 100 simulated bookings', () => {
    // Generate test data
    const bookings = generateSimulatedBookings();
    const medics = generateSimulatedMedics();

    expect(bookings.length).toBe(100);
    expect(medics.length).toBe(30);

    // Track successes and failures
    let successCount = 0;
    const failures: Array<{
      booking: BookingRequirements;
      reason: string;
    }> = [];

    // Run auto-assignment for each booking
    for (const booking of bookings) {
      const rankedMedics = rankMedicsForBooking(medics, booking);

      // A booking is successfully matched if we have at least 1 candidate with:
      // - is_available === true
      // - has_required_certs === true
      // - total_score > 0
      const successfulMatch = rankedMedics.find(
        candidate =>
          candidate.is_available &&
          candidate.has_required_certs &&
          candidate.total_score > 0
      );

      if (successfulMatch) {
        successCount++;
      } else {
        // Analyze failure reason
        let reason = 'Unknown';

        if (rankedMedics.length === 0) {
          reason = 'No candidates returned (all medics unavailable)';
        } else {
          const hasRequiredCerts = rankedMedics.some(c => c.has_required_certs);
          if (!hasRequiredCerts) {
            if (booking.confined_space_required && booking.trauma_specialist_required) {
              reason = 'No medics with both confined space AND trauma certs';
            } else if (booking.confined_space_required) {
              reason = 'No medics with confined space cert';
            } else if (booking.trauma_specialist_required) {
              reason = 'No medics with trauma cert';
            } else {
              reason = 'Certification filtering issue (unexpected)';
            }
          } else {
            reason = 'All candidates have has_required_certs but total_score = 0 (availability issue)';
          }
        }

        failures.push({ booking, reason });
      }
    }

    // Calculate success rate
    const successRate = successCount / 100;

    // Log detailed failure analysis if any
    if (failures.length > 0) {
      console.log('\n=== FAILURE ANALYSIS ===');
      console.log(`Total failures: ${failures.length}/${bookings.length}`);
      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%\n`);

      // Group failures by reason
      const failuresByReason = failures.reduce((acc, { booking, reason }) => {
        if (!acc[reason]) {
          acc[reason] = [];
        }
        acc[reason].push(booking.postcode);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [reason, postcodes] of Object.entries(failuresByReason)) {
        console.log(`${reason}: ${postcodes.length} bookings`);
        console.log(`  Postcodes: ${postcodes.join(', ')}`);
      }
      console.log('========================\n');
    } else {
      console.log(`\n✓ All 100 bookings matched successfully (100% success rate)\n`);
    }

    // Assert 95%+ success rate
    expect(successRate).toBeGreaterThanOrEqual(0.95);
  });

  it('should generate diverse booking types', () => {
    const bookings = generateSimulatedBookings();

    const standardBookings = bookings.filter(
      b => !b.confined_space_required && !b.trauma_specialist_required
    );
    const confinedSpaceBookings = bookings.filter(b => b.confined_space_required);
    const traumaBookings = bookings.filter(b => b.trauma_specialist_required);

    // Verify distribution is approximately correct
    expect(standardBookings.length).toBeGreaterThan(60); // ~70%
    expect(standardBookings.length).toBeLessThan(80);

    expect(confinedSpaceBookings.length).toBeGreaterThan(10); // ~15%
    expect(confinedSpaceBookings.length).toBeLessThan(25);

    expect(traumaBookings.length).toBeGreaterThan(10); // ~15%
    expect(traumaBookings.length).toBeLessThan(25);
  });

  it('should generate medics with varied utilization and certifications', () => {
    const medics = generateSimulatedMedics();

    // Check utilization spread
    const lowUtil = medics.filter(m => m.utilization_pct < 50).length;
    const mediumUtil = medics.filter(m => m.utilization_pct >= 50 && m.utilization_pct <= 80).length;
    const highUtil = medics.filter(m => m.utilization_pct > 80).length;

    expect(lowUtil).toBeGreaterThan(0);
    expect(mediumUtil).toBeGreaterThan(0);
    expect(highUtil).toBeGreaterThan(0);

    // Check certification spread
    const withConfinedSpace = medics.filter(m => m.has_confined_space_cert).length;
    const withTrauma = medics.filter(m => m.has_trauma_cert).length;

    expect(withConfinedSpace).toBeGreaterThan(10); // ~60% of 30 = 18
    expect(withTrauma).toBeGreaterThan(5); // ~40% of 30 = 12

    // Check rating spread
    const avgRating = medics.reduce((sum, m) => sum + m.star_rating, 0) / medics.length;
    expect(avgRating).toBeGreaterThan(4.0);
    expect(avgRating).toBeLessThan(5.0);
  });
});
