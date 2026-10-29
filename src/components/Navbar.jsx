'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Coffee, Calendar, Menu, X } from 'lucide-react';
import { useCafe } from '../context/CafeContext';

export default function Navbar() {
  const {
    cafeSettings,
    setIsBookingModalOpen,
  } = useCafe();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenBooking = () => {
    setIsBookingModalOpen(true);
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#18110c]/95 backdrop-blur-md border-b border-cafe-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo - Clickable & Accessible */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex items-center space-x-2.5 sm:space-x-3 group focus-visible:outline-gold-accent rounded-xl p-1 min-w-0"
          aria-label={`${cafeSettings.name} - Return to Homepage`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl neu-raised flex items-center justify-center flex-shrink-0 border border-gold-accent/20">
            <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-gold-accent group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-[#fdfbf7] truncate max-w-[130px] xs:max-w-xs sm:max-w-none block">
                {cafeSettings.name}
              </span>
            </div>
            <p className="text-[11px] text-cafe-300/80 hidden sm:block truncate max-w-xs">
              {cafeSettings.tagline}
            </p>
          </div>
        </Link>

        {/* Desktop Nav Links - Clean Typography without Overused Icons */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium" aria-label="Main Navigation">
          <a
            href="#availability-map"
            className="text-cafe-200 hover:text-gold-accent transition-colors py-2"
          >
            Live Tables
          </a>
          <a
            href="#menu-section"
            className="text-cafe-200 hover:text-gold-accent transition-colors py-2"
          >
            Menu
          </a>
          <a
            href="#ambiance-section"
            className="text-cafe-200 hover:text-gold-accent transition-colors py-2"
          >
            Ambiance
          </a>
          <a
            href="#about-section"
            className="text-cafe-200 hover:text-gold-accent transition-colors py-2"
          >
            Location
          </a>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Primary Book Table CTA */}
          <button
            type="button"
            onClick={handleOpenBooking}
            className="neu-gold-btn relative inline-flex items-center justify-center min-h-[40px] sm:min-h-[44px] px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
            <span>Book<span className="hidden xs:inline"> Table</span></span>
          </button>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl neu-btn-secondary flex items-center justify-center text-cafe-200 hover:text-gold-accent transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1b130e] border-b border-cafe-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl">
          <nav className="flex flex-col space-y-1 text-sm font-medium" aria-label="Mobile Navigation">
            <a
              href="#availability-map"
              onClick={closeMobileMenu}
              className="px-3.5 py-3 rounded-xl text-cafe-200 hover:text-gold-accent hover:bg-cafe-900 transition-colors"
            >
              Live Tables
            </a>
            <a
              href="#menu-section"
              onClick={closeMobileMenu}
              className="px-3.5 py-3 rounded-xl text-cafe-200 hover:text-gold-accent hover:bg-cafe-900 transition-colors"
            >
              Menu
            </a>
            <a
              href="#ambiance-section"
              onClick={closeMobileMenu}
              className="px-3.5 py-3 rounded-xl text-cafe-200 hover:text-gold-accent hover:bg-cafe-900 transition-colors"
            >
              Ambiance
            </a>
            <a
              href="#about-section"
              onClick={closeMobileMenu}
              className="px-3.5 py-3 rounded-xl text-cafe-200 hover:text-gold-accent hover:bg-cafe-900 transition-colors"
            >
              Location & Hours
            </a>
          </nav>

          <div className="pt-3 border-t border-cafe-800/80 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleOpenBooking}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl neu-gold-btn text-sm font-bold cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Reserve a Table Now</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
