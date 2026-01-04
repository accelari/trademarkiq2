# Recherche-Historie Feature - Product Requirements Document

## Übersicht
Die Recherche-Historie speichert durchgeführte Markenrecherchen dauerhaft in der Datenbank und zeigt sie im UI als navigierbare Tabs an.

## Funktionale Anforderungen

### 1. Historie-Banner
- Zeigt alle durchgeführten Recherchen als Tabs
- Jeder Tab zeigt: Markenname, Risiko-Score (%), Risiko-Indikator (grün/orange/rot)
- Aktiver Tab ist hervorgehoben
- Button "+ Weitere Recherche" zum Starten einer neuen Suche
- X-Button zum Löschen einer Recherche

### 2. Tab-Navigation
- Tab "Parameter": Eingabefelder (Markenname, Länder, Klassen, Markenart)
- Tab "Ergebnisse": Analyse-Ergebnisse mit Risiko-Score und Konflikten
- "Ergebnisse" Tab nur aktiv wenn Ergebnis vorhanden

### 3. Persistierung
- Recherchen werden in PostgreSQL gespeichert (Tabelle: recherche_history)
- Beim Laden eines Cases wird Historie aus DB geladen
- Beim Durchführen einer Recherche wird Ergebnis in DB gespeichert
- Beim Löschen wird Eintrag aus DB entfernt

### 4. KI-Chat Integration
- Nach jeder Recherche: KI erklärt Ergebnis im Chat
- Bei GO: Positive Nachricht mit Empfehlung zur Anmeldung
- Bei NO-GO: Warnung mit Konflikt-Details + automatische Alternativ-Suche via Tavily

## Testfälle

### Test 1: Recherche durchführen
1. Gehe zu /dashboard/case/[caseId]
2. Öffne "Recherche" Akkordeon
3. Gib Markenname ein (z.B. "TestMarke")
4. Wähle mindestens ein Land
5. Wähle mindestens eine Klasse
6. Klicke "Recherche starten"
7. Erwarte: Ergebnis erscheint, KI-Nachricht im Chat, Tab in Historie

### Test 2: Historie-Navigation
1. Führe 2 Recherchen durch
2. Klicke auf ersten Tab in Historie
3. Erwarte: Ergebnis der ersten Recherche wird angezeigt
4. Klicke auf zweiten Tab
5. Erwarte: Ergebnis der zweiten Recherche wird angezeigt

### Test 3: Recherche löschen
1. Führe eine Recherche durch
2. Klicke X-Button am Tab
3. Erwarte: Tab verschwindet, Wechsel zur Parameter-Ansicht

### Test 4: Persistierung nach Reload
1. Führe eine Recherche durch
2. Lade die Seite neu (F5)
3. Erwarte: Historie-Tab ist noch vorhanden
