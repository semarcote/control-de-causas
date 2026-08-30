import React, { useState, useEffect, useMemo } from 'react';
import initialCausasData from './data/causas.json';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import FilterBar from './components/FilterBar';
import CausasTable from './components/CausasTable';
import CausaModal from './components/CausaModal';
import NewCausaModal from './components/NewCausaModal';
import LoginScreen from './components/LoginScreen';
import UserManagementModal from './components/UserManagementModal';
import ExpirationPanel, { getDaysRemaining } from './components/ExpirationPanel';
import {
  getStoredSheetsUrl,
  fetchCausasFromSheets,
  updateCausaInSheets,
  createCausaInSheets,
  deleteCausaInSheets,
  createUserSheetTab,
  deleteUserSheetTab,
  saveUserToSheetsTab,
  fetchUsersFromSheetsTab,
  deleteUserFromSheetsTab
} from './services/googleSheetsService';

import { isFinalizedState, causaHasSumario } from './components/CausasTable';

const STORAGE_KEY = 'control_causas_ufi10_v12';
const USERS_STORAGE_KEY = 'control_causas_ufi10_users_v2';
const SESSION_STORAGE_KEY = 'control_causas_ufi10_session_v2';

const ADMIN_USER = {
  id: 'u-admin-marcote',
  name: 'SEBASTIÁN MARCOTE',
  email: 'admin@ufi10.gob.ar',
  password: 'admin',
  role: 'Administrador General'
};

const DEFAULT_USERS = [ADMIN_USER];

// Helper to parse IPP into { year, num } for accurate legal case sorting
function parseIPP(ippStr) {
  if (!ippStr) return { year: 9999, num: 999999 };
  const parts = ippStr.trim().split('-');
  if (parts.length >= 2) {
    const numPart = parts[parts.length - 2];
    const yearPart = parts[parts.length - 1].split('/')[0];
    const num = parseInt(numPart.replace(/\D/g, ''), 10) || 0;
    const yr = parseInt(yearPart.replace(/\D/g, ''), 10) || 0;
    const fullYear = yr < 70 ? 2000 + yr : 1900 + yr;
    return { year: fullYear, num };
  }
  return { year: 9999, num: 999999 };
}

function getUserStorageKey(user) {
  if (!user) return STORAGE_KEY;
  return `${STORAGE_KEY}_user_${user.id || user.name.replace(/\s+/g, '_')}`;
}

