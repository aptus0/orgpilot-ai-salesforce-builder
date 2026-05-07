import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrgPilot AI",
  description: "AI destekli Salesforce Custom Object ve Field oluşturucu"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
