import React, { useState, useMemo } from 'react';
import { Calendar, AlertTriangle, Clock, ChevronDown, ChevronUp, ShieldAlert, ArrowRight, ExternalLink, Filter } from 'lucide-react';
import { isFinalizedState, renderBadgePP, renderBadgeEstado, renderBadgePericia, formatDisplayDate, checkPPStatusSpecial } from './CausasTable';

// Helper to calculate days remaining from DD/MM/YY, DD/MM/YYYY or GMT Date strings
export function getDaysRemaining(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'Sin fecha') return null;

  const formatted = formatDisplayDate(dateStr);
  const parts = formatted.trim().split('/');
  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 100) year += 2000;

  const targetDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function ExpirationPanel({ causas, onSelectCausa, activeFilter, onSelectFilter }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tabFilter, setTabFilter] = useState('15dias'); // '15dias' | '30dias' | 'vencidos' | 'todos'

  // Extract all expiration events from active causes
  const expirationEvents = useMemo(() => {
    const events = [];

    (causas || []).forEach(causa => {
      // Exclude finalized/archived causes
      if (isFinalizedState(causa.estado, causa.tramite)) return;

      // 1. PP Expiration (1º or 2º) - Solo si el imputado está detenido o con estado especial "Presentada"
      const isDetenido = causa.detenido === 'SI' || causa.detenido === 'SÍ';
      const rawPPVal = causa.estado_pp || causa.vencimiento_pp1 || causa.vencimiento_pp || '';
      const isPresentada = String(rawPPVal).trim().toLowerCase().includes('presentad');

      if (isDetenido || isPresentada) {
        const isProrrogada = causa.pp_prorrogada === true || causa.pp_prorrogada === 'SI';
        const vPP = isProrrogada
          ? (causa.vencimiento_pp2 || causa.vencimiento_pp1 || causa.vencimiento_pp)
          : (causa.vencimiento_pp1 || causa.vencimiento_pp);

        if (vPP && !checkPPStatusSpecial(vPP)) {
          const days = getDaysRemaining(vPP);
          if (days !== null) {
            events.push({
              id: `pp-${causa.id}`,
              causa,
              tipo: isProrrogada ? '2º Vencimiento PP (Prórroga)' : '1º Vencimiento PP',
              categoria: 'PP',
              fecha: vPP,
              days
            });
          }
        }
      }

      // 2. IPP Expiration
      const ippDate = causa.vencimiento_ipp ? String(causa.vencimiento_ipp).trim() : '';
      if (ippDate && !checkPPStatusSpecial(ippDate)) {
        const days = getDaysRemaining(ippDate);
        if (days !== null) {
          events.push({
            id: `ipp-${causa.id}`,
            causa,
            tipo: 'Vencimiento IPP',
            categoria: 'IPP',
            fecha: ippDate,
            days
          });
        }
      }

      // 3. Pericias Expirations
      const periciasList = Array.isArray(causa.pericias) ? causa.pericias : [];
      if (periciasList.length === 0 && causa.pericia_fecha) {
        periciasList.push({ tipo: causa.pericia_detalle || 'Pericia', fecha: causa.pericia_fecha });
      }

      periciasList.forEach((p, idx) => {
        // Exclude finalized/cumplidas pericias from alert panel
        if (p.finalizada === true || p.estado === 'finalizada' || p.estado === 'cumplida') return;

        if (p.fecha) {
          const subDates = String(p.fecha).split(/[,;]/).map(d => d.trim()).filter(Boolean);
          subDates.forEach((subDate, dIdx) => {
            const days = getDaysRemaining(subDate);
            if (days !== null) {
              events.push({
                id: `pericia-${causa.id}-${idx}-${dIdx}`,
                causa,
                tipo: `Pericia: ${p.tipo || 'Procesal'}`,
                categoria: 'Pericia',
                fecha: subDate,
                days
              });
            }
          });
        }
      });
    });

    // Sort events chronologically by days remaining (urgent first)
    return events.sort((a, b) => a.days - b.days);
  }, [causas]);

  // Counts
  const vencidosCount = useMemo(() => expirationEvents.filter(e => e.days < 0).length, [expirationEvents]);
  const proximo15Count = useMemo(() => expirationEvents.filter(e => e.days >= 0 && e.days <= 15).length, [expirationEvents]);
  const proximo30Count = useMemo(() => expirationEvents.filter(e => e.days >= 0 && e.days <= 30).length, [expirationEvents]);

  // Filtered list according to tab selected
  const displayedEvents = useMemo(() => {
    if (tabFilter === '15dias') {
      return expirationEvents.filter(e => e.days >= 0 && e.days <= 15);
    }
    if (tabFilter === '30dias') {
      return expirationEvents.filter(e => e.days >= 0 && e.days <= 30);
    }
    if (tabFilter === 'vencidos') {
      return expirationEvents.filter(e => e.days < 0);
    }
    return expirationEvents;
  }, [expirationEvents, tabFilter]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden bg-slate-900/80 transition-all">
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-5 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Panel de Control de Vencimientos Procesales
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                MPBA
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Alertas de plazos inminentes para Prisión Preventiva, IPP y Pericias fijadas
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          <span>{isExpanded ? 'Ocultar Panel' : 'Ver Panel'}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Main KPI Badges (Always Visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/60">
        
        {/* 15 Days KPI Card */}
        <button
          onClick={() => {
            setTabFilter('15dias');
            setIsExpanded(true);
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            tabFilter === '15dias'
              ? 'bg-rose-950/50 border-rose-500/80 ring-1 ring-rose-500/40 shadow-lg shadow-rose-500/10'
              : 'bg-slate-900/90 border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Próximos 15 Días
            </span>
            <span className="block text-2xl font-black text-white">
              {proximo15Count} <span className="text-xs font-normal text-rose-300/80">vencimientos</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-sm border border-rose-500/40 glow-urgent">
            ≤15d
          </div>
        </button>

        {/* 30 Days KPI Card */}
        <button
          onClick={() => {
            setTabFilter('30dias');
            setIsExpanded(true);
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            tabFilter === '30dias'
              ? 'bg-amber-950/50 border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Próximos 30 Días
            </span>
            <span className="block text-2xl font-black text-white">
              {proximo30Count} <span className="text-xs font-normal text-amber-300/80">vencimientos</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm border border-amber-500/40">
            ≤30d
          </div>
        </button>

        {/* Overdue / Vencidos KPI Card */}
        <button
          onClick={() => {
            setTabFilter('vencidos');
            setIsExpanded(true);
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            tabFilter === 'vencidos'
              ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500/50'
              : 'bg-slate-900/90 border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Vencidos / Cumplidos
            </span>
            <span className="block text-2xl font-black text-red-400">
              {vencidosCount} <span className="text-xs font-normal text-slate-400">pendientes</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center font-bold text-sm border border-red-500/40">
            !
          </div>
        </button>

      </div>

      {/* Expandable Expirations List */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-slate-950/20">
          
          {/* Internal Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold mr-1">Filtrar vista:</span>
              
              <button
                onClick={() => setTabFilter('15dias')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  tabFilter === '15dias'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Próximos 15 Días ({proximo15Count})
              </button>

              <button
                onClick={() => setTabFilter('30dias')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  tabFilter === '30dias'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Próximos 30 Días ({proximo30Count})
              </button>

              <button
                onClick={() => setTabFilter('vencidos')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  tabFilter === 'vencidos'
                    ? 'bg-red-700 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Vencidos ({vencidosCount})
              </button>

              <button
                onClick={() => setTabFilter('todos')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  tabFilter === 'todos'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todos ({expirationEvents.length})
              </button>
            </div>

            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Haga clic en cualquier fila para ingresar al expediente
            </span>
          </div>

          {/* Events List Table */}
          {displayedEvents.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayedEvents.map((evt) => {
                const isOverdue = evt.days < 0;
                const isUrgent15 = evt.days >= 0 && evt.days <= 15;

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectCausa(evt.causa)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                      isOverdue
                        ? 'bg-red-950/40 border-red-500/50 hover:bg-red-900/50'
                        : isUrgent15
                        ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-900/40'
                        : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Days Badge */}
                      <div className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs shrink-0 ${
                        isOverdue
                          ? 'bg-red-600 text-white shadow-lg'
                          : isUrgent15
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 glow-urgent'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isOverdue
                          ? `Vencida (${Math.abs(evt.days)}d ago)`
                          : evt.days === 0
                          ? '¡VENCE HOY!'
                          : `Faltan ${evt.days}d`}
                      </div>

                      {/* IPP & Carátula */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400 group-hover:text-blue-300">
                            {evt.causa.ipp}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {evt.tipo}
                          </span>
                          {evt.causa.detenido === 'SI' && (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                              DETENIDO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                          {evt.causa.caratula}
                        </p>
                      </div>
                    </div>

                    {/* Date & Open Icon */}
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <div className="text-right font-mono">
                        <span className="block font-bold text-slate-200">{formatDisplayDate(evt.fecha) || evt.fecha}</span>
                        <span className="block text-[10px] text-slate-400">{evt.causa.fuera_ufi || 'En Fiscalía'}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition" />
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              No hay vencimientos registrados en esta categoría.
            </div>
          )}

        </div>
      )}

    </div>
  );
}
