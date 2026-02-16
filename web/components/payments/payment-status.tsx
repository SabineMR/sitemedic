/**
 * Payment Status Badge
 * Phase 6.5: Visual payment status indicator with error handling
 */

'use client';

interface PaymentStatusProps {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  error?: string;
  onRetry?: () => void;
}

export function PaymentStatus({ status, error, onRetry }: PaymentStatusProps) {
  // Pending status
  if (status === 'pending') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
        <span>Payment pending</span>
      </div>
    );
  }

  // Processing status
  if (status === 'processing') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Processing payment...</span>
      </div>
    );
  }

  // Success status
  if (status === 'succeeded') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
        <svg
          className="w-5 h-5 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Payment successful</span>
      </div>
    );
  }

  // Failed status
  if (status === 'failed') {
    return (
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>Payment failed</span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
            <p className="font-medium mb-1">Error details:</p>
            <p>{error}</p>
          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Full-page payment status display
 * For use on confirmation/status pages
 */
interface PaymentStatusPageProps {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  amount?: number;
  error?: string;
  bookingId?: string;
  onRetry?: () => void;
}

export function PaymentStatusPage({
  status,
  amount,
  error,
  bookingId,
  onRetry,
}: PaymentStatusPageProps) {
  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="text-center space-y-6">
        {/* Status Icon */}
        {status === 'processing' && (
          <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}

        {status === 'succeeded' && (
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {status === 'failed' && (
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}

        {/* Status Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {status === 'processing' && 'Processing Payment'}
            {status === 'succeeded' && 'Payment Successful'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'pending' && 'Payment Pending'}
          </h2>

          {amount && status === 'succeeded' && (
            <p className="text-3xl font-bold text-green-600">
              £{amount.toFixed(2)}
            </p>
          )}

          <p className="text-slate-600">
            {status === 'processing' && 'Please wait while we process your payment...'}
            {status === 'succeeded' &&
              'Your booking has been confirmed. You will receive a confirmation email shortly.'}
            {status === 'failed' &&
              'We were unable to process your payment. Please try again.'}
            {status === 'pending' && 'Your payment is being processed.'}
          </p>
        </div>

        {/* Booking Reference */}
        {bookingId && status === 'succeeded' && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Booking Reference</p>
            <p className="font-mono font-semibold text-slate-900">{bookingId}</p>
          </div>
        )}

        {/* Error Details */}
        {error && status === 'failed' && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-left">
            <p className="font-medium mb-2">Error details:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Retry Button */}
        {onRetry && status === 'failed' && (
          <button
            onClick={onRetry}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
