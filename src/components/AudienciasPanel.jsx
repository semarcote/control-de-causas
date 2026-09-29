import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Video,
  FileText,
  Search,
  Ban
} from 'lucide-react';
import { formatDisplayDate, parseAnyDate } from './CausasTable';
import CausaSearchSelect from './CausaSearchSelect';

export default function AudienciasPanel({ causas, onSelectCausa, onSaveCausa }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [tabFilter, setTabFilter] = useState('programadas'); // 'programadas' | 'hoy' | 'semana' | 'todas'
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCausaId, setSelectedCausaId] = useState('');

  // Disabled / Feriados dates state (stored as YYYY-MM-DD array in localStorage)
  const [disabledDates, setDisabledDates] = useState(() => {
    try {
      const saved = localStorage.getItem('control_causas_disabled_dates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('control_causas_disabled_dates', JSON.stringify(disabledDates));
    } catch (e) {
      console.error('Error saving disabled dates:', e);
    }
  }, [disabledDates]);

  // Helper to get YYYY-MM-DD key from Date object or date string
  const getDateKey = (dateInput) => {
    if (!dateInput) return '';
    let d = null;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string') {
      d = parseAnyDate(dateInput);
    }
    if (!d || isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isDateDisabled = (dateInput) => {
    const key = getDateKey(dateInput);
    return key ? disabledDates.includes(key) : false;
  };

  const toggleDisableDate = (dateInput) => {
    const key = getDateKey(dateInput);
    if (!key) return;
    setDisabledDates(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // New Audiencia Form State
  const [newAudiencia, setNewAudiencia] = useState({
    tipo: 'Declaración Art. 308',
    fecha: formatDisplayDate(new Date()),
    hora: '10:00',
    lugar: 'Sede UFI',
    modalidad: 'Presencial',
    estado: 'Programada',
    observaciones: ''
  });

  // Extract all audiencias from all active causes
  const allAudiencias = useMemo(() => {
    const list = [];
    (causas || []).forEach(causa => {
      const auds = Array.isArray(causa.audiencias) ? causa.audiencias : [];
      auds.forEach((aud, idx) => {
        list.push({
          ...aud,
          id: aud.id || `aud-${causa.id}-${idx}`,
          causaId: causa.id,
          causa,
          parsedDate: parseAnyDate(aud.fecha)
        });
      });
    });

    // Sort chronologically
    return list.sort((a, b) => {
      if (!a.parsedDate) return 1;
      if (!b.parsedDate) return -1;
      return a.parsedDate - b.parsedDate;
    });
  }, [causas]);

  // Calendar Grid Days Calculation
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as 0 (Argentine calendar layout)
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const totalDays = lastDayOfMonth.getDate();

    const days = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true
      });
    }

    // Next month padding to complete grid
    const remainingCells = (42 - days.length) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      days.push({
        date: new Date(year, month + 1, n),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentMonth]);

  // Map audiencias by YYYY-MM-DD key for calendar lookup
  const audienciasByDateMap = useMemo(() => {
    const map = {};
    allAudiencias.forEach(aud => {
      if (aud.parsedDate) {
        const key = `${aud.parsedDate.getFullYear()}-${String(aud.parsedDate.getMonth() + 1).padStart(2, '0')}-${String(aud.parsedDate.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        map[key].push(aud);
      }
    });
    return map;
  }, [allAudiencias]);

  // Filter displayed audiencias for agenda list
  const filteredAudiencias = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allAudiencias.filter(aud => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const causaText = `${aud.causa.ipp} ${aud.causa.caratula} ${aud.tipo} ${aud.lugar} ${aud.observaciones}`.toLowerCase();
        if (!causaText.includes(term)) return false;
      }

      // Selected calendar day filter
      if (selectedDate && aud.parsedDate) {
        const sYear = selectedDate.getFullYear();
        const sMonth = selectedDate.getMonth();
        const sDay = selectedDate.getDate();

        const aYear = aud.parsedDate.getFullYear();
        const aMonth = aud.parsedDate.getMonth();
        const aDay = aud.parsedDate.getDate();

        if (sYear !== aYear || sMonth !== aMonth || sDay !== aDay) {
          return false;
        }
      }

      // Tab filter
      if (tabFilter === 'programadas') {
        return aud.estado !== 'Realizada' && aud.estado !== 'Suspendida';
      }
      if (tabFilter === 'hoy') {
        if (!aud.parsedDate) return false;
        return (
          aud.parsedDate.getFullYear() === today.getFullYear() &&
          aud.parsedDate.getMonth() === today.getMonth() &&
          aud.parsedDate.getDate() === today.getDate()
        );
      }
      if (tabFilter === 'semana') {
        if (!aud.parsedDate) return false;
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return aud.parsedDate >= today && aud.parsedDate <= nextWeek;
      }

      return true;
    });
  }, [allAudiencias, tabFilter, searchTerm, selectedDate]);

  // Handlers for month navigation
  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const todayMonth = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleOpenAddModal = () => {
    const formattedSelected = selectedDate ? formatDisplayDate(selectedDate) : '';
    setNewAudiencia(prev => ({
      ...prev,
      fecha: formattedSelected || formatDisplayDate(new Date())
    }));
    setShowAddModal(true);
  };

  // Handle adding new audiencia
  const handleCreateAudiencia = (e) => {
    e.preventDefault();
    if (!selectedCausaId) {
      alert('Por favor seleccione un expediente I.P.P.');
      return;
    }

    if (isDateDisabled(newAudiencia.fecha)) {
      alert(`NO ES POSIBLE AGENDAR AUDIENCIA:\n\nEl día ${newAudiencia.fecha} está marcado como INHABILITADO / FERIADO. Por favor seleccione otra fecha.`);
      return;
    }

    const targetCausa = causas.find(c => String(c.id) === String(selectedCausaId));
    if (!targetCausa) return;

    const updatedAudiencias = Array.isArray(targetCausa.audiencias) ? [...targetCausa.audiencias] : [];
    const newEntry = {
      id: `aud-${Date.now()}`,
      ...newAudiencia
    };
    updatedAudiencias.push(newEntry);

    onSaveCausa({
      ...targetCausa,
      audiencias: updatedAudiencias
    });

    setShowAddModal(false);
    setNewAudiencia({
      tipo: 'Declaración Art. 308',
      fecha: formatDisplayDate(new Date()),
      hora: '10:00',
      lugar: 'Sede UFI',
      modalidad: 'Presencial',
      estado: 'Programada',
      observaciones: ''
    });
  };

  // Helper badge color for state
  const renderEstadoBadge = (estado) => {
    if (estado === 'Realizada') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Realizada
        </span>
      );
    }
    if (estado === 'Suspendida') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
          <XCircle className="h-3 w-3 text-rose-400" />
          Suspendida
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
        <Clock className="h-3 w-3 text-amber-400" />
        Programada
      </span>
    );
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Calendario de Audiencias Procesales
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Control y agenda unificada de citaciones, testimoniales y vistas fijadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition ring-1 ring-blue-400"
            >
              <Plus className="h-4 w-4" />
              <span>Agendar Audiencia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar (Left) & Agenda List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Interactive Calendar */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
          
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={todayMonth}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Header (Days of week) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
              <span key={d} className={`text-[11px] font-bold uppercase tracking-wider ${i >= 5 ? 'text-rose-400/80' : 'text-slate-400'}`}>
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarGrid.map((cell, idx) => {
              const cellDate = cell.date;
              const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
              const dayAudiencias = audienciasByDateMap[dateKey] || [];
              const isDisabled = disabledDates.includes(dateKey);

              const today = new Date();
              const isToday = (
                cellDate.getFullYear() === today.getFullYear() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getDate() === today.getDate()
              );

              const isSelected = selectedDate && (
                cellDate.getFullYear() === selectedDate.getFullYear() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getDate() === selectedDate.getDate()
              );

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(isSelected ? null : cellDate)}
                  className={`min-h-[68px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                    isDisabled
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
                      : !cell.isCurrentMonth
                      ? 'bg-slate-950/30 border-slate-900 text-slate-600 opacity-40'
                      : isSelected
                      ? 'bg-blue-900/40 border-blue-500 text-white shadow-lg ring-1 ring-blue-400'
                      : isToday
                      ? 'bg-blue-950/60 border-blue-600/60 text-white ring-1 ring-blue-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-bold px-1 rounded ${
                      isToday ? 'bg-blue-600 text-white font-extrabold' : ''
                    }`}>
                      {cellDate.getDate()}
                    </span>

                    <div className="flex items-center gap-1">
                      {isDisabled && (
                        <span className="px-1 py-0.2 rounded bg-rose-600/30 text-rose-300 font-mono text-[9px] font-bold border border-rose-500/40 flex items-center gap-0.5" title="Día inhabilitado / Feriado">
                          <Ban className="h-2.5 w-2.5 text-rose-400" />
                          Feriado
                        </span>
                      )}
                      {dayAudiencias.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/40">
                          {dayAudiencias.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Mini Badges */}
                  <div className="space-y-0.5 mt-1 overflow-hidden max-h-8">
                    {dayAudiencias.slice(0, 2).map((aud) => (
                      <div
                        key={aud.id}
                        className="truncate text-[9px] font-semibold px-1 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50"
                      >
                        {aud.hora ? `${aud.hora} ` : ''}{aud.tipo}
                      </div>
                    ))}
                    {dayAudiencias.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-bold px-1">
                        +{dayAudiencias.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Filter & Toggle Banner */}
          {selectedDate && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-semibold">
                  Día seleccionado: <strong className="text-white font-mono">{formatDisplayDate(selectedDate)}</strong>
                </span>
                {isDateDisabled(selectedDate) ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 text-[11px] flex items-center gap-1">
                    <Ban className="h-3.5 w-3.5 text-rose-400" />
                    Inhabilitado / Feriado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Habilitado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleDisableDate(selectedDate)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isDateDisabled(selectedDate)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-md'
                  }`}
                >
                  {isDateDisabled(selectedDate) ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Habilitar Día
                    </>
                  ) : (
                    <>
                      <Ban className="h-3.5 w-3.5" />
                      Anular Día (Feriado / Inhabilitado)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-slate-400 hover:text-white underline font-bold px-2 py-1"
                >
                  Ver todos los días
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right 5 Columns: Agenda List & Filters */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          
          <div>
            {/* Filter Tabs & Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Agenda de Audiencias
                </h3>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {filteredAudiencias.length} registros
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por I.P.P., carátula o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setTabFilter('programadas')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    tabFilter === 'programadas'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setTabFilter('hoy')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    tabFilter === 'hoy'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setTabFilter('semana')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    tabFilter === 'semana'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Esta Semana
                </button>
                <button
                  onClick={() => setTabFilter('todas')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    tabFilter === 'todas'
                      ? 'bg-slate-700 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>

            {/* Audiencias Items List */}
            <div className="mt-4 space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredAudiencias.length > 0 ? (
                filteredAudiencias.map((aud) => (
                  <div
                    key={aud.id}
                    onClick={() => onSelectCausa(aud.causa)}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700 transition cursor-pointer group space-y-2"
                  >
                    {/* Item Header: Date & Status */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {formatDisplayDate(aud.fecha)}
                        </span>
                        {aud.hora && (
                          <span className="font-mono font-semibold text-slate-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {aud.hora} hs
                          </span>
                        )}
                      </div>

                      {renderEstadoBadge(aud.estado)}
                    </div>

                    {/* Type & I.P.P. */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                          {aud.tipo}
                        </h4>
                        <span className="font-mono text-[11px] font-bold text-blue-400">
                          {aud.causa.ipp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {aud.causa.caratula}
                      </p>
                    </div>

                    {/* Location & Details */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        {aud.lugar || 'Sede UFI'} ({aud.modalidad || 'Presencial'})
                      </span>
                      {aud.observaciones && (
                        <span className="truncate max-w-[150px] italic text-slate-500">
                          {aud.observaciones}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
                  <CalendarIcon className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">
                    No se registraron audiencias para este filtro
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Add New Audiencia Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-400" />
                Agendar Nueva Audiencia
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAudiencia} className="space-y-3.5 text-xs">
              
              {/* Select Causa */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Seleccionar Expediente / I.P.P. *
                </label>
                <CausaSearchSelect
                  causas={causas}
                  selectedCausaId={selectedCausaId}
                  onSelectCausa={(id) => setSelectedCausaId(id)}
                  required
                />
              </div>

              {/* Tipo & Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tipo de Audiencia *
                  </label>
                  <select
                    value={newAudiencia.tipo}
                    onChange={(e) => setNewAudiencia(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Declaración Art. 308">Declaración Art. 308</option>
                    <option value="Prisión Preventiva">Prisión Preventiva</option>
                    <option value="Testimonial">Testimonial</option>
                    <option value="Audiencia Preliminar">Audiencia Preliminar</option>
                    <option value="Conciliación / Salida Alt.">Conciliación / Salida Alt.</option>
                    <option value="Pericial / Reconocimiento">Pericial / Reconocimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Fecha (dd/mm/aa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAudiencia.fecha}
                    onChange={(e) => setNewAudiencia(prev => ({ ...prev, fecha: e.target.value }))}
                    className={`w-full rounded-xl bg-slate-950 border p-2.5 text-white font-mono focus:outline-none ${
                      isDateDisabled(newAudiencia.fecha)
                        ? 'border-rose-500/80 bg-rose-950/20 text-rose-200 focus:border-rose-500'
                        : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Warning if selected date is disabled */}
              {isDateDisabled(newAudiencia.fecha) && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <Ban className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>
                    El día <strong className="font-mono text-white">{newAudiencia.fecha}</strong> está marcado como <strong>INHABILITADO / FERIADO</strong>. No se pueden fijar audiencias en esta fecha.
                  </span>
                </div>
              )}

              {/* Hora & Lugar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Hora (ej. 10:30)
                  </label>
                  <input
                    type="text"
                    value={newAudiencia.hora}
                    onChange={(e) => setNewAudiencia(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Lugar / Dependencia
                  </label>
                  <input
                    type="text"
                    value={newAudiencia.lugar}
                    onChange={(e) => setNewAudiencia(prev => ({ ...prev, lugar: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observaciones / Notas
                </label>
                <textarea
                  rows={2}
                  value={newAudiencia.observaciones}
                  onChange={(e) => setNewAudiencia(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="ej. Asiste Defensor Oficial, citar testigo con auxilio policial..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDateDisabled(newAudiencia.fecha)}
                  className={`px-4 py-2 rounded-xl font-bold transition ${
                    isDateDisabled(newAudiencia.fecha)
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  }`}
                >
                  Guardar y Cerrar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
