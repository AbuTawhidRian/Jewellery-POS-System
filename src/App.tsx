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
import BranchSettlement from './pages/BranchSettlement';

import { useAuth } from './contexts/AuthContext';
import api from './lib/api';

import Landing from './pages/Landing';
import WaitingForApproval from './pages/WaitingForApproval';

import { Toaster } from 'react-hot-toast';

// ─────────────────────────────────────────────────
// Guard 1: Must be logged in
// ─────────────────────────────────────────────────
const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'STAFF' && (!user.accessibleBranches || user.accessibleBranches.length === 0)) {
    return <WaitingForApproval />;
  }

  return <Outlet />;
};

// ─────────────────────────────────────────────────
// Guard 2: Must be SUPERADMIN — for /admin
// ─────────────────────────────────────────────────
const SuperAdminOnlyRoute = () => {
  const { user } = useAuth();
  if (user?.role !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

// ─────────────────────────────────────────────────
// Guard 3: Must be OWNER — for /settings
// ─────────────────────────────────────────────────
const OwnerOnlyRoute = () => {
  const { user } = useAuth();
  if (user?.role !== 'OWNER' && user?.role !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

// ─────────────────────────────────────────────────
// Guard 4: Must be on a retail (non-main) branch — for /pos and /ledger
// ─────────────────────────────────────────────────
const RetailOnlyRoute = () => {
  const { user, activeBranchId } = useAuth();
  const [branches, setBranches] = React.useState<any[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      api.get('/branches')
        .then(res => { setBranches(res.data); setLoaded(true); })
        .catch(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, [user]);

  if (!loaded) return <Outlet />; // Avoid flash redirect while loading

  const activeBranch = branches.find(b => b.id === activeBranchId);
  const isMain = activeBranch?.isMain === true;

  if (isMain) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

// ─────────────────────────────────────────────────
// App Router
// ─────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* All dashboard routes require login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout />}>

            {/* Available to all authenticated users */}
            <Route index element={<Dashboard />} />
            <Route path="vault" element={<Vault />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="settlement" element={<BranchSettlement />} />

            {/* OWNER only */}
            <Route element={<OwnerOnlyRoute />}>
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* SUPERADMIN only */}
            <Route element={<SuperAdminOnlyRoute />}>
              <Route path="admin" element={<SuperAdmin />} />
            </Route>

            {/* Retail branch only (blocked for main branch) */}
            <Route element={<RetailOnlyRoute />}>
              <Route path="pos" element={<POS />} />
              <Route path="ledger" element={<Ledger />} />
            </Route>

          </Route>
        </Route>
      </Routes>
    </>
  );
};

export default App;
