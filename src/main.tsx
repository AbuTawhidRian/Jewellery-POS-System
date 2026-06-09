import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { InventoryProvider } from './store/InventoryContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <InventoryProvider>
        <App />
      </InventoryProvider>
    </BrowserRouter>
  </React.StrictMode>
);
