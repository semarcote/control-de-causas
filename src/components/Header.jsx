import React, { useState, useEffect } from 'react';
import { Scale, Plus, Download, RefreshCw, Clock, ShieldAlert, Users, LogOut, Calendar, Files, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export default function Header({
  totalCausas,
  aRevisarCount,
  urgentVencimientosCount,
  currentUser,
  activePage,
  onPageChange,
  onNewCausa,
  onExportData,
  onResetData,
  onLogout
}) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('es-AR', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-3 sm:px-6 space-y-3">
      <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Title & Organization info */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                CONTROL DE CAUSAS
              </h1>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                UFI N° 10
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="capitalize">{currentDate}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons & User Info */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNewCausa}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nueva Causa
          </button>

          {/* Logged User Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-2.5 py-1.5 border border-slate-800 text-xs">
                <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="block font-bold text-slate-200 text-[11px] leading-tight uppercase tracking-wide">
                    {currentUser.name.toUpperCase()}
                  </span>
                  <span className="block text-[10px] text-slate-400 leading-tight">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Cerrar Sesión"
                className="flex items-center gap-1 rounded-xl bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Main Page Navigation Bar */}
      <div className="w-full flex items-center gap-2 pt-1 border-t border-slate-800/60">
        
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
