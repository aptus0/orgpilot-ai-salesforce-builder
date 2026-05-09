import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temas RE Custom Object Auto",
  description: "Salesforce custom object ve metadata yonetimi icin sade admin panel",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png"
  }
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
