/**
 * EU VAT/BTW Number Validation Utility
 * Validates format of EU VAT numbers to prevent Stripe API errors
 */

interface VATPattern {
  country: string;
  pattern: RegExp;
  name: string;
  example: string;
}

// EU VAT number patterns (Stripe compatible)
const VAT_PATTERNS: VATPattern[] = [
  // België/Belgium
  { country: 'BE', pattern: /^BE[0-9]{10}$/, name: 'Belgium', example: 'BE0123456789' },

  // Nederland/Netherlands
  {
    country: 'NL',
    pattern: /^NL[0-9]{9}B[0-9]{2}$/,
    name: 'Netherlands',
    example: 'NL123456789B01',
  },

  // Duitsland/Germany
  { country: 'DE', pattern: /^DE[0-9]{9}$/, name: 'Germany', example: 'DE123456789' },

  // Frankrijk/France
  { country: 'FR', pattern: /^FR[0-9A-Z]{2}[0-9]{9}$/, name: 'France', example: 'FR12345678901' },

  // Italië/Italy
  { country: 'IT', pattern: /^IT[0-9]{11}$/, name: 'Italy', example: 'IT12345678901' },

  // Spanje/Spain
  { country: 'ES', pattern: /^ES[0-9A-Z][0-9]{7}[0-9A-Z]$/, name: 'Spain', example: 'ES123456789' },

  // Portugal
  { country: 'PT', pattern: /^PT[0-9]{9}$/, name: 'Portugal', example: 'PT123456789' },

  // Oostenrijk/Austria
  { country: 'AT', pattern: /^ATU[0-9]{8}$/, name: 'Austria', example: 'ATU12345678' },

  // Luxemburg/Luxembourg
  { country: 'LU', pattern: /^LU[0-9]{8}$/, name: 'Luxembourg', example: 'LU12345678' },

  // Ierland/Ireland
  { country: 'IE', pattern: /^IE[0-9]{7}[A-Z]{1,2}$/, name: 'Ireland', example: 'IE1234567A' },

  // Denemarken/Denmark
  { country: 'DK', pattern: /^DK[0-9]{8}$/, name: 'Denmark', example: 'DK12345678' },

  // Zweden/Sweden
  { country: 'SE', pattern: /^SE[0-9]{12}$/, name: 'Sweden', example: 'SE123456789012' },

  // Finland
  { country: 'FI', pattern: /^FI[0-9]{8}$/, name: 'Finland', example: 'FI12345678' },

  // Polen/Poland
  { country: 'PL', pattern: /^PL[0-9]{10}$/, name: 'Poland', example: 'PL1234567890' },

  // Tsjechië/Czech Republic
  { country: 'CZ', pattern: /^CZ[0-9]{8,10}$/, name: 'Czech Republic', example: 'CZ12345678' },

  // Slowakije/Slovakia
  { country: 'SK', pattern: /^SK[0-9]{10}$/, name: 'Slovakia', example: 'SK1234567890' },

  // Hongarije/Hungary
  { country: 'HU', pattern: /^HU[0-9]{8}$/, name: 'Hungary', example: 'HU12345678' },

  // Slovenië/Slovenia
  { country: 'SI', pattern: /^SI[0-9]{8}$/, name: 'Slovenia', example: 'SI12345678' },

  // Kroatië/Croatia
  { country: 'HR', pattern: /^HR[0-9]{11}$/, name: 'Croatia', example: 'HR12345678901' },

  // Bulgarije/Bulgaria
  { country: 'BG', pattern: /^BG[0-9]{9,10}$/, name: 'Bulgaria', example: 'BG123456789' },

  // Roemenië/Romania
  { country: 'RO', pattern: /^RO[0-9]{2,10}$/, name: 'Romania', example: 'RO12345678' },

  // Litouwen/Lithuania
  { country: 'LT', pattern: /^LT([0-9]{9}|[0-9]{12})$/, name: 'Lithuania', example: 'LT123456789' },

  // Letland/Latvia
  { country: 'LV', pattern: /^LV[0-9]{11}$/, name: 'Latvia', example: 'LV12345678901' },

  // Estland/Estonia
  { country: 'EE', pattern: /^EE[0-9]{9}$/, name: 'Estonia', example: 'EE123456789' },

  // Malta
  { country: 'MT', pattern: /^MT[0-9]{8}$/, name: 'Malta', example: 'MT12345678' },

  // Cyprus
  { country: 'CY', pattern: /^CY[0-9]{8}[A-Z]$/, name: 'Cyprus', example: 'CY12345678A' },

  // Griekenland/Greece
  { country: 'GR', pattern: /^(GR|EL)[0-9]{9}$/, name: 'Greece', example: 'GR123456789' },

  // Noorwegen/Norway (EEA)
  { country: 'NO', pattern: /^NO[0-9]{9}MVA$/, name: 'Norway', example: 'NO123456789MVA' },

  // IJsland/Iceland (EEA)
  { country: 'IS', pattern: /^IS[0-9]{5,6}$/, name: 'Iceland', example: 'IS12345' },
];

