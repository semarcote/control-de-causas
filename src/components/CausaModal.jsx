import React, { useState, useMemo } from 'react';
import { X, Clock, FileText, Calendar, Edit3, Plus, Shield, MapPin, Gavel, CheckCircle2, AlertTriangle, Send, RotateCcw, Trash2, Unlock, UserCheck, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { renderBadgeEstado, isFinalizedState, isAbusoSexual, renderBadgePericia, renderMultiplePericiasBadges, renderBadgePP, calculatePP2Date, checkPPStatusSpecial, isDateInPast, calculatePPDatesFromDetencion, calculateFlagranciaIPPDates, formatDateMask, extractAndFormatDateFromActuacion, isDateInFuture, isValidDateString, INICIO_OPTIONS, formatDisplayDate, parseAnyDate, isPPMaxDaysExceeded } from './CausasTable';

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CausaModal({ causa, causas = [], onClose, onSave }) {
  if (!causa) return null;

  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'edit' | 'add'
  const [formData, setFormData] = useState({ ...causa });
  const todayDefaultStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const [newActuacion, setNewActuacion] = useState('');
  const [newActuacionFecha, setNewActuacionFecha] = useState(todayDefaultStr);
  const [newPlazoDias, setNewPlazoDias] = useState(causa.revisar_dias || '30');
  const [nuevoEstado, setNuevoEstado] = useState(() => {
    const st = (causa.estado || '').trim().toLowerCase();
    if (!st || st === 'esperar' || st === 'revisar' || st === 'en trámite' || st === 'en tramite' || !isFinalizedState(causa.estado, causa.tramite)) {
      return 'En Trámite';
    }
    return causa.estado;
  });
  const [detenidoState, setDetenidoState] = useState(causa.detenido || 'NO');
  const [sumarioState, setSumarioState] = useState(() => (causa.sumario && causa.sumario.trim() !== '' && causa.sumario.trim().toLowerCase() !== 'no') ? 'SÍ' : 'NO');
  const [flagranciaState, setFlagranciaState] = useState(causa.flagrancia || 'NO');
  const [fechaFlagranciaState, setFechaFlagranciaState] = useState(formatDisplayDate(causa.fecha_flagrancia) || '');
  const [flagranciaProrrogadaState, setFlagranciaProrrogadaState] = useState(causa.flagrancia_prorrogada === true || causa.flagrancia_prorrogada === 'SI');
  const [fechaDetencionState, setFechaDetencionState] = useState(formatDisplayDate(causa.fecha_detencion) || '');
  const rawPP1 = causa.vencimiento_pp1 || causa.vencimiento_pp || causa.estado_pp || '';
  const initialSpecialPP = checkPPStatusSpecial(rawPP1);
  const [vencPP1State, setVencPP1State] = useState(initialSpecialPP || formatDisplayDate(rawPP1) || '');
  const [ppProrrogadaState, setPpProrrogadaState] = useState(causa.pp_prorrogada === true || causa.pp_prorrogada === 'SI');
  const [vencIPPState, setVencIPPState] = useState(checkPPStatusSpecial(causa.vencimiento_ipp) ? '' : (formatDisplayDate(causa.vencimiento_ipp) || ''));
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

  // Audiencias State
  const [audienciasState, setAudienciasState] = useState(
    Array.isArray(causa.audiencias) ? [...causa.audiencias] : []
  );
  const [newAudTipo, setNewAudTipo] = useState('Declaración Art. 308');
  const [newAudFecha, setNewAudFecha] = useState(todayDefaultStr);
  const [newAudHora, setNewAudHora] = useState('10:00');
  const [newAudLugar, setNewAudLugar] = useState('Sede UFI');
  const [newAudModalidad, setNewAudModalidad] = useState('Presencial');
  const [newAudObs, setNewAudObs] = useState('');

  // Interactive Calendar Picker State inside CausaModal
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [pickerSelectedDate, setPickerSelectedDate] = useState(new Date());
  const [audStep, setAudStep] = useState('picker'); // 'picker' | 'details'

  // Map all system-wide audiencias by YYYY-MM-DD
  const systemAudienciasMap = useMemo(() => {
    const map = {};
    causas.forEach(c => {
      const auds = Array.isArray(c.audiencias) ? c.audiencias : [];
      auds.forEach(aud => {
        const dt = parseAnyDate(aud.fecha);
        if (dt) {
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          if (!map[key]) map[key] = [];
          map[key].push({ ...aud, causa: c });
        }
      });
    });
    return map;
  }, [causas]);

  // Calendar Grid Days Calculation for Picker
  const pickerGrid = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const totalDays = lastDay.getDate();
    const days = [];

    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLast - i), isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    const remaining = (42 - days.length) % 7;
    for (let n = 1; n <= remaining; n++) {
      days.push({ date: new Date(year, month + 1, n), isCurrentMonth: false });
    }
    return days;
  }, [pickerMonth]);

  const handleAddAudienciaItem = (e) => {
    e.preventDefault();
    if (!newAudFecha.trim()) return;

    const newItem = {
      id: `aud-${Date.now()}`,
      tipo: newAudTipo || 'Declaración Art. 308',
      fecha: newAudFecha,
      hora: newAudHora || '10:00',
      lugar: newAudLugar || 'Sede UFI',
      modalidad: newAudModalidad || 'Presencial',
      estado: 'Programada',
      observaciones: newAudObs || ''
    };

    const updated = [...audienciasState, newItem];
    setAudienciasState(updated);

    // Auto-generate movement timeline entry
    const entryText = `Audiencia fijada: ${newItem.tipo} (${formatDisplayDate(newItem.fecha)} ${newItem.hora} hs - ${newItem.lugar})`;
    const fullEntry = `${formatDisplayDate(newItem.fecha)} ${entryText}`;
    let newTramite = causa.tramite || '';
    if (newTramite.trim()) {
      newTramite = `${newTramite} /// ${fullEntry}`;
    } else {
      newTramite = fullEntry;
    }

    onSave({
      ...causa,
      audiencias: updated,
      tramite: newTramite
    });

    setNewAudObs('');
  };

  const handleToggleAudienciaEstado = (audId, newEstado) => {
    const updated = audienciasState.map(a => a.id === audId ? { ...a, estado: newEstado } : a);
    setAudienciasState(updated);
    onSave({
      ...causa,
      audiencias: updated
    });
  };

  const handleDeleteAudienciaItem = (audId) => {
    const updated = audienciasState.filter(a => a.id !== audId);
    setAudienciasState(updated);
    onSave({
      ...causa,
      audiencias: updated
    });
  };

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

    if (newPericiaFecha.trim() && isDateInPast(newPericiaFecha.trim())) {
      alert(`La fecha de la pericia (${newPericiaFecha.trim()}) es errónea: No puede ser una fecha anterior a la fecha del día de hoy.`);
      return;
    }

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

  const handleSavePericiasAndClose = () => {
    let finalPericias = [...periciasState];
    let updatedTramite = formData.tramite || causa.tramite || '';

    // Only process un-added inputs if user typed something in newPericiaTipo or newPericiaFecha AND didn't click + Agregar Pericia
    if (newPericiaTipo.trim() || newPericiaFecha.trim()) {
      if (newPericiaFecha.trim() && isDateInPast(newPericiaFecha.trim())) {
        alert(`La fecha de la pericia (${newPericiaFecha.trim()}) es errónea: No puede ser una fecha anterior a la fecha del día de hoy.`);
        return;
      }

      const tipoText = newPericiaTipo.trim() || 'Pericia Procesal';
      const fechaText = newPericiaFecha.trim() || 'Sin fecha';

      // Check if this pericia was ALREADY added by handleAddPericiaItem
      const alreadyExists = finalPericias.some(p => p.tipo === tipoText && p.fecha === fechaText);

      if (!alreadyExists) {
        const newItem = {
          id: `p-${Date.now()}`,
          tipo: tipoText,
          fecha: fechaText
        };

        finalPericias.push(newItem);

        const todayStrShort = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const periciaEntry = `${todayStrShort} Registro de Pericia procesal: ${tipoText} (Fecha fijada: ${fechaText})`;
        if (!updatedTramite.includes(periciaEntry)) {
          updatedTramite = updatedTramite ? `${updatedTramite} /// ${periciaEntry}` : periciaEntry;
        }
      }
    }

    // Deduplicate pericias by ID or tipo+fecha
    const uniqueMap = new Map();
    finalPericias.forEach(p => {
      if (p) {
        const key = p.id || `${p.tipo}-${p.fecha}`;
        uniqueMap.set(key, p);
      }
    });
    const deduplicatedPericias = Array.from(uniqueMap.values());

    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const updatedCausa = {
      ...formData,
      tramite: updatedTramite,
      pericias: deduplicatedPericias,
      revisado: todayStr
    };

    try {
      setFormData(updatedCausa);
      if (onSave) onSave(updatedCausa);
    } catch (err) {
      console.error('Error saving pericias:', err);
    } finally {
      setNewPericiaTipo('');
      setNewPericiaFecha('');
      if (onClose) onClose();
    }
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
    if (editingPericiaFecha.trim() && isDateInPast(editingPericiaFecha.trim())) {
      alert(`La fecha de la pericia (${editingPericiaFecha.trim()}) es errónea: No puede ser una fecha anterior a la fecha del día de hoy.`);
      return;
    }

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
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fechaReal = formatDisplayDate(newActuacionFecha || todayStr);

    let updatedTramite = causa.tramite || '';
    if (newActuacion.trim()) {
      const formattedEntry = `${fechaReal} - ${newActuacion.trim()}`;
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
    setNewActuacionFecha(todayDefaultStr);
    if (onClose) onClose();
  };

  const handleModificarDatos = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const specialStatus = checkPPStatusSpecial(vencPP1State);
    const finalDetenido = specialStatus === 'Presentada' ? 'SI' : (specialStatus === 'Excarcelado' || specialStatus === 'Libertad' ? 'NO' : detenidoState);
    const isDetenido = finalDetenido === 'SI';

    // Validate Fecha de Detención (REQUIRED if Detenido = SI)
    if (isDetenido) {
      if (!fechaDetencionState || !fechaDetencionState.trim()) {
        alert('Si el imputado se encuentra DETENIDO, debe ingresar obligatoriamente la Fecha de Detención para poder guardar.');
        return;
      }
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

    // Validate that PP date is NOT in the past (ONLY if Detenido = SI)
    if (isDetenido && !specialStatus && vencPP1State && isDateInPast(vencPP1State)) {
      alert(`La fecha de vencimiento de la Prisión Preventiva (${vencPP1State}) no puede ser anterior a la fecha de hoy (${todayStr}). Por favor ingrese una fecha futura o seleccione una opción de estado (Presentada / Excarcelado / Libertad).`);
      return;
    }

    const calculatedPP2 = (vencPP1State && !specialStatus) ? calculatePP2Date(vencPP1State) : '';

    // Validate that PP date does NOT exceed maximum 30 days limit from detention date (ONLY if Detenido = SI)
    if (isDetenido && !specialStatus && vencPP1State && fechaDetencionState) {
      if (isPPMaxDaysExceeded(vencPP1State, fechaDetencionState)) {
        alert(`La fecha del 1º vencimiento de la Prisión Preventiva (${vencPP1State}) supera el límite máximo legal de 30 días respecto a la fecha de detención.`);
        return;
      }
      if (ppProrrogadaState && calculatedPP2 && isPPMaxDaysExceeded(calculatedPP2, fechaDetencionState)) {
        alert(`La fecha prorrogada del 2º vencimiento de la Prisión Preventiva (${calculatedPP2}) supera el límite máximo legal de 30 días respecto a la fecha de detención.`);
        return;
      }
    }

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

    const normInicio = (formData.denunciado_en || '').trim().toLowerCase();
    const autoSumario = normInicio === 'mesa' || normInicio === 'mail' || normInicio === 'ciudadana';

    const isFlagrancia = flagranciaState === 'SI' || flagranciaState === 'SÍ';
    const flagranciaCalc = calculateFlagranciaIPPDates(fechaFlagranciaState);
    let finalVencIPP = isFlagrancia ? vencIPPState : (flagranciaState === 'NO' ? '' : vencIPPState);

    // El vencimiento IPP ingresado manualmente siempre tiene prioridad y no se vincula a la prórroga de PP
    if (flagranciaState === 'NO') {
      finalVencIPP = '';
    } else if (!finalVencIPP && isFlagrancia && fechaFlagranciaState && !flagranciaCalc.error) {
      finalVencIPP = flagranciaProrrogadaState ? flagranciaCalc.ipp2 : flagranciaCalc.ipp1;
    }

    const formattedVencPP1 = formatDisplayDate(vencPP1State);
    const formattedPP2 = formatDisplayDate(calculatedPP2);
    const formattedVencIPP = formatDisplayDate(finalVencIPP);

    const updatedCausa = {
      ...formData,
      sumario: (sumarioState === 'SÍ' || sumarioState === 'SI') ? (formData.sumario?.trim() && formData.sumario.trim().toLowerCase() !== 'no' && formData.sumario.trim().toLowerCase() !== 'si' && formData.sumario.trim().toLowerCase() !== 'sí' ? formData.sumario : 'SÍ') : 'NO',
      estado: nuevoEstado,
      detenido: finalDetenido,
      flagrancia: flagranciaState,
      fecha_flagrancia: isFlagrancia ? formatDisplayDate(fechaFlagranciaState) : '',
      flagrancia_prorrogada: isFlagrancia ? flagranciaProrrogadaState : false,
      fecha_detencion: isDetenido ? formatDisplayDate(fechaDetencionState) : '',
      vencimiento_pp1: isDetenido ? (specialStatus || formattedVencPP1 || '') : '',
      vencimiento_pp: isDetenido ? (specialStatus || (ppProrrogadaState ? (formattedPP2 || formattedVencPP1) : formattedVencPP1) || '') : '',
      vencimiento_pp2: isDetenido ? formattedPP2 : '',
      estado_pp: isDetenido ? (specialStatus || formattedVencPP1 || '') : '',
      pp_prorrogada: isDetenido ? ppProrrogadaState : false,
      vencimiento_ipp: (flagranciaState === 'NO' ? '' : ((formattedVencIPP && !checkPPStatusSpecial(formattedVencIPP)) ? formattedVencIPP : '')),
      revisar_dias: newPlazoDias,
      revisado: todayStr,
      tramite: updatedTramite
    };

    try {
      setFormData(updatedCausa);
      if (onSave) onSave(updatedCausa);
    } catch (err) {
      console.error('Error in handleModificarDatos save:', err);
    } finally {
      setChangeEstadoNote('');
      if (onClose) onClose();
    }
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
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto whitespace-nowrap border-b border-slate-800 bg-slate-900/60 px-4 pt-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 border-b-2 px-2.5 sm:px-3 py-2 text-xs font-medium transition ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Línea de Tiempo ({rawTimeline.length})
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-1.5 border-b-2 px-2.5 sm:px-3 py-2 text-xs font-medium transition ${
              activeTab === 'add'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar Movimiento
          </button>

          <button
            onClick={() => setActiveTab('pericias')}
            className={`flex items-center gap-1.5 border-b-2 px-2.5 sm:px-3 py-2 text-xs font-medium transition ${
              activeTab === 'pericias'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-purple-400" />
            Pericias ({periciasState.length})
          </button>

          <button
            onClick={() => setActiveTab('audiencias')}
            className={`flex items-center gap-1.5 border-b-2 px-2.5 sm:px-3 py-2 text-xs font-medium transition ${
              activeTab === 'audiencias'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            Audiencias ({audienciasState.length})
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 border-b-2 px-2.5 sm:px-3 py-2 text-xs font-medium transition ${
              activeTab === 'edit'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
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
                        min="0"
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
                    const actDate = extractAndFormatDateFromActuacion(item);

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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-400">Actuación #{originalIndex + 1}</span>
                              {actDate && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/40" title="Fecha en que fue realizada la actuación">
                                  <Calendar className="h-3 w-3 text-amber-400" />
                                  {actDate}
                                </span>
                              )}
                            </div>
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
              <div className="rounded-xl p-3 bg-slate-950 border border-slate-800">
                <label className="block text-xs font-semibold text-amber-400 mb-1">
                  📅 Fecha de Realización de la Actuación
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA (Ej. 29/08/2026)"
                  value={newActuacionFecha}
                  onChange={(e) => setNewActuacionFecha(formatDateMask(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

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
                  Se registrará la fecha de realización al inicio de la actuación (dd/mm/aaaa).
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
                      min="0"
                      max="365"
                      value={newPlazoDias}
                      onChange={(e) => setNewPlazoDias(e.target.value)}
                      placeholder="Días"
                      className="w-32 rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-1.5">
                      {['5', '10', '20', '30', '60'].map(dias => (
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
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 transition"
                >
                  <Send className="h-4 w-4" />
                  Guardar y Cerrar
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
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[10px] text-slate-400 font-semibold">Fechas Programadas (Múltiples separadas por coma)</label>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPericiaFecha(prev => prev ? `${prev}, ` : '')}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-0.5"
                                  >
                                    <Plus className="h-3 w-3" /> Otra Fecha
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Ej. 09/10/26, 10/10/26"
                                  value={editingPericiaFecha}
                                  onChange={(e) => setEditingPericiaFecha(formatDateMask(e.target.value))}
                                  className="w-full rounded-lg bg-slate-950 p-2 text-xs text-white border border-slate-700 focus:border-blue-400 focus:outline-none font-mono"
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-400">Fecha Programada / Vencimiento</label>
                        <button
                          type="button"
                          onClick={() => setNewPericiaFecha(prev => prev ? `${prev}, ` : '')}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" /> Otra Fecha
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej. 09/10/26, 10/10/26"
                        value={newPericiaFecha}
                        onChange={(e) => setNewPericiaFecha(formatDateMask(e.target.value))}
                        className="w-full rounded-xl bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none font-mono"
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
                  onClick={handleSavePericiasAndClose}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Guardar y Cerrar
                </button>
              </div>
            </div>
          )}

          {/* TAB: AUDIENCIAS */}
          {activeTab === 'audiencias' && (
            <div className="space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    Audiencias Fijadas de la Causa
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Consulte la disponibilidad en el calendario y agende citaciones o vistas para este expediente.
                  </p>
                </div>

                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/30">
                  {audienciasState.length} audiencias en causa
                </span>
              </div>

              {/* Paso 1: CALENDARIO DE DISPONIBILIDAD O PASO 2: FORMULARIO */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                
                {audStep === 'picker' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-200 flex items-center gap-2">
                        <span>Paso 1: Seleccione el día en el Calendario para verificar disponibilidad</span>
                      </h5>
                      <span className="text-[11px] font-mono text-amber-300">
                        {monthNames[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}
                      </span>
                    </div>

                    {/* Mini Month Picker Controls */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <button
                        type="button"
                        onClick={() => setPickerMonth(new Date())}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition font-semibold"
                      >
                        Hoy
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400">
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>

                    {/* Grid Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {pickerGrid.map((cell, cIdx) => {
                        const cDate = cell.date;
                        const dateKey = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}-${String(cDate.getDate()).padStart(2, '0')}`;
                        const dayAuds = systemAudienciasMap[dateKey] || [];
                        const isSelected = pickerSelectedDate && (
                          cDate.getFullYear() === pickerSelectedDate.getFullYear() &&
                          cDate.getMonth() === pickerSelectedDate.getMonth() &&
                          cDate.getDate() === pickerSelectedDate.getDate()
                        );
                        const isToday = (
                          cDate.getFullYear() === new Date().getFullYear() &&
                          cDate.getMonth() === new Date().getMonth() &&
                          cDate.getDate() === new Date().getDate()
                        );

                        return (
                          <div
                            key={cIdx}
                            onClick={() => {
                              setPickerSelectedDate(cDate);
                              setNewAudFecha(formatDisplayDate(cDate));
                            }}
                            className={`p-1.5 rounded-lg border transition cursor-pointer flex flex-col justify-between min-h-[46px] ${
                              !cell.isCurrentMonth
                                ? 'bg-slate-950/20 border-slate-900 text-slate-700 opacity-40'
                                : isSelected
                                ? 'bg-blue-900/60 border-blue-500 text-white shadow ring-1 ring-blue-400 font-bold'
                                : isToday
                                ? 'bg-blue-950/60 border-blue-600/50 text-white font-bold'
                                : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs">{cDate.getDate()}</span>
                              {dayAuds.length > 0 && (
                                <span className="px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-black border border-amber-500/40">
                                  {dayAuds.length}
                                </span>
                              )}
                            </div>
                            {dayAuds.length > 0 && (
                              <span className="text-[9px] font-semibold text-amber-400 truncate">
                                {dayAuds.length} fijadas
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Inspector for selected date */}
                    {pickerSelectedDate && (() => {
                      const dateKey = `${pickerSelectedDate.getFullYear()}-${String(pickerSelectedDate.getMonth() + 1).padStart(2, '0')}-${String(pickerSelectedDate.getDate()).padStart(2, '0')}`;
                      const selectedDayAuds = systemAudienciasMap[dateKey] || [];

                      return (
                        <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">
                              Audiencias el día <strong className="text-amber-300 font-mono">{formatDisplayDate(pickerSelectedDate)}</strong>:
                            </span>
                            {selectedDayAuds.length === 0 ? (
                              <span className="text-emerald-400 text-[11px] font-bold">🟢 Día totalmente libre</span>
                            ) : (
                              <span className="text-amber-400 text-[11px] font-bold">⚠️ {selectedDayAuds.length} fijadas en el sistema</span>
                            )}
                          </div>

                          {selectedDayAuds.length > 0 && (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedDayAuds.map((aud, aIdx) => (
                                <div key={aIdx} className="text-[11px] p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-slate-300">
                                  <span className="truncate">
                                    <strong className="text-blue-300 font-mono">{aud.causa.ipp}</strong> - {aud.tipo} ({aud.hora || '10:00'} hs)
                                  </span>
                                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{aud.lugar || 'Sede UFI'}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setNewAudFecha(formatDisplayDate(pickerSelectedDate));
                                setAudStep('details');
                              }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition"
                            >
                              <span>Paso 2: Confirmar Fecha ({formatDisplayDate(pickerSelectedDate)}) y Completar Audiencia</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  /* STEP 2: DETAILS FORM */
                  <form onSubmit={(e) => {
                    handleAddAudienciaItem(e);
                    setAudStep('picker');
                  }} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h5 className="font-bold text-white flex items-center gap-2">
                        <span>Paso 2: Completar Horario, Lugar y Tipo para el día</span>
                        <strong className="text-amber-300 font-mono">{newAudFecha}</strong>
                      </h5>
                      <button
                        type="button"
                        onClick={() => setAudStep('picker')}
                        className="text-slate-400 hover:text-white underline text-[11px]"
                      >
                        ⬅ Cambiar Fecha en Calendario
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Tipo de Audiencia *</label>
                        <select
                          value={newAudTipo}
                          onChange={(e) => setNewAudTipo(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:border-blue-500 focus:outline-none"
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
                        <label className="block text-slate-400 font-semibold mb-1">Fecha Confirmada</label>
                        <input
                          type="text"
                          readOnly
                          value={newAudFecha}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-amber-300 font-mono font-bold focus:outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Hora (ej. 10:00)</label>
                        <input
                          type="text"
                          value={newAudHora}
                          onChange={(e) => setNewAudHora(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Lugar / Dependencia</label>
                        <input
                          type="text"
                          value={newAudLugar}
                          onChange={(e) => setNewAudLugar(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Observaciones / Notas</label>
                      <input
                        type="text"
                        value={newAudObs}
                        onChange={(e) => setNewAudObs(e.target.value)}
                        placeholder="ej. Concurre imputado con defensor oficial..."
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAudStep('picker')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                      >
                        Atrás
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Guardar y Cerrar
                      </button>
                    </div>
                  </form>
                )}

              </div>

              {/* Audiencias List */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-300">Audiencias Registradas en esta Causa:</h5>

                {audienciasState.length > 0 ? (
                  <div className="space-y-2">
                    {audienciasState.map((aud) => (
                      <div
                        key={aud.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{aud.tipo}</span>
                            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {formatDisplayDate(aud.fecha)} {aud.hora ? ` - ${aud.hora} hs` : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            📍 {aud.lugar || 'Sede UFI'} ({aud.modalidad || 'Presencial'}) {aud.observaciones ? `• ${aud.observaciones}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={aud.estado || 'Programada'}
                            onChange={(e) => handleToggleAudienciaEstado(aud.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                          >
                            <option value="Programada">Programada</option>
                            <option value="Realizada">Realizada</option>
                            <option value="Suspendida">Suspendida</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteAudienciaItem(aud.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Eliminar audiencia"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic p-4 text-center border border-dashed border-slate-800 rounded-xl">
                    No hay audiencias agendadas en esta causa.
                  </p>
                )}
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
                    <option value="Archivada">Archivada</option>
                    <option value="Desestimada">Desestimada</option>
                    <option value="Remisión a Otra UFI">Remisión UFI</option>
                    <option value="Incompetencia">Incompetencia</option>
                    <option value="Elevada a Juicio">Elevada a Juicio</option>
                    <option value="Sobreseimiento">Sobreseimiento</option>
                    <option value="Paradero">Paradero</option>
                    <option value="Captura">Captura</option>
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
                        min="0"
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
                        {['5', '10', '20', '30', '60'].map(dias => (
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
                          setVencPP1State('');
                          setPpProrrogadaState(false);
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setFlagranciaState(val);
                        if (val === 'NO') {
                          setFechaFlagranciaState('');
                          setFlagranciaProrrogadaState(false);
                          setVencIPPState('');
                        }
                      }}
                      className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SÍ (FLAGRANCIA)</option>
                    </select>
                  </div>
                )}

                {isEnTramite && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      ¿Tiene Sumario?
                    </label>
                    <select
                      value={sumarioState}
                      onChange={(e) => setSumarioState(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 p-2.5 text-xs text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="NO">NO</option>
                      <option value="SÍ">SÍ (CON SUMARIO)</option>
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
                              {vencPP1State ? formatDisplayDate(calculatePP2Date(vencPP1State)) : 'Sin fecha 1º'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">1º Plazo Activo:</span>
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                              <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-1 rounded-sm">1º</span>
                              {formatDisplayDate(vencPP1State) || 'Sin fecha'}
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
                  type="button"
                  onClick={handleModificarDatos}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
                >
                  Guardar y Cerrar
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
