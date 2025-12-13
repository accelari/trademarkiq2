# CareerSystem Voice Assistant

Eine minimalistische Voice-to-Voice Web-Applikation mit Hume's Empathic Voice Interface (EVI).

## Features

- 🎤 Sprachbasierte Konversation mit empathischem KI-Assistenten
- 💬 Alternative Texteingabe für geschriebene Nachrichten
- 🎭 Emotionserkennung in Nutzeräußerungen
- 🎨 Minimalistisches, modernes UI-Design
- 📱 Responsive Design für Desktop und Mobile
- 🔒 Sichere Server-seitige Token-Generierung

## Erste Schritte

### 1. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env`-Datei im Hauptverzeichnis:

```bash
HUME_API_KEY=your_hume_api_key_here
HUME_SECRET_KEY=your_hume_secret_key_here
```

API-Keys erhalten Sie im [Hume Portal](https://platform.hume.ai/).

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Entwicklungsserver starten

```bash
npm run dev
```

Die Anwendung ist nun unter `http://localhost:5000` erreichbar.

## Verwendung

1. Klicken Sie auf "Sitzung starten", um die Verbindung zum Voice Assistant herzustellen
2. Erlauben Sie Mikrofonzugriff, wenn Sie dazu aufgefordert werden
3. Sprechen Sie mit dem Assistenten oder geben Sie Text ein
4. Der Assistent reagiert empathisch auf Ihre Emotionen und Anfragen
5. Klicken Sie auf "Sitzung beenden", um die Verbindung zu trennen

## Technologie-Stack

- **Framework**: Next.js 14+ mit TypeScript
- **Voice SDK**: @humeai/voice-react
- **Styling**: Tailwind CSS
- **Font**: Inter

## Projektstruktur

```
├── app/
│   ├── api/
│   │   └── token/
│   │       └── route.ts          # OAuth2 Token-Generierung
│   ├── components/
│   │   ├── Chat.tsx              # Haupt-Chat-Komponente
│   │   ├── StartCall.tsx         # Sitzungssteuerung
│   │   └── Messages.tsx          # Nachrichtenanzeige
│   ├── globals.css               # Globale Styles
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Hauptseite
├── .env.example                  # Umgebungsvariablen-Vorlage
└── package.json
```

## Sicherheitshinweise

- API-Keys werden nur server-seitig verwendet und niemals an den Client gesendet
- Access Tokens haben eine Gültigkeit von 30 Minuten
- Alle sensiblen Daten sind in `.env`-Dateien ausgelagert

## Build für Produktion

```bash
npm run build
npm start
```

## Lizenz

Private Nutzung
