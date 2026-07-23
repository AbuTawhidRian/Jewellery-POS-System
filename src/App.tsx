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

import WaitingForApproval from './pages/WaitingForApproval';

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'STAFF' && (!user.accessibleBranches || user.accessibleBranches.length === 0)) {
    return <WaitingForApproval />;
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
