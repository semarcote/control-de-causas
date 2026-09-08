import React, { useState, useEffect } from 'react';
import { Scale, Plus, Download, RefreshCw, Clock, ShieldAlert, Users, LogOut, Calendar, Files, AlertTriangle, FileSpreadsheet, Sparkles, Mail } from 'lucide-react';

export default function Header({
  totalCausas,
  aRevisarCount,
  urgentVencimientosCount,
  audienciasCount = 0,
  currentUser,
  activePage,
  onPageChange,
  onNewCausa,
  onOpenEmailModal,
  onOpenGemini,
  onExportData,
  onResetData,
  onLogout
}) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      let str = now.toLocaleDateString('es-AR', options);
      // Capitalize first letter
      str = str.charAt(0).toUpperCase() + str.slice(1);
      setCurrentDate(str);
    };
    updateTime();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2">

        {/* Logo & System Identity */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/20">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white uppercase">CONTROL DE CAUSAS</h1>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-black text-blue-300 border border-blue-500/30">
                Ministerio Público Fiscal
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Dpto. Judicial Zárate-Campana <span className="mx-1">•</span> {currentDate}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onOpenEmailModal && (
            <button
              onClick={onOpenEmailModal}
              className="flex items-center gap-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Configurar y enviar alertas por correo electrónico"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden md:inline">Alertas por Email</span>
            </button>
          )}

          <button
            onClick={onNewCausa}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Causa</span>
          </button>

          {/* User Profile Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-200 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser.role || 'Usuario'}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition ml-1"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Page Navigation Bar */}
      <div className="w-full flex items-center gap-2 pt-1 border-t border-slate-800/60 overflow-x-auto no-scrollbar">

        <button
          onClick={() => onPageChange('causas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePage === 'causas'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
          }`}
        >
          <Files className="h-4 w-4" />
          <span>Listado de Causas</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            activePage === 'causas' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {totalCausas}
          </span>
        </button>

        <button
          onClick={() => onPageChange('vencimientos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePage === 'vencimientos'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4 text-amber-400" />
          <span>Alertas de Vencimiento</span>
          {urgentVencimientosCount > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
              {urgentVencimientosCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onPageChange('audiencias')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePage === 'audiencias'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4 text-blue-400" />
          <span>Audiencias</span>
          {audienciasCount > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/30 text-blue-300 border border-blue-400/40">
              {audienciasCount}
            </span>
          )}
        </button>

        {/* Gemini AI Assistant Button */}
        {onOpenGemini && (
          <button
            onClick={onOpenGemini}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-purple-900/50 to-indigo-900/50 text-purple-200 hover:text-white hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/40 shadow-lg shadow-purple-900/20"
            title="Abrir Asistente Inteligente Gemini IA"
          >
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <span>Asistente Gemini</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-500/30 text-purple-300 border border-purple-400/30">
              IA
            </span>
          </button>
        )}

        {(currentUser?.role === 'Administrador General' || currentUser?.name?.toLowerCase().includes('marcote')) && (
          <button
            onClick={() => onPageChange('usuarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePage === 'usuarios'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Gestión de Usuarios</span>
          </button>
        )}

      </div>

    </header>
  );
}
