import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next"
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <Analytics/>
    </>
  );
}