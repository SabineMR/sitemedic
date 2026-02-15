/**
 * UK Postcode Sector Generator
 *
 * Generates a comprehensive CSV of UK postcode sectors (outward codes) with region mappings.
 *
 * UK postcode structure: AREA + DISTRICT (+ SECTOR + UNIT)
 * - Area: 1-2 letters (e.g., E, SW, EC, WC, N, NW, SE, W, B, M, L, LS, S, G, EH)
 * - District: 1-2 numbers after area (e.g., E1, SW1, EC2, M60)
 * - We store at AREA+DISTRICT level (the "outward code"), NOT the full sector
 *
 * Note: Some districts don't exist in reality (gaps in numbering), but we include them all
 * for coverage. Real bookings will validate against actual postcodes via Postcodes.io API.
 * Territory assignment works at sector level regardless.
 */

import * as fs from 'fs';
import * as path from 'path';

interface PostcodeArea {
  area: string;
  minDistrict: number;
  maxDistrict: number;
  region: string;
}

// Comprehensive UK postcode area definitions (121 areas across 12 regions)
const POSTCODE_AREAS: PostcodeArea[] = [
  // ===== LONDON (10 areas) =====
  { area: 'E', minDistrict: 1, maxDistrict: 20, region: 'London' },
  { area: 'EC', minDistrict: 1, maxDistrict: 4, region: 'London' },
  { area: 'N', minDistrict: 1, maxDistrict: 22, region: 'London' },
  { area: 'NW', minDistrict: 1, maxDistrict: 11, region: 'London' },
  { area: 'SE', minDistrict: 1, maxDistrict: 28, region: 'London' },
  { area: 'SW', minDistrict: 1, maxDistrict: 20, region: 'London' },
  { area: 'W', minDistrict: 1, maxDistrict: 14, region: 'London' },
  { area: 'WC', minDistrict: 1, maxDistrict: 2, region: 'London' },

  // ===== SOUTH EAST (17 areas) =====
  { area: 'BN', minDistrict: 1, maxDistrict: 45, region: 'South East' },
  { area: 'CT', minDistrict: 1, maxDistrict: 21, region: 'South East' },
  { area: 'DA', minDistrict: 1, maxDistrict: 18, region: 'South East' },
  { area: 'GU', minDistrict: 1, maxDistrict: 52, region: 'South East' },
  { area: 'HP', minDistrict: 1, maxDistrict: 27, region: 'South East' },
  { area: 'KT', minDistrict: 1, maxDistrict: 24, region: 'South East' },
  { area: 'ME', minDistrict: 1, maxDistrict: 20, region: 'South East' },
  { area: 'MK', minDistrict: 1, maxDistrict: 46, region: 'South East' },
  { area: 'OX', minDistrict: 1, maxDistrict: 49, region: 'South East' },
  { area: 'PO', minDistrict: 1, maxDistrict: 41, region: 'South East' },
  { area: 'RG', minDistrict: 1, maxDistrict: 45, region: 'South East' },
  { area: 'RH', minDistrict: 1, maxDistrict: 20, region: 'South East' },
  { area: 'SL', minDistrict: 0, maxDistrict: 9, region: 'South East' },
  { area: 'SN', minDistrict: 1, maxDistrict: 26, region: 'South East' },
  { area: 'SO', minDistrict: 14, maxDistrict: 53, region: 'South East' },
  { area: 'TN', minDistrict: 1, maxDistrict: 40, region: 'South East' },
  { area: 'TW', minDistrict: 1, maxDistrict: 20, region: 'South East' },

  // ===== SOUTH WEST (11 areas) =====
  { area: 'BA', minDistrict: 1, maxDistrict: 22, region: 'South West' },
  { area: 'BH', minDistrict: 1, maxDistrict: 25, region: 'South West' },
  { area: 'BS', minDistrict: 1, maxDistrict: 49, region: 'South West' },
  { area: 'DT', minDistrict: 1, maxDistrict: 11, region: 'South West' },
  { area: 'EX', minDistrict: 1, maxDistrict: 39, region: 'South West' },
  { area: 'GL', minDistrict: 1, maxDistrict: 56, region: 'South West' },
  { area: 'PL', minDistrict: 1, maxDistrict: 35, region: 'South West' },
  { area: 'SP', minDistrict: 1, maxDistrict: 11, region: 'South West' },
  { area: 'TA', minDistrict: 1, maxDistrict: 24, region: 'South West' },
  { area: 'TQ', minDistrict: 1, maxDistrict: 14, region: 'South West' },
  { area: 'TR', minDistrict: 1, maxDistrict: 27, region: 'South West' },

  // ===== EAST OF ENGLAND (16 areas) =====
  { area: 'AL', minDistrict: 1, maxDistrict: 10, region: 'East of England' },
  { area: 'CB', minDistrict: 1, maxDistrict: 25, region: 'East of England' },
  { area: 'CM', minDistrict: 0, maxDistrict: 24, region: 'East of England' },
  { area: 'CO', minDistrict: 1, maxDistrict: 16, region: 'East of England' },
  { area: 'EN', minDistrict: 1, maxDistrict: 11, region: 'East of England' },
  { area: 'HA', minDistrict: 0, maxDistrict: 9, region: 'East of England' },
  { area: 'IG', minDistrict: 1, maxDistrict: 11, region: 'East of England' },
  { area: 'IP', minDistrict: 1, maxDistrict: 33, region: 'East of England' },
  { area: 'LU', minDistrict: 1, maxDistrict: 7, region: 'East of England' },
  { area: 'NR', minDistrict: 1, maxDistrict: 35, region: 'East of England' },
  { area: 'PE', minDistrict: 1, maxDistrict: 38, region: 'East of England' },
  { area: 'RM', minDistrict: 1, maxDistrict: 20, region: 'East of England' },
  { area: 'SG', minDistrict: 1, maxDistrict: 19, region: 'East of England' },
  { area: 'SS', minDistrict: 0, maxDistrict: 17, region: 'East of England' },
  { area: 'UB', minDistrict: 1, maxDistrict: 11, region: 'East of England' },
  { area: 'WD', minDistrict: 1, maxDistrict: 25, region: 'East of England' },

  // ===== WEST MIDLANDS (9 areas) =====
  { area: 'B', minDistrict: 1, maxDistrict: 98, region: 'West Midlands' },
  { area: 'CV', minDistrict: 1, maxDistrict: 47, region: 'West Midlands' },
  { area: 'DY', minDistrict: 1, maxDistrict: 14, region: 'West Midlands' },
  { area: 'HR', minDistrict: 1, maxDistrict: 9, region: 'West Midlands' },
  { area: 'ST', minDistrict: 1, maxDistrict: 21, region: 'West Midlands' },
  { area: 'TF', minDistrict: 1, maxDistrict: 13, region: 'West Midlands' },
  { area: 'WR', minDistrict: 1, maxDistrict: 15, region: 'West Midlands' },
  { area: 'WS', minDistrict: 1, maxDistrict: 15, region: 'West Midlands' },
  { area: 'WV', minDistrict: 1, maxDistrict: 16, region: 'West Midlands' },

  // ===== EAST MIDLANDS (5 areas) =====
  { area: 'DE', minDistrict: 1, maxDistrict: 75, region: 'East Midlands' },
  { area: 'LE', minDistrict: 1, maxDistrict: 67, region: 'East Midlands' },
  { area: 'LN', minDistrict: 1, maxDistrict: 13, region: 'East Midlands' },
  { area: 'NG', minDistrict: 1, maxDistrict: 34, region: 'East Midlands' },
  { area: 'NN', minDistrict: 1, maxDistrict: 29, region: 'East Midlands' },

  // ===== NORTH WEST (14 areas) =====
  { area: 'BB', minDistrict: 1, maxDistrict: 18, region: 'North West' },
  { area: 'BL', minDistrict: 0, maxDistrict: 9, region: 'North West' },
  { area: 'CA', minDistrict: 1, maxDistrict: 28, region: 'North West' },
  { area: 'CH', minDistrict: 1, maxDistrict: 66, region: 'North West' },
  { area: 'CW', minDistrict: 1, maxDistrict: 12, region: 'North West' },
  { area: 'FY', minDistrict: 0, maxDistrict: 8, region: 'North West' },
  { area: 'L', minDistrict: 1, maxDistrict: 40, region: 'North West' },
  { area: 'LA', minDistrict: 1, maxDistrict: 23, region: 'North West' },
  { area: 'M', minDistrict: 1, maxDistrict: 60, region: 'North West' },
  { area: 'OL', minDistrict: 1, maxDistrict: 16, region: 'North West' },
  { area: 'PR', minDistrict: 0, maxDistrict: 26, region: 'North West' },
  { area: 'SK', minDistrict: 1, maxDistrict: 23, region: 'North West' },
  { area: 'WA', minDistrict: 1, maxDistrict: 16, region: 'North West' },
  { area: 'WN', minDistrict: 1, maxDistrict: 8, region: 'North West' },

  // ===== YORKSHIRE AND THE HUMBER (10 areas) =====
  { area: 'BD', minDistrict: 1, maxDistrict: 24, region: 'Yorkshire and the Humber' },
  { area: 'DN', minDistrict: 1, maxDistrict: 22, region: 'Yorkshire and the Humber' },
  { area: 'HD', minDistrict: 1, maxDistrict: 9, region: 'Yorkshire and the Humber' },
  { area: 'HG', minDistrict: 1, maxDistrict: 5, region: 'Yorkshire and the Humber' },
  { area: 'HU', minDistrict: 1, maxDistrict: 20, region: 'Yorkshire and the Humber' },
  { area: 'HX', minDistrict: 1, maxDistrict: 7, region: 'Yorkshire and the Humber' },
  { area: 'LS', minDistrict: 1, maxDistrict: 29, region: 'Yorkshire and the Humber' },
  { area: 'S', minDistrict: 1, maxDistrict: 75, region: 'Yorkshire and the Humber' },
  { area: 'WF', minDistrict: 1, maxDistrict: 17, region: 'Yorkshire and the Humber' },
  { area: 'YO', minDistrict: 1, maxDistrict: 62, region: 'Yorkshire and the Humber' },

  // ===== NORTH EAST (5 areas) =====
  { area: 'DH', minDistrict: 1, maxDistrict: 9, region: 'North East' },
  { area: 'DL', minDistrict: 1, maxDistrict: 17, region: 'North East' },
  { area: 'NE', minDistrict: 1, maxDistrict: 71, region: 'North East' },
  { area: 'SR', minDistrict: 1, maxDistrict: 8, region: 'North East' },
  { area: 'TS', minDistrict: 1, maxDistrict: 29, region: 'North East' },

  // ===== WALES (6 areas) =====
  { area: 'CF', minDistrict: 1, maxDistrict: 83, region: 'Wales' },
  { area: 'LD', minDistrict: 1, maxDistrict: 8, region: 'Wales' },
  { area: 'LL', minDistrict: 1, maxDistrict: 78, region: 'Wales' },
  { area: 'NP', minDistrict: 1, maxDistrict: 44, region: 'Wales' },
  { area: 'SA', minDistrict: 1, maxDistrict: 73, region: 'Wales' },
  { area: 'SY', minDistrict: 1, maxDistrict: 25, region: 'Wales' },

  // ===== SCOTLAND (16 areas) =====
  { area: 'AB', minDistrict: 1, maxDistrict: 56, region: 'Scotland' },
  { area: 'DD', minDistrict: 1, maxDistrict: 11, region: 'Scotland' },
  { area: 'DG', minDistrict: 1, maxDistrict: 16, region: 'Scotland' },
  { area: 'EH', minDistrict: 1, maxDistrict: 55, region: 'Scotland' },
  { area: 'FK', minDistrict: 1, maxDistrict: 21, region: 'Scotland' },
  { area: 'G', minDistrict: 1, maxDistrict: 84, region: 'Scotland' },
  { area: 'HS', minDistrict: 1, maxDistrict: 9, region: 'Scotland' },
  { area: 'IV', minDistrict: 1, maxDistrict: 63, region: 'Scotland' },
  { area: 'KA', minDistrict: 1, maxDistrict: 30, region: 'Scotland' },
  { area: 'KW', minDistrict: 1, maxDistrict: 17, region: 'Scotland' },
  { area: 'KY', minDistrict: 1, maxDistrict: 16, region: 'Scotland' },
  { area: 'ML', minDistrict: 1, maxDistrict: 12, region: 'Scotland' },
  { area: 'PA', minDistrict: 1, maxDistrict: 78, region: 'Scotland' },
  { area: 'PH', minDistrict: 1, maxDistrict: 50, region: 'Scotland' },
  { area: 'TD', minDistrict: 1, maxDistrict: 15, region: 'Scotland' },
  { area: 'ZE', minDistrict: 1, maxDistrict: 3, region: 'Scotland' },

  // ===== NORTHERN IRELAND (1 area) =====
  { area: 'BT', minDistrict: 1, maxDistrict: 94, region: 'Northern Ireland' },

  // ===== CROWN DEPENDENCIES (3 areas) =====
  { area: 'GY', minDistrict: 1, maxDistrict: 10, region: 'Channel Islands' },
  { area: 'JE', minDistrict: 1, maxDistrict: 4, region: 'Channel Islands' },
  { area: 'IM', minDistrict: 1, maxDistrict: 9, region: 'Isle of Man' },
];

