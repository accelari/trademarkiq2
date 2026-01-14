/**
 * Länder-Mapping für Markenregister
 * Berechnet relevante Länder für Konflikte basierend auf Register und Protection
 */

// EU-Mitgliedsstaaten (27 Länder)
const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

// Benelux-Länder
const BENELUX_COUNTRIES = ["BE", "NL", "LU"];

// OAPI (Organisation Africaine de la Propriété Intellectuelle) - 17 Länder
const OAPI_COUNTRIES = [
  "BF", "BJ", "CF", "CG", "CI", "CM", "GA", "GN", "GQ", "GW",
  "KM", "ML", "MR", "NE", "SN", "TD", "TG"
];

// ARIPO (African Regional Intellectual Property Organization) - 22 Länder
const ARIPO_COUNTRIES = [
  "BW", "GM", "GH", "KE", "LS", "LR", "MW", "MZ", "NA", "RW",
  "ST", "SL", "SO", "SD", "SZ", "TZ", "UG", "ZM", "ZW"
];

// Regionale Register zu Ländern
const REGIONAL_REGISTERS: Record<string, string[]> = {
  "EU": EU_COUNTRIES,
  "EM": EU_COUNTRIES, // EUIPO Alias
  "BX": BENELUX_COUNTRIES,
  "OA": OAPI_COUNTRIES,
  "AP": ARIPO_COUNTRIES,
};

/**
 * Berechnet die relevanten Länder für einen Markenkonflikt
 * 
 * @param register - Das Register der Marke (AU, EU, WO, etc.)
 * @param protection - Array der Schutzländer aus der API
 * @param searchedCountries - Array der vom Benutzer gesuchten Länder
 * @returns Array der relevanten Länder (Schnittmenge)
 */
export function getRelevantCountries(
  register: string,
  protection: string[],
  searchedCountries: string[]
): string[] {
  const relevant = new Set<string>();
  const registerUpper = (register || "").toUpperCase();
  const searchedUpper = searchedCountries.map(c => c.toUpperCase());
  const protectionUpper = (protection || []).map(c => String(c).toUpperCase());
  
  // 1. Regionales Register (EU, EM, BX, OA, AP) → Expandieren zu Ländern
  if (REGIONAL_REGISTERS[registerUpper]) {
    for (const c of REGIONAL_REGISTERS[registerUpper]) {
      if (searchedUpper.includes(c)) {
        relevant.add(c);
      }
    }
  }
  
  // 2. Nationales Register (AU, IN, DE, RU, etc.) → Register = Land
  //    Alle 2-Buchstaben-Codes außer bekannte regionale
  else if (
    registerUpper.length === 2 && 
    !["WO", "EU", "EM", "BX", "OA", "AP"].includes(registerUpper)
  ) {
    if (searchedUpper.includes(registerUpper)) {
      relevant.add(registerUpper);
    }
  }
  
  // 3. Protection-Länder die gesucht werden (immer prüfen)
  for (const c of protectionUpper) {
    // Direkter Match: Protection-Land ist in gesuchten Ländern
    if (searchedUpper.includes(c)) {
      relevant.add(c);
    }
    
    // Regionaler Code in Protection (z.B. BX, OA, EU):
    // Wenn Protection "BX" enthält und User "BE" sucht → BE ist relevant
    if (REGIONAL_REGISTERS[c]) {
      for (const regionCountry of REGIONAL_REGISTERS[c]) {
        if (searchedUpper.includes(regionCountry)) {
          relevant.add(regionCountry);
        }
      }
    }
  }
  
  // 4. Bei WIPO (WO): Die designierten Länder aus protection sind relevant
  //    Regionale Codes werden jetzt auch korrekt expandiert (Schritt 3)
  
  return Array.from(relevant);
}

/**
 * Prüft ob ein Register ein regionales System ist
 */
export function isRegionalRegister(register: string): boolean {
  return Object.keys(REGIONAL_REGISTERS).includes((register || "").toUpperCase());
}

/**
 * Gibt alle Länder eines regionalen Registers zurück
 */
export function getRegisterCountries(register: string): string[] {
  return REGIONAL_REGISTERS[(register || "").toUpperCase()] || [];
}
