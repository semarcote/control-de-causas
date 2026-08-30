import React, { useState } from 'react';
import { X, Clock, FileText, Calendar, Edit3, Plus, Shield, MapPin, Gavel, CheckCircle2, AlertTriangle, Send, RotateCcw, Trash2, Unlock, UserCheck } from 'lucide-react';
import { renderBadgeEstado, isFinalizedState, isAbusoSexual, renderBadgePericia, renderMultiplePericiasBadges, renderBadgePP, calculatePP2Date, checkPPStatusSpecial, isDateInPast, calculatePPDatesFromDetencion, calculateFlagranciaIPPDates, formatDateMask, extractAndFormatDateFromActuacion, isDateInFuture, isValidDateString, INICIO_OPTIONS, formatDisplayDate } from './CausasTable';

export default function CausaModal({ causa, onClose, onSave }) {
  if (!causa) return null;

  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'edit' | 'add'
  const [formData, setFormData] = useState({ ...causa });
  const [newActuacion, setNewActuacion] = useState('');
  const [newPlazoDias, setNewPlazoDias] = useState(causa.revisar_dias || '30');
  const [nuevoEstado, setNuevoEstado] = useState(() => {
    const st = (causa.estado || '').trim().toLowerCase();
    if (!st || st === 'esperar' || st === 'revisar' || st === 'en trámite' || st === 'en tramite' || !isFinalizedState(causa.estado, causa.tramite)) {
      return 'En Trámite';
    }
    return causa.estado;
  });
  const [detenidoState, setDetenidoState] = useState(causa.detenido || 'NO');
  const [flagranciaState, setFlagranciaState] = useState(causa.flagrancia || 'NO');
  const [fechaFlagranciaState, setFechaFlagranciaState] = useState(causa.fecha_flagrancia || '');
  const [flagranciaProrrogadaState, setFlagranciaProrrogadaState] = useState(causa.flagrancia_prorrogada === true || causa.flagrancia_prorrogada === 'SI');
  const [fechaDetencionState, setFechaDetencionState] = useState(causa.fecha_detencion || '');
  const [vencPP1State, setVencPP1State] = useState(causa.vencimiento_pp1 || causa.vencimiento_pp || causa.estado_pp || '');
  const [ppProrrogadaState, setPpProrrogadaState] = useState(causa.pp_prorrogada === true || causa.pp_prorrogada === 'SI');
  const [vencIPPState, setVencIPPState] = useState(causa.vencimiento_ipp || '');
  const [changeEstadoNote, setChangeEstadoNote] = useState('');
  const [customInicio, setCustomInicio] = useState(
    causa.denunciado_en && !INICIO_OPTIONS.includes(causa.denunciado_en) ? causa.denunciado_en : ''
  );
  const [editingActuacionIndex, setEditingActuacionIndex] = useState(null);
  const [editingActuacionText, setEditingActuacionText] = useState('');

  // Multiple Pericias State
  const [periciasState, setPericiasState] = useState(
    Array.isArray(causa.pericias) && causa.pericias.length > 0
      ? [...causa.pericias]
      : (causa.pericia_fecha || causa.pericia_detalle ? [{ id: 'p-1', tipo: causa.pericia_detalle || 'Pericia', fecha: causa.pericia_fecha || '' }] : [])
  );
  const [newPericiaTipo, setNewPericiaTipo] = useState('');
  const [newPericiaFecha, setNewPericiaFecha] = useState('');
  const [editingPericiaId, setEditingPericiaId] = useState(null);
  const [editingPericiaTipo, setEditingPericiaTipo] = useState('');
  const [editingPericiaFecha, setEditingPericiaFecha] = useState('');

  // Parse timeline items from `tramite` string using /// as delimiter
  const rawTimeline = causa.tramite
    ? causa.tramite.split('///').map(item => item.trim()).filter(Boolean)
    : [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddPericiaItem = (e) => {
    e.preventDefault();
    if (!newPericiaTipo.trim() && !newPericiaFecha.trim()) return;

    const tipoText = newPericiaTipo.trim() || 'Pericia Procesal';
    const fechaText = newPericiaFecha.trim() || 'Sin fecha';

    const newItem = {
      id: `p-${Date.now()}`,
      tipo: tipoText,
      fecha: fechaText
    };

    const updatedPericias = [...periciasState, newItem];
    setPericiasState(updatedPericias);

    // Auto-generate movement timeline entry
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const periciaEntry = `${todayStr} Registro de Pericia procesal: ${tipoText} (Fecha fijada: ${fechaText})`;

    const updatedTramite = causa.tramite
      ? `${causa.tramite} /// ${periciaEntry}`
      : periciaEntry;

    const updatedCausa = {
      ...formData,
      tramite: updatedTramite,
      pericias: updatedPericias,
      revisado: todayStr,
      revisar_dias: newPlazoDias
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);

    setNewPericiaTipo('');
    setNewPericiaFecha('');
  };

  const handleToggleFinalizarPericia = (idToToggle) => {
    let periciaName = '';
    let isNowDone = false;

    const updatedPericias = periciasState.map(p => {
      if (p.id === idToToggle) {
        isNowDone = !p.finalizada;
        periciaName = `${p.tipo} (${p.fecha})`;
        return { ...p, finalizada: isNowDone };
      }
      return p;
    });

    setPericiasState(updatedPericias);

    // Generate timeline entry
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timelineEntry = `${todayStr} Pericia ${isNowDone ? 'cumplida / finalizada' : 'reabierta / pendiente'}: ${periciaName}`;

    const updatedTramite = causa.tramite
      ? `${causa.tramite} /// ${timelineEntry}`
      : timelineEntry;

    const updatedCausa = {
      ...formData,
      tramite: updatedTramite,
      pericias: updatedPericias,
      revisado: todayStr,
      revisar_dias: newPlazoDias
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);
  };

  const handleRemovePericiaItem = (idToRemove) => {
    setPericiasState(prev => prev.filter(p => p.id !== idToRemove));
  };

  const handleStartEditPericia = (p) => {
    setEditingPericiaId(p.id);
    setEditingPericiaTipo(p.tipo || '');
    setEditingPericiaFecha(p.fecha || '');
  };

  const handleSaveEditPericia = (idToEdit) => {
    const updatedPericias = periciasState.map(p => {
      if (p.id === idToEdit) {
        return {
          ...p,
          tipo: editingPericiaTipo.trim() || 'Pericia Procesal',
          fecha: editingPericiaFecha.trim()
        };
      }
      return p;
    });

    setPericiasState(updatedPericias);

    const updatedCausa = {
      ...formData,
      pericias: updatedPericias
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);

    setEditingPericiaId(null);
    setEditingPericiaTipo('');
    setEditingPericiaFecha('');
  };

  const handleCancelEditPericia = () => {
    setEditingPericiaId(null);
    setEditingPericiaTipo('');
    setEditingPericiaFecha('');
  };

  const handleDeleteActuacion = (indexToDelete) => {
    if (!confirm('¿Está seguro de que desea eliminar esta actuación de la línea de tiempo?')) return;

    const updatedEntries = rawTimeline.filter((_, idx) => idx !== indexToDelete);
    const updatedTramite = updatedEntries.join(' /// ');

    const newLatestItem = updatedEntries.length > 0 ? updatedEntries[updatedEntries.length - 1] : '';
    const newLatestDate = extractAndFormatDateFromActuacion(newLatestItem);

    const updatedCausa = {
      ...formData,
      tramite: updatedTramite,
      ...(newLatestDate ? { revisado: newLatestDate } : {})
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);
  };

  const handleSaveEditActuacion = (originalIndex) => {
    if (!editingActuacionText.trim()) return;
    const updatedEntries = [...rawTimeline];
    updatedEntries[originalIndex] = editingActuacionText.trim();
    const updatedTramite = updatedEntries.join(' /// ');

    const newLatestItem = updatedEntries.length > 0 ? updatedEntries[updatedEntries.length - 1] : '';
    const newLatestDate = extractAndFormatDateFromActuacion(newLatestItem);

    const updatedCausa = {
      ...formData,
      tramite: updatedTramite,
      ...(newLatestDate ? { revisado: newLatestDate } : {})
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);
    setEditingActuacionIndex(null);
    setEditingActuacionText('');
  };

  const handleCancelEditActuacion = () => {
    setEditingActuacionIndex(null);
    setEditingActuacionText('');
  };

  const handleAddActuacion = (e) => {
    e.preventDefault();
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    let updatedTramite = causa.tramite || '';
    if (newActuacion.trim()) {
      const formattedEntry = `${todayStr} ${newActuacion.trim()}`;
      updatedTramite = updatedTramite ? `${updatedTramite} /// ${formattedEntry}` : formattedEntry;
    }

    const updatedCausa = {
      ...formData,
      tramite: updatedTramite,
      pericias: periciasState,
      revisado: todayStr,
      revisar_dias: newPlazoDias
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);
    setNewActuacion('');
    setActiveTab('timeline');
  };

  const handleModificarDatos = (e) => {
    e.preventDefault();
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    
    const specialStatus = checkPPStatusSpecial(vencPP1State);

    // Validate Fecha de Detención (cannot be future or invalid)
    if (detenidoState === 'SI' && fechaDetencionState) {
      if (isDateInFuture(fechaDetencionState)) {
        alert(`La fecha de detención ingresada (${fechaDetencionState}) es errónea: No puede ser una fecha futura posterior al día de hoy.`);
        return;
      }
      const parts = fechaDetencionState.split('/');
      if (parts.length === 3 && parts[2].trim().length >= 2 && !isValidDateString(fechaDetencionState)) {
        alert(`La fecha de detención ingresada (${fechaDetencionState}) es errónea o inválida.`);
        return;
      }
    }

    // Validate that PP date is NOT in the past
    if (!specialStatus && vencPP1State && isDateInPast(vencPP1State)) {
      alert(`La fecha de vencimiento de la Prisión Preventiva (${vencPP1State}) no puede ser anterior a la fecha de hoy (${todayStr}). Por favor ingrese una fecha futura o seleccione una opción de estado (Presentada / Excarcelado / Libertad).`);
      return;
    }

    const calculatedPP2 = (vencPP1State && !specialStatus) ? calculatePP2Date(vencPP1State) : '';

    const changes = [];
    if (nuevoEstado !== causa.estado) changes.push(`Estado: ${nuevoEstado}`);
    if (detenidoState !== (causa.detenido || 'NO')) changes.push(`Detenido: ${detenidoState}`);
    if (flagranciaState !== (causa.flagrancia || 'NO')) changes.push(`Flagrancia: ${flagranciaState}`);
    if (vencPP1State !== (causa.vencimiento_pp1 || causa.vencimiento_pp || '')) {
      changes.push(`Situación PP: ${vencPP1State || 'Sin fecha'}`);
    }
    if (!specialStatus && ppProrrogadaState !== (causa.pp_prorrogada === true || causa.pp_prorrogada === 'SI')) {
      changes.push(ppProrrogadaState ? `Prorrogada PP: SÍ (2º Plazo: ${calculatedPP2})` : `Prorrogada PP: NO (1º Plazo)`);
    }
    if (vencIPPState !== (causa.vencimiento_ipp || '')) changes.push(`Venc. IPP: ${vencIPPState || 'Sin fecha'}`);
    if (changeEstadoNote.trim()) changes.push(`Obs: ${changeEstadoNote.trim()}`);

    const entryText = changes.length > 0
      ? `${todayStr} Modificación de expediente (${changes.join(' | ')})`
      : `${todayStr} Actualización de expediente`;

    const updatedTramite = causa.tramite
      ? `${causa.tramite} /// ${entryText}`
      : entryText;

    const finalDetenido = specialStatus === 'Presentada' ? 'SI' : (specialStatus === 'Excarcelado' || specialStatus === 'Libertad' ? 'NO' : detenidoState);
    const isDetenido = finalDetenido === 'SI';

    const normInicio = (formData.denunciado_en || '').trim().toLowerCase();
    const autoSumario = normInicio === 'mesa' || normInicio === 'mail' || normInicio === 'ciudadana';

    const isFlagrancia = flagranciaState === 'SI' || flagranciaState === 'SÍ';
    const flagranciaCalc = calculateFlagranciaIPPDates(fechaFlagranciaState);
    let finalVencIPP = vencIPPState;

    if (isFlagrancia && fechaFlagranciaState && !flagranciaCalc.error) {
      finalVencIPP = flagranciaProrrogadaState ? flagranciaCalc.ipp2 : flagranciaCalc.ipp1;
    }

    const updatedCausa = {
      ...formData,
      sumario: autoSumario ? (formData.sumario?.trim() || 'SÍ') : formData.sumario,
      estado: nuevoEstado,
      detenido: finalDetenido,
      flagrancia: flagranciaState,
      fecha_flagrancia: isFlagrancia ? fechaFlagranciaState : '',
      flagrancia_prorrogada: isFlagrancia ? flagranciaProrrogadaState : false,
      fecha_detencion: isDetenido ? fechaDetencionState : '',
      vencimiento_pp1: (isDetenido || specialStatus) ? vencPP1State : '',
      vencimiento_pp: (isDetenido || specialStatus) ? vencPP1State : '',
      vencimiento_pp2: (isDetenido && !specialStatus) ? calculatedPP2 : '',
      estado_pp: specialStatus || (isDetenido ? vencPP1State : ''),
      pp_prorrogada: isDetenido ? ppProrrogadaState : false,
      vencimiento_ipp: finalVencIPP,
      revisar_dias: newPlazoDias,
      revisado: todayStr,
      tramite: updatedTramite
    };

    setFormData(updatedCausa);
    onSave(updatedCausa);
    setChangeEstadoNote('');
    setActiveTab('timeline');
  };

  const handleReabrir = () => {
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const reopenEntry = `${todayStr} Reapertura de causa - Estado cambiado a En Trámite`;
    const updatedTramite = causa.tramite ? `${causa.tramite} /// ${reopenEntry}` : reopenEntry;
    const updated = {
      ...formData,
      estado: 'En Trámite',
      revisado: todayStr,
      revisar_dias: '30',
      tramite: updatedTramite
    };
    setFormData(updated);
    onSave(updated);
    setActiveTab('timeline');
  };

  const isFinal = isFinalizedState(causa.estado, causa.tramite);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel relative w-full max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-950/80 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-blue-400">
                I.P.P. {causa.ipp || 'S/N'}
              </span>
              {(causa.flagrancia === 'SI' || causa.flagrancia === 'SÍ') && (
                <span className="rounded bg-amber-500/25 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/50" title="Trámite de Flagrancia (FL)">
                  FL
                </span>
              )}
              {renderBadgeEstado(causa.estado, causa.tramite)}
              {isAbusoSexual(causa.caratula, causa.tramite) && !isFinal && (
                <span className="rounded bg-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/50 glow-urgent" title="Abuso Sexual (AS)">
                  AS
                </span>
              )}
              {causa.sumario?.trim() !== '' && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30" title="Causa con Sumario (S)">
                  S
                </span>
              )}
            </div>
            <h2 className="mt-1 text-sm font-semibold text-slate-200 line-clamp-2">
              {causa.caratula || 'Sin carátula especificada'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isFinal && (
              <button
                onClick={handleReabrir}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition"
              >
                <RotateCcw className="h-4 w-4" />
                Reabrir Causa
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-800 bg-slate-900/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            Línea de Tiempo ({rawTimeline.length})
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'add'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="h-4 w-4" />
            Agregar Movimiento
          </button>

          <button
            onClick={() => setActiveTab('pericias')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'pericias'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4 text-purple-400" />
            Pericias ({periciasState.length})
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'edit'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Modificar Estado Procesal
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          
          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              
              {/* Meta details banner */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 rounded-xl bg-slate-950/60 p-3.5 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Última Revisión</span>
                  <span className="font-mono text-slate-200 font-semibold">{formatDisplayDate(causa.revisado) || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Plazo de Revisión</span>
                  {isFinalizedState(causa.estado, causa.tramite) ? (
                    <span className="font-mono text-slate-500 text-[11px] italic">No requiere revisión</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={newPlazoDias}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPlazoDias(val);
                          const updatedCausa = {
                            ...formData,
                            revisar_dias: val
                          };
                          setFormData(updatedCausa);
                          onSave(updatedCausa);
                        }}
                        className="w-14 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300 border border-slate-700 focus:border-amber-400 focus:outline-none text-center shadow-inner"
                        title="Plazo de revisión en días (editable)"
                      />
                      <span className="text-slate-400 text-[11px]">días</span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">Detenido</span>
                  {causa.detenido === 'SI' || causa.detenido === 'SÍ' ? (
                    <span className="font-bold text-rose-400">SÍ DETENIDO</span>
                  ) : (
                    <span className="font-mono text-slate-400">NO</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Vencimiento PP</span>
                  {renderBadgePP(causa)}
                </div>
                <div>
                  <span className="text-slate-500 block">Vencimiento IPP</span>
                  <span className="font-mono text-amber-300 font-semibold">{formatDisplayDate(causa.vencimiento_ipp) || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Pericia Programada</span>
                  {renderBadgePericia(causa.pericia_fecha, causa.pericia_detalle)}
                </div>
              </div>

              {/* Chronological list (Reversed: Newest at top) */}
              {rawTimeline.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay trámites u oficios registrados en esta causa.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {rawTimeline.map((item, originalIndex) => ({ item, originalIndex })).reverse().map(({ item, originalIndex }) => {
                    const isLatest = originalIndex === rawTimeline.length - 1;
                    const isArchivo = item.toLowerCase().includes('archivo');
                    const isEditing = editingActuacionIndex === originalIndex;

                    return (
                      <div key={originalIndex} className="relative group">
                        {/* Timeline Bullet */}
                        <div className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-slate-900 ${
                          isLatest ? 'border-blue-500 text-blue-400' : isArchivo ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400'
                        }`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${isLatest ? 'bg-blue-400' : 'bg-slate-500'}`} />
                        </div>

                        {/* Content Card */}
                        <div className={`rounded-xl p-3.5 border transition ${
                          isLatest ? 'bg-blue-950/20 border-blue-500/30' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                            <span className="font-semibold text-blue-400">Actuación #{originalIndex + 1}</span>
                            <div className="flex items-center gap-1.5">
                              {isLatest && (
                                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20 mr-1">
                                  Más Reciente
                                </span>
                              )}
                              {!isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingActuacionIndex(originalIndex);
                                      setEditingActuacionText(item);
                                    }}
                                    title="Editar esta actuación"
                                    className="rounded p-1 text-slate-400 hover:bg-blue-500/20 hover:text-blue-300 transition flex items-center gap-1"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span className="text-[10px]">Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActuacion(originalIndex)}
                                    title="Eliminar esta actuación"
                                    className="rounded p-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditActuacion(originalIndex)}
                                    className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-500 transition flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditActuacion}
                                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition flex items-center gap-1"
                                  >
                                    <X className="h-3 w-3" />
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                rows={3}
                                value={editingActuacionText}
                                onChange={(e) => setEditingActuacionText(e.target.value.toUpperCase())}
                                className="w-full rounded-xl bg-slate-900 p-2.5 text-xs text-white border border-blue-500/50 focus:border-blue-400 focus:outline-none font-mono uppercase"
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                              {item}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: AGREGAR MOVIMIENTO */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddActuacion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Detalle del Nuevo Movimiento / Diligencia Procesal
                </label>
                <textarea
                  rows={4}
                  value={newActuacion}
                  onChange={(e) => setNewActuacion(e.target.value.toUpperCase())}
                  placeholder="Ej: Se agrega pericia de la VAIC /// Oficio notificado a la Defensoría..."
                  className="w-full rounded-xl bg-slate-950 p-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none uppercase"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Se agregará la fecha actual de forma automática al inicio del movimiento.
                </p>
              </div>

              {!isFinalizedState(causa.estado, causa.tramite) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nuevo Plazo de Revisión (Días)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={newPlazoDias}
                      onChange={(e) => setNewPlazoDias(e.target.value)}
                      placeholder="Días"
                      className="w-32 rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-1.5">
                      {['10', '15', '30', '60'].map(dias => (
                        <button
                          key={dias}
                          type="button"
                          onClick={() => setNewPlazoDias(dias)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                            newPlazoDias === dias
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {dias}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-blue-500 transition"
                >
                  <Send className="h-4 w-4" />
                  Guardar Movimiento
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PERICIAS PROCESALES (PESTAÑA APARTE) */}
          {activeTab === 'pericias' && (
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-950/80 p-5 border border-slate-800/90 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                      🔬 Pericias de la Causa ({periciasState.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gestiona las solicitudes de pericias, estados y alertas por calendario.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/20">
                    Panel de Pericias
                  </span>
                </div>

                {/* List of current pericias */}
                {periciasState.length > 0 ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {periciasState.map((p) => {
                      const isEditing = editingPericiaId === p.id;

                      if (isEditing) {
                        return (
                          <div key={p.id} className="rounded-xl bg-slate-900 p-3 border border-blue-500/50 space-y-2 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Tipo de Pericia</label>
                                <input
                                  type="text"
                                  value={editingPericiaTipo}
                                  onChange={(e) => setEditingPericiaTipo(e.target.value.toUpperCase())}
                                  className="w-full rounded-lg bg-slate-950 p-2 text-xs text-white border border-slate-700 focus:border-blue-400 focus:outline-none uppercase"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Fecha Programada / Vencimiento</label>
                                <input
                                  type="text"
                                  value={editingPericiaFecha}
                                  onChange={(e) => setEditingPericiaFecha(formatDateMask(e.target.value))}
                                  className="w-full rounded-lg bg-slate-950 p-2 text-xs text-white border border-slate-700 focus:border-blue-400 focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditPericia(p.id)}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditPericia}
                                className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`${p.id}-${p.finalizada ? 'done' : 'pending'}`} className="flex items-center justify-between rounded-xl bg-slate-900 p-3 border border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            {renderBadgePericia(p.fecha, p.tipo, p.finalizada)}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditPericia(p)}
                              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-blue-600/30 hover:text-blue-300 hover:border-blue-500/40 transition"
                              title="Editar tipo o fecha de esta pericia"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleFinalizarPericia(p.id)}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                                p.finalizada
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-emerald-600/30 hover:text-emerald-300'
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {p.finalizada ? 'Cumplida' : 'Marcar Cumplida'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemovePericiaItem(p.id)}
                              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                              title="Eliminar esta pericia"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-900/60 p-6 text-center border border-slate-800/60">
                    <p className="text-xs text-slate-400 italic">No hay pericias registradas aún en esta causa.</p>
                  </div>
                )}

                {/* Add new pericia sub-form */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <span className="block text-xs font-bold text-slate-200">
                    + Registrar Nueva Pericia / Alerta por Calendario:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo de Pericia</label>
                      <input
                        type="text"
                        placeholder="Ej. Balística, UFED / DAIC..."
                        value={newPericiaTipo}
                        onChange={(e) => setNewPericiaTipo(e.target.value.toUpperCase())}
                        className="w-full rounded-xl bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fecha Programada / Vencimiento</label>
                      <input
                        type="text"
                        placeholder="Ej. 15/09/26"
                        value={newPericiaFecha}
                        onChange={(e) => setNewPericiaFecha(formatDateMask(e.target.value))}
                        className="w-full rounded-xl bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick suggestion tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-medium">Sugeridos:</span>
                    {['Balística', 'Accidentológica', 'UFED / DAIC', 'CTA Menor', 'Psicológica', 'Psiquiátrica'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewPericiaTipo(tag)}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleAddPericiaItem}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600/30 px-4 py-2 text-xs font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40 transition shadow-md"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Pericia
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedCausa = { ...formData, pericias: periciasState };
                    setFormData(updatedCausa);
                    onSave(updatedCausa);
                    setActiveTab('timeline');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Guardar Pericias
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MODIFICAR ESTADO PROCESAL */}
          {activeTab === 'edit' && (() => {
            const stNorm = (nuevoEstado || '').trim().toLowerCase();
            const isEnTramite = stNorm === 'en trámite' || stNorm === 'en tramite' || stNorm === 'esperar' || stNorm === 'revisar';

            return (
              <form onSubmit={handleModificarDatos} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Estado Procesal <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="En Trámite">En Trámite</option>
                    <option value="Paradero">Paradero</option>
                    <option value="Captura">Captura</option>
                    <option value="Elevada a Juicio">Elevada a Juicio</option>
                    <option value="Archivada">Archivada</option>
                    <option value="Desestimada">Desestimada</option>
                    <option value="Sobreseimiento">Sobreseimiento</option>
                    <option value="Incompetencia">Incompetencia</option>
                    <option value="Remisión a Otra UFI">Remisión UFI</option>
                  </select>
                </div>

                {isEnTramite && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Plazo de Revisión (Días)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={newPlazoDias}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPlazoDias(val);
                          setFormData(prev => ({ ...prev, revisar_dias: val }));
                        }}
                        className="w-24 rounded-xl bg-slate-950 p-2.5 text-xs text-white font-mono font-bold border border-slate-800 focus:border-blue-500 focus:outline-none text-center"
                      />
                      <div className="flex gap-1">
                        {['5', '10', '15', '30', '60'].map(dias => (
                          <button
                            key={dias}
                            type="button"
                            onClick={() => {
                              setNewPlazoDias(dias);
                              setFormData(prev => ({ ...prev, revisar_dias: dias }));
                            }}
                            className={`rounded-lg px-2 py-1 text-[11px] font-medium border transition ${
                              newPlazoDias === dias
                                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {dias}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isEnTramite && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      ¿Tiene Imputado Detenido?
                    </label>
                    <select
                      value={detenidoState}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDetenidoState(val);
                        if (val === 'NO') {
                          setFechaDetencionState('');
                        }
                      }}
                      className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SI (DETENIDO / PRISIÓN PREVENTIVA)</option>
                    </select>
                  </div>
                )}

                {isEnTramite && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      ¿Tiene trámite de flagrancia?
                    </label>
                    <select
                      value={flagranciaState}
                      onChange={(e) => setFlagranciaState(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SÍ (FLAGRANCIA)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Seccion de Fecha de Flagrancia y Calculo IPP (Visibles si Flagrancia = SI) */}
              {isEnTramite && (flagranciaState === 'SI' || flagranciaState === 'SÍ') && (() => {
                const flagCalc = calculateFlagranciaIPPDates(fechaFlagranciaState);
                return (
                  <div className={`rounded-xl p-3.5 border space-y-2 transition ${
                    flagCalc.error ? 'bg-rose-500/10 border-rose-500/40' : 'bg-amber-500/10 border-amber-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`block font-bold ${flagCalc.error ? 'text-rose-400' : 'text-amber-400'}`}>
                        ⚡ Fecha de Declaración de Flagrancia
                      </label>
                      <span className="text-[10px] text-amber-300/80 font-medium">
                        Calcula 1º Venc. IPP (+20d) y 2º Venc. Prorrogado (+40d) automáticamente
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="EJ. 10/08/26"
                      value={fechaFlagranciaState}
                      onChange={(e) => setFechaFlagranciaState(formatDateMask(e.target.value))}
                      className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
                    />
                    {flagCalc.error ? (
                      <p className="text-[11px] font-semibold text-rose-400">{flagCalc.error}</p>
                    ) : flagCalc.ipp1 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="rounded-lg bg-slate-900/90 p-2 border border-amber-500/30">
                          <span className="block text-[10px] font-bold text-amber-400">1º Vencimiento IPP Flagrancia (+20 días)</span>
                          <span className="font-mono text-xs font-bold text-white">{flagCalc.ipp1}</span>
                        </div>
                        <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="block text-[10px] font-bold text-slate-400">2º Vencimiento IPP Prorrogado (+40 días)</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={flagranciaProrrogadaState}
                                onChange={(e) => setFlagranciaProrrogadaState(e.target.checked)}
                                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
                              />
                              <span className="text-[10px] font-extrabold text-amber-300">Prorrogar</span>
                            </label>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-300">{flagCalc.ipp2}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              {/* Secciones avanzadas (Visibles ÚNICAMENTE si el Estado Procesal es "En Trámite") */}
              {isEnTramite && (
                <>
                  {/* Secciones de Prisión Preventiva (PP) - Visibles si Imputado Detenido = SI */}
                  {detenidoState === 'SI' && (
                    <>
                      {/* Fecha de Detención & Auto-cálculo de Plazos PP */}
                      <div className={`rounded-xl p-3.5 border space-y-2 transition ${
                        calculatePPDatesFromDetencion(fechaDetencionState).error
                          ? 'bg-rose-500/10 border-rose-500/40'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className={`block font-bold ${
                            calculatePPDatesFromDetencion(fechaDetencionState).error ? 'text-rose-400' : 'text-amber-400'
                          }`}>
                            📅 Fecha de Detención del Imputado
                          </label>
                          <span className="text-[10px] text-amber-300/80 font-medium">
                            Calcula 1º Plazo PP (+15d) y 2º Plazo PP (+30d) automáticamente
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Ej. 10/08/26"
                          value={fechaDetencionState}
                          onChange={(e) => {
                            const val = formatDateMask(e.target.value);
                            setFechaDetencionState(val);
                            const { pp1 } = calculatePPDatesFromDetencion(val);
                            if (pp1) {
                              setVencPP1State(pp1);
                            }
                          }}
                          className={`w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border focus:outline-none ${
                            calculatePPDatesFromDetencion(fechaDetencionState).error
                              ? 'border-rose-500 text-rose-300 focus:border-rose-400'
                              : 'border-amber-500/40 focus:border-amber-400'
                          }`}
                        />
                        {calculatePPDatesFromDetencion(fechaDetencionState).error ? (
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold pt-1">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>⚠️ {calculatePPDatesFromDetencion(fechaDetencionState).error}</span>
                          </div>
                        ) : (
                          fechaDetencionState && (
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-amber-300 font-semibold pt-1">
                              <span>⚡ 1º Plazo Vence (+15 días corridos): <strong className="text-amber-200 underline">{calculatePPDatesFromDetencion(fechaDetencionState).pp1 || 'ingresando fecha...'}</strong></span>
                              <span>🔥 2º Plazo Vence (+30 días total): <strong className="text-rose-300 underline">{calculatePPDatesFromDetencion(fechaDetencionState).pp2 || 'ingresando fecha...'}</strong></span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Special PP Status Selector Bar */}
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">
                            ⚖️ Situación de Prisión Preventiva (PP)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Cambiar fecha por estado procesal especial
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => { setVencPP1State('Presentada'); setDetenidoState('SI'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                              checkPPStatusSpecial(vencPP1State) === 'Presentada'
                                ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-blue-900/30 hover:text-blue-300'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            📄 Presentada (Sigue Detenido)
                          </button>

                          <button
                            type="button"
                            onClick={() => { setVencPP1State('Excarcelado'); setDetenidoState('NO'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                              checkPPStatusSpecial(vencPP1State) === 'Excarcelado'
                                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/30'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-emerald-900/30 hover:text-emerald-300'
                            }`}
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            🔓 Excarcelado
                          </button>

                          <button
                            type="button"
                            onClick={() => { setVencPP1State('Libertad'); setDetenidoState('NO'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                              checkPPStatusSpecial(vencPP1State) === 'Libertad'
                                ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-500/30'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-sky-900/30 hover:text-sky-300'
                            }`}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            🕊️ Libertad
                          </button>

                          {checkPPStatusSpecial(vencPP1State) && (
                            <button
                              type="button"
                              onClick={() => setVencPP1State('')}
                              className="text-xs text-rose-400 hover:underline px-2 py-1 font-medium"
                            >
                              Limpiar Estado (Ingresar Fecha)
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1º Plazo PP Input */}
                        <div>
                          <label className="block font-semibold text-amber-400 mb-1">
                            1º Vencimiento PP (Fecha Inicial)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. 20/05/26 o 'Presentada'"
                            value={vencPP1State}
                            onChange={(e) => setVencPP1State(formatDateMask(e.target.value))}
                            className={`w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border focus:outline-none ${
                              isDateInPast(vencPP1State)
                                ? 'border-rose-500 text-rose-300'
                                : 'border-amber-500/40 focus:border-amber-400'
                            }`}
                          />
                          {isDateInPast(vencPP1State) ? (
                            <p className="mt-1 text-[10px] text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              No puede ser anterior al día de hoy
                            </p>
                          ) : (
                            <p className="mt-1 text-[10px] text-slate-500">
                              2º Plazo = +15 días corridos
                            </p>
                          )}
                        </div>

                        {/* Prórrroga Checkbox Toggle */}
                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">
                            ¿Prorrogar PP? (2º Plazo)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-slate-950 p-2.5 border border-slate-800 hover:border-slate-700 transition">
                            <input
                              type="checkbox"
                              disabled={!!checkPPStatusSpecial(vencPP1State)}
                              checked={ppProrrogadaState && !checkPPStatusSpecial(vencPP1State)}
                              onChange={(e) => setPpProrrogadaState(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 disabled:opacity-40"
                            />
                            <span className={`text-xs font-bold ${ppProrrogadaState && !checkPPStatusSpecial(vencPP1State) ? 'text-rose-400' : 'text-slate-400'}`}>
                              {checkPPStatusSpecial(vencPP1State) ? 'N/A' : (ppProrrogadaState ? 'SÍ (Prorrogado)' : 'NO (1º Plazo)')}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Active Plazo Preview Banner */}
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Estado del Vencimiento PP Activo en Tablero:</span>
                        {ppProrrogadaState ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">2º Plazo (+15 días corridos):</span>
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 glow-urgent">
                              <span className="text-[10px] font-black text-white bg-rose-600 px-1 rounded-sm">2º</span>
                              {vencPP1State ? calculatePP2Date(vencPP1State) : 'Sin fecha 1º'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">1º Plazo Activo:</span>
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                              <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-1 rounded-sm">1º</span>
                              {vencPP1State || 'Sin fecha'}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Controles Estándar (Vencimiento IPP y Denuncia) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Vencimiento IPP
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 19/09/26"
                        value={vencIPPState}
                        onChange={(e) => setVencIPPState(formatDateMask(e.target.value))}
                        className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Denuncia (Lugar de Inicio)
                      </label>
                      <select
                        value={
                          INICIO_OPTIONS.includes(formData.denunciado_en)
                            ? formData.denunciado_en
                            : (formData.denunciado_en ? 'Otro' : '')
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          const norm = val.trim().toLowerCase();
                          const isAutoSumario = norm === 'mesa' || norm === 'mail' || norm === 'ciudadana';
                          if (val === 'Otro') {
                            setFormData(prev => ({
                              ...prev,
                              denunciado_en: customInicio || 'Otro',
                              sumario: isAutoSumario ? (prev.sumario?.trim() || 'SÍ') : prev.sumario
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              denunciado_en: val,
                              sumario: isAutoSumario ? (prev.sumario?.trim() || 'SÍ') : prev.sumario
                            }));
                          }
                        }}
                        className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">- Seleccionar Origen -</option>
                        {INICIO_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>

                      {/* Input desplegable al elegir "Otro" */}
                      {(formData.denunciado_en === 'Otro' || (!INICIO_OPTIONS.includes(formData.denunciado_en) && formData.denunciado_en !== '')) && (
                        <div className="mt-2 space-y-1">
                          <input
                            type="text"
                            placeholder="Escriba la otra dependencia o lugar..."
                            value={customInicio}
                            onChange={(e) => {
                              const typed = e.target.value;
                              setCustomInicio(typed);
                              setFormData(prev => ({
                                ...prev,
                                denunciado_en: typed || 'Otro'
                              }));
                            }}
                            className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 border border-blue-500/50 focus:border-blue-400 focus:outline-none shadow-sm"
                          />
                          <p className="text-[10px] text-blue-400">Especifica la dependencia personalizada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Observación / Motivo del Cambio (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={changeEstadoNote}
                  onChange={(e) => setChangeEstadoNote(e.target.value.toUpperCase())}
                  placeholder="Ej: Se dictó elevación a juicio / Se archivó la causa..."
                  className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none uppercase"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Todas las modificaciones realizadas se registrarán automáticamente con la fecha de hoy en la línea de tiempo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-800 px-4 py-2.5 font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
                >
                  Guardar Modificaciones
                </button>
              </div>
            </form>
          );
        })()}

        </div>

      </div>
    </div>
  );
}