export interface VATValidationResult {
  isValid: boolean;
  country?: string;
  countryName?: string;
  format?: string;
  error?: string;
  errorParams?: Record<string, string>; // Parameters for i18n translation
}

/**
 * Validate EU VAT/BTW number format
 * Note: Error messages use i18n keys that should be translated in your component
 * Use the `error` field as the translation key and `errorParams` for placeholders
 */
export function validateVATNumber(vatNumber: string): VATValidationResult {
  if (!vatNumber || typeof vatNumber !== 'string') {
    return {
      isValid: false,
      error: 'auth.validation.vatRequired',
    };
  }

  // Clean input: remove spaces, convert to uppercase
  const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();

  // Check if it starts with a country code
  if (cleanVAT.length < 4) {
    return {
      isValid: false,
      error: 'auth.validation.vatTooShort',
    };
  }

  const countryCode = cleanVAT.substring(0, 2);

  // Find matching pattern
  const pattern = VAT_PATTERNS.find((p) => p.country === countryCode);

  if (!pattern) {
    return {
      isValid: false,
      error: 'auth.validation.vatUnknownCountry',
      errorParams: { code: countryCode },
    };
  }

  // Validate against pattern
  const isValid = pattern.pattern.test(cleanVAT);

  if (!isValid) {
    return {
      isValid: false,
      country: pattern.country,
      countryName: pattern.name,
      format: pattern.example,
      error: 'auth.validation.vatInvalidFormat',
      errorParams: { country: pattern.name, format: pattern.example },
    };
  }

  return {
    isValid: true,
    country: pattern.country,
    countryName: pattern.name,
    format: cleanVAT,
  };
}

/**
 * Format VAT number for display (adds spaces for readability)
 */
export function formatVATNumber(vatNumber: string): string {
  if (!vatNumber) return '';

  const clean = vatNumber.replace(/\s/g, '').toUpperCase();
  const countryCode = clean.substring(0, 2);
  const rest = clean.substring(2);

  // Add spaces for better readability (country-specific formatting)
  switch (countryCode) {
    case 'BE':
      return `${countryCode} ${rest.substring(0, 4)} ${rest.substring(4, 7)} ${rest.substring(7)}`;
    case 'NL':
      return `${countryCode} ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6, 9)} ${rest.substring(9)}`;
    case 'DE':
      return `${countryCode} ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6)}`;
    default:
      // Default: add space every 3-4 characters
      return `${countryCode} ${rest.replace(/(.{3,4})/g, '$1 ').trim()}`;
  }
}

/**
 * Get all supported countries for dropdown/info
 */
export function getSupportedVATCountries(): Array<{ code: string; name: string; example: string }> {
  return VAT_PATTERNS.map((p) => ({
    code: p.country,
    name: p.name,
    example: p.example,
  }));
}

/**
 * Check if VAT number is required for a country
 */
export function isVATRequired(countryCode: string): boolean {
  // For B2B in EU, VAT is usually required for business customers
  const euCountries = VAT_PATTERNS.map((p) => p.country);
  return euCountries.includes(countryCode.toUpperCase());
}
