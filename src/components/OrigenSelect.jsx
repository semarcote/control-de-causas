import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { INICIO_OPTIONS } from './CausasTable';

export default function OrigenSelect({
  value = '',
  onChange,
  options = INICIO_OPTIONS,
  placeholder = '- Seleccionar u escribir Origen -',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Synchronize internal input value when external value changes and dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setInputValue(value || '');
    }
  }, [value, isOpen]);

  // Position dropdown intelligently (drop up if near bottom of screen/container)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // If user typed something custom without picking from list, preserve it
        if (inputValue !== value && onChange) {
          onChange(inputValue);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, inputValue, value, onChange]);

  // Filter options based on user input (case-insensitive)
  const cleanInput = (inputValue || '').trim().toLowerCase();
  
  const filteredOptions = options.filter(opt => {
    if (!cleanInput) return true;
    const cleanOpt = opt.toLowerCase();
    return cleanOpt.includes(cleanInput);
  }).sort((a, b) => {
    if (!cleanInput) return 0;
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aStarts = aLower.startsWith(cleanInput);
    const bStarts = bLower.startsWith(cleanInput);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    if (onChange) {
      onChange(val);
    }
  };

  const handleSelectOption = (opt) => {
    setInputValue(opt);
    setIsOpen(false);
    if (onChange) {
      onChange(opt);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputValue('');
    setIsOpen(false);
    if (onChange) {
      onChange('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className="relative flex items-center w-full rounded-xl bg-slate-950 border border-slate-800 focus-within:border-blue-500 transition shadow-sm cursor-pointer"
        onClick={() => {
          setIsOpen(true);
          if (inputRef.current) inputRef.current.focus();
        }}
      >
        <Search className="h-4 w-4 ml-3 text-slate-500 flex-shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/80 transition"
            title="Limpiar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown
            className={`h-4 w-4 mr-3 text-slate-500 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-400' : ''
            }`}
          />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-[100] w-full rounded-xl border border-slate-700 bg-slate-900/98 backdrop-blur-md shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((opt) => {
                const isSelected = (value || '').toLowerCase().trim() === opt.toLowerCase().trim();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/25 text-blue-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              <span>No coincide ningún origen predefinido.</span>
              {inputValue.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelectOption(inputValue.trim())}
                  className="mt-1 block w-full text-center text-xs font-bold text-blue-400 hover:underline cursor-pointer"
                >
                  Usar "{inputValue.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
