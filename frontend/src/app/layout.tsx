import type { Metadata } from "next";
import { DS_FALLBACK_CSS } from "@plataforma-xvia/ds-core/fallback-css";
import { DS_THEMES_CSS, DS_TOKENS_CSS } from "@plataforma-xvia/ds-tokens/css-text";
import { Mulish, Open_Sans } from "next/font/google";
import "./globals.css";

const heading = Mulish({ subsets: ["latin"], variable: "--app-font-heading" });
const sans = Open_Sans({ subsets: ["latin"], variable: "--app-font-sans" });
const CRITICAL_CSS = `${DS_TOKENS_CSS}\n${DS_THEMES_CSS}\n${DS_FALLBACK_CSS}`;

export const metadata: Metadata = {
  title: "Auditoria GSC — SETDIG",
  description: "Detecção de páginas suspeitas em sites *.ms.gov.br via Google Search Console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${sans.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      </head>
      <body>
        {children}
        <footer>
          Secretaria-Executiva de Transformação Digital — SETDIG
        </footer>
      </body>
    </html>
  );
}
