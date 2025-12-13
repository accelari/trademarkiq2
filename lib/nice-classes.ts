export interface NiceClass {
  id: number;
  name: string;
  description: string;
  popular?: boolean;
}

export const NICE_CLASSES: NiceClass[] = [
  { id: 1, name: "Chemische Erzeugnisse", description: "Chemische Erzeugnisse für gewerbliche, wissenschaftliche Zwecke", popular: false },
  { id: 2, name: "Farben, Lacke", description: "Farben, Firnisse, Lacke; Rostschutzmittel", popular: false },
  { id: 3, name: "Kosmetik, Reinigungsmittel", description: "Wasch- und Bleichmittel; Putz-, Polier-, Reinigungsmittel; Parfümerien", popular: true },
  { id: 4, name: "Technische Öle, Brennstoffe", description: "Technische Öle und Fette; Schmiermittel; Brennstoffe", popular: false },
  { id: 5, name: "Pharmazeutische Produkte", description: "Pharmazeutische und veterinärmedizinische Erzeugnisse; Hygienepräparate", popular: true },
  { id: 6, name: "Metalle, Metallwaren", description: "Unedle Metalle und deren Legierungen; Baumaterialien aus Metall", popular: false },
  { id: 7, name: "Maschinen", description: "Maschinen und Werkzeugmaschinen; Motoren", popular: false },
  { id: 8, name: "Handwerkzeuge", description: "Handbetätigte Werkzeuge und Geräte; Messerschmiedewaren", popular: false },
  { id: 9, name: "Computer, Software, Elektronik", description: "Wissenschaftliche Apparate; Computer; Software; Elektronik", popular: true },
  { id: 10, name: "Medizinische Geräte", description: "Chirurgische, ärztliche und zahnärztliche Instrumente und Apparate", popular: false },
  { id: 11, name: "Beleuchtung, Heizung, Sanitär", description: "Beleuchtungs-, Heizungs-, Kühl- und Sanitärapparate", popular: false },
  { id: 12, name: "Fahrzeuge", description: "Fahrzeuge; Apparate zur Beförderung auf dem Land, in der Luft oder auf dem Wasser", popular: false },
  { id: 13, name: "Schusswaffen, Feuerwerkskörper", description: "Schusswaffen; Munition und Geschosse; Sprengstoffe; Feuerwerkskörper", popular: false },
  { id: 14, name: "Schmuck, Uhren", description: "Edelmetalle und deren Legierungen; Juwelierwaren, Schmuckwaren, Uhren", popular: true },
  { id: 15, name: "Musikinstrumente", description: "Musikinstrumente", popular: false },
  { id: 16, name: "Papier, Druckereierzeugnisse", description: "Papier und Pappe; Druckereierzeugnisse; Buchbindeartikel", popular: false },
  { id: 17, name: "Kautschuk, Kunststoffe", description: "Kautschuk, Guttapercha, Gummi, Asbest, Glimmer", popular: false },
  { id: 18, name: "Leder, Taschen, Koffer", description: "Leder und Lederimitationen; Häute und Felle; Reise- und Handkoffer", popular: true },
  { id: 19, name: "Baumaterialien (nicht Metall)", description: "Baumaterialien (nicht aus Metall); Rohre (nicht aus Metall)", popular: false },
  { id: 20, name: "Möbel, Einrichtungsgegenstände", description: "Möbel, Spiegel, Bilderrahmen; Waren aus Holz, Kork, Rohr", popular: false },
  { id: 21, name: "Haushaltsgeräte, Glaswaren", description: "Geräte und Behälter für Haushalt und Küche; Glaswaren, Porzellan", popular: false },
  { id: 22, name: "Seile, Zelte, Planen", description: "Seile und Bindfäden; Netze; Zelte und Planen", popular: false },
  { id: 23, name: "Garne, Fäden", description: "Garne und Fäden für textile Zwecke", popular: false },
  { id: 24, name: "Webstoffe, Textilien", description: "Webstoffe und Textilwaren; Bett- und Tischdecken", popular: false },
  { id: 25, name: "Bekleidung, Schuhe", description: "Bekleidungsstücke, Schuhwaren, Kopfbedeckungen", popular: true },
  { id: 26, name: "Kurzwaren, Stickereien", description: "Spitzen und Stickereien, Bänder und Schnürbänder", popular: false },
  { id: 27, name: "Bodenbeläge, Teppiche", description: "Teppiche, Fußmatten, Matten, Linoleum", popular: false },
  { id: 28, name: "Spiele, Sportartikel", description: "Spiele und Spielzeug; Turn- und Sportartikel", popular: true },
  { id: 29, name: "Fleisch, Fisch, Milchprodukte", description: "Fleisch, Fisch, Geflügel; Milch und Milchprodukte; Öle und Fette", popular: true },
  { id: 30, name: "Kaffee, Backwaren, Süßwaren", description: "Kaffee, Tee, Kakao; Zucker; Backwaren und Konditorwaren", popular: true },
  { id: 31, name: "Land- und Gartenbauprodukte", description: "Landwirtschaftliche Erzeugnisse; Frisches Obst und Gemüse", popular: false },
  { id: 32, name: "Bier, Getränke (alkoholfrei)", description: "Biere; Mineralwässer; Fruchtsäfte; alkoholfreie Getränke", popular: true },
  { id: 33, name: "Alkoholische Getränke", description: "Alkoholische Getränke (ausgenommen Biere)", popular: true },
  { id: 34, name: "Tabakwaren", description: "Tabak; Raucherartikel; Streichhölzer", popular: false },
  { id: 35, name: "Werbung, Geschäftsführung", description: "Werbung; Geschäftsführung; Unternehmensverwaltung; Büroarbeiten", popular: true },
  { id: 36, name: "Versicherungen, Finanzwesen", description: "Versicherungswesen; Finanzwesen; Geldgeschäfte; Immobilienwesen", popular: true },
  { id: 37, name: "Bauwesen, Reparatur", description: "Bauwesen; Reparaturwesen; Installationsarbeiten", popular: false },
  { id: 38, name: "Telekommunikation", description: "Telekommunikation", popular: true },
  { id: 39, name: "Transport, Verpackung, Lagerung", description: "Transportwesen; Verpackung und Lagerung von Waren; Veranstaltung von Reisen", popular: false },
  { id: 40, name: "Materialbearbeitung", description: "Materialbearbeitung", popular: false },
  { id: 41, name: "Erziehung, Unterhaltung, Sport", description: "Erziehung; Ausbildung; Unterhaltung; sportliche und kulturelle Aktivitäten", popular: true },
  { id: 42, name: "IT-Dienstleistungen, SaaS", description: "Wissenschaftliche und technologische Dienstleistungen; Softwareentwicklung", popular: true },
  { id: 43, name: "Gastronomie, Beherbergung", description: "Dienstleistungen zur Verpflegung und Beherbergung von Gästen", popular: true },
  { id: 44, name: "Medizinische Dienstleistungen", description: "Medizinische und veterinärmedizinische Dienstleistungen", popular: false },
  { id: 45, name: "Rechts- und Sicherheitsdienste", description: "Juristische Dienstleistungen; Sicherheitsdienste", popular: false },
];

export const getClassById = (id: number): NiceClass | undefined => {
  return NICE_CLASSES.find(c => c.id === id);
};

export const getPopularClasses = (): NiceClass[] => {
  return NICE_CLASSES.filter(c => c.popular);
};

export const formatClassLabel = (niceClass: NiceClass): string => {
  return `Klasse ${niceClass.id} - ${niceClass.name}`;
};
