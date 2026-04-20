import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next"
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export const metadata = {
  title: "ASTRA San Raffaele",
  description: "Community ASTRA San Raffaele: eventi universitari, convenzioni, opportunità e servizi per studenti.",
};

export default function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F8F7F3; color: #08102A; overflow-x: hidden; }
      `}</style>
      <Navbar />
      {children}
      <Footer />
      <Analytics/>
    </>
  );
}