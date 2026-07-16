import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { WhyVerzaRoute } from "@/components/landing/WhyVerzaRoute";
import { Features } from "@/components/landing/Features";
import { ModelsShowcase } from "@/components/landing/ModelsShowcase";
import { Vision } from "@/components/landing/Vision";
import { PricingCta, Footer } from "@/components/landing/PricingFooter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-obsidian">
      <LandingNav />
      <Hero />
      <WhyVerzaRoute />
      <Features />
      <ModelsShowcase />
      <Vision />
      <PricingCta />
      <Footer />
    </main>
  );
}