import React, { useState } from 'react';
import { X, UserPlus, Shield, Key, Trash2, CheckCircle2, User, Mail, Pencil, Save, RotateCcw } from 'lucide-react';

export default function UserManagementModal({ users, onAddUser, onUpdateUser, onDeleteUser, onClose }) {
  // Create user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Secretario / Instructor');
  
  // Edit user state (null when not editing)
  const [editingUserId, setEditingUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    const newUser = {
      id: `u-${Date.now()}`,
      name: name.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role: role
    };

    onAddUser(newUser);
    setName('');
    setEmail('');
    setPassword('');
    setSuccessMsg(`Usuario ${newUser.name} creado (se generó su pestaña en Google Sheets)`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditName(user.name.toUpperCase());
    setEditEmail(user.email);
    setEditPassword(user.password);
    setEditRole(user.role);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
    setEditRole('');
  };

  const handleEditSubmit = (e, userId) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim() || !editPassword.trim()) return;

    const updatedUser = {
      id: userId,
      name: editName.trim().toUpperCase(),
      email: editEmail.trim().toLowerCase(),
      password: editPassword.trim(),
      role: editRole
    };

    onUpdateUser(updatedUser);
    setSuccessMsg(`Datos del usuario "${updatedUser.name}" actualizados correctamente`);
    cancelEdit();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteClick = (userToDelete) => {
    if (window.confirm(`¿Está seguro de que desea eliminar al usuario "${userToDelete.name}" (${userToDelete.email})? Se eliminará también su pestaña en Google Sheets.`)) {
      onDeleteUser(userToDelete.id);
      setSuccessMsg(`Usuario "${userToDelete.name}" eliminado correctamente`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-900/95 text-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestión de Usuarios y Accesos (Administrador)</h2>
              <p className="text-xs text-slate-400">Edita datos, claves y usuarios de la UFI N° 10</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs flex-1">
          
          {/* Notification Alert */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form: Create New User */}
          <form onSubmit={handleCreateSubmit} className="space-y-4 rounded-xl bg-slate-950/70 p-4 border border-slate-800/80">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-bold text-blue-400 flex items-center gap-2 text-xs">
                <UserPlus className="h-4 w-4" />
                Crear Nuevo Usuario Judicial
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Se generará su perfil de acceso y automáticamente su pestaña en Google Sheets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Dr. Carlos Gómez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Correo Electrónico / Usuario</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="cgomez@ufi10.gob.ar"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Contraseña de Acceso</label>
                <div className="relative">
                  <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 text-white placeholder-slate-500 border border-slate-800 focus:border-blue-500 focus:outline-none font-mono no-uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Rol / Cargo Judicial</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Instructor Judicial">Instructor Judicial</option>
                  <option value="Secretario / Instructor">Secretario / Instructor</option>
                  <option value="Auxiliar Letrado">Auxiliar Letrado</option>
                  <option value="Empleado Judicial">Empleado Judicial</option>
                  <option value="Fiscal Titular / Adjunto">Fiscal Titular / Adjunto</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 transition"
              >
                <UserPlus className="h-4 w-4" />
                Guardar Nuevo Usuario
              </button>
            </div>
          </form>

          {/* Registered Users List with Edit Mode */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Usuarios Registrados y Edición de Credenciales ({users.length})
            </h3>

            <div className="space-y-3">
              {users.map((u) => {
                const isAdminUser = u.id === 'u-admin-marcote' || (u.role === 'Administrador General' && u.email === 'admin@ufi10.gob.ar');
                const isEditingThis = editingUserId === u.id;

                if (isEditingThis) {
                  return (
                    <form
                      key={u.id}
                      onSubmit={(e) => handleEditSubmit(e, u.id)}
                      className="p-4 rounded-xl bg-slate-950 border border-blue-500/50 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Editando Usuario: {u.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {u.id}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">Correo Electrónico / Usuario</label>
                          <input
                            type="email"
                            required
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">Contraseña</label>
                          <input
                            type="text"
                            required
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 focus:border-blue-500 focus:outline-none font-mono no-uppercase"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">Rol / Cargo</label>
                          {isAdminUser ? (
                            <input
                              type="text"
                              disabled
                              value="Administrador General"
                              className="w-full px-3 py-2 rounded-xl bg-slate-900/60 text-amber-300 border border-slate-800 font-bold"
                            />
                          ) : (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 focus:border-blue-500 focus:outline-none"
                            >
                              <option value="Instructor Judicial">Instructor Judicial</option>
                              <option value="Secretario / Instructor">Secretario / Instructor</option>
                              <option value="Auxiliar Letrado">Auxiliar Letrado</option>
                              <option value="Empleado Judicial">Empleado Judicial</option>
                              <option value="Fiscal Titular / Adjunto">Fiscal Titular / Adjunto</option>
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition font-semibold"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition font-bold shadow-lg"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Guardar Cambios
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl border flex items-center justify-center font-black ${
                        isAdminUser ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{u.name}</span>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            isAdminUser ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>Email/User: <strong className="text-slate-200">{u.email}</strong></span>
                          <span>•</span>
                          <span>Clave: <strong className="text-slate-200">{u.password}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 text-xs font-semibold transition"
                        title={`Editar datos y contraseña de ${u.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-blue-400" />
                        <span>Editar</span>
                      </button>

                      {!isAdminUser && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(u)}
                          className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300 transition"
                          title={`Eliminar usuario ${u.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
