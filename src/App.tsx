import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import POS from './pages/POS';
import Ledger from './pages/Ledger';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import Transfers from './pages/Transfers';
import { useAuth } from './contexts/AuthContext';

import Landing from './pages/Landing';

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'STAFF' && (!user.accessibleBranches || user.accessibleBranches.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">You have not been assigned to any branches. Please contact your administrator to grant you access.</p>
          <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="bg-gold-500 hover:bg-gold-600 text-slate-950 px-6 py-2 rounded-lg font-bold transition-colors">Sign Out</button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="vault" element={<Vault />} />
          <Route path="pos" element={<POS />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<SuperAdmin />} />
        </Route>
      </Route>
    </Routes>
    </>
  );
};

export default App;
