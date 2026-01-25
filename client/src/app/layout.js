import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const Ubuntu_Medium = localFont({
  src: "./fonts/Ubuntu_Medium.ttf",
  variable: "--font-ubuntu-medium",
});

export const metadata = {
  metadataBase: new URL('https://computerclub.mist.ac.bd'),
  title: "MIST Computer Club",
  description:
    "MIST Computer Club is one of the finest clubs of MIST that is supervised by our experienced, cooperative and so many helpful faculty members",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/mcc.png', sizes: '32x32', type: 'image/png' },
      { url: '/mcc.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/mcc.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    images: '/mccLogoBlack.png',
    width: 1200,
    height: 630,
    type: 'website',
    locale: 'en_US',
    siteName: 'MIST Computer Club',
  },
  other: {
    'msapplication-TileColor': '#1e40af',
  },
};

export const viewport = {
  themeColor: '#1e40af',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/mccLogo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/mccLogo.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${Ubuntu_Medium.className} font-[--font-ubuntu-medium]`}
        cz-shortcut-listen="true"
      >
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