export default function App() {
  // Users state (Ensures Administrator Sebastián Marcote is the sole Admin)
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove old "Auxiliar Letrado" Marcote account if present
          const cleaned = parsed.filter(u => !(u.role === 'Aux. Bar Letrado' || u.role === 'Auxiliar Letrado' || (u.name.toLowerCase().includes('marcote') && u.role !== 'Administrador General')));
          if (!cleaned.some(u => u.id === ADMIN_USER.id || u.role === 'Administrador General')) {
            cleaned.unshift(ADMIN_USER);
          }
          return cleaned;
        }
      } catch (e) {}
    }
    return DEFAULT_USERS;
  });

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  // Session state (Defaults to Administrator General Sebastián Marcote)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'Administrador General' || parsed.id === ADMIN_USER.id)) {
          return ADMIN_USER;
        }
        return parsed;
      } catch (e) {}
    }
    return ADMIN_USER;
  });

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  // Synchronize Admin user and registered users from Google Sheets USUARIOS tab on app load
  useEffect(() => {
    const url = getStoredSheetsUrl();
    if (url) {
      // Always save Admin user to USUARIOS sheet tab
      saveUserToSheetsTab(url, ADMIN_USER).catch(e => console.error('Error syncing admin user:', e));

      // Fetch registered users from Google Sheets USUARIOS tab
      fetchUsersFromSheetsTab(url).then(remoteUsers => {
        if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          setUsers(remoteUsers);
        }
      }).catch(e => console.error('Error fetching users from USUARIOS tab:', e));
    }
  }, []);

  const handleAddUser = (newUser) => {
    const formattedUser = {
      ...newUser,
      name: newUser.name.trim().toUpperCase()
    };
    setUsers(prev => [...prev, formattedUser]);

    // Save user to USUARIOS sheet tab and generate individual sheet tab in Google Sheets
    const sheetsUrl = getStoredSheetsUrl();
    if (sheetsUrl) {
      saveUserToSheetsTab(sheetsUrl, formattedUser).catch(e => console.error('Error saving user to USUARIOS sheet tab:', e));
      createUserSheetTab(sheetsUrl, formattedUser).catch(e => console.error('Error creating user sheet tab:', e));
    }
  };

  const handleUpdateUser = (updatedUser) => {
    const formattedUser = {
      ...updatedUser,
      name: updatedUser.name.trim().toUpperCase()
    };
    setUsers(prev => prev.map(u => u.id === formattedUser.id ? formattedUser : u));

    // Update user in USUARIOS sheet tab in Google Sheets
    const sheetsUrl = getStoredSheetsUrl();
    if (sheetsUrl) {
      saveUserToSheetsTab(sheetsUrl, formattedUser).catch(e => console.error('Error updating user in USUARIOS sheet tab:', e));
    }

    // If updating the currently logged-in user (e.g. Administrator Marcote), update active session
    if (currentUser && currentUser.id === formattedUser.id) {
      setCurrentUser(formattedUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(formattedUser));
    }
  };

  const handleDeleteUser = (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));

    // Delete user from USUARIOS sheet tab and delete user sheet tab in Google Sheets
    if (userToDelete) {
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        deleteUserFromSheetsTab(sheetsUrl, userToDelete).catch(e => console.error('Error deleting user from USUARIOS sheet tab:', e));
        deleteUserSheetTab(sheetsUrl, userToDelete.name).catch(e => console.error('Error deleting user sheet tab:', e));
      }
    }
  };

  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Load initial dataset from user-scoped localStorage or default for Admin / empty for others
  const [causas, setCausas] = useState(() => {
    const key = getUserStorageKey(currentUser);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading saved causas, loading default', e);
      }
    }
    const isAdmin = currentUser?.role === 'Administrador General' || currentUser?.name?.toLowerCase().includes('marcote');
    return isAdmin ? initialCausasData : [];
  });

  // Re-load dataset and fetch Google Sheets data whenever currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    const key = getUserStorageKey(currentUser);
    const saved = localStorage.getItem(key);
    const isAdmin = currentUser?.role === 'Administrador General' || currentUser?.name?.toLowerCase().includes('marcote');

    if (saved) {
      try {
        setCausas(JSON.parse(saved));
      } catch (e) {
        setCausas(isAdmin ? initialCausasData : []);
      }
    } else {
      setCausas(isAdmin ? initialCausasData : []);
    }

    // Background fetch from Google Sheets for the active user's tab
    const url = getStoredSheetsUrl();
    if (url) {
      fetchCausasFromSheets(url, currentUser.name)
        .then((remoteCausas) => {
          if (Array.isArray(remoteCausas)) {
            setCausas(remoteCausas);
          }
        })
        .catch((err) => {
          console.warn('Google Sheets background fetch notice:', err);
        });
    }
  }, [currentUser]);

  // Save to user-scoped localStorage on change
  useEffect(() => {
    if (!currentUser) return;
    const key = getUserStorageKey(currentUser);
    localStorage.setItem(key, JSON.stringify(causas));
  }, [causas, currentUser]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('en trámite'); // Default to 'en trámite'
  const [sumarioFilter, setSumarioFilter] = useState('todos'); // 'todos' | 'con_sumario' | 'sin_sumario'
  const [inicioFilter, setInicioFilter] = useState('todos'); // 'todos' | INICIO_OPTIONS
  const [sortBy, setSortBy] = useState('ipp-asc'); // 'ipp-asc' | 'ipp-desc' | 'revisar-asc' | 'revisado-desc'

  // Modals State
  const [selectedCausa, setSelectedCausa] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Count aRevisar (only active causes require review)
  const aRevisarCount = useMemo(() => {
    return causas.filter(c => {
      if (isFinalizedState(c.estado, c.tramite)) return false;
      return c.estado?.toLowerCase() === 'revisar';
    }).length;
  }, [causas]);

  // Filtered & Sorted Dataset
  const filteredCausas = useMemo(() => {
    return causas.filter(causa => {
      // 1. Search term match (IPP, Carátula, Trámite)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const ippMatch = causa.ipp?.toLowerCase().includes(query);
        const caratulaMatch = causa.caratula?.toLowerCase().includes(query);
        const tramiteMatch = causa.tramite?.toLowerCase().includes(query);
        if (!ippMatch && !caratulaMatch && !tramiteMatch) return false;
      }

      // 2. Status filter (Strictly matched on causa.estado)
      if (statusFilter !== 'todos') {
        const stLower = (causa.estado || '').toLowerCase().trim();
        const sfLower = statusFilter.toLowerCase().trim();

        if (sfLower === 'en trámite' || sfLower === 'en tramite') {
          // If estado is set to ANY resolution or special state, exclude it from En Trámite!
          const isResolved = isFinalizedState(causa.estado, causa.tramite);
          if (isResolved) return false;
        } else if (sfLower.includes('paradero')) {
          if (!stLower.includes('paradero')) return false;
        } else if (sfLower.includes('captura')) {
          if (!stLower.includes('captura')) return false;
        } else if (sfLower.includes('elevada')) {
          if (!stLower.includes('elevada')) return false;
        } else if (sfLower.includes('archiv')) {
          if (!stLower.includes('archiv') && !stLower.includes('archivo')) return false;
        } else if (sfLower.includes('desestim')) {
          if (!stLower.includes('desestim')) return false;
        } else if (sfLower.includes('sobrese')) {
          if (!stLower.includes('sobrese')) return false;
        } else if (sfLower.includes('incompet')) {
          if (!stLower.includes('incompet')) return false;
        } else if (sfLower.includes('remis')) {
          if (!stLower.includes('remis')) return false;
        }
      }

      // 3. Sumario filter
      const hasSum = causaHasSumario(causa);
      if (sumarioFilter === 'con_sumario' && !hasSum) return false;
      if (sumarioFilter === 'sin_sumario' && hasSum) return false;

      // 4. Denuncia / Inicio filter
      if (inicioFilter && inicioFilter !== 'todos') {
        const initTarget = inicioFilter.trim().toLowerCase();
        const causaInit = (causa.denunciado_en || '').trim().toLowerCase();
        if (!causaInit) return false;
        if (causaInit !== initTarget && !initTarget.includes(causaInit) && !causaInit.includes(initTarget)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'ipp-asc') {
        const pA = parseIPP(a.ipp);
        const pB = parseIPP(b.ipp);
        if (pA.year !== pB.year) return pA.year - pB.year;
        return pA.num - pB.num;
      }
      if (sortBy === 'ipp-desc') {
        const pA = parseIPP(a.ipp);
        const pB = parseIPP(b.ipp);
        if (pA.year !== pB.year) return pB.year - pA.year;
        return pB.num - pA.num;
      }
      if (sortBy === 'revisar-asc') {
        const numA = parseInt(a.revisar_dias || '999', 10);
        const numB = parseInt(b.revisar_dias || '999', 10);
        return numA - numB;
      }
      if (sortBy === 'revisado-desc') {
        return (b.revisado || '').localeCompare(a.revisado || '');
      }
      return 0;
    });
  }, [causas, searchTerm, statusFilter, sumarioFilter, inicioFilter, sortBy]);

  // Handlers
  const handleSaveCausa = (updatedCausa) => {
    setCausas(prev => prev.map(c => c.id === updatedCausa.id ? updatedCausa : c));
    
    // Only update selectedCausa if modal is already open
    if (selectedCausa && selectedCausa.id === updatedCausa.id) {
      setSelectedCausa(updatedCausa);
    }

    const sheetsUrl = getStoredSheetsUrl();
    if (sheetsUrl) {
      updateCausaInSheets(sheetsUrl, updatedCausa, currentUser?.name).catch(e => console.error('Background sync save error:', e));
    }
  };

  const handleReabrirCausa = (causa) => {
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const reopenEntry = `${todayStr} Reapertura de causa - Estado cambiado a En Trámite`;
    const updatedTramite = causa.tramite ? `${causa.tramite} /// ${reopenEntry}` : reopenEntry;
    const updated = {
      ...causa,
      estado: 'En Trámite',
      revisado: todayStr,
      revisar_dias: '30',
      tramite: updatedTramite
    };
    setCausas(prev => prev.map(c => c.id === causa.id ? updated : c));

    const sheetsUrl = getStoredSheetsUrl();
    if (sheetsUrl) {
      updateCausaInSheets(sheetsUrl, updated, currentUser?.name).catch(e => console.error('Background sync reopen error:', e));
    }
  };

  const handleCreateCausa = (newCausa) => {
    setCausas(prev => [newCausa, ...prev]);
    setIsCreating(false);

    const sheetsUrl = getStoredSheetsUrl();
    if (sheetsUrl) {
      createCausaInSheets(sheetsUrl, newCausa, currentUser?.name).catch(e => console.error('Background sync create error:', e));
    }
  };

  const handleDeleteCausa = (id) => {
    const causaToDelete = causas.find(c => c.id === id);
    if (window.confirm('¿Está seguro de eliminar esta causa del sistema?')) {
      setCausas(prev => prev.filter(c => c.id !== id));
      if (selectedCausa?.id === id) setSelectedCausa(null);

      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        deleteCausaInSheets(sheetsUrl, id, causaToDelete?.ipp, currentUser?.name).catch(e => console.error('Background sync delete error:', e));
      }
    }
  };

  const handleResetData = () => {
    if (window.confirm('¿Desea restablecer todos los datos a la planilla ODS original? Se perderán las modificaciones personalizadas.')) {
      setCausas(initialCausasData);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(causas, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Control_Causas_UFI10_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('en trámite');
    setSumarioFilter('todos');
    setInicioFilter('todos');
  };

  const [activePage, setActivePage] = useState('causas'); // 'causas' | 'vencimientos' | 'usuarios'

  // Count urgent expirations (<= 15 days)
  const urgentVencimientosCount = useMemo(() => {
    let count = 0;
    causas.forEach(c => {
      if (isFinalizedState(c.estado, c.tramite)) return;
      const dates = [
        c.vencimiento_pp2, c.vencimiento_pp1, c.vencimiento_pp,
        c.vencimiento_ipp,
        ...(Array.isArray(c.pericias) ? c.pericias.map(p => p.fecha) : [c.pericia_fecha])
      ];
      if (dates.some(d => {
        const days = getDaysRemaining(d);
        return days !== null && days <= 15;
      })) {
        count++;
      }
    });
    return count;
  }, [causas]);

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLogin={handleLogin}
        onRegisterUser={(newUser) => {
          handleAddUser(newUser);
          handleLogin(newUser);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* Header with Page Navigation Bar */}
      <Header
        totalCausas={causas.length}
        aRevisarCount={aRevisarCount}
        urgentVencimientosCount={urgentVencimientosCount}
        currentUser={currentUser}
        activePage={activePage}
        onPageChange={setActivePage}
        onNewCausa={() => setIsCreating(true)}
        onExportData={handleExportData}
        onResetData={handleResetData}
        onLogout={handleLogout}
      />

      {/* Main Content Area: Page Router */}
      <main className="flex-1 w-full p-4 sm:p-6 space-y-5">
        
        {/* PAGE 1: LISTADO DE CAUSAS */}
        {activePage === 'causas' && (
          <>
            <StatsOverview
              causas={causas}
              selectedFilter={statusFilter}
              onSelectFilter={setStatusFilter}
            />

            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sumarioFilter={sumarioFilter}
              onSumarioFilterChange={setSumarioFilter}
              inicioFilter={inicioFilter}
              onInicioFilterChange={setInicioFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              totalResults={filteredCausas.length}
              onClearFilters={handleClearFilters}
            />

            <CausasTable
              causas={filteredCausas}
              onSelectCausa={(causa) => setSelectedCausa(causa)}
              onEditCausa={(causa) => setSelectedCausa(causa)}
              onDeleteCausa={handleDeleteCausa}
              onReabrirCausa={handleReabrirCausa}
              onSaveCausa={handleSaveCausa}
            />
          </>
        )}

        {/* PAGE 2: ALERTAS DE VENCIMIENTO */}
        {activePage === 'vencimientos' && (
          <ExpirationPanel
            causas={causas}
            onSelectCausa={(causa) => setSelectedCausa(causa)}
          />
        )}

        {/* PAGE 3: GESTIÓN DE USUARIOS (Solo Administrador General) */}
        {activePage === 'usuarios' && (currentUser?.role === 'Administrador General' || currentUser?.name?.toLowerCase().includes('marcote')) && (
          <UserManagementModal
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onClose={() => setActivePage('causas')}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        UFI N° 10 - Sistema de Control y Seguimiento Procesal de Causas • {causas.length} expedientes registrados
      </footer>

      {/* Modal Detail / Timeline / Edit */}
      {selectedCausa && (
        <CausaModal
          causa={selectedCausa}
          onClose={() => setSelectedCausa(null)}
          onSave={handleSaveCausa}
        />
      )}

      {/* Modal New Causa */}
      {isCreating && (
        <NewCausaModal
          onClose={() => setIsCreating(false)}
          onCreate={handleCreateCausa}
        />
      )}

      {/* User Management Modal */}
      {isUserManagementOpen && (
        <UserManagementModal
          users={users}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          onClose={() => setIsUserManagementOpen(false)}
        />
      )}

    </div>
  );
}
