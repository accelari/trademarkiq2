# Agents Review - Code Review durch das Agent-System

Führe ein umfassendes Code-Review durch alle relevanten Agenten durch.

Argument: $ARGUMENTS (Datei oder Verzeichnis zum Reviewen, optional)

---

Führe folgendes aus:

1. Bestimme was reviewed werden soll:
   - Falls $ARGUMENTS angegeben: diese Datei/Verzeichnis
   - Falls leer: die zuletzt geänderten Dateien (git diff)

2. Lade die zu reviewenden Dateien

3. Führe Reviews durch mit folgenden Agenten:
   - `architect`: Struktur, Design Patterns
   - `security`: Sicherheitsprobleme
   - `reviewer`: Allgemeine Code-Qualität
   - `frontend` oder `backend`: Je nach Dateityp

4. Erstelle eine Zusammenfassung:

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
