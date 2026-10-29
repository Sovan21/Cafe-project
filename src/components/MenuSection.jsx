'use client';

import React, { useState } from 'react';
import { DEFAULT_MENU_CATEGORIES, DEFAULT_MENU_ITEMS } from '../constants/defaultData';
import { useCafe } from '../context/CafeContext';

export default function MenuSection() {
  const { cafeSettings, menuItems } = useCafe();
  const [activeCategory, setActiveCategory] = useState('all');

  const items = menuItems || DEFAULT_MENU_ITEMS;
  const filteredItems = items.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <section id="menu-section" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h2 className="font-display text-2xl xs:text-3xl sm:text-5xl font-bold text-[#faf6f0] tracking-tight">
          Our Cafe Menu
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-cafe-200 font-normal leading-relaxed">
          Freshly baked pastries, signature toasts, and specialty coffees prepared daily.
        </p>
      </div>

      {/* Category Tabs in Neumorphic Tray - Mobile Optimized Horizontal Swipe */}
      <div className="flex justify-center mb-8 sm:mb-12 w-full overflow-hidden">
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none pb-2 sm:pb-0 px-1">
          <div className="neu-tray p-1.5 sm:p-2 rounded-2xl sm:rounded-full flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-max mx-auto">
            {DEFAULT_MENU_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeCategory === cat.id
                    ? 'neu-gold-btn shadow-neu-gold font-bold scale-[1.02]'
                    : 'neu-btn-secondary text-cafe-300 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="neu-card rounded-2xl sm:rounded-3xl overflow-hidden border border-cafe-700/40 hover:border-gold-accent/40 flex flex-col justify-between group"
          >
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                width="600"
                height="400"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#201610] via-transparent to-transparent" />
              {item.badge && (
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full neu-card text-gold-accent text-[10px] font-bold uppercase tracking-wider shadow-neu-card border border-gold-accent/30">
                  {item.badge}
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#faf6f0] group-hover:text-gold-accent transition-colors leading-snug">
                    {item.name}
                  </h3>
                  <span className="font-mono text-sm sm:text-base font-bold text-gold-accent ml-2 whitespace-nowrap flex-shrink-0">
                    {cafeSettings.currency} {item.price}
                  </span>
                </div>
                <p className="text-xs text-cafe-300 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-cafe-800/80 flex items-center justify-between text-[11px] text-cafe-400">
                <span className="capitalize">{item.category} selection</span>
                <span className="text-emerald-400 font-medium">Fresh Daily</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
