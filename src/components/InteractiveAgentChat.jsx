import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, X, Sparkles, AlertCircle, FileText, Calendar, Clock, ChevronRight, User, Shield, Search } from 'lucide-react';
import { parseAnyDate, formatDisplayDate, checkPPStatusSpecial, getVencimientoIPP, isFinalizedState } from './CausasTable';

export default function InteractiveAgentChat({ causas = [], currentUser, onSelectCausa }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `¡Hola ${currentUser?.name ? currentUser.name.split(' ')[0] : ''}! Soy tu **Agente Fiscal Interactivo** 🤖. Puedo analizar todas tus causas en tiempo real, informarte sobre vencimientos urgentes, redactar actas o buscar expedientes específicos. ¿En qué te puedo ayudar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Knowledge engine over local causas dataset
  const processQuery = (queryText) => {
    const q = queryText.toLowerCase().trim();
    const now = new Date();

    // 1. Query about urgent expirations / vencimientos (STRICTLY FOR CAUSAS EN TRÁMITE)
    if (q.includes('vencimiento') || q.includes('urgente') || q.includes('plazo') || q.includes('prision') || q.includes('preventiva')) {
      const urgentList = causas.filter(c => {
        if (!c) return false;
        if (isFinalizedState(c.estado, c.tramite)) return false;

        const ippDate = getVencimientoIPP(c);
        const pp1 = c.vencimiento_pp1 || c.vencimiento_pp;
        return (ippDate && !checkPPStatusSpecial(ippDate)) || (c.detenido === 'SI' && pp1 && !checkPPStatusSpecial(pp1));
      });

      if (urgentList.length === 0) {
        return `✅ **Sin vencimientos críticos inminentes**: No se registran plazos de Prisión Preventiva ni vencimientos de IPP en tus causas en trámite.`;
      }

      let response = `🚨 **Diagnóstico de Vencimientos en Causas en Trámite (${urgentList.length}):**\n\n`;
      urgentList.slice(0, 5).forEach((c, idx) => {
        const vIPP = c.vencimiento_ipp ? `Venc. IPP: ${c.vencimiento_ipp}` : '';
        const vPP = c.vencimiento_pp1 ? `1º Venc. PP: ${c.vencimiento_pp1}` : '';
        response += `${idx + 1}. **IPP ${c.ipp}** - *${c.caratula || 'Sin carátula'}*\n   ↳ ${vPP || vIPP} (Estado: En trámite)\n\n`;
      });
      return response;
    }

    // 2. Query about detainees / detenidos (STRICTLY FOR CAUSAS EN TRÁMITE)
    if (q.includes('detenido') || q.includes('preso') || q.includes('aprehendido') || q.includes('carcel')) {
      const detenidosList = causas.filter(c => {
        if (!c) return false;
        if (isFinalizedState(c.estado, c.tramite)) return false;
        return c.detenido === 'SI' || c.detenido === 'SÍ';
      });

      if (detenidosList.length === 0) {
        return `ℹ️ **Sin detenidos registrados en trámite**: Actualmente no tenés causas en trámite con personas privadas de la libertad.`;
      }

      let response = `⛓️ **Registro de Detenidos en Causas en Trámite (${detenidosList.length}):**\n\n`;
      detenidosList.forEach((c, idx) => {
        response += `${idx + 1}. **IPP ${c.ipp}** - *${c.caratula}*\n   ↳ Detenido desde: ${c.fecha_detencion || 'Sin fecha'} | PP1: ${c.vencimiento_pp1 || 'N/D'}\n\n`;
      });
      return response;
    }

    // 3. Request to draft an "Acta Art. 308" or legal document
    if (q.includes('redact') || q.includes('acta') || q.includes('308') || q.includes('escrito') || q.includes('borrador')) {
      const sampleCausa = causas[0];
      const ippStr = sampleCausa ? sampleCausa.ipp : '18-01-008767-26/00';
      const caratulaStr = sampleCausa ? sampleCausa.caratula : 'IMPUTADO S/ DELITO';

      return `📝 **Borrador Automático de Acta de Declaración Art. 308 CPP:**

--------------------------------------------------
**ACTA DE DECLARACIÓN (ARTÍCULO 308 C.P.P.P.B.A.)**
**I.P.P. N°:** ${ippStr}
**CARÁTULA:** ${caratulaStr}
**FECHA Y HORA:** ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs.
**DEPENDENCIA:** Unidad Funcional de Instrucción y Juicio N° 10 - Dpto. Judicial Zárate-Campana.

En la ciudad de Escobar, a los ${new Date().getDate()} días del mes de ${new Date().toLocaleString('es-AR', { month: 'long' })} de ${new Date().getFullYear()}, comparece ante el Sr. Instructor Judicial de la UFI N° 10, Asistido por su Defensor Oficial/Particular, la persona del imputado en la presente IPP.

**I. HECHO IMPUTADO:** Se le atribuye haber tomado parte en el hecho acaecido el día...
**II. DERECHOS:** Se le hacen saber los derechos y garantías constitucionales (Art. 308 y conc. del C.P.P.).
--------------------------------------------------
*(Podés copiar este texto directamente para tus actuaciones)*`;
    }

    // 4. Search specific IPP or name
    const matches = causas.filter(c => {
      if (!c) return false;
      const ippMatch = (c.ipp || '').toLowerCase().includes(q);
      const carMatch = (c.caratula || '').toLowerCase().includes(q);
      return ippMatch || carMatch;
    });

    if (matches.length > 0) {
      let response = `🔍 **Expedientes encontrados para tu búsqueda (${matches.length}):**\n\n`;
      matches.slice(0, 4).forEach((c, idx) => {
        response += `${idx + 1}. **IPP ${c.ipp}** - *${c.caratula}*\n   ↳ Estado: ${c.estado} | Ingreso: ${c.fecha_inicio || c.revisado || 'N/D'}\n\n`;
      });
      return response;
    }

    // 5. Default intelligent summary response
    const enTramiteCount = causas.filter(c => c && c.estado === 'En Trámite').length;
    return `📊 **Resumen General de tu Fiscalía:**
Actualmente tenés **${causas.length} causas registradas** en el sistema (**${enTramiteCount} causas activas en trámite**).

Podés pedirme:
• *"¿Qué vencimientos tengo urgentes?"*
• *"Lista de detenidos"*
• *"Redactar acta Art. 308"*
• *"Buscar causa por IPP o carátula"*`;
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputQuery.trim()) return;

    const userText = inputQuery.trim();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    // Simulated instant agent response
    setTimeout(() => {
      const botResponse = processQuery(userText);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    }, 300);
  };

  const handleQuickCommand = (cmdText) => {
    setInputQuery(cmdText);
    setTimeout(() => {
      const userMsg = {
        id: Date.now(),
        sender: 'user',
        text: cmdText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);

      setTimeout(() => {
        const botResponse = processQuery(cmdText);
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: botResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }, 300);
    }, 50);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-2xl shadow-blue-600/40 border border-blue-400/40 transition-all transform hover:scale-105 active:scale-95 group"
      >
        <div className="relative">
          <Bot className="h-5 w-5 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <span className="hidden sm:inline font-black tracking-wide">Agente Fiscal IA</span>
      </button>

      {/* Slide-over Interactive Chat Window */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Agente Interactivo Fiscal
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    En Línea
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Asistente en tiempo real de causas procesales</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickCommand('¿Qué vencimientos tengo urgentes?')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 font-semibold whitespace-nowrap transition"
            >
              🚨 Vencimientos
            </button>
            <button
              type="button"
              onClick={() => handleQuickCommand('Lista de detenidos')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 font-semibold whitespace-nowrap transition"
            >
              ⛓️ Detenidos
            </button>
            <button
              type="button"
              onClick={() => handleQuickCommand('Redactar borrador de acta Art. 308')}
              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 font-semibold whitespace-nowrap transition"
            >
              📝 Redactar 308
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="h-7 w-7 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/20 font-medium'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-md'
                  }`}
                >
                  {msg.text}
                  <div className={`text-[9px] mt-1.5 text-right font-mono ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 focus-within:border-blue-500 transition">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Preguntame sobre vencimientos, causas o redactar escrituras..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 px-2 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className={`p-2 rounded-lg transition ${
                  inputQuery.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

        </div>
      )}
    </>
  );
}
