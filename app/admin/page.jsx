'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CafeProvider } from '../../src/context/CafeContext';

const AdminDashboard = dynamic(
  () => import('../../src/components/AdminDashboard'),
  {
    ssr: false,
  }
);

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <CafeProvider>
      <div className="min-h-screen bg-[#110b08] text-[#faf6f0] flex flex-col selection:bg-cafe-600 selection:text-white">
        {/* Admin Dashboard Workspace */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-6 lg:p-8">
          {mounted ? (
            <AdminDashboard isStandalone={true} />
          ) : (
            <div className="w-full neu-raised rounded-3xl p-12 my-6 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-[#c4884d] border-t-transparent animate-spin"></div>
              <p className="text-xs text-cafe-300 font-mono tracking-wide">
                Loading Staff Management Portal...
              </p>
            </div>
          )}
        </main>
      </div>
    </CafeProvider>
  );
}
