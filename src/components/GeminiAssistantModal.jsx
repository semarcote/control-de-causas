import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User, Key, CheckCircle, AlertTriangle, RefreshCw, Calendar, Search, ShieldAlert, ArrowRight, CornerDownLeft } from 'lucide-react';
import { getStoredGeminiApiKey, setStoredGeminiApiKey, getStoredGeminiHistory, setStoredGeminiHistory, sendPromptToGemini } from '../services/geminiService';
import { formatDisplayDate, calculate4MonthsIPPDate } from './CausasTable';

export default function GeminiAssistantModal({ isOpen, onClose, causas = [], currentUser, onSaveCausa, onSelectCausa }) {
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const messagesEndRef = useRef(null);

  // Sync state when currentUser or isOpen changes
  useEffect(() => {
    if (isOpen && currentUser) {
      const currentKey = getStoredGeminiApiKey(currentUser);
      setApiKey(currentKey);
      setTempApiKey(currentKey);

      const storedHistory = getStoredGeminiHistory(currentUser);
      if (storedHistory && storedHistory.length > 0) {
        setMessages(storedHistory);
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: `¡Hola **${currentUser.name || 'Usuario'}**! Soy tu **Asistente Inteligente Gemini** personal para el Control de Causas MPBA.\n\nPuedo ayudarte a buscar expedientes, consultar próximos vencimientos (IPP a 4 meses, Prisión Preventiva, Pericias), registrar nuevas audiencias o generar un resumen procesal.`,
            timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

      if (!currentKey) {
        setShowConfig(true);
      } else {
        setShowConfig(false);
      }
    }
  }, [isOpen, currentUser?.id, currentUser?.name]);

  // Save history on changes
  useEffect(() => {
    if (currentUser && messages.length > 0) {
      setStoredGeminiHistory(currentUser, messages);
    }
  }, [messages, currentUser?.id, currentUser?.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSaveKey = (e) => {
    e.preventDefault();
    setStoredGeminiApiKey(currentUser, tempApiKey);
    setApiKey(tempApiKey.trim());
    setApiError('');
    setShowConfig(false);
  };

  const handleSendPrompt = async (promptText) => {
    const textToSend = promptText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    if (!apiKey) {
      setShowConfig(true);
      return;
    }

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setApiError('');

    try {
      // Build conversation history format for API
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }));

      const res = await sendPromptToGemini(textToSend.trim(), history, causas, apiKey, currentUser);

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.text,
        proposal: res.proposal,
        toolResult: res.toolResult,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Gemini error:', err);
      if (err.message === 'API_KEY_MISSING' || err.message === 'API_KEY_INVALID') {
        setApiError('Clave API inválida o ausente. Ingrese su clave de API de Google Gemini para continuar.');
        setShowConfig(true);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ **Error en la solicitud**: ${err.message || 'No se pudo conectar con Gemini API.'}`,
            timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and execute a proposal from Gemini Function Call
  const handleConfirmProposal = (msgId, proposal) => {
    const { actionName, causaTarget, args } = proposal;
    const causa = causas.find(c => c.id === causaTarget.id);

    if (!causa) {
      alert('No se encontró la causa objetivo.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    if (actionName === 'registrar_audiencia') {
      const newAud = {
        id: `aud-${Date.now()}`,
        fecha: formatDisplayDate(args.fecha || todayStr),
        hora: args.hora || '10:00',
        tipo: args.tipo || 'Audiencia Procesal',
        observaciones: args.observaciones || `Registrada vía Gemini IA por ${currentUser?.name || 'Usuario'}`,
        estado: 'Pendiente'
      };

      const existingAuds = Array.isArray(causa.audiencias) ? causa.audiencias : [];
      const updatedAuds = [...existingAuds, newAud];

      const entry = `${todayStr} Audiencia registrada vía Gemini IA (${currentUser?.name || 'Usuario'}): ${newAud.tipo} para el ${newAud.fecha} a las ${newAud.hora} hs`;
      const updatedTramite = causa.tramite ? `${causa.tramite} /// ${entry}` : entry;

      const updatedCausa = {
        ...causa,
        audiencias: updatedAuds,
        tramite: updatedTramite,
        revisado: todayStr
      };

      if (onSaveCausa) onSaveCausa(updatedCausa);

      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, proposalConfirmed: true, text: `${m.text}\n\n✅ **Audiencia registrada exitosamente** en la causa ${causa.ipp || causa.caratula} para la fecha **${newAud.fecha}**.` } : m)
      );
    } else if (actionName === 'actualizar_pericia') {
      const periciasList = Array.isArray(causa.pericias) ? [...causa.pericias] : [];
      const targetState = args.nuevoEstado || 'en_proceso';
      const targetType = (args.periciaIdOrTipo || '').toLowerCase();

      let periciaFound = false;
      const updatedPericias = periciasList.map(p => {
        if (!periciaFound && (targetType === '' || (p.tipo || '').toLowerCase().includes(targetType))) {
          periciaFound = true;
          return {
            ...p,
            estado: targetState,
            finalizada: targetState === 'agregada' || targetState === 'cumplida'
          };
        }
        return p;
      });

      if (!periciaFound && args.periciaIdOrTipo) {
        updatedPericias.push({
          id: `p-${Date.now()}`,
          tipo: args.periciaIdOrTipo,
          fecha: 'Sin fecha',
          estado: targetState,
          finalizada: targetState === 'agregada' || targetState === 'cumplida'
        });
      }

      const activeP = updatedPericias.find(p => !p.finalizada && p.estado !== 'agregada') || updatedPericias[0];
      const entry = `${todayStr} Pericia actualizada vía Gemini IA (${currentUser?.name || 'Usuario'} - ${targetState}): ${args.periciaIdOrTipo || 'Procesal'}`;
      const updatedTramite = causa.tramite ? `${causa.tramite} /// ${entry}` : entry;

      const updatedCausa = {
        ...causa,
        pericias: updatedPericias,
        pericia_fecha: activeP ? activeP.fecha : '',
        pericia_detalle: activeP ? activeP.tipo : '',
        pericia_finalizada: activeP ? (activeP.finalizada || activeP.estado === 'agregada') : false,
        pericia_estado: activeP ? (activeP.estado || '') : '',
        tramite: updatedTramite,
        revisado: todayStr
      };

      if (onSaveCausa) onSaveCausa(updatedCausa);

      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, proposalConfirmed: true, text: `${m.text}\n\n✅ **Pericia actualizada exitosamente** a estado *"${targetState}"* en la causa ${causa.ipp || causa.caratula}.` } : m)
      );
    } else if (actionName === 'actualizar_causa') {
      const isDet = args.detenido === 'SI' || args.detenido === 'SÍ';
      const isInd = args.indagatoria === 'SI' || args.indagatoria === 'SÍ';
      const fInd = isInd ? formatDisplayDate(args.fechaIndagatoria || todayStr) : '';
      const vIPP = isInd ? calculate4MonthsIPPDate(fInd) : causa.vencimiento_ipp;

      const entry = `${todayStr} Actualización vía Gemini IA (${currentUser?.name || 'Usuario'}): ${args.observacion || 'Modificación de estado/detenido/indagatoria'}`;
      const updatedTramite = causa.tramite ? `${causa.tramite} /// ${entry}` : entry;

      const updatedCausa = {
        ...causa,
        estado: args.nuevoEstado || causa.estado,
        detenido: args.detenido ? (isDet ? 'SI' : 'NO') : causa.detenido,
        fecha_detencion: isDet ? formatDisplayDate(args.fechaDetencion || causa.fecha_detencion || todayStr) : '',
        indagatoria: args.indagatoria ? (isInd ? 'SI' : 'NO') : causa.indagatoria,
        fecha_indagatoria: fInd || causa.fecha_indagatoria,
        vencimiento_ipp: vIPP || causa.vencimiento_ipp,
        tramite: updatedTramite,
        revisado: todayStr
      };

      if (onSaveCausa) onSaveCausa(updatedCausa);

      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, proposalConfirmed: true, text: `${m.text}\n\n✅ **Causa actualizada exitosamente** en la causa ${causa.ipp || causa.caratula}.` } : m)
      );
    }
  };

  const handleClearHistory = () => {
    const freshMessages = [
      {
        id: 'welcome',
        role: 'assistant',
        text: `¡Conversación reiniciada para **${currentUser?.name || 'Usuario'}**! ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(freshMessages);
    setStoredGeminiHistory(currentUser, freshMessages);
  };

  const quickPrompts = [
    { label: '🔍 Causas con detenido', prompt: 'Buscar causas con imputado detenido' },
    { label: '📅 ¿Qué audiencias hay?', prompt: '¿Qué audiencias están programadas próximamente?' },
    { label: '⏰ Vencimientos a 15 días', prompt: '¿Qué vencimientos procesales tengo en los próximos 15 días?' },
    { label: '📝 Registrar Audiencia', prompt: 'Quiero registrar una audiencia de declaración Art. 308' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-4xl h-[88vh] bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden glass-panel">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Asistente Gemini • <span className="text-purple-300">{currentUser?.name || 'Usuario'}</span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-extrabold text-purple-300 border border-purple-500/30">
                  AI Personal
                </span>
              </h2>
              <p className="text-xs text-slate-400">Módulo Gemini IA exclusivo para {currentUser?.name || 'este usuario'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                apiKey
                  ? 'bg-slate-900 text-emerald-400 border-emerald-500/40 hover:bg-slate-800'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}
              title="Configurar Clave API Gemini del Usuario"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{apiKey ? 'API Conectada' : 'Registrar Clave API'}</span>
            </button>

            <button
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="Limpiar chat de este usuario"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* API Key Configuration Panel overlay */}
        {showConfig && (
          <div className="p-4 bg-slate-950/95 border-b border-slate-800 animate-slideDown flex flex-col gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Key className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-white">Registro de Gemini API Key para {currentUser?.name || 'este Usuario'}</h3>
                <p className="text-slate-400">
                  Ingresa la clave de API de Google Gemini para el perfil de <strong>{currentUser?.name || 'tu usuario'}</strong>. Se guardará de forma privada e independiente en tu equipo. Obtén una clave gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveKey} className="flex gap-2 items-center mt-1">
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-900 text-slate-100 px-3.5 py-2 rounded-xl border border-slate-800 focus:border-purple-500 focus:outline-none font-mono text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-600/30 shrink-0"
              >
                Guardar Clave del Usuario
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
              )}
            </form>
            {apiError && <p className="text-rose-400 font-medium">{apiError}</p>}
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 p-2.5 px-4 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" />
            Sugerencias:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(qp.prompt)}
              disabled={isLoading}
              className="px-3 py-1 rounded-full bg-slate-900 hover:bg-purple-900/40 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-500/40 text-xs transition whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 rounded-2xl border text-xs leading-relaxed transition-all shadow-md ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none'
                      : 'bg-slate-900/90 text-slate-200 border-slate-800 rounded-tl-none space-y-2'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {/* Proposal Execution Confirmation Card */}
                  {m.proposal && !m.proposalConfirmed && (
                    <div className="mt-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2.5 text-xs text-slate-200">
                      <div className="flex items-center gap-2 font-bold text-purple-300">
                        <ShieldAlert className="h-4 w-4 text-purple-400" />
                        <span>Confirmación Requerida ({currentUser?.name})</span>
                      </div>
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                        <div><span className="text-slate-400">Acción:</span> <strong className="text-purple-300">{m.proposal.actionName}</strong></div>
                        <div><span className="text-slate-400">Causa:</span> <strong className="text-white">{m.proposal.causaTarget.ipp || m.proposal.causaTarget.caratula}</strong></div>
                        {Object.entries(m.proposal.args || {}).map(([k, v]) => (
                          <div key={k}><span className="text-slate-400">{k}:</span> <span className="text-slate-200">{String(v)}</span></div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleConfirmProposal(m.id, m.proposal)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Confirmar y Aplicar Cambio</span>
                      </button>
                    </div>
                  )}

                  {/* Search Results Mini Cards */}
                  {m.toolResult && m.toolResult.type === 'search_results' && m.toolResult.causas?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="font-bold text-slate-300 text-[11px]">Expedientes Encontrados ({m.toolResult.count}):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {m.toolResult.causas.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (onSelectCausa) onSelectCausa(c);
                              onClose();
                            }}
                            className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition flex flex-col gap-1"
                          >
                            <div className="font-bold text-blue-400 flex items-center justify-between text-[11px]">
                              <span>{c.ipp || c.id}</span>
                              <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-300">{c.estado}</span>
                            </div>
                            <div className="text-[11px] font-medium text-slate-200 truncate">{c.caratula}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>

              {m.role === 'user' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 shrink-0">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping"></span>
                <span>Gemini procesando la consulta procesal para {currentUser?.name}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-2 bg-slate-900 p-1.5 pl-3.5 rounded-xl border border-slate-800 focus-within:border-purple-500 transition"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Escribe tu consulta (${currentUser?.name || 'Usuario'})... ej: buscar causas con detenido`}
              disabled={isLoading}
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition shadow-md shadow-purple-600/20 shrink-0"
            >
              <span>Enviar</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
