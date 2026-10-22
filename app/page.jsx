'use client';

import React from 'react';
import { CafeProvider } from '../src/context/CafeContext';
import Navbar from '../src/components/Navbar';
import Hero from '../src/components/Hero';
import LiveTableMap from '../src/components/LiveTableMap';
import MenuSection from '../src/components/MenuSection';
import AmbianceSection from '../src/components/AmbianceSection';
import Footer from '../src/components/Footer';
import BookingModal from '../src/components/BookingModal';

export default function Home() {
  return (
    <CafeProvider>
      <div className="min-h-screen flex flex-col selection:bg-cafe-600 selection:text-white">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <LiveTableMap />
          <MenuSection />
          <AmbianceSection />
        </main>
        <Footer />
        <BookingModal />
      </div>
    </CafeProvider>
  );
}
