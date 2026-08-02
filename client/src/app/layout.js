import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import QueryProvider from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata = {
  metadataBase: new URL("https://computerclub.mist.ac.bd"),
  title: "MIST Computer Club",
  description:
    "MIST Computer Club is one of the finest clubs of MIST that is supervised by our experienced, cooperative and so many helpful faculty members",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/mcc.png", sizes: "32x32", type: "image/png" },
      { url: "/mcc.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/mcc.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MIST Computer Club",
    images: [
      {
        url: "/mcc.png",
        width: 1200,
        height: 1200,
        alt: "MIST Computer Club",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/mcc.png"],
  },
  other: {
    "msapplication-TileColor": "#1e40af",
  },
};

export const viewport = {
  themeColor: "#1e40af",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/mcc.png" type="image/png" />
        <link rel="apple-touch-icon" href="/mcc.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans`}
        cz-shortcut-listen="true"
      >
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <Navbar />
            {children}
            <Footer />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
