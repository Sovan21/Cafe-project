import './globals.css';

export const metadata = {
  title: "L'Aura Cafe & Artisanal Roastery | Real-Time Table Reservations",
  description: "Experience artisanal single-origin coffee, handcrafted sourdough bakery, and live table reservation availability with instant booking confirmation.",
  keywords: [
    "L'Aura Cafe",
    "Artisanal Coffee Roastery",
    "Real-time Table Booking",
    "Cafe Reservation",
    "Gourmet Brunch",
    "Live Seating Availability"
  ],
  authors: [{ name: "L'Aura Hospitality Group" }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: "L'Aura Cafe & Artisanal Roastery | Live Table Booking",
    description: "Reserve your ideal dining table in real-time with guaranteed seat allocation and instant email confirmation.",
    type: "website",
    locale: "en_US",
    siteName: "L'Aura Cafe & Roastery",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#140e0a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#140e0a] text-[#faf6f0] font-sans antialiased selection:bg-cafe-600 selection:text-white min-h-screen max-w-[100vw] overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
