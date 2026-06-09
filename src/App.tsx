import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import POS from './pages/POS';
import Ledger from './pages/Ledger';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="vault" element={<Vault />} />
        <Route path="pos" element={<POS />} />
        <Route path="ledger" element={<Ledger />} />
      </Route>
    </Routes>
  );
};

export default App;
