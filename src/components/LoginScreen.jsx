import React, { useState } from 'react';
import { Shield, Lock, Mail, Eye, EyeOff, KeyRound, AlertCircle, ArrowRight, UserCheck, UserPlus, User } from 'lucide-react';

export default function LoginScreen({ users, onLogin, onRegisterUser }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Instructor Judicial');
  const [regSuccess, setRegSuccess] = useState('');

  const handleEmailChange = (val, setter, currentVal) => {
    if (val.endsWith('@') && !currentVal.endsWith('@')) {
      setter(`${val}mpba.gov.ar`);
    } else {
      setter(val);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(
      u => u.email.toLowerCase() === cleanEmail && u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales inválidas. Verifique el usuario y la contraseña.');
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      setError('El correo o usuario ingresado ya se encuentra registrado.');
      return;
    }

    const newUser = {
      id: `u-${Date.now()}`,
      name: regName.trim(),
      email: cleanEmail,
      password: regPassword.trim(),
      role: regRole
    };

    setRegSuccess(`¡Usuario registrado! Creando pestaña en Google Sheets...`);
    setTimeout(() => {
      if (onRegisterUser) {
        onRegisterUser(newUser);
      } else {
        onLogin(newUser);
      }
    }, 1000);
  };

  const handleQuickLogin = (quickUser) => {
    setEmail(quickUser.email);
    setPassword(quickUser.password);
    onLogin(quickUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Dynamic background glow shapes */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-5">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 ring-1 ring-blue-400/40">
            <Shield className="h-9 w-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              CONTROL DE CAUSAS
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mt-1">
              Ministerio Público Fiscal • Dpto. Judicial Zárate-Campana
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sistema de Gestión Procesal, Vencimientos y Control Pericial
          </p>
        </div>

        {/* Tab Switcher: Iniciar Sesión / Crear Usuario */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'register'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Crear Nuevo Usuario</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl shadow-slate-950/80 backdrop-blur-xl relative">
          
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {regSuccess && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-pulse">
              <UserCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{regSuccess}</span>
            </div>
          )}

          {/* TAB 1: INICIAR SESIÓN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Usuario / Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="ejemplo@mpba.gov.ar"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value, setEmail, email)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition no-uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition no-uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.99]"
              >
                <KeyRound className="h-4 w-4" />
                Ingresar al Sistema
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* TAB 2: CREAR NUEVO USUARIO */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nombre Completo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Dr. Carlos Gómez"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 focus:border-emerald-500 focus:outline-none no-uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Correo Electrónico / Usuario <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="cgomez@mpba.gov.ar"
                    value={regEmail}
                    onChange={(e) => handleEmailChange(e.target.value, setRegEmail, regEmail)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 focus:border-emerald-500 focus:outline-none no-uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Contraseña de Acceso <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 focus:border-emerald-500 focus:outline-none no-uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Rol / Cargo Judicial
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-900/90 text-white border border-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Instructor Judicial">Instructor Judicial</option>
                  <option value="Secretario / Instructor">Secretario / Instructor</option>
                  <option value="Auxiliar Letrado">Auxiliar Letrado</option>
                  <option value="Empleado Judicial">Empleado Judicial</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition active:scale-[0.99]"
              >
                <UserPlus className="h-4 w-4" />
                Registrarse e Ingresar al Sistema
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500">
          Ministerio Público Fiscal &copy; 2026 - Control de Causas en Trámite
        </p>

      </div>
    </div>
  );
}
