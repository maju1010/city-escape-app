import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BurgerMenu from "./components/BurgerMenu";
import ScrollToTop from "./components/ScrollToTop";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "City Escape",
  description: "Løs mysterier og udforsk byen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${geist.variable} h-full antialiased dark`}>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('cityescape_theme')||'dark';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <ScrollToTop />
        <BurgerMenu />
        {children}
      </body>
    </html>
  );
}
