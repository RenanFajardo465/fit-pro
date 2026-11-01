import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";

export const metadata: Metadata = {
  title: "Fit-Pro",
  description: "Treino, nutrição, histórico e evolução — plataforma pessoal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // evita zoom acidental ao tocar em inputs durante o treino
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        {/*
         * Aplica a classe `.dark` (ou não) antes do primeiro paint, com
         * base na preferência salva pelo `ThemeToggle` — sem isso, a página
         * sempre nasceria escura e trocaria pra clara só depois de
         * hidratar, piscando. Escuro continua sendo o padrão sem preferência salva.
         */}
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
