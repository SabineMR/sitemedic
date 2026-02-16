export type EmploymentStatus = 'self_employed' | 'umbrella';

export interface IR35Assessment {
  employment_status: EmploymentStatus;
  utr?: string; // Required for self_employed
  umbrella_company_name?: string; // Required for umbrella
  cest_assessment_result?: string; // 'outside_ir35' | 'inside_ir35' | 'unknown'
  cest_assessment_date?: string;
  cest_pdf_url?: string;
}

// Validate UTR format (10 digits, with optional spaces)
export function validateUTR(utr: string): boolean {
  const cleaned = utr.replace(/\s/g, '');
  return /^\d{10}$/.test(cleaned);
}

// Check if CEST assessment is required
export function requiresCESTAssessment(employment_status: EmploymentStatus): boolean {
  return employment_status === 'self_employed';
}

// Validate IR35 status completeness
export function validateIR35Status(data: IR35Assessment): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.employment_status) {
    errors.push('Employment status is required');
  }

  if (data.employment_status === 'self_employed') {
    if (!data.utr) {
      errors.push('UTR is required for self-employed contractors');
    } else if (!validateUTR(data.utr)) {
      errors.push('Invalid UTR format (must be 10 digits)');
    }

    // CEST assessment recommended but not strictly required
    if (!data.cest_assessment_result) {
      errors.push('HMRC CEST assessment is strongly recommended for IR35 compliance');
    }
  }

  if (data.employment_status === 'umbrella') {
    if (!data.umbrella_company_name) {
      errors.push('Umbrella company name is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Calculate deductions (simplified - umbrella companies handle this)
export function calculateDeductions(grossPay: number, employment_status: EmploymentStatus): {
  gross: number;
  tax: number;
  ni: number;
  net: number;
} {
  if (employment_status === 'umbrella') {
    // Umbrella company handles deductions
    return { gross: grossPay, tax: 0, ni: 0, net: grossPay };
  }

  // Self-employed: no deductions (medic responsible for own taxes)
  return { gross: grossPay, tax: 0, ni: 0, net: grossPay };
}
