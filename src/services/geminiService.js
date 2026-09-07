// Gemini Service for Control de Causas MPBA - Multi-User Scoped
// Handles Google Gemini API calls, Function Calling (Tools), and user-scoped API key/history storage.

function getUserStorageKey(user, prefix) {
  const uName = (user?.name || user?.id || 'default').trim().toLowerCase().replace(/\s+/g, '_');
  return `${prefix}_${uName}`;
}

export function getStoredGeminiApiKey(user) {
  if (!user) return '';
  const key = getUserStorageKey(user, 'control_causas_gemini_key');
  return localStorage.getItem(key) || '';
}

export function setStoredGeminiApiKey(user, apiKey) {
  const key = getUserStorageKey(user, 'control_causas_gemini_key');
  if (!apiKey) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, apiKey.trim());
  }
}

export function getStoredGeminiHistory(user) {
  try {
    const key = getUserStorageKey(user, 'control_causas_gemini_history');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredGeminiHistory(user, history) {
  try {
    const key = getUserStorageKey(user, 'control_causas_gemini_history');
    if (!history || history.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(history.slice(-30))); // Keep last 30 messages
    }
  } catch (e) {}
}

// Function declarations (Tools) for Gemini
const TOOL_DEFINITIONS = [
  {
    name: 'buscar_causas',
    description: 'Busca y filtra expedientes o causas en el sistema por término de búsqueda (IPP, carátula, delito), estado procesal, sumario, detención o presencia de indagatoria.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Término de búsqueda (número de IPP, apellido del imputado, carátula o delito).' },
        estado: { type: 'STRING', description: 'Filtrar por estado procesal (ej: "En Trámite", "En Espera", "Archivada", etc.).' },
        detenido: { type: 'STRING', description: 'Filtrar por presencia de detenido: "SI" o "NO".' },
        sumario: { type: 'STRING', description: 'Filtrar por sumario: "SI" o "NO".' }
      }
    }
  },
  {
    name: 'consultar_vencimientos',
    description: 'Consulta los vencimientos procesales próximos a vencer (Prisión Preventiva, IPP a 4 meses de indagatoria, o pericias) dentro de los próximos N días.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diasMaximos: { type: 'NUMBER', description: 'Número máximo de días hacia adelante para consultar vencimientos (por defecto 15 o 30 días).' }
      }
    }
  },
  {
    name: 'registrar_audiencia',
    description: 'Prepara una orden para registrar una nueva audiencia fijada en una causa específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        causaIdOrIPP: { type: 'STRING', description: 'ID o número de IPP / carátula de la causa donde se fijará la audiencia.' },
        fecha: { type: 'STRING', description: 'Fecha de la audiencia en formato DD/MM/AA o DD/MM/YYYY.' },
        hora: { type: 'STRING', description: 'Hora de la audiencia (ej: "10:00", "11:30").' },
        tipo: { type: 'STRING', description: 'Tipo de audiencia (ej: "Declaración Art. 308", "Audiencia PP", "Informativa", etc.).' },
        observaciones: { type: 'STRING', description: 'Observaciones o notas adicionales de la audiencia.' }
      },
      required: ['causaIdOrIPP', 'fecha', 'tipo']
    }
  },
  {
    name: 'actualizar_pericia',
    description: 'Prepara una orden para actualizar el estado de una pericia en una causa (ej: marcar como "en_proceso" o "agregada").',
    parameters: {
      type: 'OBJECT',
      properties: {
        causaIdOrIPP: { type: 'STRING', description: 'ID o IPP de la causa.' },
        periciaIdOrTipo: { type: 'STRING', description: 'Nombre o tipo de pericia (ej: "Psicológica", "CTA Menor", "Balística").' },
        nuevoEstado: { type: 'STRING', description: 'Nuevo estado de la pericia: "en_proceso", "agregada", "pendiente".' }
      },
      required: ['causaIdOrIPP', 'nuevoEstado']
    }
  },
  {
    name: 'actualizar_causa',
    description: 'Prepara una actualización del estado procesal, imputado detenido o indagatoria de una causa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        causaIdOrIPP: { type: 'STRING', description: 'ID o número de IPP de la causa a modificar.' },
        nuevoEstado: { type: 'STRING', description: 'Nuevo estado procesal (ej: "En Trámite", "En Espera", "Archivadas", "Elevadas a Juicio", etc.).' },
        detenido: { type: 'STRING', description: '"SI" o "NO" indicando si el imputado pasa a estar detenido.' },
        fechaDetencion: { type: 'STRING', description: 'Fecha de detención en formato DD/MM/AA (requerido si detenido es SI).' },
        indagatoria: { type: 'STRING', description: '"SI" o "NO" indicando si tiene imputado con indagatoria.' },
        fechaIndagatoria: { type: 'STRING', description: 'Fecha en que fue indagado en formato DD/MM/AA.' },
        observacion: { type: 'STRING', description: 'Motivo o nota registrada en la línea de tiempo.' }
      },
      required: ['causaIdOrIPP']
    }
  },
  {
    name: 'generar_resumen_causa',
    description: 'Solicita un análisis y resumen detallado del historial procesal y estado de una causa específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        causaIdOrIPP: { type: 'STRING', description: 'ID, IPP o carátula de la causa a resumir.' }
      },
      required: ['causaIdOrIPP']
    }
  }
];

