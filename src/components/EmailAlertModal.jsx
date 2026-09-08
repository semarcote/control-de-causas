import React, { useState, useEffect } from 'react';
import { Mail, Send, Check, CheckCircle2, Loader2, BellOff, X, AlertTriangle, Copy, HelpCircle } from 'lucide-react';
import { getExpirationEvents } from './ExpirationPanel';
import {
  sendEmailAlerts,
  getStoredEmailConfig,
  getStoredSheetsUrl,
  createTriggerAlerts,
  deleteTriggerAlerts,
  getStoredTriggerStatus,
  APPS_SCRIPT_TEMPLATE
} from '../services/googleSheetsService';

export default function EmailAlertModal({ isOpen, onClose, causas, userName }) {
  const [emailInput, setEmailInput] = useState('');
  const [diasMaxInput, setDiasMaxInput] = useState(15);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [settingTrigger, setSettingTrigger] = useState(false);
  const [isTriggerActive, setIsTriggerActive] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedEmail = getStoredEmailConfig(userName);
      setEmailInput(savedEmail || '');
      setIsTriggerActive(getStoredTriggerStatus(userName));
      setEmailStatus(null);
      setShowScriptGuide(false);
    }
  }, [isOpen, userName]);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setSendingEmail(true);
    setEmailStatus(null);
    setShowScriptGuide(false);
    try {
      const sheetsUrl = getStoredSheetsUrl();
      
      // Extraer exactamente los mismos vencimientos procesales que se visualizan en la pantalla
      const allEvents = getExpirationEvents(causas);
      const targetEvents = allEvents
        .filter(evt => evt.days <= diasMaxInput)
        .map(evt => ({
          ipp: evt.causa ? evt.causa.ipp : '',
          caratula: evt.causa ? (evt.causa.caratula || evt.causa.sumario || '') : '',
          tipo: evt.tipo || 'Vencimiento',
          fecha: evt.fecha || '',
          days: evt.days
        }));

      const res = await sendEmailAlerts(sheetsUrl, emailInput.trim(), diasMaxInput, userName, targetEvents);
      setEmailStatus({ type: 'success', text: res.message || 'Reporte enviado con éxito.' });
    } catch (err) {
      const isInvalidAction = err.message && err.message.toLowerCase().includes('acción no válida');
      if (isInvalidAction) {
        setShowScriptGuide(true);
        setEmailStatus({
          type: 'error',
          text: 'El código en tu Google Sheets no tiene la función de envío de emails todavía. Debes actualizar el Apps Script en Google (creando una "Nueva Versión").'
        });
      } else {
        setEmailStatus({ type: 'error', text: err.message || 'Error al enviar el reporte. Verifica la URL de Google Sheets.' });
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const handleToggleTrigger = async () => {
    if (!emailInput.trim() && !isTriggerActive) return;

    setSettingTrigger(true);
    setEmailStatus(null);
    setShowScriptGuide(false);
    try {
      const sheetsUrl = getStoredSheetsUrl();

      if (isTriggerActive) {
        // Desactivar alerta diaria
        const res = await deleteTriggerAlerts(sheetsUrl, userName);
        setIsTriggerActive(false);
        setEmailStatus({ type: 'success', text: res.message || 'Alerta diaria desactivada correctamente.' });
      } else {
        // Activar alerta diaria
        const res = await createTriggerAlerts(sheetsUrl, emailInput.trim(), diasMaxInput, userName);
        setIsTriggerActive(true);
        setEmailStatus({ type: 'success', text: res.message || 'Alerta diaria (8:00 AM) activada correctamente.' });
      }
    } catch (err) {
      const isInvalidAction = err.message && err.message.toLowerCase().includes('acción no válida');
      if (isInvalidAction) {
        setShowScriptGuide(true);
        setEmailStatus({
          type: 'error',
          text: 'El código en tu Google Sheets requiere actualización para activar o desactivar alertas automáticas.'
        });
      } else {
        setEmailStatus({ type: 'error', text: err.message || 'Error al modificar el activador diario.' });
      }
    } finally {
      setSettingTrigger(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Alertas por Correo Electrónico
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  MPBA
                </span>
              </h3>
              <p className="text-xs text-slate-400">Configuración y envío de notificaciones de vencimientos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* High-Visibility Trigger Status Card */}
        <div className={`p-4 rounded-xl border transition-all ${
          isTriggerActive
            ? 'bg-emerald-950/60 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
            : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold border ${
                isTriggerActive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}>
                {isTriggerActive ? <CheckCircle2 className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Alerta Diaria Matutina (8:00 AM)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                    isTriggerActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {isTriggerActive ? '● ACTIVADA' : '○ DESACTIVADA'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isTriggerActive
                    ? `Resumen matutino programado diariamente a: ${emailInput || 'tu correo'}`
                    : 'Las notificaciones diarias automáticas están apagadas.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleTrigger}
              disabled={settingTrigger || sendingEmail}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isTriggerActive
                  ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-500/50 hover:border-rose-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 shadow-emerald-900/30'
              }`}
            >
              {settingTrigger ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isTriggerActive ? (
                <>
                  <BellOff className="h-3.5 w-3.5" />
                  <span>Desactivar</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Activar Alerta</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dirección de Correo Electrónico Destinatario:
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="ejemplo@mpba.gov.ar"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ingresa la casilla donde deseas recibir el informe formateado en HTML con las alertas procesales.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Rango de Días a Incluir en los Reportes:
            </label>
            <select
              value={diasMaxInput}
              onChange={(e) => setDiasMaxInput(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value={7}>Próximos 7 días hábiles / Vencidos</option>
              <option value={15}>Próximos 15 días (Recomendado)</option>
              <option value={30}>Próximos 30 días</option>
              <option value={60}>Próximos 60 días</option>
            </select>
          </div>

          {/* Status Message */}
          {emailStatus && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              emailStatus.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            }`}>
              {emailStatus.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{emailStatus.text}</span>
            </div>
          )}

          {/* Script Update Instructions Box */}
          {showScriptGuide && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                  <HelpCircle className="h-4 w-4" /> Pasos para Actualizar Google Apps Script (10 segundos):
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? '¡Código Copiado!' : 'Copiar Código de Script'}
                </button>
              </div>

              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>Abre tu hoja de cálculo en <strong>Google Sheets</strong>.</li>
                <li>Ve al menú superior: <strong>Extensiones &gt; Apps Script</strong>.</li>
                <li>Borra todo el código actual, pega el nuevo código (usando el botón de arriba) y presiona el ícono de guardar (💾).</li>
                <li>En la esquina superior derecha, haz clic en: <strong>Implementar &gt; Administrar implementaciones</strong>.</li>
                <li>Haz clic en el ícono del <strong>Lápiz (Editar)</strong>, en Versión selecciona <strong>"Nueva versión"</strong> y presiona <strong>Implementar</strong>.</li>
              </ol>
            </div>
          )}

          {/* Primary Action Button: Send Email Now */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={sendingEmail || settingTrigger}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando Reporte de Inmediato...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Enviar Reporte por Email Ahora</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
