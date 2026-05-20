import { useEffect } from "react";
import Navbar from "@/components/waterpark/Navbar";
import HeroSection from "@/components/waterpark/HeroSection";
import AtraccionesSection from "@/components/waterpark/AtraccionesSection";
import EntradasSection from "@/components/waterpark/EntradasSection";
import Tour360Banner from "@/components/waterpark/Tour360Banner";
import GaleriaMultimedia from "@/components/waterpark/GaleriaMultimedia";
import ProximosEventos from "@/components/waterpark/ProximosEventos";
import Footer from "@/components/waterpark/Footer";
import { trackEvent } from "@/lib/analytics";

const Index = () => {
  useEffect(() => {
    void trackEvent("page_view");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <AtraccionesSection />
      <EntradasSection />
      <Tour360Banner />
      <GaleriaMultimedia />
      <ProximosEventos />
      <Footer />
    </div>
  );
};

export default Index;
