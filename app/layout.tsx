import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ASTRA San-Raffaele",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={` h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{margin: 0}}>{children}</body>
    </html>
  );
}