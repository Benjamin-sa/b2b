/**
 * Country Name to ISO 3166-1 alpha-2 Code Mapping
 *
 * Stripe requires ISO country codes for address validation and tax calculation
 * This utility converts full country names to their ISO codes
 */

export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // EU Countries
  Belgium: 'BE',
  Netherlands: 'NL',
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Portugal: 'PT',
  Austria: 'AT',
  Luxembourg: 'LU',
  Ireland: 'IE',
  Denmark: 'DK',
  Sweden: 'SE',
  Finland: 'FI',
  Poland: 'PL',
  'Czech Republic': 'CZ',
  Slovakia: 'SK',
  Hungary: 'HU',
  Slovenia: 'SI',
  Croatia: 'HR',
  Bulgaria: 'BG',
  Romania: 'RO',
  Lithuania: 'LT',
  Latvia: 'LV',
  Estonia: 'EE',
  Malta: 'MT',
  Cyprus: 'CY',
  Greece: 'GR',

  // EEA (non-EU)
  Norway: 'NO',
  Iceland: 'IS',
  Liechtenstein: 'LI',

  // Other European
  Switzerland: 'CH',
  'United Kingdom': 'GB',
  UK: 'GB',
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

/**
 * Country Code to Primary Language Mapping (for Stripe preferred_locales)
 *
 * Maps ISO 3166-1 alpha-2 country codes to RFC-4646 language codes
 * Used for Stripe's preferred_locales parameter (NOT country codes!)
 *
 * Note: Belgium is multilingual (nl, fr, de) - defaulting to Dutch (nl) as primary
 * Switzerland is multilingual (de, fr, it) - defaulting to German (de) as primary
 */
export const COUNTRY_CODE_TO_LANGUAGE: Record<string, string> = {
  // EU Countries
  BE: 'nl', // Belgium - Dutch (also speaks French, German)
  NL: 'nl', // Netherlands - Dutch
  DE: 'de', // Germany - German
  FR: 'fr', // France - French
  IT: 'it', // Italy - Italian
  ES: 'es', // Spain - Spanish
  PT: 'pt', // Portugal - Portuguese
  AT: 'de', // Austria - German
  LU: 'fr', // Luxembourg - French (also German, Luxembourgish)
  IE: 'en', // Ireland - English
  DK: 'da', // Denmark - Danish
  SE: 'sv', // Sweden - Swedish
  FI: 'fi', // Finland - Finnish
  PL: 'pl', // Poland - Polish
  CZ: 'cs', // Czech Republic - Czech
  SK: 'sk', // Slovakia - Slovak
  HU: 'hu', // Hungary - Hungarian
  SI: 'sl', // Slovenia - Slovenian
  HR: 'hr', // Croatia - Croatian
  BG: 'bg', // Bulgaria - Bulgarian
  RO: 'ro', // Romania - Romanian
  LT: 'lt', // Lithuania - Lithuanian
  LV: 'lv', // Latvia - Latvian
  EE: 'et', // Estonia - Estonian
  MT: 'en', // Malta - English (also Maltese)
  CY: 'el', // Cyprus - Greek
  GR: 'el', // Greece - Greek

  // EEA (non-EU)
  NO: 'no', // Norway - Norwegian
  IS: 'is', // Iceland - Icelandic
  LI: 'de', // Liechtenstein - German

  // Other European
  CH: 'de', // Switzerland - German (also French, Italian)
  GB: 'en', // United Kingdom - English

  // Common fallback
  US: 'en', // United States - English
};

/**
 * Get language code(s) for Stripe preferred_locales from country code
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "BE")
 * @returns RFC-4646 language code (e.g., "nl" for Belgium) or undefined
 *
 * @example
 * getPreferredLocale('BE') // Returns 'nl' (Dutch for Belgium)
 * getPreferredLocale('FR') // Returns 'fr' (French)
 * getPreferredLocale('CH') // Returns 'de' (German for Switzerland)
 */
export function getPreferredLocale(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;

  const upperCode = countryCode.toUpperCase();
  return COUNTRY_CODE_TO_LANGUAGE[upperCode];
}
