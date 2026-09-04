import React from 'react';
import { Activity } from 'lucide-react';

export default function StatsOverview({ causas, selectedFilter, onSelectFilter }) {
  // Count en tramite (causes active in instruction)
  const enTramiteCount = (causas || []).filter(c => {
    const st = (c.estado || '').toLowerCase();
    const tr = (c.tramite || '').toLowerCase();
    return st === 'en trámite' || st === 'en tramite' || st === 'esperar' || st === 'revisar' || (!st.includes('archiv') && !tr.includes('archivo') && !st.includes('elevad') && !st.includes('desestim') && !st.includes('sobrese') && !st.includes('incompet') && !st.includes('remis'));
  }).length;

  const isSelected = (selectedFilter || '').toLowerCase() === 'en trámite';

  return (
    <div className="flex items-center">
      <button
        onClick={() => onSelectFilter && onSelectFilter('en trámite')}
        className={`glass-panel inline-flex items-center gap-3 rounded-xl px-4 py-2 text-left transition-all border ${
          isSelected
            ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Activity className="h-4 w-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Causas En Trámite:
          </span>
          <span className="text-xl font-bold tracking-tight text-white">
            {enTramiteCount}
          </span>
        </div>
      </button>
    </div>
  );
}
