import React, { useState, useMemo } from 'react';
import { Upload, FileText, Check, AlertTriangle, X, Download, Eye, Sparkles, Database, FileUp, CheckCircle2, Ban, Plus, FileSpreadsheet } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Worker configuration for pdfjs-dist browser parsing
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// 1. Extract raw text from PDF files
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

// 2. Download sample Excel template for users
export function downloadExcelTemplate() {
  const templateData = [
    [
      'I.P.P. (Número Causa)',
      'Carátula / Imputado y Delito',
      'Estado',
      'Lugar de Inicio / Denuncia',
      'Último Trámite',
      'Detenido (SI/NO)'
    ],
    [
      '18-01-001234-26/00',
      'PEREZ JUAN CARLOS S/ ROBO CALIFICADO',
      'En Trámite',
      'Sede Policial',
      'Ingreso causa a la UFI 10',
      'NO'
    ],
    [
      '18-01-005678-26/00',
      'GONZALEZ MARIA S/ HURTO SIMPLE',
      'Archivada',
      'Mesa de Entradas',
      'Archivada según art. 268 CPP',
      'NO'
    ],
    [
      '18-01-009988-26/00',
      'RODRIGUEZ PEDRO S/ AMENAZAS',
      'Elevada a Juicio',
      'Denuncia UFI',
      'Elevada al Juzgado de Garantías N° 2',
      'SI'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 22 }, // IPP
    { wch: 45 }, // Caratula
    { wch: 18 }, // Estado
    { wch: 25 }, // Lugar Inicio
    { wch: 40 }, // Ultimo tramite
    { wch: 16 }  // Detenido
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Causas');
  XLSX.writeFile(wb, 'Plantilla_Carga_Masiva_Causas.xlsx');
}

// 3. Parse Excel files (.xlsx, .xls, .csv)
export async function parseCausesFromExcelFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const results = [];
  const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rows || rows.length === 0) return;

    let headerIdx = -1;
    let colMap = { ipp: -1, caratula: -1, estado: -1, denunciado_en: -1, tramite: -1, detenido: -1 };

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r].map(c => String(c).trim().toLowerCase());
      const ippCol = row.findIndex(c => c.includes('ipp') || c.includes('causa') || c.includes('numero') || c.includes('expediente'));
      if (ippCol !== -1) {
        headerIdx = r;
        colMap.ipp = ippCol;
        colMap.caratula = row.findIndex(c => c.includes('caratula') || c.includes('delito') || c.includes('imputado'));
        colMap.estado = row.findIndex(c => c.includes('estado'));
        colMap.denunciado_en = row.findIndex(c => c.includes('inicio') || c.includes('denuncia') || c.includes('origen') || c.includes('dependencia') || c.includes('lugar'));
        colMap.tramite = row.findIndex(c => c.includes('tramite') || c.includes('actuacion') || c.includes('novedad') || c.includes('ultimo'));
        colMap.detenido = row.findIndex(c => c.includes('detenido') || c.includes('preso'));
        break;
      }
    }

    if (headerIdx !== -1 && colMap.ipp !== -1) {
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawIppVal = String(row[colMap.ipp] || '').trim();
        if (!rawIppVal) continue;

        const match = rawIppVal.match(/(?:PP-)?(?:18-)?(\d{2})-(\d{1,6})-(\d{2})(?:\/(\d{2}))?/i);
        let formattedIpp = rawIppVal;
        if (match) {
          const dept = match[1].padStart(2, '0');
          const num = match[2].padStart(6, '0');
          const year = match[3].padStart(2, '0');
          const suf = match[4] ? match[4].padStart(2, '0') : '00';
          formattedIpp = `18-${dept}-${num}-${year}/${suf}`;
        }

        if (!formattedIpp.includes('18-') && formattedIpp.length < 8) continue;

        const caratula = colMap.caratula !== -1 && row[colMap.caratula] ? String(row[colMap.caratula]).trim().toUpperCase() : `PROCESO ${formattedIpp}`;
        const estado = colMap.estado !== -1 && row[colMap.estado] ? String(row[colMap.estado]).trim() : 'En Trámite';
        const denunciadoEn = colMap.denunciado_en !== -1 && row[colMap.denunciado_en] ? String(row[colMap.denunciado_en]).trim() : 'Mesa de Entradas';
        const tramite = colMap.tramite !== -1 && row[colMap.tramite] ? String(row[colMap.tramite]).trim() : `Ingresado desde planilla Excel (${sheetName})`;
        const detenido = colMap.detenido !== -1 && row[colMap.detenido] ? (String(row[colMap.detenido]).trim().toUpperCase().startsWith('S') ? 'SI' : 'NO') : 'NO';

        if (!results.some(res => res.ipp === formattedIpp)) {
          results.push({
            id: `excel-imp-${Date.now()}-${results.length}`,
            ipp: formattedIpp,
            caratula: caratula || `PROCESO ${formattedIpp}`,
            estado: estado || 'En Trámite',
            denunciado_en: denunciadoEn || 'Mesa de Entradas',
            revisado: todayStr,
            revisar_dias: '10',
            detenido: detenido,
            sumario: denunciadoEn.toLowerCase().includes('mesa') ? 'SÍ' : 'NO',
            tramite: tramite
          });
        }
      }
    }

    // Unstructured text / regex fallback on Excel content
    const allSheetText = rows.map(r => r.join(' ')).join('\n');
    const regexParsed = parseCausesFromText(allSheetText);
    regexParsed.forEach(regItem => {
      if (!results.some(r => r.ipp === regItem.ipp)) {
        results.push(regItem);
      }
    });
  });

  return results;
}

