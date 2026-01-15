import { 
  EU_COUNTRIES as _EU_COUNTRIES, 
  BENELUX_COUNTRIES as _BENELUX_COUNTRIES, 
  OAPI_COUNTRIES as _OAPI_COUNTRIES 
} from "@/lib/country-mapping";

export const EU_COUNTRIES = _EU_COUNTRIES;
export const BENELUX_COUNTRIES = _BENELUX_COUNTRIES;
export const OAPI_COUNTRIES = _OAPI_COUNTRIES;

export interface TMSearchResult {
  mid: number;
  verbal: string;
  img: string | null;
  status: "LIVE" | "DEAD" | "UNKN";
  class: number[];
  submition: string;
  protection: string[];
  app: string;
  reg: string;
  date: {
    applied?: string;
    granted?: string;
    expiration?: string;
  };
  accuracy: number;
}

export interface TMSearchResponse {
  total: number;
  result: TMSearchResult[];
}

export interface TMInfoResponse {
  mid: number;
  verbal: string;
  img: string | null;
  status: "LIVE" | "DEAD" | "UNKN";
  class: {
    number: number;
    description?: string;
    subclasses?: string[];
  }[];
  submition: string;
  protection: string[];
  app: string;
  reg: string;
  date: {
    applied?: string;
    granted?: string;
    expiration?: string;
    renewal?: string;
  };
  owner?: {
    name?: string;
    address?: string;
    country?: string;
  };
  attorney?: {
    name?: string;
    address?: string;
  };
  accuracy?: number;
}

export interface NormalizedTrademark {
  id: string;
  mid: number;
  registrationNumber: string;
  applicationNumber: string;
  name: string;
  holder: string | null;
  holderAddress: string | null;
  holderCountry: string | null;
  status: "active" | "expired" | "unknown";
  statusOriginal: string;
  registrationDate: string | null;
  applicationDate: string | null;
  expiryDate: string | null;
  renewalDate: string | null;
  designationCountries: string[];
  niceClasses: number[];
  goodsServices: string | null;
  imageUrl: string | null;
  source: string;
  office: string;
  accuracy: number;
}

export const OFFICE_NAMES: Record<string, string> = {
  WO: "WIPO",
  EU: "EUIPO",
  EM: "EUIPO",
  DE: "DPMA",
  US: "USPTO",
  UK: "UKIPO",
  GB: "UKIPO",
  FR: "INPI",
  ES: "OEPM",
  IT: "UIBM",
  CH: "IGE",
  AT: "ÖPA",
  TR: "TÜRKPATENT",
  CN: "CNIPA",
  JP: "JPO",
  KR: "KIPO",
  AU: "IP Australia",
  CA: "CIPO",
  BR: "INPI",
  RU: "ROSPATENT",
  IN: "CGPDTM",
};

export const WIPO_MEMBERS = [
  "AL", "AM", "AT", "AU", "AZ", "BA", "BE", "BG", "BH", "BN", "BT", "BW", "BY", "CA",
  "CH", "CN", "CU", "CY", "CZ", "DE", "DK", "DZ", "EE", "EG", "ES", "FI", "FR", "GB",
  "GE", "GH", "GR", "HR", "HU", "ID", "IE", "IL", "IN", "IR", "IS", "IT", "JP", "KE",
  "KG", "KH", "KP", "KR", "KZ", "LA", "LI", "LR", "LS", "LT", "LU", "LV", "MA", "MC",
  "MD", "ME", "MG", "MK", "MN", "MO", "MW", "MX", "MY", "MZ", "NA", "NL", "NO", "NZ",
  "OM", "PH", "PL", "PT", "RO", "RS", "RU", "RW", "SD", "SE", "SG", "SI", "SK", "SL",
  "SM", "ST", "SY", "SZ", "TH", "TJ", "TM", "TN", "TR", "UA", "US", "UZ", "VN", "ZM", "ZW"
];

// BENELUX_COUNTRIES und OAPI_COUNTRIES werden aus @/lib/country-mapping importiert (siehe oben)

