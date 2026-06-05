import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Control de Maestros | UNEFCO",
  description: "Sistema de control y seguimiento de cursos UNEFCO. Gestión de notas, grupos, calendario, agenda, participantes y cumplimiento operativo.",
  keywords: "UNEFCO, cursos, maestros, control, seguimiento, educación, Bolivia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
