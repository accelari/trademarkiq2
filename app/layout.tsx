import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "TrademarkIQ – KI-Markenrecherche in Sekunden | ACCELARI",
  description: "Finden Sie Namenskollisionen bevor Sie €5.000+ für Widersprüche zahlen. DPMA, EUIPO, WIPO durchsuchen. DSGVO-konform. Ab €49/Monat.",
  keywords: "Markenrecherche, Trademark, DPMA, EUIPO, WIPO, KI, AI, Markenanmeldung, Deutschland",
  authors: [{ name: "ACCELARI GmbH" }],
  openGraph: {
    title: "TrademarkIQ – KI-Markenrecherche in Sekunden",
    description: "Finden Sie Namenskollisionen bevor Sie €5.000+ für Widersprüche zahlen.",
    type: "website",
    locale: "de_DE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
