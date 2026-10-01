import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "Radar Imperatriz", template: "%s · Radar Imperatriz" },
  description: "A informação que movimenta a cidade. Central de inteligência jornalística de Imperatriz (MA).",
  robots: { index: false, follow: false },
};

// Aplica o tema salvo antes da primeira pintura (evita "piscar" ao usar o tema escuro).
const themeScript = `try{if(localStorage.getItem("radar-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${serif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
