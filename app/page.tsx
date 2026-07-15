import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { ModelsShowcase } from "@/components/landing/ModelsShowcase";
import { PricingCta, Footer } from "@/components/landing/PricingFooter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-obsidian">
      <LandingNav />
      <Hero />
      <Features />
      <ModelsShowcase />
      <PricingCta />
      <Footer />
    </main>
  );
}