// Helper to execute function call against current causas array
export function executeGeminiTool(toolCall, causas) {
  const { name, args } = toolCall;

  if (name === 'buscar_causas') {
    const q = (args.query || '').toLowerCase().trim();
    const est = (args.estado || '').toLowerCase().trim();
    const det = (args.detenido || '').toUpperCase().trim();
    const sum = (args.sumario || '').toUpperCase().trim();

    const results = causas.filter(c => {
      if (q) {
        const matchesIPP = (c.ipp || '').toLowerCase().includes(q);
        const matchesCaratula = (c.caratula || '').toLowerCase().includes(q);
        const matchesTramite = (c.tramite || '').toLowerCase().includes(q);
        if (!matchesIPP && !matchesCaratula && !matchesTramite) return false;
      }
      if (est && !(c.estado || '').toLowerCase().includes(est)) return false;
      if (det && c.detenido !== det) return false;
      if (sum && c.sumario !== sum) return false;
      return true;
    });

    return {
      type: 'search_results',
      count: results.length,
      causas: results.slice(0, 10).map(c => ({
        id: c.id,
        ipp: c.ipp,
        caratula: c.caratula,
        estado: c.estado,
        detenido: c.detenido,
        sumario: c.sumario,
        denuncia: c.denunciado_en,
        indagatoria: c.indagatoria,
        vencimiento_ipp: c.vencimiento_ipp,
        vencimiento_pp: c.vencimiento_pp1 || c.vencimiento_pp
      }))
    };
  }

  if (name === 'consultar_vencimientos') {
    const maxDays = args.diasMaximos || 30;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const parseDate = (dStr) => {
      if (!dStr || dStr === '-' || dStr === 'Sin fecha') return null;
      const parts = String(dStr).trim().split('/');
      if (parts.length < 3) return null;
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      const d = new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      return isNaN(d.getTime()) ? null : d;
    };

    const vencimientos = [];
    causas.forEach(c => {
      if (c.estado === 'Archivadas' || c.estado === 'Desestimadas' || c.estado === 'Sobreseimientos' || c.estado === 'Elevadas a Juicio') return;

      // IPP
      if (c.vencimiento_ipp) {
        const d = parseDate(c.vencimiento_ipp);
        if (d) {
          const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
          if (diffDays <= maxDays) {
            vencimientos.push({
              causa: c.ipp || c.caratula,
              tipo: 'Vencimiento IPP',
              fecha: c.vencimiento_ipp,
              faltanDias: diffDays
            });
          }
        }
      }

      // PP
      if ((c.detenido === 'SI' || c.detenido === 'SÍ') && c.vencimiento_pp1) {
        const d = parseDate(c.vencimiento_pp1);
        if (d) {
          const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
          if (diffDays <= maxDays) {
            vencimientos.push({
              causa: c.ipp || c.caratula,
              tipo: '1º Vencimiento PP (Detenido)',
              fecha: c.vencimiento_pp1,
              faltanDias: diffDays
            });
          }
        }
      }

      // Pericias
      const periciasList = Array.isArray(c.pericias) ? c.pericias : [];
      periciasList.forEach(p => {
        const st = String(p.estado || '').toLowerCase();
        if (p.finalizada || st === 'agregada' || st === 'cumplida' || st === 'en_proceso') return;
        const d = parseDate(p.fecha);
        if (d) {
          const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
          if (diffDays <= maxDays) {
            vencimientos.push({
              causa: c.ipp || c.caratula,
              tipo: `Pericia: ${p.tipo || 'Procesal'}`,
              fecha: p.fecha,
              faltanDias: diffDays
            });
          }
        }
      });
    });

    return {
      type: 'vencimientos_results',
      totalCount: vencimientos.length,
      vencimientos: vencimientos.sort((a, b) => a.faltanDias - b.faltanDias).slice(0, 15)
    };
  }

  if (name === 'generar_resumen_causa') {
    const q = (args.causaIdOrIPP || '').toLowerCase().trim();
    const causa = causas.find(c => (c.id && c.id.toLowerCase() === q) || (c.ipp && c.ipp.toLowerCase().includes(q)) || (c.caratula && c.caratula.toLowerCase().includes(q)));

    if (!causa) {
      return { error: `No se encontró ninguna causa que coincida con "${args.causaIdOrIPP}".` };
    }

    return {
      type: 'causa_resumen',
      causa: {
        id: causa.id,
        ipp: causa.ipp,
        caratula: causa.caratula,
        estado: causa.estado,
        detenido: causa.detenido,
        fecha_detencion: causa.fecha_detencion || 'Sin fecha',
        indagatoria: causa.indagatoria || 'NO',
        fecha_indagatoria: causa.fecha_indagatoria || '-',
        vencimiento_ipp: causa.vencimiento_ipp || 'Sin vencimiento',
        vencimiento_pp1: causa.vencimiento_pp1 || 'Sin fecha',
        denunciado_en: causa.denunciado_en,
        periciasCount: Array.isArray(causa.pericias) ? causa.pericias.length : 0,
        audienciasCount: Array.isArray(causa.audiencias) ? causa.audiencias.length : 0,
        tramite: causa.tramite || 'Sin movimientos registrados'
      }
    };
  }

  // Proposals requiring confirmation
  if (name === 'registrar_audiencia' || name === 'actualizar_pericia' || name === 'actualizar_causa') {
    const q = (args.causaIdOrIPP || '').toLowerCase().trim();
    const causa = causas.find(c => (c.id && c.id.toLowerCase() === q) || (c.ipp && c.ipp.toLowerCase().includes(q)) || (c.caratula && c.caratula.toLowerCase().includes(q)));

    if (!causa) {
      return { error: `No se encontró ninguna causa que coincida con "${args.causaIdOrIPP}". Verifique el número de IPP o carátula.` };
    }

    return {
      type: 'proposal',
      actionName: name,
      causaTarget: { id: causa.id, ipp: causa.ipp, caratula: causa.caratula },
      args
    };
  }

  return { error: 'Acción no reconocida' };
}

