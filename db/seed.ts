import { db } from "./index";
import { experts } from "./schema";

const expertData = [
  {
    name: "Dr. Julia Weber",
    title: "Fachanwältin für gewerblichen Rechtsschutz",
    company: "Weber & Partner Rechtsanwälte",
    location: "München",
    rating: 49,
    reviewCount: 47,
    specialties: ["Markenrecht", "Patentrecht", "Wettbewerbsrecht"],
    languages: ["Deutsch", "Englisch"],
    experience: "15+ Jahre",
    price: "ab 250€/Std.",
    verified: true,
    available: true,
  },
  {
    name: "Thomas Müller",
    title: "Rechtsanwalt & Markenberater",
    company: "Kanzlei Müller",
    location: "Berlin",
    rating: 47,
    reviewCount: 32,
    specialties: ["Markenrecht", "Start-up-Beratung"],
    languages: ["Deutsch", "Englisch", "Französisch"],
    experience: "10+ Jahre",
    price: "ab 180€/Std.",
    verified: true,
    available: true,
  },
  {
    name: "Dr. Anna Schneider",
    title: "Patentanwältin",
    company: "IP Solutions GmbH",
    location: "Hamburg",
    rating: 48,
    reviewCount: 28,
    specialties: ["Patentrecht", "Markenrecht", "Designrecht"],
    languages: ["Deutsch", "Englisch"],
    experience: "12+ Jahre",
    price: "ab 220€/Std.",
    verified: true,
    available: false,
  },
  {
    name: "Michael Fischer",
    title: "Markenrechtsexperte",
    company: "Fischer IP Consulting",
    location: "Frankfurt",
    rating: 46,
    reviewCount: 19,
    specialties: ["Markenrecht", "Internationale Anmeldungen"],
    languages: ["Deutsch", "Englisch", "Spanisch"],
    experience: "8+ Jahre",
    price: "ab 150€/Std.",
    verified: true,
    available: true,
  },
  {
    name: "Sarah Hoffmann",
    title: "Rechtsanwältin für IP-Recht",
    company: "Hoffmann & Kollegen",
    location: "Düsseldorf",
    rating: 45,
    reviewCount: 23,
    specialties: ["Markenrecht", "Urheberrecht", "Lizenzrecht"],
    languages: ["Deutsch", "Englisch"],
    experience: "7+ Jahre",
    price: "ab 160€/Std.",
    verified: true,
    available: true,
  },
];

async function seed() {
  console.log("Seeding experts...");

  for (const expert of expertData) {
    await db.insert(experts).values(expert).onConflictDoNothing();
  }

  console.log("Seeding complete!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
