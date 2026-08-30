import React, { useState } from 'react';
import { X, Plus, Scale, FileText, Unlock, UserCheck, AlertTriangle } from 'lucide-react';
import { calculatePP2Date, checkPPStatusSpecial, isDateInPast, calculatePPDatesFromDetencion, calculateFlagranciaIPPDates, formatDateMask, formatCaratulaMask, isDateInFuture, isValidDateString, INICIO_OPTIONS } from './CausasTable';

export default function NewCausaModal({ onClose, onCreate }) {
  const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const currentYear2Digits = new Date().getFullYear().toString().slice(-2);

  const [ippDept, setIppDept] = useState('01');
  const [ippNumber, setIppNumber] = useState('');
  const [ippYear, setIppYear] = useState(currentYear2Digits);
  const [ippSuffix, setIppSuffix] = useState('00');
  const [customInicio, setCustomInicio] = useState('');

  const [formData, setFormData] = useState({
    ipp: '',
    estado: 'En Trámite',
    revisado: todayStr,
    revisar_dias: '10',
    flagrancia: 'NO',
    fecha_flagrancia: '',
    flagrancia_prorrogada: false,
    detenido: 'NO',
    fecha_detencion: '',
    vencimiento_pp1: '',
    vencimiento_pp2: '',
    estado_pp: '',
    pp_prorrogada: false,
    vencimiento_pp: '',
    vencimiento_ipp: '',
    pericia_fecha: '',
    pericia_detalle: '',
    caratula: '',
    sumario: '',
    denunciado_en: '',
    vencimiento: '',
    fuera_ufi: '',
    tramite: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanDept = (ippDept || '01').replace(/\D/g, '').padStart(2, '0').slice(-2);
    const cleanNum = ippNumber.replace(/\D/g, '');
    if (!cleanNum && !formData.caratula.trim()) {
      alert('Por favor ingrese al menos los números del IPP o la Carátula de la causa.');
      return;
    }

    const paddedNum = cleanNum ? cleanNum.padStart(6, '0') : '000000';
    const cleanYear = (ippYear || currentYear2Digits).replace(/\D/g, '').padStart(2, '0').slice(-2);
    const cleanSuffix = (ippSuffix || '00').replace(/\D/g, '').padStart(2, '0').slice(-2);
    const fullFormattedIPP = `18-${cleanDept}-${paddedNum}-${cleanYear}/${cleanSuffix}`;

    if (formData.detenido === 'SI' && formData.fecha_detencion) {
      if (isDateInFuture(formData.fecha_detencion)) {
        alert(`La fecha de detención ingresada (${formData.fecha_detencion}) es errónea: No puede ser una fecha futura posterior al día de hoy.`);
        return;
      }
      const parts = formData.fecha_detencion.split('/');
      if (parts.length === 3 && parts[2].trim().length >= 2 && !isValidDateString(formData.fecha_detencion)) {
        alert(`La fecha de detención ingresada (${formData.fecha_detencion}) es errónea o inválida.`);
        return;
      }
    }

    const specialStatus = checkPPStatusSpecial(formData.vencimiento_pp1);
    if (!specialStatus && formData.vencimiento_pp1 && isDateInPast(formData.vencimiento_pp1)) {
      alert(`La fecha de vencimiento de la Prisión Preventiva (${formData.vencimiento_pp1}) no puede ser anterior al día de hoy (${todayStr}).`);
      return;
    }

    const normInicio = (formData.denunciado_en || '').trim().toLowerCase();
    const autoSumario = normInicio === 'mesa' || normInicio === 'mail' || normInicio === 'ciudadana';

    onCreate({
      ...formData,
      ipp: fullFormattedIPP,
      sumario: autoSumario ? 'SÍ' : formData.sumario,
      id: `causa-custom-${Date.now()}`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel relative w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Registrar Nueva Causa Penal</h2>
              <p className="text-xs text-slate-400">Ingreso de expediente en UFI N° 10</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-300">
                Número I.P.P. <span className="text-rose-400">*</span>
              </label>
              
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 focus-within:border-blue-500 transition">
                <span className="font-mono text-xs font-bold text-blue-400 pl-2 select-none">
                  18-
                </span>

                <input
                  type="text"
                  maxLength={2}
                  placeholder="01"
                  value={ippDept}
                  onChange={(e) => setIppDept(e.target.value.replace(/\D/g, ''))}
                  className="w-7 font-mono text-xs font-bold text-blue-300 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center focus:outline-none focus:border-blue-400 placeholder-slate-600"
                  title="Número de Departamento (Predeterminado 01, editable)"
                />

                <span className="font-mono text-xs text-slate-500 select-none">-</span>

                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="004501"
                  value={ippNumber}
                  onChange={(e) => setIppNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-18 font-mono text-xs font-bold text-white bg-transparent p-1 focus:outline-none placeholder-slate-600 tracking-wider"
                />

                <span className="font-mono text-xs text-slate-500 select-none">-</span>

                <input
                  type="text"
                  maxLength={2}
                  placeholder={currentYear2Digits}
                  value={ippYear}
                  onChange={(e) => setIppYear(e.target.value.replace(/\D/g, ''))}
                  className="w-8 font-mono text-xs font-bold text-white bg-transparent p-1 focus:outline-none placeholder-slate-600 text-center"
                />

                <span className="font-mono text-xs text-slate-500 select-none">/</span>

                <select
                  value={ippSuffix}
                  onChange={(e) => setIppSuffix(e.target.value)}
                  className="bg-slate-900 font-mono text-xs font-bold text-amber-300 border border-slate-800 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                >
                  {['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map(suf => (
                    <option key={suf} value={suf} className="bg-slate-900 text-slate-200">
                      {suf}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-slate-500">Formato Resultante:</span>
                <span className="font-mono font-bold text-blue-400">
                  {`18-${(ippDept || '01').padStart(2, '0').slice(-2)}-${(ippNumber.replace(/\D/g, '') || '000000').padStart(6, '0')}-${(ippYear || currentYear2Digits).padStart(2, '0').slice(-2)}/${ippSuffix || '00'}`}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Estado Inicial</label>
              <div className="w-full rounded-xl bg-slate-950 p-2.5 text-xs font-semibold text-blue-400 border border-blue-500/30 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span>En Trámite</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Carátula / Imputado y Delito <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. PEREZ S/ HURTO CALIFICADO"
              value={formData.caratula}
              onChange={(e) => setFormData(prev => ({ ...prev, caratula: formatCaratulaMask(e.target.value) }))}
              className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-slate-800 focus:border-blue-500 focus:outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Fecha Revisión</label>
              <input
                type="text"
                value={formData.revisado}
                onChange={(e) => setFormData(prev => ({ ...prev, revisado: e.target.value }))}
                className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Plazo de Revisión (Días)</label>
              <input
                type="number"
                value={formData.revisar_dias}
                onChange={(e) => setFormData(prev => ({ ...prev, revisar_dias: e.target.value }))}
                className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">¿Detenido?</label>
              <select
                value={formData.detenido || 'NO'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    detenido: val,
                    fecha_detencion: val === 'NO' ? '' : prev.fecha_detencion,
                    vencimiento_pp1: val === 'NO' ? '' : prev.vencimiento_pp1,
                    vencimiento_pp: val === 'NO' ? '' : prev.vencimiento_pp
                  }));
                }}
                className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">¿Trámite Flagrancia?</label>
              <select
                value={formData.flagrancia || 'NO'}
                onChange={(e) => setFormData(prev => ({ ...prev, flagrancia: e.target.value }))}
                className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="NO">NO</option>
                <option value="SI">SÍ</option>
              </select>
            </div>

            {/* Fecha de Flagrancia & Prórroga en Alta de Causa */}
            {(formData.flagrancia === 'SI' || formData.flagrancia === 'SÍ') && (() => {
              const flagCalc = calculateFlagranciaIPPDates(formData.fecha_flagrancia);
              return (
                <div className={`col-span-2 rounded-xl p-3 border space-y-2 transition ${
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
                    value={formData.fecha_flagrancia || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_flagrancia: formatDateMask(e.target.value) }))}
                    className="w-full rounded-xl bg-slate-950 p-2 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
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
                              checked={!!formData.flagrancia_prorrogada}
                              onChange={(e) => setFormData(prev => ({ ...prev, flagrancia_prorrogada: e.target.checked }))}
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

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Denuncia (Lugar de Inicio)</label>
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
                  const isCiudadana = norm.includes('ciudadan');
                  
                  if (val === 'Otro') {
                    setFormData(prev => ({
                      ...prev,
                      denunciado_en: customInicio || 'Otro',
                      sumario: isAutoSumario ? 'SÍ' : prev.sumario,
                      revisar_dias: '10'
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      denunciado_en: val,
                      sumario: isAutoSumario ? 'SÍ' : prev.sumario,
                      revisar_dias: isCiudadana ? '5' : (prev.revisar_dias === '5' ? '10' : (prev.revisar_dias || '10'))
                    }));
                  }
                }}
                className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">- Seleccionar Origen -</option>
                {INICIO_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
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
                      const typed = e.target.value.toUpperCase();
                      setCustomInicio(typed);
                      setFormData(prev => ({
                        ...prev,
                        denunciado_en: typed || 'Otro'
                      }));
                    }}
                    className="w-full rounded-xl bg-slate-950 p-2 text-xs text-white placeholder-slate-500 border border-blue-500/50 focus:border-blue-400 focus:outline-none shadow-sm uppercase"
                  />
                  <p className="text-[10px] text-blue-400">Especifica la dependencia personalizada</p>
                </div>
              )}
            </div>
          </div>

          {/* Sección Prisión Preventiva (Únicamente si está detenido) */}
          {formData.detenido === 'SI' && (
            <div className="rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs">🔒 Datos de Detención y Prisión Preventiva</span>
                <span className="text-[10px] text-amber-300 font-semibold">Imputado Detenido</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-amber-300 mb-1">📅 Fecha de Detención</label>
                  <input
                    type="text"
                    placeholder="Ej. 10/08/26"
                    value={formData.fecha_detencion || ''}
                    onChange={(e) => {
                      const val = formatDateMask(e.target.value);
                      const { pp1, pp2 } = calculatePPDatesFromDetencion(val);
                      setFormData(prev => ({
                        ...prev,
                        fecha_detencion: val,
                        vencimiento_pp1: pp1 || prev.vencimiento_pp1,
                        vencimiento_pp: pp1 || prev.vencimiento_pp,
                        vencimiento_pp2: pp2 || prev.vencimiento_pp2
                      }));
                    }}
                    className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-amber-500/40 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-amber-300 mb-1">1º Vencimiento PP</label>
                  <input
                    type="text"
                    placeholder="Ej. 20/05/26 o 'Presentada'"
                    value={formData.vencimiento_pp1 || formData.vencimiento_pp || ''}
                    onChange={(e) => {
                      const val = formatDateMask(e.target.value);
                      const autoPP2 = calculatePP2Date(val);
                      setFormData(prev => ({
                        ...prev,
                        vencimiento_pp1: val,
                        vencimiento_pp: val,
                        vencimiento_pp2: autoPP2
                      }));
                    }}
                    className="w-full rounded-xl bg-slate-950 p-2.5 text-white border border-amber-500/40 focus:border-amber-400 focus:outline-none"
                  />
                  <div className="flex gap-1 pt-1.5">
                    {['Presentada', 'Excarcelado', 'Libertad'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, vencimiento_pp1: st, vencimiento_pp: st, estado_pp: st, detenido: st === 'Presentada' ? 'SI' : 'NO' }))}
                        className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-700 hover:bg-amber-500/20 hover:text-amber-300 transition"
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white shadow-lg hover:bg-blue-500 transition"
            >
              <Plus className="h-4 w-4" />
              Crear Causa
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