// WIPO Designation Mapping: Ländercode → WIPO-Designationscode
// Für regionale Organisationen, die bei WIPO einen eigenen Code haben
export const WIPO_DESIGNATION_MAPPING: Record<string, string> = {
  // Benelux-Länder → BX
  "BE": "BX",
  "NL": "BX",
  "LU": "BX",
  // OAPI-Länder → OA
  "BJ": "OA",
  "BF": "OA",
  "CM": "OA",
  "CF": "OA",
  "KM": "OA",
  "CG": "OA",
  "CI": "OA",
  "GA": "OA",
  "GN": "OA",
  "GW": "OA",
  "GQ": "OA",
  "ML": "OA",
  "MR": "OA",
  "NE": "OA",
  "SN": "OA",
  "TD": "OA",
  "TG": "OA",
};

// Funktion um den korrekten WIPO-Designationscode zu erhalten
export function getWIPODesignation(countryCode: string): string {
  return WIPO_DESIGNATION_MAPPING[countryCode.toUpperCase()] || countryCode.toUpperCase();
}

// Prüft ob ein Land Teil einer regionalen Organisation bei WIPO ist
export function isRegionalWIPOMember(countryCode: string): { isRegional: boolean; regionCode?: string; regionName?: string } {
  const code = countryCode.toUpperCase();
  if (BENELUX_COUNTRIES.includes(code)) {
    return { isRegional: true, regionCode: "BX", regionName: "Benelux" };
  }
  if (OAPI_COUNTRIES.includes(code)) {
    return { isRegional: true, regionCode: "OA", regionName: "OAPI (African Intellectual Property Organization)" };
  }
  return { isRegional: false };
}

export const REGION_MAPPINGS: Record<string, string[]> = {
  EU: EU_COUNTRIES,
  BX: BENELUX_COUNTRIES,
  OA: OAPI_COUNTRIES,
  EMEA: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "AE", "SA", "ZA", "EG", "IL"],
};

