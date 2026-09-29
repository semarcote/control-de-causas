import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, FileText } from 'lucide-react';

export function parseIppParts(ippStr) {
  if (!ippStr || typeof ippStr !== 'string') {
    return { year: 0, num: 0, raw: '' };
  }
  const clean = ippStr.trim();
  
  // Format PBA: 18-01-008767-25/00 or PP-18-01-008767-25/00
  const matchPba = clean.match(/(?:[A-Za-z]+-)?(\d+)-(\d+)-(\d+)-(\d{2,4})(?:\/(\d+))?/);
  if (matchPba) {
    const num = parseInt(matchPba[3], 10) || 0;
    let year = parseInt(matchPba[4], 10) || 0;
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    return { year, num, raw: clean };
  }

  // Format: NNNN/YY or NNNN/YYYY
  const matchSlash = clean.match(/(\d+)\/(\d{2,4})/);
  if (matchSlash) {
    const num = parseInt(matchSlash[1], 10) || 0;
    let year = parseInt(matchSlash[2], 10) || 0;
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    return { year, num, raw: clean };
  }

  // Fallback: search for numbers
  const nums = clean.match(/\d+/g);
  if (nums && nums.length >= 2) {
    const num = parseInt(nums[nums.length - 2], 10) || 0;
    let year = parseInt(nums[nums.length - 1], 10) || 0;
    if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
    return { year, num, raw: clean };
  }

  return { year: 0, num: parseInt(clean.replace(/\D/g, ''), 10) || 0, raw: clean };
}

export function sortCausasByIppAndYear(causas) {
  return [...(causas || [])].sort((a, b) => {
    const pA = parseIppParts(a.ipp);
    const pB = parseIppParts(b.ipp);

    // Primary sort: Year (descending: newest years first, e.g. 2026, 2025, 2024...)
    if (pA.year !== pB.year) {
      return pB.year - pA.year;
    }

    // Secondary sort: Cause number (ascending: 95, 790, 1020, 3778, 6011, 8767)
    if (pA.num !== pB.num) {
      return pA.num - pB.num;
    }

    // Tertiary sort: Carátula
    return (a.caratula || '').localeCompare(b.caratula || '');
  });
}

export default function CausaSearchSelect({
  causas = [],
  selectedCausaId = '',
  onSelectCausa,
  placeholder = 'Buscar o seleccionar causa por N° de IPP o Carátula...',
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  // Sorted causas: Year descending, IPP number ascending
  const sortedCausas = useMemo(() => {
    return sortCausasByIppAndYear(causas);
  }, [causas]);

  // Selected causa object
  const selectedCausa = useMemo(() => {
    return sortedCausas.find(c => String(c.id) === String(selectedCausaId)) || null;
  }, [sortedCausas, selectedCausaId]);

  // Filtered causas based on search term
  const filteredCausas = useMemo(() => {
    if (!searchTerm.trim()) return sortedCausas;
    const term = searchTerm.trim().toLowerCase();
    return sortedCausas.filter(c => {
      const ippText = (c.ipp || '').toLowerCase();
      const caratulaText = (c.caratula || '').toLowerCase();
      return ippText.includes(term) || caratulaText.includes(term);
    });
  }, [sortedCausas, searchTerm]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (causa) => {
    if (onSelectCausa) {
      onSelectCausa(causa ? causa.id : '');
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelectCausa) {
      onSelectCausa('');
    }
    setSearchTerm('');
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div 
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-950 border transition cursor-pointer ${
          isOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-4 w-4 text-blue-400 shrink-0" />
          
          <input
            type="text"
            value={isOpen ? searchTerm : (selectedCausa ? `${selectedCausa.ipp} - ${selectedCausa.caratula}` : searchTerm)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            placeholder={selectedCausa ? `${selectedCausa.ipp} - ${selectedCausa.caratula}` : placeholder}
            className="w-full bg-transparent text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none truncate"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(selectedCausa || searchTerm) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
              title="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
        </div>
      </div>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input 
          type="text" 
          tabIndex={-1}
          value={selectedCausaId} 
          onChange={() => {}}
          required 
          className="sr-only" 
        />
      )}

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl divide-y divide-slate-800/60 p-1">
          {filteredCausas.length > 0 ? (
            filteredCausas.map((c) => {
              const isSelected = String(c.id) === String(selectedCausaId);
              const p = parseIppParts(c.ipp);

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between text-xs gap-2 ${
                    isSelected 
                      ? 'bg-blue-600/20 text-white font-semibold border border-blue-500/40' 
                      : 'hover:bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[11px]">
                        {c.ipp}
                      </span>
                      {p.year > 0 && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Año {p.year}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">
                      {c.caratula || 'Sin carátula'}
                    </p>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 italic">
              No se encontraron causas que coincidan con la búsqueda
            </div>
          )}
        </div>
      )}
    </div>
  );
}
