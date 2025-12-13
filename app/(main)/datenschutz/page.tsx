import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="s-container">
          <h1 className="text-4xl font-semibold text-gray-900 mb-4">
            Datenschutzerklärung
          </h1>
          <p className="text-gray-600">
            Informationen zum Datenschutz bei TrademarkIQ
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="s-container">
          <div className="max-w-3xl prose prose-gray">
            <h2>1. Datenschutz auf einen Blick</h2>
            
            <h3>Allgemeine Hinweise</h3>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren 
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene 
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>

            <h3>Datenerfassung auf dieser Website</h3>
            <p>
              <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen 
              Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>

            <h2>2. Hosting</h2>
            <p>
              Wir hosten die Inhalte unserer Website bei folgendem Anbieter: Die Server befinden 
              sich ausschließlich in Deutschland und unterliegen den strengen deutschen und 
              europäischen Datenschutzvorschriften.
            </p>

            <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>
            
            <h3>Datenschutz</h3>
            <p>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. 
              Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der 
              gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>

            <h3>Hinweis zur verantwortlichen Stelle</h3>
            <p>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p>
              ACCELARI GmbH<br />
              [Adresse]<br />
              E-Mail: datenschutz@accelari.com
            </p>

            <h3>Speicherdauer</h3>
            <p>
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt 
              wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die 
              Datenverarbeitung entfällt.
            </p>

            <h2>4. Datenerfassung auf dieser Website</h2>
            
            <h3>Cookies</h3>
            <p>
              Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine 
              Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder 
              vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft 
              (permanente Cookies) auf Ihrem Endgerät gespeichert.
            </p>

            <h3>Kontaktformular</h3>
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus 
              dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks 
              Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
            </p>

            <h2>5. TrademarkIQ Service</h2>
            
            <h3>Markenrecherche-Daten</h3>
            <p>
              Bei der Nutzung unseres Markenrecherche-Dienstes werden folgende Daten verarbeitet:
            </p>
            <ul>
              <li>Eingegebene Markennamen und Suchbegriffe</li>
              <li>Ausgewählte Nizza-Klassen</li>
              <li>Rechercheergebnisse und generierte Berichte</li>
              <li>Nutzungsdaten (Zeitpunkt der Recherche, IP-Adresse)</li>
            </ul>
            <p>
              Diese Daten werden ausschließlich zur Erbringung des Dienstes und zur Verbesserung 
              unserer Services verwendet.
            </p>

            <h3>KI-Sprachassistent</h3>
            <p>
              Bei der Nutzung unseres KI-Sprachassistenten werden Ihre Sprachaufnahmen temporär 
              verarbeitet, um Ihnen Antworten zu liefern. Die Audioaufnahmen werden nicht 
              dauerhaft gespeichert und nach der Verarbeitung gelöscht.
            </p>

            <h2>6. Ihre Rechte</h2>
            <p>Sie haben jederzeit das Recht:</p>
            <ul>
              <li>Auskunft über Ihre bei uns gespeicherten Daten zu erhalten</li>
              <li>Berichtigung unrichtiger Daten zu verlangen</li>
              <li>Löschung Ihrer Daten zu verlangen</li>
              <li>Einschränkung der Verarbeitung zu verlangen</li>
              <li>Datenübertragbarkeit zu verlangen</li>
              <li>Der Verarbeitung zu widersprechen</li>
            </ul>

            <h2>7. SSL- bzw. TLS-Verschlüsselung</h2>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung 
              vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte 
              Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" 
              auf „https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
            </p>

            <h2>8. Änderungen dieser Datenschutzerklärung</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den 
              aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen 
              umzusetzen.
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