// TMSearch.ai verfügbare nationale Register (basierend auf tmsearch.ai/database)
// Diese Länder haben ein direktes nationales Register bei TMSearch.ai
export const TMSEARCH_AVAILABLE_REGISTERS: Record<string, boolean> = {
  // Internationale Register (immer verfügbar)
  "WO": true,   // WIPO
  "EU": true,   // EUIPO
  
  // Nationale Register bei TMSearch.ai verfügbar
  "US": true,   // USPTO - United States
  "IN": true,   // India
  "GB": true,   // UKIPO - United Kingdom
  "AR": true,   // Argentina
  "MX": true,   // Mexico
  "TW": true,   // Taiwan
  "ES": true,   // OEPM - Spain
  "TR": true,   // TÜRKPATENT - Turkey
  "AU": true,   // IP Australia
  "CA": true,   // CIPO - Canada
  "RU": true,   // ROSPATENT - Russia
  "IT": true,   // UIBM - Italy
  "CH": true,   // IGE - Switzerland
  "HK": true,   // Hong Kong
  "UA": true,   // Ukraine
  "SA": true,   // Saudi Arabia
  "NO": true,   // Norway
  "AE": true,   // UAE
  "IL": true,   // Israel
  "MA": true,   // Morocco
  "EG": true,   // Egypt
  "GE": true,   // Georgia
  "EE": true,   // Estonia
  "KZ": true,   // Kazakhstan
  "LT": true,   // Lithuania
  "KE": true,   // Kenya
  "OM": true,   // Oman
  "BY": true,   // Belarus
  "LV": true,   // Latvia
  "BH": true,   // Bahrain
  "AM": true,   // Armenia
  "UZ": true,   // Uzbekistan
  "MD": true,   // Moldova
  "AZ": true,   // Azerbaijan
  "KG": true,   // Kyrgyzstan
  "BW": true,   // Botswana
  
  // Wichtige Länder OHNE direktes nationales Register bei TMSearch.ai
  "DE": false,  // DPMA - Deutschland (nur über EUIPO/WIPO)
  "FR": false,  // INPI - Frankreich (nur über EUIPO/WIPO)
  "AT": false,  // ÖPA - Österreich (nur über EUIPO/WIPO)
  "NL": false,  // BOIP - Niederlande/Benelux (nur über EUIPO/WIPO)
  "BE": false,  // BOIP - Belgien/Benelux (nur über EUIPO/WIPO)
  "LU": false,  // BOIP - Luxemburg/Benelux (nur über EUIPO/WIPO)
  "PL": false,  // Polen (nur über EUIPO/WIPO)
  "PT": false,  // Portugal (nur über EUIPO/WIPO)
  "SE": false,  // Schweden (nur über EUIPO/WIPO)
  "DK": false,  // Dänemark (nur über EUIPO/WIPO)
  "FI": false,  // Finnland (nur über EUIPO/WIPO)
  "IE": false,  // Irland (nur über EUIPO/WIPO)
  "GR": false,  // Griechenland (nur über EUIPO/WIPO)
  "CZ": false,  // Tschechien (nur über EUIPO/WIPO)
  "HU": false,  // Ungarn (nur über EUIPO/WIPO)
  "RO": false,  // Rumänien (nur über EUIPO/WIPO)
  "BG": false,  // Bulgarien (nur über EUIPO/WIPO)
  "HR": false,  // Kroatien (nur über EUIPO/WIPO)
  "SK": false,  // Slowakei (nur über EUIPO/WIPO)
  "SI": false,  // Slowenien (nur über EUIPO/WIPO)
  "CY": false,  // Zypern (nur über EUIPO/WIPO)
  "MT": false,  // Malta (nur über EUIPO/WIPO)
  "CN": false,  // China (nur über WIPO)
  "JP": false,  // Japan (nur über WIPO)
  "KR": false,  // Südkorea (nur über WIPO)
  "BR": false,  // Brasilien (nur über WIPO)
  "NZ": false,  // Neuseeland (nur über WIPO)
  "SG": false,  // Singapur (nur über WIPO)
  "ZA": false,  // Südafrika (nur über WIPO)
  
  // OAPI-Länder (nur über WIPO mit OA-Designation)
  "BJ": false,  // Benin (OAPI)
  "BF": false,  // Burkina Faso (OAPI)
  "CM": false,  // Kamerun (OAPI)
  "CF": false,  // Zentralafrikanische Republik (OAPI)
  "KM": false,  // Komoren (OAPI)
  "CG": false,  // Kongo (OAPI)
  "CI": false,  // Elfenbeinküste (OAPI)
  "GA": false,  // Gabun (OAPI)
  "GN": false,  // Guinea (OAPI)
  "GW": false,  // Guinea-Bissau (OAPI)
  "GQ": false,  // Äquatorialguinea (OAPI)
  "ML": false,  // Mali (OAPI)
  "MR": false,  // Mauretanien (OAPI)
  "NE": false,  // Niger (OAPI)
  "SN": false,  // Senegal (OAPI)
  "TD": false,  // Tschad (OAPI)
  "TG": false,  // Togo (OAPI)
  
  // Regionale Organisationen
  "BX": true,   // Benelux (bei WIPO verfügbar)
  "OA": true,   // OAPI (bei WIPO verfügbar)
};

