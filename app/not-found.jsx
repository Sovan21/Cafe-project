import Link from 'next/link';
import { Coffee, ArrowLeft, Home, Calendar, Utensils } from 'lucide-react';

export const metadata = {
  title: "404 - Table Not Found | L'Aura Cafe & Roastery",
  description: "The requested page or reservation could not be found. Return to L'Aura Cafe homepage.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#140e0a] text-[#faf6f0] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cafe-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel max-w-lg w-full p-8 sm:p-10 rounded-3xl text-center relative z-10 border border-gold-accent/25 shadow-glass">
        {/* Glowing Icon Badge */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cafe-700 to-cafe-900 border border-gold-accent/40 flex items-center justify-center shadow-glow">
          <Coffee className="w-10 h-10 text-gold-accent" />
        </div>

        {/* Status Code & Headings */}
        <span className="inline-block px-3 py-1 rounded-full bg-gold-accent/15 border border-gold-accent/30 text-gold-accent text-xs font-mono font-bold tracking-widest uppercase mb-3">
          Error 404
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
          This Table is Unoccupied
        </h1>
        <p className="text-cafe-300 text-sm leading-relaxed mb-8">
          The page or reservation you are searching for might have been moved, removed, or never existed in our roastery records.
        </p>

        {/* Primary CTA */}
        <div className="space-y-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm neu-gold-btn transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          {/* Quick Route Shortcuts */}
          <div className="pt-4 border-t border-cafe-800/80 flex items-center justify-center gap-4 text-xs text-cafe-300">
            <Link href="/#availability-map" className="hover:text-gold-accent transition-colors flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Live Tables</span>
            </Link>
            <span className="text-cafe-700">•</span>
            <Link href="/#menu-section" className="hover:text-gold-accent transition-colors flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5" />
              <span>Menu</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
