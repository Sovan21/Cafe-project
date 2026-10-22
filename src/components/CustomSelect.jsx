'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value, label: opt.label ?? String(opt.value) };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Clickable Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full neu-inset rounded-xl sm:rounded-2xl px-3 sm:px-3.5 py-2.5 text-left text-sm text-cafe-100 font-medium cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2 hover:border-orange-500/50 transition-colors select-none"
      >
        <span className="text-white text-xs sm:text-sm font-semibold truncate pr-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-orange-500 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-orange-400' : ''
          }`}
        />
      </button>

      {/* Custom Neumorphic Options Dropdown Panel */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-0 z-50 w-full min-w-[130px] max-h-64 overflow-y-auto rounded-2xl neu-raised p-1.5 border border-orange-500/30 shadow-2xl animate-scale-up`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'neu-gold-btn text-white font-bold shadow-neu-orange'
                    : 'text-cafe-200 hover:bg-orange-500/20 hover:text-orange-300 active:bg-orange-700/40'
                }`}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
