/**
 * Unit-Tests für country-mapping.ts
 * Ausführen mit: npx jest lib/country-mapping.test.ts
 */

import { getRelevantCountries, getRegisterCountries, isRegionalRegister } from '@/lib/country-mapping';

describe('getRelevantCountries', () => {
  
  // ==================== NATIONALE REGISTER ====================
  describe('Nationale Register (AU, IN, DE, etc.)', () => {
    
    test('AU-Register: nur AU wenn AU gesucht wird', () => {
      const result = getRelevantCountries('AU', [], ['AU', 'DE', 'US']);
      expect(result).toContain('AU');
      expect(result).not.toContain('DE');
      expect(result).not.toContain('US');
    });

    test('IN-Register: nur IN wenn IN gesucht wird', () => {
      const result = getRelevantCountries('IN', [], ['AU', 'IN', 'US']);
      expect(result).toContain('IN');
      expect(result.length).toBe(1);
    });

    test('DE-Register: nur DE wenn DE gesucht wird', () => {
      const result = getRelevantCountries('DE', [], ['DE', 'FR', 'IT']);
      expect(result).toEqual(['DE']);
    });

    test('Nationales Register: leer wenn Land nicht gesucht wird', () => {
      const result = getRelevantCountries('AU', [], ['DE', 'FR', 'US']);
      expect(result).toEqual([]);
    });
  });

  // ==================== EU-REGISTER ====================
  describe('EU-Register (EU, EM)', () => {
    
    test('EU-Register: expandiert zu allen gesuchten EU-Ländern', () => {
      const result = getRelevantCountries('EU', [], ['DE', 'FR', 'IT', 'US']);
      expect(result).toContain('DE');
      expect(result).toContain('FR');
      expect(result).toContain('IT');
      expect(result).not.toContain('US'); // US ist kein EU-Land
    });

    test('EM-Register: gleich wie EU (Alias)', () => {
      const result = getRelevantCountries('EM', [], ['DE', 'PL', 'JP']);
      expect(result).toContain('DE');
      expect(result).toContain('PL');
      expect(result).not.toContain('JP');
    });

    test('EU-Register: leer wenn keine EU-Länder gesucht werden', () => {
      const result = getRelevantCountries('EU', [], ['US', 'JP', 'CN']);
      expect(result).toEqual([]);
    });

    test('EU-Register: alle 27 EU-Länder wenn alle gesucht werden', () => {
      const allEU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
      const result = getRelevantCountries('EU', [], allEU);
      expect(result.length).toBe(27);
    });
  });

  // ==================== WO (WIPO) REGISTER ====================
  describe('WO-Register (WIPO Madrid)', () => {
    
    test('WO-Register: nur Protection-Länder die gesucht werden', () => {
      const result = getRelevantCountries('WO', ['US', 'JP', 'DE', 'FR'], ['US', 'JP', 'AU']);
      expect(result).toContain('US');
      expect(result).toContain('JP');
      expect(result).not.toContain('AU'); // AU nicht in Protection
      expect(result).not.toContain('DE'); // DE nicht gesucht
    });

    test('WO-Register: leer wenn keine Überlappung', () => {
      const result = getRelevantCountries('WO', ['US', 'JP'], ['DE', 'FR']);
      expect(result).toEqual([]);
    });

    test('WO-Register: Protection-Array wird korrekt verarbeitet', () => {
      const result = getRelevantCountries('WO', ['AU', 'DE', 'GE', 'IN'], ['AU', 'DE', 'GE', 'IN']);
      expect(result).toContain('AU');
      expect(result).toContain('DE');
      expect(result).toContain('GE');
      expect(result).toContain('IN');
      expect(result.length).toBe(4);
    });
  });

  // ==================== BENELUX (BX) ====================
  describe('BX-Register (Benelux)', () => {
    
    test('BX-Register: expandiert zu BE, NL, LU', () => {
      const result = getRelevantCountries('BX', [], ['BE', 'NL', 'LU', 'DE']);
      expect(result).toContain('BE');
      expect(result).toContain('NL');
      expect(result).toContain('LU');
      expect(result).not.toContain('DE');
    });

    test('BX-Register: nur gesuchte Benelux-Länder', () => {
      const result = getRelevantCountries('BX', [], ['BE', 'DE']);
      expect(result).toEqual(['BE']);
    });
  });

  // ==================== KOMBINATION: Register + Protection ====================
  describe('Kombination Register + Protection', () => {
    
    test('AU-Register mit AU Protection: AU wird zurückgegeben', () => {
      const result = getRelevantCountries('AU', ['AU'], ['AU', 'NZ', 'US']);
      expect(result).toContain('AU');
    });

    test('AU-Register mit NZ Protection: AU und NZ', () => {
      const result = getRelevantCountries('AU', ['AU', 'NZ'], ['AU', 'NZ', 'US']);
      expect(result).toContain('AU');
      expect(result).toContain('NZ');
      expect(result).not.toContain('US');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    
    test('Leerer Register-String', () => {
      const result = getRelevantCountries('', ['US'], ['US']);
      expect(result).toContain('US'); // Protection sollte trotzdem funktionieren
    });

    test('Leere Protection-Array', () => {
      const result = getRelevantCountries('AU', [], ['AU']);
      expect(result).toContain('AU'); // Register sollte trotzdem funktionieren
    });

    test('Leere searchedCountries', () => {
      const result = getRelevantCountries('AU', ['AU'], []);
      expect(result).toEqual([]);
    });

    test('Case-insensitive: Kleinbuchstaben', () => {
      const result = getRelevantCountries('au', ['au'], ['AU']);
      expect(result).toContain('AU');
    });
  });
});

// ==================== HELPER FUNCTIONS ====================
describe('Helper Functions', () => {
  
  test('getRegisterCountries: EU gibt 27 Länder zurück', () => {
    const result = getRegisterCountries('EU');
    expect(result.length).toBe(27);
    expect(result).toContain('DE');
    expect(result).toContain('FR');
  });

  test('getRegisterCountries: BX gibt 3 Länder zurück', () => {
    const result = getRegisterCountries('BX');
    expect(result).toEqual(['BE', 'NL', 'LU']);
  });

  test('getRegisterCountries: unbekanntes Register gibt leer zurück', () => {
    const result = getRegisterCountries('XX');
    expect(result).toEqual([]);
  });

  test('isRegionalRegister: EU ist regional', () => {
    expect(isRegionalRegister('EU')).toBe(true);
    expect(isRegionalRegister('EM')).toBe(true);
    expect(isRegionalRegister('BX')).toBe(true);
  });

  test('isRegionalRegister: AU ist nicht regional', () => {
    expect(isRegionalRegister('AU')).toBe(false);
    expect(isRegionalRegister('DE')).toBe(false);
    expect(isRegionalRegister('WO')).toBe(false);
  });
});
