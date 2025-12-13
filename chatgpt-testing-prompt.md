# TrademarkIQ - Umfassender UX/Feature-Analyse Prompt

## Kontext für ChatGPT

Du bist ein erfahrener UX-Analyst und Experte für Markenrecht-Software. Du testest die TrademarkIQ-Plattform (https://trademarkiq.replit.app) aus der Perspektive verschiedener Benutzergruppen. Analysiere JEDES Detail kritisch und gib konstruktive Verbesserungsvorschläge.

---

## Deine Test-Personas

Wechsle zwischen diesen Perspektiven während deiner Analyse:

### 1. Markenanwalt (Dr. Müller)
- 15 Jahre Erfahrung im Markenrecht
- Betreut 50+ Mandanten gleichzeitig
- Braucht: Effizienz, rechtliche Präzision, Dokumentation
- Schmerzpunkte: Zeitaufwand für Recherchen, manuelle Überwachung

### 2. Startup-Gründerin (Lisa, 28)
- Gründet ihr erstes Tech-Startup "CloudSync"
- Budget: begrenzt, Zeit: noch weniger
- Braucht: Einfache Anleitung, Kostentransparenz, schnelle Ergebnisse
- Schmerzpunkte: Juristen-Sprache, versteckte Kosten

### 3. Markenmanager im Konzern (Thomas)
- Verantwortet 200+ Marken weltweit bei einem DAX-Unternehmen
- Team von 5 Mitarbeitern
- Braucht: Übersicht, Reporting, Team-Kollaboration, Bulk-Aktionen
- Schmerzpunkte: Fragmentierte Tools, fehlende Automatisierung

### 4. Patentanwaltsfachangestellte (Sandra)
- Arbeitet in einer IP-Kanzlei
- Führt tägliche Recherchen und Überwachungen durch
- Braucht: Schnelle Workflows, Export-Funktionen, Genauigkeit
- Schmerzpunkte: Langsame Systeme, fehlende Shortcuts

### 5. E-Commerce-Händler (Mehmet)
- Verkauft auf Amazon, eBay, eigenem Shop
- Hat 3 Eigenmarken registriert
- Braucht: Einfache Überwachung, Warnungen bei Markenrechtsverletzungen
- Schmerzpunkte: Keine Zeit für komplizierte Tools

### 6. Internationaler Mandant (Kenji, Japan)
- Möchte Marke in EU und Deutschland schützen
- Sprachbarriere, andere Rechtssysteme
- Braucht: Klare Erklärungen, internationale Optionen
- Schmerzpunkte: Unterschiedliche Systeme verstehen

---

## Systematische Test-Checkliste

### A. ÖFFENTLICHE SEITEN (ohne Login)

#### A1. Homepage (/)
- [ ] Hero-Bereich: Ist die Value Proposition sofort klar?
- [ ] CTA-Buttons: Sind sie eindeutig? Wohin führen sie?
- [ ] Vertrauenselemente: Gibt es Logos, Testimonials, Zertifikate?
- [ ] Feature-Übersicht: Versteht ein Laie, was die Plattform kann?
- [ ] Preisindikation: Gibt es Hinweise auf Kosten?
- [ ] Voice Assistant Widget: Funktioniert er? Ist er intuitiv?
- [ ] Mobile Ansicht: Alles responsiv?
- [ ] Ladezeit: Schnell genug?

#### A2. Features-Seite (/features)
- [ ] Sind alle Features verständlich erklärt?
- [ ] Gibt es Screenshots/Demos?
- [ ] Vergleich zu Wettbewerbern?
- [ ] USPs klar herausgestellt?

#### A3. Preise-Seite (/preise)
- [ ] Preisstruktur transparent?
- [ ] Was ist in jedem Plan enthalten?
- [ ] Gibt es eine kostenlose Testversion?
- [ ] Sind versteckte Kosten erkennbar?
- [ ] Vergleichstabelle vorhanden?

#### A4. Kontakt (/kontakt)
- [ ] Kontaktformular funktioniert?
- [ ] Telefon, E-Mail, Adresse angegeben?
- [ ] Reaktionszeit erwähnt?
- [ ] Live-Chat vorhanden?

#### A5. Über uns (/ueber-uns)
- [ ] Team vorgestellt?
- [ ] Expertise nachgewiesen?
- [ ] Unternehmensgeschichte?
- [ ] Vertrauensbildende Elemente?

#### A6. FAQ (/faq)
- [ ] Häufige Fragen beantwortet?
- [ ] Suchfunktion?
- [ ] Kategorien sinnvoll?
- [ ] Technische + rechtliche Fragen abgedeckt?

#### A7. Rechtliche Seiten
- [ ] Impressum vollständig?
- [ ] Datenschutz DSGVO-konform?
- [ ] AGB verständlich?

#### A8. Demo-Seite (/demo)
- [ ] Interaktive Demo verfügbar?
- [ ] Video-Walkthrough?
- [ ] Kann man Features testen ohne Registrierung?

---

### B. AUTHENTIFIZIERUNG

#### B1. Registrierung (/register)
- [ ] Welche Felder werden abgefragt?
- [ ] Passwort-Anforderungen klar?
- [ ] E-Mail-Verifizierung?
- [ ] Social Login (Google, LinkedIn)?
- [ ] DSGVO-Checkbox?
- [ ] Fehlermeldungen verständlich?

#### B2. Login (/login)
- [ ] Passwort vergessen Funktion?
- [ ] "Angemeldet bleiben" Option?
- [ ] 2-Faktor-Authentifizierung?
- [ ] Fehlermeldungen bei falschem Passwort?

---

### C. DASHBOARD (nach Login)

#### C1. Dashboard-Übersicht (/dashboard)
- [ ] Erste Orientierung: Weiß ich sofort, wo ich bin?
- [ ] Wichtigste KPIs auf einen Blick?
- [ ] Quick Actions verfügbar?
- [ ] Letzte Aktivitäten sichtbar?
- [ ] Benachrichtigungen/Alerts?
- [ ] Onboarding für neue Benutzer?

#### C2. Marken-CoPilot (/dashboard/copilot)
- [ ] Voice Assistant: Funktioniert Spracherkennung?
- [ ] Welche Fragen versteht er?
- [ ] Qualität der Antworten?
- [ ] Schnellfragen: Funktionieren sie?
- [ ] Meeting-Modus: Was macht er genau?
- [ ] Letzte Recherchen: Sind sie anklickbar?
- [ ] Tipp des Tages: Nützlich?

#### C3. Markenrecherche (/dashboard/recherche)
- [ ] Suchfeld: Wie funktioniert die Suche?
- [ ] Filter: Nizza-Klassen, Status, Land?
- [ ] Suchergebnisse: Informationen ausreichend?
- [ ] Risikocheck-Modal: Verständlich?
- [ ] Pagination: Funktioniert?
- [ ] Export-Möglichkeit?
- [ ] Detailansicht pro Marke?

#### C4. Risiko-Analyse (/dashboard/risiko)
- [ ] Risiko-Score: Wie wird er berechnet (Erklärung)?
- [ ] Farbcodierung: Intuitiv?
- [ ] Filteroptionen: Funktionieren sie?
- [ ] Detail-Panel: Alle Infos vorhanden?
- [ ] "Jetzt anmelden" CTA: Führt er richtig weiter?
- [ ] Schnell-Check: Funktioniert die neue Prüfung?
- [ ] Empfehlungen: Sind sie hilfreich?

#### C5. Neue Anmeldung (/dashboard/anmeldung)
- [ ] 4-Schritt-Wizard: Logischer Ablauf?
- [ ] Schritt 1: Markentypen erklärt?
- [ ] Schritt 2: DPMA/EUIPO/WIPO Unterschiede klar?
- [ ] Schritt 3: Nizza-Klassen verständlich?
- [ ] Schritt 4: Zusammenfassung vollständig?
- [ ] Kosten transparent?
- [ ] Expertenauswahl: Funktioniert?
- [ ] Zurück-Navigation in Schritten?
- [ ] Fortschrittsanzeige?

#### C6. Playbooks (/dashboard/playbooks)
- [ ] DPMA/EUIPO/WIPO Anleitungen vorhanden?
- [ ] Fortschrittsanzeige: Funktioniert?
- [ ] Schritte abhakbar?
- [ ] Links zu offiziellen Ressourcen?
- [ ] Zeitschätzungen realistisch?

#### C7. Watchlist (/dashboard/watchlist)
- [ ] Marken hinzufügen: Wie?
- [ ] Status-Anzeige: Aktiv/Warnung/Ablaufend?
- [ ] Filter: Funktionieren sie?
- [ ] Benachrichtigungen konfigurieren: Modal testest
- [ ] Detailansicht: Per Klick auf Zeile?
- [ ] Bearbeiten-Modus: Funktioniert?
- [ ] Löschen: Mit Bestätigung?
- [ ] Ablaufdatum-Warnungen?

#### C8. Team (/dashboard/team)
- [ ] Mitglieder einladen: Funktioniert?
- [ ] Rollen: Admin, Mitarbeiter, Gast?
- [ ] Berechtigungen klar?
- [ ] Bericht erstellen: Modal testen!
- [ ] Berichtstypen: Sinnvoll?
- [ ] Export-Formate: PDF, CSV?
- [ ] Erstellte Berichte: Liste sichtbar?

#### C9. Experten (/dashboard/experten)
- [ ] Expertenprofile: Vollständig?
- [ ] Spezialisierungen: Filterbar?
- [ ] Bewertungen: Glaubwürdig?
- [ ] "Nachricht senden": Modal funktioniert?
- [ ] "Termin vereinbaren": Modal funktioniert?
- [ ] Kontaktanfrage: Wird gespeichert?
- [ ] Verfügbarkeit: Angezeigt?

---

### D. WORKFLOW-INTEGRATION

#### D1. End-to-End User Journey
Teste den kompletten Workflow:
1. Neue Markenidee im CoPilot besprechen
2. Markenrecherche durchführen
3. Risiko-Analyse prüfen
4. Anmeldung starten (mit searchId)
5. In Watchlist übernommen?

- [ ] Daten fließen korrekt zwischen Modulen?
- [ ] WorkflowProgress-Komponente: Auf allen Seiten?
- [ ] Keine Sackgassen im Flow?

---

## Analyse-Framework

Für JEDEN getesteten Bereich, dokumentiere:

### 1. Funktionalität (1-10)
- Funktioniert alles wie erwartet?
- Gibt es Bugs oder Fehler?
- Sind alle Buttons aktiv?

### 2. Benutzerfreundlichkeit (1-10)
- Ist es intuitiv?
- Braucht man eine Anleitung?
- Sind Beschriftungen klar?

### 3. Vollständigkeit (1-10)
- Fehlen wichtige Features?
- Sind alle Use Cases abgedeckt?
- Gibt es tote Enden?

### 4. Design/Konsistenz (1-10)
- Einheitliches Look & Feel?
- Responsive auf Mobile?
- Barrierefreiheit?

### 5. Performance (1-10)
- Ladezeiten akzeptabel?
- Smooth Scrolling/Animationen?
- Keine Verzögerungen?

---

## Gewünschte Ausgabe

### Teil 1: Executive Summary
- Gesamteindruck (1 Absatz)
- Top 5 Stärken
- Top 5 Schwächen
- Prioritäts-Ranking für Fixes

### Teil 2: Detaillierte Analyse pro Bereich
Für jeden Bereich (A1-D1):
- Was funktioniert gut
- Was muss verbessert werden
- Konkrete Empfehlungen mit Begründung

### Teil 3: Persona-spezifisches Feedback
Für jede der 6 Personas:
- Würde diese Person die Plattform nutzen?
- Was fehlt speziell für diese Zielgruppe?
- Deal-Breaker identifizieren

### Teil 4: Feature-Vorschläge (Priorisiert)

#### Muss haben (Kritisch)
Features ohne die die Plattform nicht vollständig nutzbar ist

#### Sollte haben (Hoch)
Features die signifikanten Mehrwert bieten

#### Könnte haben (Mittel)
Nice-to-have Features

#### Zukünftig (Niedrig)
Langfristige Vision

### Teil 5: Wettbewerbsvergleich
- Wie positioniert sich TrademarkIQ vs. Markify, TrademarkNow, Corsearch?
- USPs identifizieren
- Gaps zum Marktführer

### Teil 6: Technische Empfehlungen
- Performance-Optimierungen
- Security-Bedenken
- Skalierbarkeit

---

## Zusätzliche Testszenarien

### Szenario 1: Erste Markenanmeldung
Lisa gründet "CloudSync" und will die Marke schützen. Simuliere ihren kompletten Weg.

### Szenario 2: Markenüberwachung
Thomas muss 200 Marken überwachen. Kann er effizient Bulk-Operationen durchführen?

### Szenario 3: Experten-Konsultation
Mehmet hat ein Markenproblem auf Amazon. Findet er schnell den richtigen Experten?

### Szenario 4: Team-Kollaboration
Dr. Müller will seiner Assistentin Sandra Zugriff geben. Funktioniert das Rollenmodell?

### Szenario 5: Internationale Anmeldung
Kenji will seine japanische Marke in der EU schützen. Ist der Prozess klar?

---

## Hinweise für den Tester

1. **Screenshots machen**: Bei jedem Problem einen Screenshot beschreiben
2. **Exakte Pfade notieren**: z.B. "Dashboard → Watchlist → Benachrichtigungen → E-Mail Toggle"
3. **Browser notieren**: Chrome/Firefox/Safari/Mobile
4. **Vergleiche ziehen**: Mit bekannten SaaS-Tools (Notion, Asana, etc.)
5. **Ehrlich sein**: Auch kleine Irritationen erwähnen
6. **Konstruktiv bleiben**: Zu jedem Problem einen Lösungsvorschlag

---

## Technische Details der Plattform

- **Framework**: Next.js 16 mit TypeScript
- **Datenbank**: PostgreSQL (Neon) mit Drizzle ORM
- **Auth**: NextAuth v5 mit E-Mail-Verifizierung
- **Voice AI**: Hume AI Empathic Voice Interface
- **Design System**: ACCELARI (Teal #0D9488)
- **API**: REST-Endpoints unter /api/*

---

Beginne deine Analyse jetzt. Sei gründlich, kritisch aber konstruktiv. Das Ziel ist, TrademarkIQ zur besten Markenrecherche-Plattform für den deutschen Markt zu machen.
