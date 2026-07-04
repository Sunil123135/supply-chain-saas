import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Yugam — Supply Chain Intelligence",
  description: "The Era of Supply Chain Intelligence. MedTech + CPG planning and Copilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
