/**
 * Generiert URLs zu offiziellen Markenregistern
 * Unterstützt: DPMA, EUIPO, WIPO, USPTO, UKIPO, IGE, ÖPA
 */

export interface RegisterUrlParams {
  office: string;
  applicationNumber?: string;
  registrationNumber?: string;
}

/**
 * Generiert eine URL zum offiziellen Markenregister
 */
export function getRegisterUrl(params: RegisterUrlParams): string | null {
  const { office, applicationNumber, registrationNumber } = params;
  const officeCode = office?.toUpperCase();

  // Bereinige Nummern (entferne Leerzeichen, Bindestriche etc.)
  const cleanNumber = (num: string | undefined) =>
    num?.replace(/[\s\-\.]/g, "") || "";

  const appNum = cleanNumber(applicationNumber);
  const regNum = cleanNumber(registrationNumber);

  switch (officeCode) {
    case "DE":
      // DPMA Register - verwendet Registrierungsnummer
      if (regNum) {
        return `https://register.dpma.de/DPMAregister/marke/register/${regNum}`;
      }
      if (appNum) {
        return `https://register.dpma.de/DPMAregister/marke/anmeldung/${appNum}`;
      }
      break;

    case "EU":
    case "EM":
      // EUIPO eSearch - verwendet Anmeldenummer
      if (appNum) {
        // EUIPO verwendet Format ohne führende Nullen
        const euipoNum = appNum.replace(/^0+/, "");
        return `https://euipo.europa.eu/eSearch/#details/trademarks/${euipoNum}`;
      }
      break;

    case "WO":
      // WIPO Madrid Monitor - verwendet Registrierungsnummer
      if (regNum) {
        return `https://www3.wipo.int/madrid/monitor/en/showData.jsp?ID=${regNum}`;
      }
      break;

    case "US":
      // USPTO TSDR - verwendet Serial Number (Anmeldenummer)
      if (appNum) {
        return `https://tsdr.uspto.gov/#caseNumber=${appNum}&caseType=SERIAL_NO`;
      }
      if (regNum) {
        return `https://tsdr.uspto.gov/#caseNumber=${regNum}&caseType=US_REGISTRATION_NO`;
      }
      break;

    case "GB":
    case "UK":
      // UKIPO - verwendet Anmeldenummer
      if (appNum) {
        return `https://trademarks.ipo.gov.uk/ipo-tmcase/page/Results/1/UK${appNum}`;
      }
      break;

    case "CH":
      // IGE Swissreg - verwendet Registrierungsnummer
      if (regNum) {
        return `https://www.swissreg.ch/srclient/faces/jsp/trademark/sr30.jsp?language=de&section=tm&id=${regNum}`;
      }
      break;

    case "AT":
      // Österreichisches Patentamt
      if (regNum) {
        return `https://www.patentamt.at/marken/markenregister/?tx_marcua_marcua%5Baction%5D=detail&tx_marcua_marcua%5Bcontroller%5D=Default&tx_marcua_marcua%5Bid%5D=${regNum}`;
      }
      break;

    case "FR":
      // INPI France
      if (appNum) {
        return `https://data.inpi.fr/marques/${appNum}`;
      }
      break;

    case "ES":
      // OEPM Spain
      if (appNum) {
        return `https://consultas2.oepm.es/LocalizadorWeb/BusquedaMarcas?numSolicitud=${appNum}`;
      }
      break;
  }

  return null;
}

/**
 * Gibt den Namen des Registers zurück
 */
export function getRegisterName(office: string): string {
  const names: Record<string, string> = {
    DE: "DPMA Register",
    EU: "EUIPO eSearch",
    EM: "EUIPO eSearch",
    WO: "WIPO Madrid Monitor",
    US: "USPTO TSDR",
    GB: "UKIPO",
    UK: "UKIPO",
    CH: "Swissreg",
    AT: "Österr. Patentamt",
    FR: "INPI",
    ES: "OEPM",
  };
  return names[office?.toUpperCase()] || "Register";
}