// 4. Parse text blocks / SIMP text
export function parseCausesFromText(rawText) {
  if (!rawText) return [];
  const results = [];
  const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // PBA / SIMP IPP regex matcher: PP-18-01-XXXXXX-YY/ZZ or 18-01-XXXXXX-YY/ZZ
  const simpIppRegex = /(?:PP-)?(?:18-)?(\d{2})-(\d{1,6})-(\d{2})(?:\/(\d{2}))?/gi;

  let match;
  while ((match = simpIppRegex.exec(rawText)) !== null) {
    const dept = match[1].padStart(2, '0');
    const num = match[2].padStart(6, '0');
    const year = match[3].padStart(2, '0');
    const suf = match[4] ? match[4].padStart(2, '0') : '00';
    const formattedIpp = `18-${dept}-${num}-${year}/${suf}`;

    const startIndex = Math.max(0, match.index - 50);
    const endIndex = Math.min(rawText.length, match.index + 300);
    const snippet = rawText.substring(startIndex, endIndex);

    // Extract dates
    const dates = snippet.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || [];
    const fechaInicio = dates[0] || todayStr;

    // Detect Forma Inicio / Origen
    let denunciadoEn = 'Mesa de Entradas';
    const snipLower = snippet.toLowerCase();
    if (snipLower.includes('sede policial') || snipLower.includes('acta de procedimiento')) {
      denunciadoEn = 'Sede Policial';
    } else if (snipLower.includes('denuncia en ufi') || snipLower.includes('sede judicial')) {
      denunciadoEn = 'Denuncia UFI';
    } else if (snipLower.includes('miba') || snipLower.includes('digital')) {
      denunciadoEn = 'Mesa de Entradas';
    }

    // Extract Carátula
    let caratula = '';
    const caratulaMatch = snippet.match(/(?:(?:[A-ZÁÉÍÓÚÑ]{2,}\s+){1,4}(?:S\/|C\/|s\/|c\/)\s*(?:[A-ZÁÉÍÓÚÑ\s,]{3,50}))/i);
    if (caratulaMatch) {
      caratula = caratulaMatch[0].trim().toUpperCase();
    } else {
      const formaMatch = snippet.match(/(Acta de procedimiento[^\n]*|En Sede Judicial[^\n]*|Denuncia iniciada[^\n]*|En sede judicial[^\n]*|Denuncia digital[^\n]*)/i);
      if (formaMatch) {
        caratula = formaMatch[0].trim().toUpperCase();
      } else {
        caratula = `PROCESO SIMP ${formattedIpp}`;
      }
    }

    // Detect Estado
    let estado = 'En Trámite';
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
        caratula: caratula,
        estado,
        denunciado_en: denunciadoEn,
        revisado: fechaInicio,
        revisar_dias: '10',
        detenido: 'NO',
        sumario: denunciadoEn.includes('Mesa') || denunciadoEn.includes('Digital') ? 'SÍ' : 'NO',
        tramite: `Ingresado desde reporte SIMP (Fecha Inicio: ${fechaInicio})`
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

  // Handle File Upload (PDF, XLSX, XLS, CSV)
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setIsExtracting(true);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let items = [];

      if (ext === 'pdf') {
        const text = await extractTextFromPdfFile(file);
        setExtractedText(text);
        items = parseCausesFromText(text);
      } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
        items = await parseCausesFromExcelFile(file);
        setExtractedText(`Planilla Excel procesada: ${file.name}`);
      } else {
        alert('Formato no soportado. Seleccione un archivo Excel (.xlsx, .xls), CSV (.csv) o PDF (.pdf)');
        return;
      }

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
      console.error('Error al procesar el archivo:', err);
      alert('Ocurrió un error al leer el archivo. Verifique que el archivo no esté dañado.');
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Carga Masiva de Causas (Excel, PDF, CSV y SIMP)
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-300 border border-indigo-500/30">
                  Importador Automático
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Suba planillas Excel, archivos PDF o pegue textos de actuaciones del SIMP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
              title="Descargar plantilla Excel oficial pre-estructurada"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Plantilla Excel</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection: File Upload vs Manual Text */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950/40 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-slate-900 text-indigo-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Subir Archivo Excel / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 ${
              activeTab === 'text'
                ? 'bg-slate-900 text-indigo-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Pegar Texto de PDF / SIMP</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Tab 1: File Upload Dropzone (Excel, PDF, CSV) */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl bg-slate-950/60 cursor-pointer transition text-center group">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <FileUp className="h-10 w-10 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                <p className="text-sm font-bold text-white">
                  Haga clic para seleccionar o arrastre un archivo Excel (.xlsx, .xls, .csv) o PDF
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Admite planillas personalizadas, plantillas oficiales, reportes SIMP o calendarios judiciales
                </p>

                {fileName && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/40">
                    Archivo seleccionado: {fileName}
                  </div>
                )}
              </label>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  ¿Necesita un formato de archivo guía?
                </span>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                >
                  Descargar Plantilla Excel de Ejemplo
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Manual Text Input */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="block text-slate-300 font-semibold">
                Pegue aquí el texto copiado de una planilla, PDF o del sistema SIMP:
              </label>
              <textarea
                rows={5}
                value={manualTextInput}
                onChange={(e) => setManualTextInput(e.target.value)}
                placeholder="Ejemplo: IPP 18-01-008767-26/00 SALVATIERRA S/ ABUSO SEXUAL - EN TRAMITE..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleProcessManualText}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Procesar e Identificar Causas en Texto
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isExtracting && (
            <div className="p-6 text-center rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-indigo-300">
                Procesando archivo y extrayendo registros de I.P.P...
              </p>
            </div>
          )}

          {/* Extraction Results Table & Preview */}
          {!isExtracting && parsedCauses.length > 0 && (
            <div className="space-y-3">
              
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold">
                    Causas detectadas en el archivo: <strong className="text-white font-mono">{parsedCauses.length}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px] border border-indigo-500/30">
                    {countSelectedToImport} seleccionadas para importar
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
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
                      <th className="p-2.5">Carátula / Imputado</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5 text-center">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {parsedCauses.map((item) => {
                      const isSelected = !!selectedItemsMap[item.id];
                      const normIpp = item.ipp.trim().toLowerCase().replace(/\s+/g, '');
                      const isAlreadyInSystem = existingIppSet.has(normIpp);

                      return (
                        <tr key={item.id} className={`transition hover:bg-slate-800/40 ${isSelected ? 'bg-indigo-950/20' : ''}`}>
                          
                          {/* Checkbox */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(item.id)}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* IPP Editable */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.ipp}
                              onChange={(e) => handleUpdateItemField(item.id, 'ipp', e.target.value)}
                              className="bg-slate-950 text-amber-300 font-bold px-2 py-1 rounded border border-slate-800 w-full focus:border-indigo-500 focus:outline-none"
                            />
                          </td>

                          {/* Caratula Editable */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.caratula}
                              onChange={(e) => handleUpdateItemField(item.id, 'caratula', e.target.value.toUpperCase())}
                              className="bg-slate-950 text-slate-200 px-2 py-1 rounded border border-slate-800 w-full focus:border-indigo-500 focus:outline-none truncate"
                            />
                          </td>

                          {/* Estado Selector */}
                          <td className="p-2.5">
                            <select
                              value={item.estado}
                              onChange={(e) => handleUpdateItemField(item.id, 'estado', e.target.value)}
                              className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
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
                Asegúrese de que la planilla Excel o PDF contenga números de I.P.P. (ej. 18-01-001234-26/00).
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer / Import Button */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/90 p-4 px-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
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
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
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
