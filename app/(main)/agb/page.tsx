import Link from "next/link";

export default function AGBPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="s-container">
          <h1 className="text-4xl font-semibold text-gray-900 mb-4">
            Allgemeine Geschäftsbedingungen
          </h1>
          <p className="text-gray-600">
            AGB für die Nutzung von TrademarkIQ
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="s-container">
          <div className="max-w-3xl prose prose-gray">
            <h2>§ 1 Geltungsbereich</h2>
            <p>
              (1) Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen 
              der ACCELARI GmbH (nachfolgend „Anbieter") und dem Kunden über die Nutzung der 
              Software-as-a-Service-Plattform TrademarkIQ (nachfolgend „Dienst").
            </p>
            <p>
              (2) Abweichende oder ergänzende Bedingungen des Kunden werden nicht Vertragsbestandteil, 
              es sei denn, der Anbieter stimmt deren Geltung ausdrücklich schriftlich zu.
            </p>

            <h2>§ 2 Vertragsgegenstand</h2>
            <p>
              (1) Der Anbieter stellt dem Kunden über das Internet eine Plattform zur Durchführung 
              von Markenrecherchen zur Verfügung. Der Funktionsumfang richtet sich nach dem vom 
              Kunden gewählten Tarif.
            </p>
            <p>
              (2) Der Dienst umfasst:
            </p>
            <ul>
              <li>Zugang zur Markenrecherche-Plattform</li>
              <li>Durchführung von Markenrecherchen gemäß des gewählten Tarifs</li>
              <li>Generierung von Recherche-Berichten</li>
              <li>Zugang zum KI-Sprachassistenten (sofern im Tarif enthalten)</li>
            </ul>

            <h2>§ 3 Vertragsschluss und Testphase</h2>
            <p>
              (1) Der Vertrag kommt durch die Registrierung des Kunden und die Bestätigung durch 
              den Anbieter zustande.
            </p>
            <p>
              (2) Neue Kunden erhalten eine kostenlose Testphase von 14 Tagen. Nach Ablauf der 
              Testphase wird der Vertrag automatisch in ein kostenpflichtiges Abonnement 
              umgewandelt, sofern der Kunde nicht vorher kündigt.
            </p>

            <h2>§ 4 Leistungsumfang und Verfügbarkeit</h2>
            <p>
              (1) Der Anbieter stellt den Dienst mit einer Verfügbarkeit von 99,5% im Jahresmittel 
              zur Verfügung.
            </p>
            <p>
              (2) Der Anbieter ist berechtigt, den Dienst für Wartungsarbeiten vorübergehend 
              einzuschränken. Wartungsarbeiten werden nach Möglichkeit in verkehrsarme Zeiten 
              gelegt und rechtzeitig angekündigt.
            </p>

            <h2>§ 5 Pflichten des Kunden</h2>
            <p>
              (1) Der Kunde ist verpflichtet, seine Zugangsdaten geheim zu halten und vor dem 
              Zugriff Dritter zu schützen.
            </p>
            <p>
              (2) Der Kunde ist für alle Aktivitäten verantwortlich, die unter seinem Account 
              durchgeführt werden.
            </p>
            <p>
              (3) Der Kunde darf den Dienst nicht missbrauchen, insbesondere nicht:
            </p>
            <ul>
              <li>Zur Durchführung illegaler Aktivitäten nutzen</li>
              <li>Automatisierte Massenabfragen durchführen</li>
              <li>Sicherheitsmaßnahmen umgehen oder testen</li>
            </ul>

            <h2>§ 6 Preise und Zahlung</h2>
            <p>
              (1) Die aktuellen Preise sind auf der Website des Anbieters einsehbar.
            </p>
            <p>
              (2) Die Zahlung erfolgt im Voraus für den jeweiligen Abrechnungszeitraum (monatlich 
              oder jährlich).
            </p>
            <p>
              (3) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zum Dienst zu sperren.
            </p>

            <h2>§ 7 Vertragslaufzeit und Kündigung</h2>
            <p>
              (1) Bei monatlicher Zahlung kann der Vertrag mit einer Frist von 14 Tagen zum Ende 
              des jeweiligen Abrechnungszeitraums gekündigt werden.
            </p>
            <p>
              (2) Bei jährlicher Zahlung kann der Vertrag mit einer Frist von einem Monat zum 
              Ende des Vertragsjahres gekündigt werden.
            </p>
            <p>
              (3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
            </p>

            <h2>§ 8 Gewährleistung und Haftung</h2>
            <p>
              (1) Der Anbieter gewährleistet die Funktionsfähigkeit des Dienstes gemäß der 
              jeweiligen Leistungsbeschreibung.
            </p>
            <p>
              (2) Die Rechercheergebnisse stellen keine Rechtsberatung dar. Der Kunde ist für 
              die Interpretation und Verwendung der Ergebnisse selbst verantwortlich.
            </p>
            <p>
              (3) Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit. Bei 
              leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen 
              Vertragspflicht.
            </p>

            <h2>§ 9 Datenschutz</h2>
            <p>
              (1) Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung 
              des Anbieters und den geltenden Datenschutzgesetzen.
            </p>
            <p>
              (2) Alle Daten werden ausschließlich auf Servern in Deutschland verarbeitet und 
              gespeichert.
            </p>

            <h2>§ 10 Änderungen der AGB</h2>
            <p>
              (1) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern.
            </p>
            <p>
              (2) Änderungen werden dem Kunden mindestens 30 Tage vor Inkrafttreten per E-Mail 
              mitgeteilt. Widerspricht der Kunde nicht innerhalb von 30 Tagen, gelten die 
              geänderten AGB als angenommen.
            </p>

            <h2>§ 11 Schlussbestimmungen</h2>
            <p>
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des 
              UN-Kaufrechts.
            </p>
            <p>
              (2) Gerichtsstand für alle Streitigkeiten aus diesem Vertragsverhältnis ist, 
              sofern der Kunde Kaufmann ist, der Sitz des Anbieters.
            </p>
            <p>
              (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit 
              der übrigen Bestimmungen unberührt.
            </p>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Stand: November 2025
              </p>
              <Link href="/" className="text-primary hover:underline mt-4 inline-block">
                ← Zurück zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
