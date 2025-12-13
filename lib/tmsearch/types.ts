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

export const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

export const WIPO_MEMBERS = [
  "AL", "AM", "AT", "AU", "AZ", "BA", "BE", "BG", "BH", "BN", "BT", "BW", "BY", "CA",
  "CH", "CN", "CU", "CY", "CZ", "DE", "DK", "DZ", "EE", "EG", "ES", "FI", "FR", "GB",
  "GE", "GH", "GR", "HR", "HU", "ID", "IE", "IL", "IN", "IR", "IS", "IT", "JP", "KE",
  "KG", "KH", "KP", "KR", "KZ", "LA", "LI", "LR", "LS", "LT", "LU", "LV", "MA", "MC",
  "MD", "ME", "MG", "MK", "MN", "MO", "MW", "MX", "MY", "MZ", "NA", "NL", "NO", "NZ",
  "OM", "PH", "PL", "PT", "RO", "RS", "RU", "RW", "SD", "SE", "SG", "SI", "SK", "SL",
  "SM", "ST", "SY", "SZ", "TH", "TJ", "TM", "TN", "TR", "UA", "US", "UZ", "VN", "ZM", "ZW"
];

export const REGION_MAPPINGS: Record<string, string[]> = {
  EU: EU_COUNTRIES,
  BX: ["BE", "NL", "LU"],
  EMEA: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "AE", "SA", "ZA", "EG", "IL"],
};

export interface SearchOfficeStrategy {
  country: string;
  countryName: string;
  offices: {
    code: string;
    name: string;
    type: "national" | "wipo" | "euipo";
    reason: string;
  }[];
}

export function getSearchOfficesForCountry(countryCode: string): SearchOfficeStrategy {
  const code = countryCode.toUpperCase();
  const countryName = OFFICE_NAMES[code] || code;
  const offices: SearchOfficeStrategy["offices"] = [];

  // 1. National office (always first)
  offices.push({
    code: code,
    name: OFFICE_NAMES[code] || `${code} National`,
    type: "national",
    reason: `Direktsuche im nationalen Amt ${OFFICE_NAMES[code] || code}`
  });

  // 2. WIPO if member
  if (WIPO_MEMBERS.includes(code)) {
    offices.push({
      code: "WO",
      name: "WIPO",
      type: "wipo",
      reason: `${code} ist WIPO-Mitglied - suche WIPO-Marken mit Designation ${code}`
    });
  }

  // 3. EUIPO if EU member
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
