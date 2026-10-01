import React, { useState, useMemo } from 'react';
import { Upload, FileText, Check, AlertTriangle, X, Download, Eye, Sparkles, Database, FileUp, CheckCircle2, Ban, Plus } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Worker configuration for pdfjs-dist browser parsing
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n--- PÁGINA ${pageNum} ---\n` + pageText;
  }
  return fullText;
}

export function parseCausesFromText(rawText) {
  if (!rawText) return [];
  const results = [];
  const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // PBA IPP regex matcher: 18-XX-XXXXXX-YY/ZZ or XX-XX-XXXXXX-YY/ZZ
  const fullIppRegex = /(?:18-)?(\d{2})-(\d{1,6})-(\d{2})(?:\/(\d{2}))?/gi;

  let match;
  while ((match = fullIppRegex.exec(rawText)) !== null) {
    const rawIpp = match[0];
    const dept = match[1].padStart(2, '0');
    const num = match[2].padStart(6, '0');
    const year = match[3].padStart(2, '0');
    const suf = match[4] ? match[4].padStart(2, '0') : '00';
    const formattedIpp = `18-${dept}-${num}-${year}/${suf}`;

    const startIndex = Math.max(0, match.index - 80);
    const endIndex = Math.min(rawText.length, match.index + 220);
    const snippet = rawText.substring(startIndex, endIndex);

    // Extract carátula if present
    let caratula = '';
    const caratulaMatch = snippet.match(/(?:(?:[A-ZÁÉÍÓÚÑ]{2,}\s+){1,4}(?:S\/|C\/|s\/|c\/)\s*(?:[A-ZÁÉÍÓÚÑ\s,]{3,40}))/i);
    if (caratulaMatch) {
      caratula = caratulaMatch[0].trim().toUpperCase();
    } else {
      const afterIpp = rawText.substring(match.index + rawIpp.length, match.index + rawIpp.length + 80);
      const cleanAfter = afterIpp.split('\n')[0].replace(/^[\s:\-\–]+/, '').trim();
      if (cleanAfter.length >= 3) {
        caratula = cleanAfter.substring(0, 60).toUpperCase();
      }
    }

    // Detect estado
    let estado = 'En Trámite';
    const snipLower = snippet.toLowerCase();
    if (snipLower.includes('archiv')) estado = 'Archivada';
    else if (snipLower.includes('elevad')) estado = 'Elevada a Juicio';
    else if (snipLower.includes('paradero')) estado = 'Paradero';
    else if (snipLower.includes('captura')) estado = 'Captura';
    else if (snipLower.includes('desestim')) estado = 'Desestimada';
    else if (snipLower.includes('incompet')) estado = 'Incompetencia';
    else if (snipLower.includes('sobrese')) estado = 'Sobreseída';

    if (!results.some(r => r.ipp === formattedIpp)) {
      results.push({
        id: `pdf-imp-${Date.now()}-${results.length}`,
        ipp: formattedIpp,
        caratula: caratula || 'S/ CARÁTULA EXTRAÍDA DE PDF',
        estado,
        denunciado_en: 'Mesa de Entradas',
        revisado: todayStr,
        revisar_dias: '10',
        detenido: 'NO',
        sumario: 'NO',
        tramite: 'Carga masiva realizada desde reporte PDF'
      });
    }
  }

  return results;
}

export default function PdfImporterModal({ causas = [], onClose, onImportCausas }) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [parsedCauses, setParsedCauses] = useState([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState({});
  const [manualTextInput, setManualTextInput] = useState('');
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'text'

  // Map existing IPPs for quick duplicate checking
  const existingIppSet = useMemo(() => {
    const set = new Set();
    (causas || []).forEach(c => {
      if (c && c.ipp) {
        set.add(c.ipp.trim().toLowerCase().replace(/\s+/g, ''));
      }
    });
    return set;
  }, [causas]);

  // Handle PDF file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setIsExtracting(true);

    try {
      const text = await extractTextFromPdfFile(file);
      setExtractedText(text);
      const items = parseCausesFromText(text);
      setParsedCauses(items);

      // Select all non-duplicate items by default
      const initialMap = {};
      items.forEach(item => {
        const norm = item.ipp.trim().toLowerCase().replace(/\s+/g, '');
        if (!existingIppSet.has(norm)) {
          initialMap[item.id] = true;
        }
      });
      setSelectedItemsMap(initialMap);
    } catch (err) {
      console.error('Error al procesar el archivo PDF:', err);
      alert('Ocurrió un error al leer el archivo PDF. Asegúrese de que sea un PDF válido.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle manual text parsing
  const handleProcessManualText = () => {
    if (!manualTextInput.trim()) return;
    setIsExtracting(true);
    setTimeout(() => {
      const items = parseCausesFromText(manualTextInput);
      setExtractedText(manualTextInput);
      setParsedCauses(items);

      const initialMap = {};
      items.forEach(item => {
        const norm = item.ipp.trim().toLowerCase().replace(/\s+/g, '');
        if (!existingIppSet.has(norm)) {
          initialMap[item.id] = true;
        }
      });
      setSelectedItemsMap(initialMap);
      setIsExtracting(false);
    }, 200);
  };

  const toggleSelectAll = () => {
    const allSelected = parsedCauses.every(c => selectedItemsMap[c.id]);
    const nextMap = {};
    if (!allSelected) {
      parsedCauses.forEach(c => {
        nextMap[c.id] = true;
      });
    }
    setSelectedItemsMap(nextMap);
  };

  const handleToggleItem = (id) => {
    setSelectedItemsMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleUpdateItemField = (id, field, value) => {
    setParsedCauses(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const countSelectedToImport = useMemo(() => {
    return Object.values(selectedItemsMap).filter(Boolean).length;
  }, [selectedItemsMap]);

  const handleConfirmImport = () => {
    const toImport = parsedCauses.filter(c => selectedItemsMap[c.id]);
    if (toImport.length === 0) {
      alert('Por favor seleccione al menos una causa para importar.');
      return;
    }

    if (onImportCausas) {
      onImportCausas(toImport);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel relative w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 p-4 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Carga Masiva de Causas Leyendo PDF
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-black text-blue-300 border border-blue-500/30">
                  Lectura Automática
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Extraiga e importe listados de I.P.P. desde reportes PDF o textos de actuaciones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection: PDF File Upload vs Manual Text */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950/40 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-slate-900 text-blue-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Subir Archivo PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 ${
              activeTab === 'text'
                ? 'bg-slate-900 text-blue-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Pegar Texto de PDF / SIMP</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Tab 1: PDF Upload Dropzone */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl bg-slate-950/60 cursor-pointer transition text-center group">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <FileUp className="h-10 w-10 text-blue-400 group-hover:scale-110 transition-transform mb-2" />
                <p className="text-sm font-bold text-white">
                  Haga clic para seleccionar o arrastre un archivo PDF
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Admite reportes del SIMP, listados de mesa de entradas, calendarios u oficios judiciales
                </p>

                {fileName && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/40">
                    Archivo cargado: {fileName}
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Tab 2: Manual Text Input */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="block text-slate-300 font-semibold">
                Pegue aquí el texto copiado de un reporte PDF o sistema SIMP:
              </label>
              <textarea
                rows={5}
                value={manualTextInput}
                onChange={(e) => setManualTextInput(e.target.value)}
                placeholder="Ejemplo: IPP 18-01-008767-26/00 SALVATIERRA S/ ABUSO SEXUAL - EN TRAMITE..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleProcessManualText}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Sparkles className="h-4 w-4" />
                Procesar e Identificar Causas en Texto
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isExtracting && (
            <div className="p-6 text-center rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
              <div className="h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-blue-300">
                Leyendo archivo PDF y analizando patrones de IPP...
              </p>
            </div>
          )}

          {/* Extraction Results Table & Preview */}
          {!isExtracting && parsedCauses.length > 0 && (
            <div className="space-y-3">
              
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold">
                    Causas detectadas en el PDF: <strong className="text-white font-mono">{parsedCauses.length}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[11px] border border-blue-500/30">
                    {countSelectedToImport} seleccionadas para importar
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                >
                  {parsedCauses.every(c => selectedItemsMap[c.id]) ? 'Desmarcar Todas' : 'Seleccionar Todas'}
                </button>
              </div>

              {/* Table List */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    <tr>
                      <th className="p-2.5 text-center w-10">Importar</th>
                      <th className="p-2.5">Número I.P.P.</th>
                      <th className="p-2.5">Carátula Extraída</th>
                      <th className="p-2.5">Estado Detectado</th>
                      <th className="p-2.5 text-center">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {parsedCauses.map((item) => {
                      const isSelected = !!selectedItemsMap[item.id];
                      const normIpp = item.ipp.trim().toLowerCase().replace(/\s+/g, '');
                      const isAlreadyInSystem = existingIppSet.has(normIpp);

                      return (
                        <tr key={item.id} className={`transition hover:bg-slate-800/40 ${isSelected ? 'bg-blue-950/20' : ''}`}>
                          
                          {/* Checkbox */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(item.id)}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* IPP Editable */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.ipp}
                              onChange={(e) => handleUpdateItemField(item.id, 'ipp', e.target.value)}
                              className="bg-slate-950 text-amber-300 font-bold px-2 py-1 rounded border border-slate-800 w-full focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* Caratula Editable */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.caratula}
                              onChange={(e) => handleUpdateItemField(item.id, 'caratula', e.target.value.toUpperCase())}
                              className="bg-slate-950 text-slate-200 px-2 py-1 rounded border border-slate-800 w-full focus:border-blue-500 focus:outline-none truncate"
                            />
                          </td>

                          {/* Estado Selector */}
                          <td className="p-2.5">
                            <select
                              value={item.estado}
                              onChange={(e) => handleUpdateItemField(item.id, 'estado', e.target.value)}
                              className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800 focus:border-blue-500 focus:outline-none text-xs cursor-pointer"
                            >
                              <option value="En Trámite">En Trámite</option>
                              <option value="Archivada">Archivada</option>
                              <option value="Elevada a Juicio">Elevada a Juicio</option>
                              <option value="Paradero">Paradero</option>
                              <option value="Captura">Captura</option>
                              <option value="Desestimada">Desestimada</option>
                              <option value="Incompetencia">Incompetencia</option>
                              <option value="Sobreseída">Sobreseída</option>
                            </select>
                          </td>

                          {/* System Validation Badge */}
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {isAlreadyInSystem ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40" title="Esta causa ya existe registrada en el sistema">
                                <AlertTriangle className="h-3 w-3 text-rose-400" />
                                Duplicada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                Lista para Importar
                              </span>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {!isExtracting && parsedCauses.length === 0 && (extractedText || fileName) && (
            <div className="p-6 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <Ban className="h-8 w-8 text-rose-400 mx-auto" />
              <p className="text-xs font-bold text-slate-300">
                No se encontraron números de I.P.P. con formato judicial en el archivo procesado.
              </p>
              <p className="text-[11px] text-slate-500">
                Asegúrese de que el PDF contenga texto seleccionable con números de I.P.P. (ej. 18-01-008767-26/00).
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer / Import Button */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/90 p-4 px-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={countSelectedToImport === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
              countSelectedToImport === 0
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Importar {countSelectedToImport} Causas Seleccionadas</span>
          </button>
        </div>

      </div>
    </div>
  );
}
