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
import { useAuth } from './contexts/AuthContext';

import Landing from './pages/Landing';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const App: React.FC = () => {
  return (
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
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<SuperAdmin />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
