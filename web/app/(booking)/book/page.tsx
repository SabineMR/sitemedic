/**
 * Book a Medic Page
 * Phase 4.5: Customer-facing booking form
 */

import { Metadata } from 'next';
import { BookingForm } from '@/components/booking/booking-form';

export const metadata: Metadata = {
  title: 'Book a Medic - Guardian Medics',
  description:
    'Book qualified paramedics for your construction site. Select dates, configure shift requirements, and see real-time pricing.',
};

export default function BookPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Book a Medic</h1>
        <p className="text-lg text-muted-foreground">
          Select your dates and site details
        </p>
      </div>

      {/* Booking Form */}
      <BookingForm />
    </div>
  );
}
