'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { What3WordsInput } from '@/components/ui/what3words-input';
import { coordinatesToWhat3Words } from '@/lib/utils/what3words';

interface QuoteBuilderProps {
  onClose: () => void;
}

export default function QuoteBuilder({ onClose }: QuoteBuilderProps) {
  const [step, setStep] = useState(1);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [formData, setFormData] = useState({
    workerCount: '',
    projectType: '',
    medicCount: '1',
    duration: '1-day',
    durationKnown: 'estimated', // 'estimated' or 'fixed'
    estimatedDuration: '',
    location: '',
    siteAddress: '',
    coordinates: '', // Format: "lat, long" or empty if address is provided
    what3wordsAddress: '', // Format: ///word.word.word or word.word.word
    startDate: '',
    endDate: '',
    projectPhase: '',
    specialRequirements: [] as string[],
    name: '',
    email: '',
    phone: '',
    company: '',
  });

  const updateField = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill recommended medic count when worker count or project type changes
  useEffect(() => {
    if (formData.workerCount && formData.projectType) {
      const recommended = calculateRecommendedMedics();
      updateField('medicCount', recommended.toString());
    }
  }, [formData.workerCount, formData.projectType]);

  // Initialize Google Places Autocomplete when API loads
  useEffect(() => {
    if (!googleMapsLoaded || !addressInputRef.current) return;

    // Create autocomplete instance with UK restriction
    autocompleteRef.current = new google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: 'gb' },
      types: ['geocode'],
      fields: ['formatted_address', 'geometry', 'address_components'],
    });

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place || !place.geometry) return;

      // Check if address is in England or Wales (exclude Scotland and Northern Ireland)
      const addressComponents = place.address_components || [];
      const country = addressComponents.find(c => c.types.includes('country'));
      const adminArea = addressComponents.find(c => c.types.includes('administrative_area_level_1'));

      // Filter out Scotland and Northern Ireland
      const excludedAreas = ['Scotland', 'Northern Ireland'];
      if (adminArea && excludedAreas.includes(adminArea.long_name)) {
        alert('Please select an address in England or Wales only.');
        updateField('siteAddress', '');
        updateField('coordinates', '');
        setAddressAutoFilled(false);
        return;
      }

      // Extract formatted address
      const address = place.formatted_address || '';

      // Extract coordinates
      const lat = place.geometry.location?.lat();
      const lng = place.geometry.location?.lng();
      const coordinates = lat && lng ? `${lat}, ${lng}` : '';

      // Update form data and mark as auto-filled
      updateField('siteAddress', address);
      updateField('coordinates', coordinates);
      setAddressAutoFilled(true);

      // Auto-fill what3words address from coordinates
      if (lat && lng) {
        coordinatesToWhat3Words(lat, lng).then((result) => {
          if (result) {
            updateField('what3wordsAddress', `///${result.words}`);
          }
        });
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [googleMapsLoaded]);

  // Calculate recommended paramedics based on HSE guidance (configurable via env vars)
  const calculateRecommendedMedics = () => {
    const workers = parseInt(formData.workerCount) || 0;
    const isHighRisk = formData.projectType === 'high-risk';

    if (workers === 0) return 1;

    // HSE guidance (not legal requirement): configurable ratios
    // Default: High-risk sites 1 per 50 workers, low-risk 1 per 100 workers
    const highRiskRatio = parseInt(process.env.NEXT_PUBLIC_HIGH_RISK_RATIO || '50');
    const lowRiskRatio = parseInt(process.env.NEXT_PUBLIC_LOW_RISK_RATIO || '100');

    const ratio = isHighRisk ? highRiskRatio : lowRiskRatio;
    const recommended = Math.max(1, Math.ceil(workers / ratio));

    return recommended;
  };

  // Validate site address, coordinates, or what3words
  const isValidLocation = (): boolean => {
    // Either site address OR coordinates OR what3words must be provided
    const hasAddress = formData.siteAddress.trim().length > 0;
    const hasCoordinates = formData.coordinates.trim().length > 0;
    const hasWhat3Words = formData.what3wordsAddress.trim().length > 0;

    // what3words takes priority as the most precise
    if (hasWhat3Words) {
      // Basic format check: 3 words separated by dots
      const w3wRegex = /^(\/\/\/)?[a-z]+\.[a-z]+\.[a-z]+$/i;
      return w3wRegex.test(formData.what3wordsAddress.trim());
    }

    // If coordinates provided, validate format (lat, long)
    if (hasCoordinates && !hasAddress) {
      const coordRegex = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
      return coordRegex.test(formData.coordinates.trim());
    }

    return hasAddress || hasCoordinates;
  };

  const getDurationDays = () => {
    if (formData.durationKnown === 'fixed') {
      // Calculate days from start and end dates
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // Include both start and end day
      }
      return 1;
    } else {
      // Estimated duration - use midpoint of range
      const estimatedMap: Record<string, number> = {
        '1-2-weeks': 7, // midpoint of 5-10 days
        '2-4-weeks': 15, // midpoint of 10-20 days
        '1-3-months': 40, // midpoint of 20-60 days
        '3-6-months': 90, // midpoint of 60-120 days
        '6-12-months': 180, // midpoint of 120-240 days
        'ongoing': 20, // show 1 month for initial estimate
      };
      return estimatedMap[formData.estimatedDuration] || 1;
    }
  };

  const calculatePrice = () => {
    const basePrice = 350; // £350/day per medic
    const medicCount = parseInt(formData.medicCount);
    const days = getDurationDays();

    return basePrice * medicCount * days;
  };

  const getDurationLabel = () => {
    if (formData.durationKnown === 'fixed') {
      // Show calculated duration from dates
      const days = getDurationDays();
      if (days === 1) return '1 day';
      if (days <= 7) return `${days} days`;
      if (days <= 14) return `${days} days (~${Math.round(days / 5)} weeks)`;
      if (days <= 60) return `${days} days (~${Math.round(days / 20)} months)`;
      return `${days} days (~${Math.round(days / 20)} months)`;
    } else {
      const labelMap: Record<string, string> = {
        '1-2-weeks': '1-2 weeks (~7 days)',
        '2-4-weeks': '2-4 weeks (~15 days)',
        '1-3-months': '1-3 months (~40 days)',
        '3-6-months': '3-6 months (~90 days)',
        '6-12-months': '6-12 months (~180 days)',
        'ongoing': 'Ongoing (shown: 1 month)',
      };
      return labelMap[formData.estimatedDuration] || '1 day';
    }
  };

  const canProceedToStep2 = () => {
    // Validate required fields for step 1
    if (!formData.projectType) return false;
    if (!isValidLocation()) return false;
    if (formData.durationKnown === 'estimated' && !formData.estimatedDuration) return false;
    if (!formData.startDate) return false;
    // For fixed duration, end date is required
    if (formData.durationKnown === 'fixed' && !formData.endDate) return false;
    // End date must be after or equal to start date
    if (formData.durationKnown === 'fixed' && formData.endDate && formData.endDate < formData.startDate) return false;
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !canProceedToStep2()) {
      alert('Please fill in all required fields before continuing');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <>
      {/* Load Google Maps Places API */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`}
        onLoad={() => setGoogleMapsLoaded(true)}
        strategy="lazyOnload"
      />

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Get Your Quote</h2>
            <p className="text-sm text-slate-500">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-slate-50">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Tell us about your construction site
                </h3>

                <div className="space-y-5">
                  {/* Worker count for calculating recommended paramedics */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Maximum workers on site at one time?
                    </label>
                    <input
                      type="number"
                      value={formData.workerCount}
                      onChange={(e) => updateField('workerCount', e.target.value)}
                      placeholder="e.g., 50"
                      min="1"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900 font-medium mb-1">
                        💡 Important: Enter peak concurrent workers, not total headcount
                      </p>
                      <p className="text-xs text-blue-700">
                        Example: If you have 50 workers on day shift and 30 on night shift, enter <strong>50</strong> (the highest number at any one time). This ensures adequate paramedic coverage during peak hours.
                      </p>
                    </div>
                  </div>

                  {/* Project type for risk assessment */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      What type of construction work? *
                    </label>
                    <select
                      value={formData.projectType}
                      onChange={(e) => updateField('projectType', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select project type...</option>
                      <option value="standard">Standard Construction (residential, commercial)</option>
                      <option value="high-risk">High-Risk (demolition, confined space, height work)</option>
                      <option value="heavy-civil">Heavy Civil Engineering (bridges, tunnels, infrastructure)</option>
                      <option value="refurbishment">Refurbishment & Fit-Out</option>
                    </select>
                  </div>

                  {/* Recommended paramedics based on calculations */}
                  {formData.workerCount && formData.projectType && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-green-900">
                            ✓ HSE Guidance Recommendation: {calculateRecommendedMedics()} paramedic{calculateRecommendedMedics() > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-green-800 mt-1">
                            Based on {formData.workerCount} peak concurrent workers on a {formData.projectType.replace('-', ' ')} site
                          </p>
                          <p className="text-xs text-green-700 mt-2 font-medium">
                            {formData.projectType === 'high-risk'
                              ? `📋 HSE Guidance: High-risk sites typically need 1 first aider per ${process.env.NEXT_PUBLIC_HIGH_RISK_RATIO || '50'} workers`
                              : `📋 HSE Guidance: Low-risk sites typically need 1 first aider per ${process.env.NEXT_PUBLIC_LOW_RISK_RATIO || '100'} workers`}
                          </p>
                          <div className="mt-2 pt-2 border-t border-green-300">
                            <p className="text-xs text-green-800">
                              <strong>Note:</strong> UK law (Health and Safety First-Aid Regulations 1981, CDM 2015) requires "adequate first-aid provisions" based on risk assessment. The ratios above are HSE guidance, not legal mandates. We recommend paramedic coverage as best practice.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual override for paramedic count */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Number of paramedics needed *
                    </label>
                    <select
                      value={formData.medicCount}
                      onChange={(e) => updateField('medicCount', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">1 paramedic</option>
                      <option value="2">2 paramedics</option>
                      <option value="3">3 paramedics</option>
                      <option value="4">4 paramedics</option>
                      <option value="5">5+ paramedics</option>
                    </select>
                  </div>

                  {/* Project phase */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Project phase
                    </label>
                    <select
                      value={formData.projectPhase}
                      onChange={(e) => updateField('projectPhase', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select phase...</option>
                      <option value="pre-construction">Pre-Construction (planning, groundworks)</option>
                      <option value="construction">Active Construction</option>
                      <option value="fit-out">Fit-Out & Finishing</option>
                      <option value="completion">Near Completion</option>
                    </select>
                  </div>

                  {/* Special requirements */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-slate-700">
                        Special requirements (select all that apply)
                      </label>
                      <div className="relative group">
                        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition cursor-help">
                          <svg className="w-3 h-3 font-bold" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>

                        {/* Hover tooltip */}
                        <div className="absolute left-0 top-7 z-50 w-96 p-4 bg-slate-900 text-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                          <div className="absolute -top-2 left-4 w-4 h-4 bg-slate-900 transform rotate-45"></div>
                          <h5 className="font-semibold mb-2 text-sm">What do these mean?</h5>
                          <dl className="space-y-2 text-xs">
                            <div>
                              <dt className="font-medium text-white">Confined Space Work</dt>
                              <dd className="text-slate-300">Work in tanks, vessels, silos, or enclosed spaces. Paramedic needs specialized confined space rescue training.</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-white">Working at Height (&gt;3m)</dt>
                              <dd className="text-slate-300">Scaffolding, roofing, or elevated work platforms. Paramedic should understand fall injuries and rescue procedures.</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-white">Heavy Machinery Operation</dt>
                              <dd className="text-slate-300">Cranes, excavators, or large plant equipment. Paramedic needs experience with crush injuries and extrication.</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-white">CSCS Card Site</dt>
                              <dd className="text-slate-300">Construction Skills Certification Scheme required. Paramedic will need valid CSCS card for site access.</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-white">Trauma Specialist</dt>
                              <dd className="text-slate-300">High-risk environment requiring advanced trauma care experience (e.g., major injuries, multiple casualties).</dd>
                            </div>
                          </dl>
                          <p className="mt-2 text-slate-300 italic text-xs">
                            ℹ️ Selecting these helps us match you with a paramedic who has the right experience and qualifications.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { value: 'confined-space', label: 'Confined Space Work' },
                        { value: 'height', label: 'Working at Height (>3m)' },
                        { value: 'heavy-machinery', label: 'Heavy Machinery Operation' },
                        { value: 'cscs-required', label: 'CSCS Card Site' },
                        { value: 'trauma-specialist', label: 'Trauma Specialist Required' },
                      ].map((req) => (
                        <label key={req.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.specialRequirements.includes(req.value)}
                            onChange={(e) => {
                              const current = formData.specialRequirements;
                              if (e.target.checked) {
                                updateField('specialRequirements', [...current, req.value]);
                              } else {
                                updateField('specialRequirements', current.filter(r => r !== req.value));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{req.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Site address with Google Places autocomplete */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Site address * {googleMapsLoaded && <span className="text-green-600 text-xs">(autocomplete enabled)</span>}
                    </label>
                    <input
                      ref={addressInputRef}
                      type="text"
                      value={formData.siteAddress}
                      onChange={(e) => {
                        updateField('siteAddress', e.target.value);
                        // Reset auto-fill flag when user manually types
                        if (addressAutoFilled) {
                          setAddressAutoFilled(false);
                          updateField('coordinates', '');
                        }
                      }}
                      placeholder="Start typing address in England or Wales..."
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        !isValidLocation() && (formData.siteAddress || formData.coordinates)
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-slate-300 focus:border-blue-500'
                      }`}
                      autoComplete="off"
                      required={!formData.coordinates}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {googleMapsLoaded
                        ? 'Start typing to see address suggestions (England & Wales only). Coordinates auto-fill on selection.'
                        : 'Enter the full construction site address for accurate paramedic dispatch'}
                    </p>
                  </div>

                  {/* Coordinates (auto-filled from address or manual override) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      GPS coordinates {addressAutoFilled ? '(auto-filled)' : formData.siteAddress ? '' : '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.coordinates}
                      onChange={(e) => updateField('coordinates', e.target.value)}
                      placeholder="e.g., 51.5074, -0.1278"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        !isValidLocation() && formData.coordinates && !formData.siteAddress
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-slate-300 focus:border-blue-500'
                      } ${addressAutoFilled ? 'bg-slate-50' : ''}`}
                      required={!formData.siteAddress}
                      readOnly={addressAutoFilled}
                    />
                    {formData.coordinates && !formData.siteAddress && !isValidLocation() && (
                      <p className="text-xs text-red-600 mt-1">
                        Please enter coordinates in format: latitude, longitude (e.g., 51.5074, -0.1278)
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {addressAutoFilled
                        ? '✓ Auto-filled from selected address'
                        : 'Enter coordinates manually if exact address is not available'}
                    </p>
                  </div>

                  {/* what3words address (precise 3m x 3m location) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      what3words address (recommended for precision)
                    </label>
                    <What3WordsInput
                      value={formData.what3wordsAddress}
                      onChange={(value, coords) => {
                        updateField('what3wordsAddress', value);
                        // If coordinates are provided from what3words, update them
                        if (coords) {
                          updateField('coordinates', `${coords.lat}, ${coords.lng}`);
                        }
                      }}
                      placeholder="e.g., filled.count.soap or ///filled.count.soap"
                      autoFillFromCoordinates={
                        formData.coordinates && !formData.what3wordsAddress
                          ? (() => {
                              const parts = formData.coordinates.split(',').map((s) => s.trim());
                              if (parts.length === 2) {
                                const lat = parseFloat(parts[0]);
                                const lng = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                  return { lat, lng };
                                }
                              }
                              return null;
                            })()
                          : null
                      }
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900 font-medium mb-1">
                        💡 Why what3words?
                      </p>
                      <p className="text-xs text-blue-700">
                        what3words divides the world into 3m x 3m squares and gives each one a unique 3-word address. This is much easier to communicate over phone or radio than GPS coordinates, and ensures paramedics can find the exact location on your construction site.
                      </p>
                    </div>
                  </div>

                  {/* Duration flexibility */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Do you know exactly how long you'll need coverage?
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="durationKnown"
                          value="fixed"
                          checked={formData.durationKnown === 'fixed'}
                          onChange={(e) => updateField('durationKnown', e.target.value)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Yes, I know the exact duration</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="durationKnown"
                          value="estimated"
                          checked={formData.durationKnown === 'estimated'}
                          onChange={(e) => updateField('durationKnown', e.target.value)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Estimated duration (common for construction)</span>
                      </label>
                    </div>
                  </div>

                  {/* Duration selection - only show for estimated duration */}
                  {formData.durationKnown === 'estimated' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Estimated coverage duration *
                      </label>
                      <select
                        value={formData.estimatedDuration}
                        onChange={(e) => updateField('estimatedDuration', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select estimated duration...</option>
                        <option value="1-2-weeks">1-2 weeks</option>
                        <option value="2-4-weeks">2-4 weeks</option>
                        <option value="1-3-months">1-3 months</option>
                        <option value="3-6-months">3-6 months</option>
                        <option value="6-12-months">6-12 months</option>
                        <option value="ongoing">Ongoing (with weekly renewal)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        We understand construction timelines can be uncertain. We'll work with you on flexible arrangements.
                      </p>
                    </div>
                  )}

                  {/* Start date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      When do you need to start? *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* End date - only show for fixed duration */}
                  {formData.durationKnown === 'fixed' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        When will coverage end? *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateField('endDate', e.target.value)}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      {formData.startDate && formData.endDate && formData.endDate < formData.startDate && (
                        <p className="text-xs text-red-600 mt-1">
                          End date must be after start date
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {formData.durationKnown === 'estimated' ? 'Your estimated cost' : 'Your quote'}
                </h3>

                {/* Project summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Workers on site:</span>
                      <span className="font-medium text-slate-900">{formData.workerCount || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Project type:</span>
                      <span className="font-medium text-slate-900 capitalize">{formData.projectType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Location:</span>
                      <span className="font-medium text-slate-900">
                        {formData.what3wordsAddress
                          ? formData.what3wordsAddress
                          : formData.siteAddress || formData.coordinates}
                      </span>
                    </div>
                    {formData.what3wordsAddress && (formData.siteAddress || formData.coordinates) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Address:</span>
                        <span className="font-medium text-slate-900 text-xs">
                          {formData.siteAddress || formData.coordinates}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        {formData.durationKnown === 'fixed' ? 'Coverage dates:' : 'Start date:'}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formData.durationKnown === 'fixed' && formData.endDate
                          ? `${new Date(formData.startDate).toLocaleDateString('en-GB')} - ${new Date(formData.endDate).toLocaleDateString('en-GB')}`
                          : new Date(formData.startDate).toLocaleDateString('en-GB')
                        }
                      </span>
                    </div>
                    {formData.specialRequirements.length > 0 && (
                      <div className="pt-2 border-t border-slate-300">
                        <span className="text-slate-600 text-xs">Special requirements:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {formData.specialRequirements.map(req => (
                            <span key={req} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {req.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-slate-700 font-medium">
                      {formData.durationKnown === 'estimated' ? 'Estimated total' : 'Total cost'}
                    </span>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-blue-600">
                        £{calculatePrice().toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-500">
                        +VAT (20%)
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-blue-200 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-700">
                      <span>{formData.medicCount} paramedic{formData.medicCount !== '1' ? 's' : ''}</span>
                      <span className="font-medium">£350/day each</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Duration</span>
                      <span className="font-medium">{getDurationLabel()}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Total days</span>
                      <span className="font-medium">{getDurationDays()} days</span>
                    </div>
                  </div>

                  {formData.durationKnown === 'estimated' && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        💡 This is an estimated cost. Final pricing will be confirmed based on actual duration and any adjustments to requirements.
                      </p>
                    </div>
                  )}
                </div>

                {/* What's included */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Included at no extra cost:
                  </h4>
                  <ul className="text-sm text-green-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>HCPC-registered paramedic on-site</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Digital treatment logging (mobile app + web dashboard)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Automatic RIDDOR auto-flagging and HSE compliance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Weekly safety reports (PDF)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Works 100% offline (no mobile signal required)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>UK GDPR compliant data storage</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Your contact details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="+44"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company name
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => updateField('company', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <p className="mt-6 text-xs text-slate-500">
                  By submitting this form, you agree to be contacted about your quote. We'll never share your details with third parties.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={prevStep}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Back
              </button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => {
                  // Here you would submit the form data
                  alert('Quote request submitted! (This would actually send the data to your backend)');
                  onClose();
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Request Quote
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
