/**
 * Calendar Invite Generator
 * Phase 4.5: Generate .ics calendar invites for booking confirmation emails
 */

import ical from 'ical-generator';

export interface BookingIcsData {
  date: string;        // "2026-03-15"
  startTime: string;   // "07:00"
  endTime: string;     // "15:00"
  siteName: string;
  siteAddress: string;
  medicName: string;
  clientEmail: string;
  clientName: string;
}

/**
 * Generate .ics calendar invite for booking
 * Returns the .ics file content as a string
 */
export function generateBookingIcs(booking: BookingIcsData): string {
  // Parse start and end times to create Date objects
  const [startHour, startMinute] = booking.startTime.split(':').map(Number);
  const [endHour, endMinute] = booking.endTime.split(':').map(Number);

  const startDate = new Date(booking.date);
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date(booking.date);
  endDate.setHours(endHour, endMinute, 0, 0);

  // Create calendar with UK timezone
  const calendar = ical({
    name: 'SiteMedic Booking',
    timezone: 'Europe/London',
  });

  // Add event
  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary: `Medic Visit - ${booking.siteName}`,
    description: `Your medic ${booking.medicName} will arrive at ${booking.startTime}.\n\nSite: ${booking.siteName}\nAddress: ${booking.siteAddress}`,
    location: booking.siteAddress,
    organizer: {
      name: 'SiteMedic Bookings',
      email: 'bookings@sitemedic.co.uk',
    },
    attendees: [
      {
        name: booking.clientName,
        email: booking.clientEmail,
      },
    ],
  });

  return calendar.toString();
}
