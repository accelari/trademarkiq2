import { fetchAccessToken } from "hume";
import CompactHeroSection from "../components/sections/CompactHeroSection";
import FeaturesPreview from "../components/sections/FeaturesPreview";
import TestimonialsSection from "../components/sections/TestimonialsSection";
import PartnerLogos from "../components/sections/PartnerLogos";
import CTASection from "../components/sections/CTASection";

export const dynamic = "force-dynamic";

async function getAccessToken(): Promise<string> {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error("Missing HUME_API_KEY or HUME_SECRET_KEY");
    }

    const accessToken = await fetchAccessToken({
      apiKey,
      secretKey,
    });

    if (!accessToken) {
      throw new Error("Failed to fetch access token");
    }

    return accessToken;
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error;
  }
}

export default async function Home() {
  let accessToken: string = "";
  let hasVoiceAssistant = true;

  try {
    accessToken = await getAccessToken();
  } catch (err) {
    hasVoiceAssistant = false;
  }

  return (
    <>
      <CompactHeroSection 
        accessToken={accessToken} 
        hasVoiceAssistant={hasVoiceAssistant} 
      />
      <FeaturesPreview />
      <TestimonialsSection />
      <PartnerLogos />
      <CTASection />
    </>
  );
}
