export interface TravelCalculation {
  distance_miles: number;
  travel_time_minutes: number;
  travel_cost: number; // £2/mile beyond 30 miles
  room_board_cost: number; // Flat rate if travel >2 hours
  recommended_option: 'travel_bonus' | 'room_board' | 'deny';
  total_cost: number;
  shift_value: number;
  cost_percentage: number; // cost / shift_value
}

// Business rules
const TRAVEL_BONUS_RATE = 2; // £2 per mile
const FREE_TRAVEL_MILES = 30; // First 30 miles are included
const ROOM_BOARD_FLAT_RATE = 150; // £150 for overnight accommodation
const TRAVEL_TIME_THRESHOLD = 120; // 2 hours = 120 minutes
const DENIAL_THRESHOLD = 0.5; // Deny if cost >50% of shift value

// Calculate travel bonus cost
export function calculateTravelBonus(distance_miles: number): number {
  const billable_miles = Math.max(0, distance_miles - FREE_TRAVEL_MILES);
  return Number((billable_miles * TRAVEL_BONUS_RATE).toFixed(2));
}

// Calculate room/board cost (flat rate)
export function calculateRoomBoard(travel_time_minutes: number): number {
  return travel_time_minutes > TRAVEL_TIME_THRESHOLD ? ROOM_BOARD_FLAT_RATE : 0;
}

// Determine if booking should be denied
export function shouldDenyBooking(cost: number, shift_value: number): boolean {
  return cost / shift_value > DENIAL_THRESHOLD;
}

// Calculate out-of-territory cost and recommend option
export function calculateOutOfTerritoryCost(
  distance_miles: number,
  travel_time_minutes: number,
  shift_value: number
): TravelCalculation {
  const travel_cost = calculateTravelBonus(distance_miles);
  const room_board_cost = calculateRoomBoard(travel_time_minutes);

  // Compare options
  let recommended_option: 'travel_bonus' | 'room_board' | 'deny';
  let total_cost: number;

  if (travel_cost === 0 && room_board_cost === 0) {
    // Within free travel zone
    recommended_option = 'travel_bonus';
    total_cost = 0;
  } else if (room_board_cost === 0) {
    // Travel <2 hours: only travel bonus applies
    recommended_option = 'travel_bonus';
    total_cost = travel_cost;
  } else {
    // Travel >2 hours: compare travel bonus vs room/board
    if (travel_cost < room_board_cost) {
      recommended_option = 'travel_bonus';
      total_cost = travel_cost;
    } else {
      recommended_option = 'room_board';
      total_cost = room_board_cost;
    }
  }

  const cost_percentage = shift_value > 0 ? total_cost / shift_value : 0;

  // Override recommendation if cost too high
  if (shouldDenyBooking(total_cost, shift_value)) {
    recommended_option = 'deny';
  }

  return {
    distance_miles,
    travel_time_minutes,
    travel_cost,
    room_board_cost,
    recommended_option,
    total_cost,
    shift_value,
    cost_percentage: Number((cost_percentage * 100).toFixed(2)), // Percentage
  };
}

// Format cost calculation for display
export function formatCostBreakdown(calc: TravelCalculation): string {
  const lines = [
    `Distance: ${calc.distance_miles} miles`,
    `Travel time: ${Math.round(calc.travel_time_minutes / 60)} hours ${calc.travel_time_minutes % 60} minutes`,
    ``,
    `Option 1: Travel Bonus`,
    `  Billable miles: ${Math.max(0, calc.distance_miles - FREE_TRAVEL_MILES)} miles × £${TRAVEL_BONUS_RATE}/mile = £${calc.travel_cost}`,
    ``,
  ];

  if (calc.room_board_cost > 0) {
    lines.push(
      `Option 2: Room & Board`,
      `  Overnight accommodation: £${calc.room_board_cost}`,
      ``
    );
  }

  lines.push(
    `Recommended: ${calc.recommended_option === 'deny' ? 'DENY BOOKING' : calc.recommended_option.replace('_', ' ').toUpperCase()}`,
    `Total cost: £${calc.total_cost}`,
    `Shift value: £${calc.shift_value}`,
    `Cost percentage: ${calc.cost_percentage}%`,
  );

  if (calc.recommended_option === 'deny') {
    lines.push(``, `⚠️ Cost exceeds 50% of shift value. Booking should be denied unless manually overridden by admin.`);
  }

  return lines.join('\n');
}