const MODELS_TO_TRY = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

async function fetchGeminiAPI(key, requestBody) {
  let lastErr = null;

  for (const model of MODELS_TO_TRY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        return { ok: true, data, model };
      }

      const errText = await response.text();
      console.warn(`Gemini model ${model} response status ${response.status}:`, errText);
      lastErr = errText;

      if (response.status === 400 && (errText.includes('API_KEY_INVALID') || errText.includes('API key not valid'))) {
        throw new Error('API_KEY_INVALID');
      }
    } catch (e) {
      if (e.message === 'API_KEY_INVALID') throw e;
      lastErr = e.message;
    }
  }

  throw new Error(`Error en la API de Gemini: ${lastErr || 'Modelos no disponibles.'}`);
}

// Main execution API for Gemini Assistant
export async function sendPromptToGemini(userPrompt, conversationHistory = [], causas = [], apiKey = '', currentUser = null) {
  const key = apiKey || getStoredGeminiApiKey(currentUser);
  if (!key) {
    throw new Error('API_KEY_MISSING');
  }

  const userNameStr = currentUser?.name ? ` (Usuario: ${currentUser.name})` : '';

  const systemInstruction = {
    parts: [
      {
        text: `Eres el Asistente Inteligente de la Unidad Funcional de Instrucción (UFI) del Ministerio Público Fiscal de Buenos Aires (MPBA)${userNameStr}.
Tu rol es asistir a los instructores y fiscales a buscar causas, consultar vencimientos procesales (IPP a 4 meses de indagatoria, Prisión Preventiva a 15 y 30 días), registrar audiencias, actualizar el estado de pericias e imputados detenidos.
Responde siempre de forma profesional, clara, concisa y cortés en español.
Usa markdown (negritas, listas, tablas) para presentar la información procesal de manera limpia.
Si el usuario solicita realizar cambios en una causa (registrar audiencias, modificar pericias o estado), utiliza las funciones disponibles (tools) de forma precisa.`
      }
    ]
  };

  const contents = [
    ...conversationHistory,
    {
      role: 'user',
      parts: [{ text: userPrompt }]
    }
  ];

  const requestBody = {
    systemInstruction,
    contents,
    tools: [
      {
        functionDeclarations: TOOL_DEFINITIONS
      }
    ]
  };

  const { data } = await fetchGeminiAPI(key, requestBody);
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No se recibió respuesta válida de Gemini.');
  }

  const part = candidate.content?.parts?.[0];

  // Check if Gemini invoked a tool call
  if (part?.functionCall) {
    const fnCall = part.functionCall;
    const toolResult = executeGeminiTool(fnCall, causas);

    // If tool returned a proposal requiring user click confirmation
    if (toolResult.type === 'proposal') {
      return {
        type: 'proposal',
        text: `Entendido. He preparado la orden para **${fnCall.name === 'registrar_audiencia' ? 'registrar la audiencia' : fnCall.name === 'actualizar_pericia' ? 'actualizar la pericia' : 'actualizar la causa'}** en la causa **${toolResult.causaTarget.ipp || toolResult.causaTarget.caratula}**. Por favor, revisa y confirma la acción abajo:`,
        proposal: toolResult
      };
    }

    // Otherwise send tool result back to Gemini for second turn response
    const secondTurnContents = [
      ...contents,
      {
        role: 'model',
        parts: [{ functionCall: fnCall }]
      },
      {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: fnCall.name,
              response: toolResult
            }
          }
        ]
      }
    ];

    try {
      const secondRes = await fetchGeminiAPI(key, {
        systemInstruction,
        contents: secondTurnContents
      });

      const secondPart = secondRes.data.candidates?.[0]?.content?.parts?.[0];
      return {
        type: 'text',
        text: secondPart?.text || 'Búsqueda completada exitosamente.',
        toolResult
      };
    } catch (e) {
      return {
        type: 'text',
        text: `Resultados encontrados (${toolResult.count || toolResult.totalCount || 0}):\n\n` + JSON.stringify(toolResult, null, 2),
        toolResult
      };
    }
  }

  return {
    type: 'text',
    text: part?.text || 'No se obtuvo texto de respuesta.'
  };
}
