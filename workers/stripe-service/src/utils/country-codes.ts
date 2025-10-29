/**
 * Country Name to ISO 3166-1 alpha-2 Code Mapping
 * 
 * Stripe requires ISO country codes for address validation and tax calculation
 * This utility converts full country names to their ISO codes
 */

export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // EU Countries
  'Belgium': 'BE',
  'Netherlands': 'NL',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Portugal': 'PT',
  'Austria': 'AT',
  'Luxembourg': 'LU',
  'Ireland': 'IE',
  'Denmark': 'DK',
  'Sweden': 'SE',
  'Finland': 'FI',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Slovakia': 'SK',
  'Hungary': 'HU',
  'Slovenia': 'SI',
  'Croatia': 'HR',
  'Bulgaria': 'BG',
  'Romania': 'RO',
  'Lithuania': 'LT',
  'Latvia': 'LV',
  'Estonia': 'EE',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Greece': 'GR',
  
  // EEA (non-EU)
  'Norway': 'NO',
  'Iceland': 'IS',
  'Liechtenstein': 'LI',
  
  // Other European
  'Switzerland': 'CH',
  'United Kingdom': 'GB',
  'UK': 'GB',
};

/**
 * Convert country name to ISO 3166-1 alpha-2 code
 * 
 * @param countryName - Full country name (e.g., "Belgium")
 * @returns ISO country code (e.g., "BE") or undefined if not found
 */
export function getCountryCode(countryName?: string): string | undefined {
  if (!countryName) return undefined;
  
  // If it's already a 2-letter code, return as-is (uppercase)
  if (countryName.length === 2) {
    return countryName.toUpperCase();
  }
  
  // Look up in mapping
  return COUNTRY_NAME_TO_CODE[countryName];
}

/**
 * Validate if a string is a valid ISO country code
 * 
 * @param code - Potential country code
 * @returns true if it's a valid 2-letter uppercase code
 */
export function isValidCountryCode(code?: string): boolean {
  if (!code) return false;
  return /^[A-Z]{2}$/.test(code);
}