// Links zu offiziellen nationalen Markenregistern für Selbstrecherche
export const NATIONAL_REGISTER_URLS: Record<string, { name: string; url: string; searchUrl?: string }> = {
  "DE": { 
    name: "DPMA (Deutsches Patent- und Markenamt)", 
    url: "https://www.dpma.de",
    searchUrl: "https://register.dpma.de/DPMAregister/marke/einsteiger"
  },
  "FR": { 
    name: "INPI (Institut National de la Propriété Industrielle)", 
    url: "https://www.inpi.fr",
    searchUrl: "https://data.inpi.fr/recherche_avancee/marques"
  },
  "AT": { 
    name: "Österreichisches Patentamt", 
    url: "https://www.patentamt.at",
    searchUrl: "https://see-ip.patentamt.at/"
  },
  "NL": { 
    name: "BOIP (Benelux Office for Intellectual Property)", 
    url: "https://www.boip.int",
    searchUrl: "https://www.boip.int/en/trademarks-register"
  },
  "BE": { 
    name: "BOIP (Benelux Office for Intellectual Property)", 
    url: "https://www.boip.int",
    searchUrl: "https://www.boip.int/en/trademarks-register"
  },
  "LU": { 
    name: "BOIP (Benelux Office for Intellectual Property)", 
    url: "https://www.boip.int",
    searchUrl: "https://www.boip.int/en/trademarks-register"
  },
  "PL": { 
    name: "Polnisches Patentamt (UPRP)", 
    url: "https://uprp.gov.pl",
    searchUrl: "https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search"
  },
  "PT": { 
    name: "INPI Portugal", 
    url: "https://inpi.justica.gov.pt",
    searchUrl: "https://servicosonline.inpi.pt/pesquisas/main/marcas.jsp"
  },
  "SE": { 
    name: "PRV (Patent- och registreringsverket)", 
    url: "https://www.prv.se",
    searchUrl: "https://tc.prv.se/spd/search"
  },
  "DK": { 
    name: "Danish Patent and Trademark Office", 
    url: "https://www.dkpto.dk",
    searchUrl: "https://onlineweb.dkpto.dk/pvsonline/Varemaerke"
  },
  "FI": { 
    name: "PRH (Finnish Patent and Registration Office)", 
    url: "https://www.prh.fi",
    searchUrl: "https://tavaramerkkitietokanta.prh.fi/"
  },
  "IE": { 
    name: "IPOI (Intellectual Property Office of Ireland)", 
    url: "https://www.ipoi.gov.ie",
    searchUrl: "https://eregister.ipoi.gov.ie/query/TMSearch.aspx"
  },
  "GR": { 
    name: "Griechisches Markenamt", 
    url: "https://www.ggb.gr",
    searchUrl: "https://www.tmdn.org/tmview/"
  },
  "CZ": { 
    name: "Tschechisches Patentamt (ÚPV)", 
    url: "https://www.upv.cz",
    searchUrl: "https://isdv.upv.cz/webapp/!resdb.oza.frm"
  },
  "HU": { 
    name: "Ungarisches Patentamt (SZTNH)", 
    url: "https://www.sztnh.gov.hu",
    searchUrl: "https://www.sztnh.gov.hu/en/searches"
  },
  "CN": { 
    name: "CNIPA (China National Intellectual Property Administration)", 
    url: "https://www.cnipa.gov.cn",
    searchUrl: "https://wcjs.sbj.cnipa.gov.cn/"
  },
  "JP": { 
    name: "JPO (Japan Patent Office)", 
    url: "https://www.jpo.go.jp",
    searchUrl: "https://www.j-platpat.inpit.go.jp/"
  },
  "KR": { 
    name: "KIPO (Korean Intellectual Property Office)", 
    url: "https://www.kipo.go.kr",
    searchUrl: "http://engdtj.kipris.or.kr/engdtj/grrt1000a.do"
  },
  "BR": { 
    name: "INPI Brasil", 
    url: "https://www.gov.br/inpi",
    searchUrl: "https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_702.jsp"
  },
  "RO": { 
    name: "OSIM (Oficiul de Stat pentru Inventii si Marci)", 
    url: "https://www.osim.ro",
    searchUrl: "http://api.osim.ro:8080/marci/search"
  },
  "BG": { 
    name: "Bulgarisches Patentamt", 
    url: "https://www.bpo.bg",
    searchUrl: "https://portal.bpo.bg/trademarks-search"
  },
  "HR": { 
    name: "DZIV (Kroatisches Patentamt)", 
    url: "https://www.dziv.hr",
    searchUrl: "https://www.dziv.hr/en/e-services/search-databases/"
  },
  "SK": { 
    name: "Slowakisches Patentamt (ÚPV SR)", 
    url: "https://www.indprop.gov.sk",
    searchUrl: "https://wbr.indprop.gov.sk/WebRegistre/"
  },
  "SI": { 
    name: "SIPO (Slowenisches Patentamt)", 
    url: "https://www.uil-sipo.si",
    searchUrl: "https://www.uil-sipo.si/uil/dodatno/baze-podatkov/"
  },
  "CY": { 
    name: "Zyprisches Markenamt", 
    url: "https://www.mcit.gov.cy",
    searchUrl: "https://www.tmdn.org/tmview/"
  },
  "MT": { 
    name: "Maltesisches Patentamt", 
    url: "https://commerce.gov.mt",
    searchUrl: "https://www.tmdn.org/tmview/"
  },
  "NZ": { 
    name: "IPONZ (Intellectual Property Office of New Zealand)", 
    url: "https://www.iponz.govt.nz",
    searchUrl: "https://app.iponz.govt.nz/app/TradeMarkSearch"
  },
  "SG": { 
    name: "IPOS (Intellectual Property Office of Singapore)", 
    url: "https://www.ipos.gov.sg",
    searchUrl: "https://ip2sg.ipos.gov.sg/RPS/WP/CM/SearchSimple/TM.aspx"
  },
  "ZA": { 
    name: "CIPC (Companies and Intellectual Property Commission)", 
    url: "https://www.cipc.co.za",
    searchUrl: "https://iponline.cipc.co.za/"
  },
  // Regionale Organisationen
  "BX": { 
    name: "BOIP (Benelux Office for Intellectual Property)", 
    url: "https://www.boip.int",
    searchUrl: "https://www.boip.int/en/trademarks-register"
  },
  "OA": { 
    name: "OAPI (African Intellectual Property Organization)", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  // OAPI-Mitgliedsländer (alle verweisen auf OAPI)
  "BJ": { 
    name: "OAPI - Benin", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "BF": { 
    name: "OAPI - Burkina Faso", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "CM": { 
    name: "OAPI - Kamerun", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "CF": { 
    name: "OAPI - Zentralafrikanische Republik", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "KM": { 
    name: "OAPI - Komoren", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "CG": { 
    name: "OAPI - Kongo", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "CI": { 
    name: "OAPI - Elfenbeinküste", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "GA": { 
    name: "OAPI - Gabun", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "GN": { 
    name: "OAPI - Guinea", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "GW": { 
    name: "OAPI - Guinea-Bissau", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "GQ": { 
    name: "OAPI - Äquatorialguinea", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "ML": { 
    name: "OAPI - Mali", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "MR": { 
    name: "OAPI - Mauretanien", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "NE": { 
    name: "OAPI - Niger", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "SN": { 
    name: "OAPI - Senegal", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "TD": { 
    name: "OAPI - Tschad", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
  "TG": { 
    name: "OAPI - Togo", 
    url: "https://oapi.int",
    searchUrl: "https://oapi.int/en/databases/"
  },
};

// Interface für Suchbericht
export interface SearchCoverageReport {
  // Länder die der User ausgewählt hat
  selectedCountries: string[];
  
  // Register die tatsächlich durchsucht wurden
  searchedRegisters: {
    code: string;
    name: string;
    type: "national" | "euipo" | "wipo";
  }[];
  
  // Länder ohne direktes nationales Register (nur EUIPO/WIPO durchsucht)
  countriesWithoutNationalRegister: {
    countryCode: string;
    countryName: string;
    nationalRegisterName: string;
    searchUrl?: string;
    searchedVia: ("EUIPO" | "WIPO")[];
  }[];
  
  // Ob Kollisionen gefunden wurden (pro Land)
  conflictsFoundPerCountry: Record<string, number>;
  
  // Warnung anzeigen? (nur wenn keine Kollisionen UND fehlendes nationales Register)
  showWarning: boolean;
  
  // Länder für die eine Warnung angezeigt werden soll
  countriesNeedingManualSearch: {
    countryCode: string;
    countryName: string;
    nationalRegisterName: string;
    searchUrl?: string;
  }[];
}

// Hilfsfunktion: Prüfen ob ein Land ein direktes nationales Register bei TMSearch hat
export function hasNationalRegister(countryCode: string): boolean {
  const code = countryCode.toUpperCase();
  return TMSEARCH_AVAILABLE_REGISTERS[code] === true;
}

// Hilfsfunktion: Suchbericht für ausgewählte Länder erstellen
export function createSearchCoverageReport(
  selectedCountries: string[],
  conflictsPerCountry: Record<string, number>
): SearchCoverageReport {
  const searchedRegisters: SearchCoverageReport["searchedRegisters"] = [];
  const countriesWithoutNationalRegister: SearchCoverageReport["countriesWithoutNationalRegister"] = [];
  const countriesNeedingManualSearch: SearchCoverageReport["countriesNeedingManualSearch"] = [];
  
  // EUIPO und WIPO sind immer durchsucht
  searchedRegisters.push({ code: "EU", name: "EUIPO", type: "euipo" });
  searchedRegisters.push({ code: "WO", name: "WIPO", type: "wipo" });
  
  for (const country of selectedCountries) {
    const code = country.toUpperCase();
    const countryName = OFFICE_NAMES[code] || code;
    const hasNational = hasNationalRegister(code);
    const conflictsFound = conflictsPerCountry[code] || 0;
    
    // Prüfe ob das Land Teil einer regionalen Organisation ist
    const regionalInfo = isRegionalWIPOMember(code);
    const wipoDesignation = getWIPODesignation(code);
    
    if (hasNational) {
      // Nationales Register verfügbar
      searchedRegisters.push({ 
        code, 
        name: countryName, 
        type: "national" 
      });
    } else {
      // Kein nationales Register - nur EUIPO/WIPO
      const searchedVia: ("EUIPO" | "WIPO")[] = [];
      if (EU_COUNTRIES.includes(code)) searchedVia.push("EUIPO");
      // WIPO-Suche: Für Benelux/OAPI-Länder wird mit BX/OA gesucht
      if (WIPO_MEMBERS.includes(code) || regionalInfo.isRegional) searchedVia.push("WIPO");
      
      const registerInfo = NATIONAL_REGISTER_URLS[code];
      
      // Für regionale Organisationen: Verweis auf das regionale Register
      let nationalRegisterName = registerInfo?.name || `${countryName} Markenamt`;
      let searchUrl = registerInfo?.searchUrl;
      
      if (regionalInfo.isRegional && regionalInfo.regionCode) {
        const regionalRegisterInfo = NATIONAL_REGISTER_URLS[regionalInfo.regionCode];
        if (regionalRegisterInfo) {
          nationalRegisterName = regionalRegisterInfo.name;
          searchUrl = regionalRegisterInfo.searchUrl;
        }
      }
      
      countriesWithoutNationalRegister.push({
        countryCode: code,
        countryName,
        nationalRegisterName,
        searchUrl,
        searchedVia,
      });
      
      // Warnung nur wenn KEINE Kollisionen für dieses Land gefunden wurden
      if (conflictsFound === 0) {
        countriesNeedingManualSearch.push({
          countryCode: code,
          countryName,
          nationalRegisterName,
          searchUrl,
        });
      }
    }
  }
  
  return {
    selectedCountries,
    searchedRegisters,
    countriesWithoutNationalRegister,
    conflictsFoundPerCountry: conflictsPerCountry,
    showWarning: countriesNeedingManualSearch.length > 0,
    countriesNeedingManualSearch,
  };
}

export interface SearchOfficeStrategy {
  country: string;
  countryName: string;
  offices: {
    code: string;
    name: string;
    type: "national" | "wipo" | "euipo";
    reason: string;
    wipoDesignation?: string;  // Der korrekte WIPO-Designationscode (z.B. BX für Benelux, OA für OAPI)
  }[];
}

export function getSearchOfficesForCountry(countryCode: string): SearchOfficeStrategy {
  const code = countryCode.toUpperCase();
  const countryName = OFFICE_NAMES[code] || code;
  const offices: SearchOfficeStrategy["offices"] = [];

  // Prüfe ob das Land Teil einer regionalen Organisation ist
  const regionalInfo = isRegionalWIPOMember(code);

  // 1. National office (always first) - nur wenn nicht regionale Organisation
  if (code !== "BX" && code !== "OA") {
    offices.push({
      code: code,
      name: OFFICE_NAMES[code] || `${code} National`,
      type: "national",
      reason: `Direktsuche im nationalen Amt ${OFFICE_NAMES[code] || code}`
    });
  }

  // 2. WIPO - mit korrektem Designationscode
  // Für Benelux-Länder: BX, für OAPI-Länder: OA, sonst Ländercode
  const wipoDesignation = getWIPODesignation(code);
  
  // Prüfe ob das Land oder die Region WIPO-Mitglied ist
  const isWIPOMember = WIPO_MEMBERS.includes(code) || 
                       regionalInfo.isRegional || 
                       code === "BX" || 
                       code === "OA";
  
  if (isWIPOMember) {
    let wipoReason = "";
    if (regionalInfo.isRegional) {
      wipoReason = `${code} ist Teil von ${regionalInfo.regionName} - suche WIPO-Marken mit Designation ${wipoDesignation}`;
    } else if (code === "BX") {
      wipoReason = "Benelux - suche WIPO-Marken mit Designation BX (gilt für BE, NL, LU)";
    } else if (code === "OA") {
      wipoReason = "OAPI - suche WIPO-Marken mit Designation OA (gilt für 17 afrikanische Länder)";
    } else {
      wipoReason = `${code} ist WIPO-Mitglied - suche WIPO-Marken mit Designation ${wipoDesignation}`;
    }
    
        offices.push({
          code: "WO",
          name: "WIPO",
          type: "wipo",
          reason: wipoReason,
          wipoDesignation: wipoDesignation
        });
  }

  // 3. EUIPO if EU member (Benelux-Länder sind auch EU-Mitglieder)
  if (EU_COUNTRIES.includes(code)) {
    offices.push({
      code: "EU",
      name: "EUIPO",
      type: "euipo",
      reason: `${code} ist EU-Mitglied - EU-Marken gelten auch in ${code}`
    });
  }

  return { country: code, countryName, offices };
}

export const COUNTRY_TO_OFFICE: Record<string, string> = {
  "USA": "US", "UNITED STATES": "US", "VEREINIGTE STAATEN": "US", "AMERIKA": "US", "UNITED STATES OF AMERICA": "US",
  "DEUTSCHLAND": "DE", "GERMANY": "DE", "BRD": "DE",
  "EUROPA": "EU", "EM": "EU", "EUROPEAN UNION": "EU", "EUROPÄISCHE UNION": "EU", "EUIPO": "EU",
  "UK": "GB", "UNITED KINGDOM": "GB", "GROSSBRITANNIEN": "GB", "ENGLAND": "GB", "GREAT BRITAIN": "GB",
  "SCHWEIZ": "CH", "SWITZERLAND": "CH", "SUISSE": "CH",
  "ÖSTERREICH": "AT", "AUSTRIA": "AT",
  "FRANKREICH": "FR", "FRANCE": "FR",
  "ITALIEN": "IT", "ITALY": "IT", "ITALIA": "IT",
  "SPANIEN": "ES", "SPAIN": "ES", "ESPAÑA": "ES",
  "NIEDERLANDE": "NL", "NETHERLANDS": "NL", "HOLLAND": "NL",
  "CHINA": "CN", "JAPAN": "JP", "KOREA": "KR", "SÜDKOREA": "KR", "SOUTH KOREA": "KR",
  "INDIEN": "IN", "INDIA": "IN", "BRASILIEN": "BR", "BRAZIL": "BR",
  "KANADA": "CA", "CANADA": "CA", "AUSTRALIEN": "AU", "AUSTRALIA": "AU",
  "WIPO": "WO", "INTERNATIONAL": "WO", "WELTWEIT": "WO",
  "PORTUGAL": "PT", "POLEN": "PL", "POLAND": "PL",
  "BELGIEN": "BE", "BELGIUM": "BE", "GRIECHENLAND": "GR", "GREECE": "GR",
  "IRLAND": "IE", "IRELAND": "IE", "DÄNEMARK": "DK", "DENMARK": "DK",
  "SCHWEDEN": "SE", "SWEDEN": "SE", "FINNLAND": "FI", "FINLAND": "FI",
  "NORWEGEN": "NO", "NORWAY": "NO", "TSCHECHIEN": "CZ", "CZECH REPUBLIC": "CZ",
  "UNGARN": "HU", "HUNGARY": "HU", "RUMÄNIEN": "RO", "ROMANIA": "RO",
  "BULGARIEN": "BG", "BULGARIA": "BG", "KROATIEN": "HR", "CROATIA": "HR",
  "TÜRKEI": "TR", "TURKEY": "TR", "RUSSLAND": "RU", "RUSSIA": "RU",
  "MEXIKO": "MX", "MEXICO": "MX", "ARGENTINIEN": "AR", "ARGENTINA": "AR",
  "SINGAPUR": "SG", "SINGAPORE": "SG", "HONGKONG": "HK", "HONG KONG": "HK",
  "TAIWAN": "TW", "THAILAND": "TH", "VIETNAM": "VN", "INDONESIEN": "ID", "INDONESIA": "ID",
  "MALAYSIA": "MY", "PHILIPPINEN": "PH", "PHILIPPINES": "PH",
  "SÜDAFRIKA": "ZA", "SOUTH AFRICA": "ZA", "ÄGYPTEN": "EG", "EGYPT": "EG",
  "ISRAEL": "IL", "SAUDI-ARABIEN": "SA", "SAUDI ARABIA": "SA",
  "VEREINIGTE ARABISCHE EMIRATE": "AE", "UAE": "AE", "UNITED ARAB EMIRATES": "AE",
};

export function normalizeOfficeCode(input: string): string {
  const normalized = input.trim().toUpperCase();
  return COUNTRY_TO_OFFICE[normalized] || normalized;
}

export function normalizeOfficeCodes(inputs: string[]): string[] {
  return inputs.map(normalizeOfficeCode);
}

export function getOfficeName(officeCode: string): string {
  return OFFICE_NAMES[officeCode] || officeCode;
}

export function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

export function normalizeStatus(status: "LIVE" | "DEAD" | "UNKN"): "active" | "expired" | "unknown" {
  switch (status) {
    case "LIVE": return "active";
    case "DEAD": return "expired";
    case "UNKN": return "unknown";
    default: return "unknown";
  }
}

export function getImageUrl(imgPath: string | null, size: 210 | 500 | 700 = 210): string | null {
  if (!imgPath) return null;
  return `https://img.tmsearch.ai/img/${size}/${imgPath}`;
}

export function normalizeResult(result: TMSearchResult): NormalizedTrademark {
  return {
    id: `tm-${result.mid}`,
    mid: result.mid,
    registrationNumber: result.reg || "",
    applicationNumber: result.app || "",
    name: result.verbal || `TM-${result.mid}`,
    holder: null,
    holderAddress: null,
    holderCountry: null,
    status: normalizeStatus(result.status),
    statusOriginal: result.status,
    registrationDate: parseDate(result.date?.granted),
    applicationDate: parseDate(result.date?.applied),
    expiryDate: parseDate(result.date?.expiration),
    renewalDate: null,
    designationCountries: result.protection || [],
    niceClasses: result.class || [],
    goodsServices: null,
    imageUrl: getImageUrl(result.img),
    source: "tmsearch",
    office: result.submition || "",
    accuracy: result.accuracy || 0,
  };
}

export function normalizeInfoResult(info: TMInfoResponse): NormalizedTrademark {
  return {
    id: `tm-${info.mid}`,
    mid: info.mid,
    registrationNumber: info.reg || "",
    applicationNumber: info.app || "",
    name: info.verbal || `TM-${info.mid}`,
    holder: info.owner?.name || null,
    holderAddress: info.owner?.address || null,
    holderCountry: info.owner?.country || null,
    status: normalizeStatus(info.status),
    statusOriginal: info.status,
    registrationDate: parseDate(info.date?.granted),
    applicationDate: parseDate(info.date?.applied),
    expiryDate: parseDate(info.date?.expiration),
    renewalDate: parseDate(info.date?.renewal),
    designationCountries: info.protection || [],
    niceClasses: info.class?.map(c => c.number) || [],
    goodsServices: info.class?.map(c => c.description).filter(Boolean).join(" | ") || null,
    imageUrl: getImageUrl(info.img),
    source: "tmsearch",
    office: info.submition || "",
    accuracy: info.accuracy || 0,
  };
}
