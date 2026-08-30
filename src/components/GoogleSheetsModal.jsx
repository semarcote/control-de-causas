import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  APPS_SCRIPT_TEMPLATE,
  getStoredSheetsUrl,
  setStoredSheetsUrl,
  getLastSyncTime,
  fetchCausasFromSheets,
  syncAllToSheets
} from '../services/googleSheetsService';

export default function GoogleSheetsModal({
  isOpen,
  onClose,
  causas,
  onUpdateCausas,
  syncStatus,
  setSyncStatus
}) {
  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'guide' | 'code'
  const [testResult, setTestResult] = useState(null); // null | { type: 'success'|'error', text: string }
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const currentUrl = getStoredSheetsUrl();
      setUrlInput(currentUrl);
      setLastSync(getLastSyncTime());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveUrl = async (e) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setStoredSheetsUrl('');
      setSyncStatus('offline');
      setTestResult({ type: 'info', text: 'Conexión eliminada. Modo Offline local activo.' });
      return;
    }

    setIsProcessing(true);
    setTestResult(null);

    try {
      // Probar conexión trayendo datos
      const data = await fetchCausasFromSheets(cleanUrl);
      setStoredSheetsUrl(cleanUrl);
      setSyncStatus('connected');
      setLastSync(getLastSyncTime());
      setTestResult({
        type: 'success',
        text: `¡Conexión exitosa! Se encontraron ${data.length} causas en la planilla de Google Sheets.`
      });
      // Si el usuario quiere actualizar con las causas traídas de Sheets
      if (data.length > 0) {
        if (window.confirm(`Se obtuvieron ${data.length} causas desde Google Sheets. ¿Deseas reemplazar el listado actual con el de Google Sheets?`)) {
          onUpdateCausas(data);
        }
      }
    } catch (err) {
      console.error('Error probando conexión a Sheets:', err);
      setTestResult({
        type: 'error',
        text: `Error de conexión: ${err.message}. Asegúrate de haber publicado el script como "Aplicación web" accesible a "Cualquiera".`
      });
      setSyncStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePushToSheets = async () => {
    const url = getStoredSheetsUrl();
    if (!url) {
      alert('Debes configurar y guardar la URL de Google Apps Script primero.');
      return;
    }

    if (!window.confirm(`Se enviarán las ${causas.length} causas actuales de la página web hacia tu Google Sheet. ¿Continuar?`)) {
      return;
    }

    setIsProcessing(true);
    setSyncStatus('syncing');
    setTestResult(null);

    try {
      await syncAllToSheets(url, causas);
      setSyncStatus('connected');
      setLastSync(getLastSyncTime());
      setTestResult({
        type: 'success',
        text: `¡Éxito! Se han exportado las ${causas.length} causas a tu Google Sheet correctamente.`
      });
    } catch (err) {
      console.error('Error en Push a Sheets:', err);
      setSyncStatus('error');
      setTestResult({
        type: 'error',
        text: `Falló la exportación: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullFromSheets = async () => {
    const url = getStoredSheetsUrl();
    if (!url) {
      alert('Debes configurar y guardar la URL de Google Apps Script primero.');
      return;
    }

    setIsProcessing(true);
    setSyncStatus('syncing');
    setTestResult(null);

    try {
      const data = await fetchCausasFromSheets(url);
      setSyncStatus('connected');
      setLastSync(getLastSyncTime());
      onUpdateCausas(data);
      setTestResult({
        type: 'success',
        text: `¡Éxito! Se importaron ${data.length} causas desde tu Google Sheet.`
      });
    } catch (err) {
      console.error('Error en Pull desde Sheets:', err);
      setSyncStatus('error');
      setTestResult({
        type: 'error',
        text: `Falló la importación: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Conexión con Google Sheets
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  Google Apps Script
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sincronización en tiempo real de causas procesales de la UFI N° 10
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            Configuración & Sincronización
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Guía Paso a Paso
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'code'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="h-4 w-4" />
            Código Apps Script
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">

          {/* TAB 1: CONFIGURACIÓN & SINCRONIZACIÓN */}
          {activeTab === 'config' && (
            <div className="space-y-6">

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : syncStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}>
                <div className="flex items-center gap-3">
                  {syncStatus === 'connected' && <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />}
                  {syncStatus === 'syncing' && <RefreshCw className="h-6 w-6 text-blue-400 animate-spin flex-shrink-0" />}
                  {syncStatus === 'error' && <AlertCircle className="h-6 w-6 text-rose-400 flex-shrink-0" />}
                  {syncStatus === 'offline' && <FileSpreadsheet className="h-6 w-6 text-slate-500 flex-shrink-0" />}

                  <div>
                    <h4 className="font-bold text-sm">
                      {syncStatus === 'connected' && 'Google Sheets Conectado'}
                      {syncStatus === 'syncing' && 'Sincronizando con Google Sheets...'}
                      {syncStatus === 'error' && 'Error de Conexión'}
                      {syncStatus === 'offline' && 'Modo Offline (Almacenamiento Local)'}
                    </h4>
                    <p className="text-xs opacity-80">
                      {syncStatus === 'connected' && `Última sincronización a las ${lastSync || 'recién'}`}
                      {syncStatus === 'syncing' && 'Procesando consulta con la Aplicación Web...'}
                      {syncStatus === 'error' && 'No se pudo contactar a la Web App de Google.'}
                      {syncStatus === 'offline' && 'Ingresa la URL de tu Web App para habilitar la sincronización.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopyScript}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? '¡Copiado!' : 'Copiar Script'}
                </button>
              </div>

              {/* URL Form */}
              <form onSubmit={handleSaveUrl} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  URL de la Aplicación Web de Google Apps Script:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Conectar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pega aquí la URL terminada en <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">/exec</code> que te otorga Google al implementar la aplicación web.
                </p>
              </form>

              {/* Feedback messages */}
              {testResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : testResult.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}>
                  {testResult.type === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  {testResult.type === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <span>{testResult.text}</span>
                </div>
              )}

              {/* Manual Synchronization Action Cards */}
              <div className="border-t border-slate-800 pt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Acciones de Sincronización Manual:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                        <UploadCloud className="h-4 w-4 text-emerald-400" />
                        Exportar de Web a Google Sheets
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Envía las <strong className="text-white">{causas.length} causas</strong> actuales guardadas en el navegador directamente a tu hoja de cálculo.
                      </p>
                    </div>
                    <button
                      onClick={handlePushToSheets}
                      disabled={isProcessing || !urlInput}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-2 text-xs font-bold transition disabled:opacity-40"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Guardar Todo en Google Sheets
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                        <DownloadCloud className="h-4 w-4 text-blue-400" />
                        Importar de Google Sheets a Web
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Descarga las causas registradas en la hoja de cálculo de Google y actualiza la lista de la página web.
                      </p>
                    </div>
                    <button
                      onClick={handlePullFromSheets}
                      disabled={isProcessing || !urlInput}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-2 text-xs font-bold transition disabled:opacity-40"
                    >
                      <DownloadCloud className="h-4 w-4" />
                      Cargar desde Google Sheets
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: GUÍA PASO A PASO */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-white">¿Cómo vincular tu Google Sheet en 5 sencillos pasos?</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400 text-xs flex-shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">Copia el Código Apps Script</h4>
                    <p className="text-slate-400 mt-0.5">
                      Haz clic en la pestaña <button onClick={() => setActiveTab('code')} className="text-emerald-400 underline font-semibold">Código Apps Script</button> o pulsa el botón de copiar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400 text-xs flex-shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">Abre tu Google Sheet & el Editor</h4>
                    <p className="text-slate-400 mt-0.5">
                      Abre tu hoja de Google Sheets en Google Drive. En el menú superior ve a: <strong className="text-white">Extensiones &gt; Apps Script</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400 text-xs flex-shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">Pega el Código y Guarda</h4>
                    <p className="text-slate-400 mt-0.5">
                      Borra el código que aparezca por defecto (ej. <code className="text-slate-300 bg-slate-800 px-1 rounded">myFunction</code>), pega el código copiado y haz clic en el icono de guardar (💾).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400 text-xs flex-shrink-0">
                    4
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">Implementar como Aplicación Web</h4>
                    <p className="text-slate-400 mt-0.5">
                      Haz clic en el botón azul <strong className="text-blue-400">Implementar &gt; Nueva implementación</strong>.
                    </p>
                    <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300">
                      <li>Tipo: <strong className="text-emerald-400">Aplicación web</strong></li>
                      <li>Ejecutar como: <strong className="text-emerald-400">Yo (tu email)</strong></li>
                      <li>Quién tiene acceso: <strong className="text-emerald-400">Cualquiera</strong> (o Anyone)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400 text-xs flex-shrink-0">
                    5
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">Copia la URL y Pégala en la App</h4>
                    <p className="text-slate-400 mt-0.5">
                      Copia la <strong className="text-white">URL de la aplicación web</strong> que te entrega Google y pégala en el campo de configuración de este modal. ¡Y listo!
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveTab('config')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Ir a Ingresar URL
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CÓDIGO APPS SCRIPT */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Copia este código y pégalo en el editor de Apps Script de tu Google Sheet:
                </p>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-500 transition"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? '¡Copiado al Portapapeles!' : 'Copiar Código Completo'}
                </button>
              </div>

              <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 max-h-[350px] overflow-auto">
                <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap">
                  {APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/70 px-6 py-3 text-xs text-slate-400">
          <span>Control de Causas UFI N° 10 • Google Sheets API Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
