import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Focus Business | Onboarding de productoras", description: "Formulario de configuración comercial y automatización para productoras." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
