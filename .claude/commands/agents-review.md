# Agents Review - Code Review durch das Agent-System

Führe ein umfassendes Code-Review durch alle relevanten Agenten durch.

Argument: $ARGUMENTS (Datei oder Verzeichnis zum Reviewen, optional)

---

Führe folgendes aus:

1. **SICHERHEITS-VALIDIERUNG** für $ARGUMENTS:
   - Pfade müssen innerhalb des Projekt-Verzeichnisses sein
   - Keine `..` oder absoluten Pfade außerhalb des Projekts
   - Nur existierende Dateien/Verzeichnisse akzeptieren

2. Bestimme was reviewed werden soll:
   - Falls $ARGUMENTS angegeben: diese Datei/Verzeichnis (nach Validierung)
   - Falls leer: die zuletzt geänderten Dateien (git diff)

3. Lade die zu reviewenden Dateien

4. Führe Reviews durch mit folgenden Agenten:
   - `architect`: Struktur, Design Patterns
   - `security`: Sicherheitsprobleme
   - `reviewer`: Allgemeine Code-Qualität
   - `frontend` oder `backend`: Je nach Dateityp

5. Erstelle eine Zusammenfassung:

```
📋 CODE REVIEW ERGEBNIS
=======================

Datei(en): [liste]

## 🏗️ Architektur
[Architekt-Feedback]

## 🔒 Sicherheit
[Security-Feedback]

## 📝 Code-Qualität
[Reviewer-Feedback]

## 💡 Empfehlungen
[Priorisierte Liste]

Gesamtbewertung: [⭐⭐⭐⭐⭐ / 5]
```
