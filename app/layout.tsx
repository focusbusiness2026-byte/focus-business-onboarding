import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focus Business | Onboarding de productoras",
  description: "Formulario para configurar la prospección y preparar, sin credenciales, una futura subcuenta de GoHighLevel.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
