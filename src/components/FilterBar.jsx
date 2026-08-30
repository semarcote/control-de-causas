import React from 'react';
import { Search, Filter, ArrowUpDown, X, FileText, MapPin } from 'lucide-react';
import { INICIO_OPTIONS } from './CausasTable';

export default function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sumarioFilter = 'todos',
  onSumarioFilterChange,
  inicioFilter = 'todos',
  onInicioFilterChange,
  sortBy,
  onSortByChange,
  totalResults,
  onClearFilters
}) {
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'todos' || sumarioFilter !== 'todos' || (inicioFilter && inicioFilter !== 'todos');

  const statusChips = [
    { id: 'en trámite', label: 'En Trámite' },
    { id: 'paradero', label: 'Paradero' },
    { id: 'captura', label: 'Captura' },
    { id: 'archivada', label: 'Archivadas' },
    { id: 'desestimada', label: 'Desestimadas' },
    { id: 'elevada a juicio', label: 'Elevadas a Juicio' },
    { id: 'sobreseimiento', label: 'Sobreseimientos' },
    { id: 'incompetencia', label: 'Incompetencia' },
    { id: 'remisión a otra ufi', label: 'Remisión UFI' },
    { id: 'todos', label: 'Todas' }
  ];

  return (
    <div className="glass-panel flex flex-col gap-3 rounded-xl p-4 border border-slate-800">
      
      {/* Top row: Search input & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
            placeholder="Buscar por I.P.P., carátula, trámite o delito..."
            className="w-full rounded-xl bg-slate-900/90 py-2.5 pl-10 pr-9 text-sm text-white placeholder-slate-400 border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition uppercase"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="rounded-xl bg-slate-900 py-2.5 px-3 text-xs font-medium text-slate-300 border border-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="ipp-asc">I.P.P. Ascendente (Año y Número)</option>
            <option value="ipp-desc">I.P.P. Descendente (Año y Número)</option>
            <option value="revisar-asc">Próximos a Revisar (Urgentes)</option>
            <option value="revisado-desc">Última Revisión (Reciente)</option>
          </select>
        </div>

      </div>

      {/* Bottom row: Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Estado:
          </span>

          {statusChips.map((chip) => {
            const active = statusFilter.toLowerCase() === chip.id.toLowerCase();
            return (
              <button
                key={chip.id}
                onClick={() => onStatusFilterChange(chip.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                }`}
              >
                {chip.label}
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Sumario Check Chips */}
          <button
            onClick={() => onSumarioFilterChange && onSumarioFilterChange(sumarioFilter === 'con_sumario' ? 'todos' : 'con_sumario')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition border ${
              sumarioFilter === 'con_sumario'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30 font-bold'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Solo Sumarios</span>
          </button>

          <button
            onClick={() => onSumarioFilterChange && onSumarioFilterChange(sumarioFilter === 'sin_sumario' ? 'todos' : 'sin_sumario')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition border ${
              sumarioFilter === 'sin_sumario'
                ? 'bg-slate-700 text-white border-slate-500 shadow-sm ring-1 ring-slate-400/30 font-bold'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Sin Sumario</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Filtro por Denuncia / Lugar de Inicio */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-blue-400" /> Denuncia:
            </span>
            <select
              value={inicioFilter || 'todos'}
              onChange={(e) => onInicioFilterChange && onInicioFilterChange(e.target.value)}
              className={`rounded-lg py-1 px-2.5 text-xs font-semibold border transition cursor-pointer focus:outline-none ${
                inicioFilter && inicioFilter !== 'todos'
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm ring-1 ring-blue-500/30 font-bold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/50 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <option value="todos" className="bg-slate-900 text-slate-300 font-normal">Todas las Dependencias</option>
              {INICIO_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200 font-medium">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results counter & Clear */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Mostrando <strong className="text-slate-200">{totalResults}</strong> causas
          </span>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2 transition"
            >
              Limpiar filtros
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