/**
 * Generate all postcode sectors from area definitions
 */
function generatePostcodeSectors(): Array<{ postcode_sector: string; region: string }> {
  const sectors: Array<{ postcode_sector: string; region: string }> = [];

  for (const area of POSTCODE_AREAS) {
    for (let district = area.minDistrict; district <= area.maxDistrict; district++) {
      const postcode_sector = `${area.area}${district}`;
      sectors.push({
        postcode_sector,
        region: area.region,
      });
    }
  }

  return sectors;
}

/**
 * Write sectors to CSV file
 */
function writeCSV(sectors: Array<{ postcode_sector: string; region: string }>) {
  const outputPath = path.join(__dirname, '..', 'data', 'uk_postcode_sectors.csv');

  // Create CSV content
  const header = 'postcode_sector,region\n';
  const rows = sectors.map(s => `${s.postcode_sector},${s.region}`).join('\n');
  const csv = header + rows;

  // Write to file
  fs.writeFileSync(outputPath, csv, 'utf-8');

  return outputPath;
}

/**
 * Count sectors by region
 */
function countByRegion(sectors: Array<{ postcode_sector: string; region: string }>) {
  const counts: Record<string, number> = {};

  for (const sector of sectors) {
    counts[sector.region] = (counts[sector.region] || 0) + 1;
  }

  return counts;
}

/**
 * Main execution
 */
function main() {
  console.log('🏴󠁧󠁢󠁥󠁮󠁧󠁿 Generating UK postcode sector dataset...\n');

  // Generate sectors
  const sectors = generatePostcodeSectors();
  console.log(`✅ Generated ${sectors.length.toLocaleString()} postcode sectors\n`);

  // Count by region
  const regionCounts = countByRegion(sectors);
  console.log('📊 Sectors by region:');
  const sortedRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
  for (const [region, count] of sortedRegions) {
    console.log(`   ${region.padEnd(30)} ${count.toLocaleString().padStart(6)} sectors`);
  }
  console.log('');

  // Write CSV
  const outputPath = writeCSV(sectors);
  console.log(`💾 CSV written to: ${outputPath}`);
  console.log(`📄 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

  console.log('✨ Generation complete!');
  console.log(`   Total areas: ${POSTCODE_AREAS.length}`);
  console.log(`   Total sectors: ${sectors.length.toLocaleString()}`);
  console.log(`   Total regions: ${Object.keys(regionCounts).length}`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in Edge Function
export { POSTCODE_AREAS, generatePostcodeSectors };
