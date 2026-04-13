import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next"
import Footer from "@/components/ui/footer";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <Footer />
      <Analytics />
    </>
  );
}