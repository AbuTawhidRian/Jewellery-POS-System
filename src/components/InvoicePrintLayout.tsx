import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { useInventory } from '../store/InventoryContext';
import { format } from 'date-fns';
import api from '../lib/api';

import { useAuth } from '../contexts/AuthContext';

const InvoicePrintLayout: React.FC = () => {
  const { printInvoiceData } = useInventory();
  const { user, activeBranchId } = useAuth();
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);

  useEffect(() => {
    if (activeBranchId) {
      api.get('/branches').then(res => {
        const branch = res.data.find((b: any) => b.id === activeBranchId);
        if (branch) setActiveBranchName(branch.name);
      }).catch(console.error);
    }
  }, [activeBranchId]);

  if (!printInvoiceData) return null;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: A5 portrait; margin: 12mm; }
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print-border-b { border-bottom: 2px solid #e2e8f0 !important; }
          .print-border-t { border-top: 2px solid #e2e8f0 !important; }
          .print-bg-header { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-stripe:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>
      <div id="invoice-print-area" className="hidden print:block bg-white text-black min-h-screen font-sans">
      <div className="max-w-[14.8cm] w-full mx-auto p-4 bg-white">
        
        {/* Header Section */}
        <div className="flex justify-between items-start print-border-b pb-6 mb-8">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
              {activeBranchName || user?.shopName || 'Jewellery Shop'}
            </h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide mt-1">
              {user?.shopSlogan || 'Wholesale & Retail Trading'}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <h2 className="text-3xl font-bold text-slate-300 tracking-[0.2em] uppercase mb-3">Invoice</h2>
            <table className="text-sm text-slate-600">
              <tbody>
                <tr>
                  <td className="pr-4 font-semibold text-slate-800 text-right">Date:</td>
                  <td className="text-right">{format(new Date(printInvoiceData.date), 'MMM dd, yyyy')}</td>
                </tr>
                <tr>
                  <td className="pr-4 font-semibold text-slate-800 text-right">Time:</td>
                  <td className="text-right">{format(new Date(printInvoiceData.date), 'hh:mm a')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</h3>
            <p className="text-2xl font-bold text-slate-900">{printInvoiceData.buyerName}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left border-collapse mb-8 border border-slate-200">
          <thead>
            <tr className="print-bg-header text-slate-800 border-b-2 border-slate-300">
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider w-8 text-center border-r border-slate-200">#</th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider border-r border-slate-200">Item Description</th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-center border-r border-slate-200">Qty</th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-right border-r border-slate-200">Gross Wt</th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-right border-r border-slate-200">Stone Wt</th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-right">Net Wt (g)</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {Object.values(printInvoiceData.items.reduce((acc, item) => {
              const key = `${item.model || 'Unknown'}-${item.type}`;
              if (!acc[key]) {
                acc[key] = {
                  model: item.model || 'Unknown',
                  type: item.type,
                  qty: 0,
                  weight: 0,
                  stone_weight: 0,
                };
              }
              acc[key].qty += 1;
              acc[key].weight += Number(item.weight) || 0;
              acc[key].stone_weight += Number(item.stone_weight) || 0;
              return acc;
            }, {} as Record<string, { model: string, type: string, qty: number, weight: number, stone_weight: number }>)).map((group, idx) => {
              const sw = group.stone_weight;
              const gw = group.weight;
              const nw = gw > 0 ? Math.max(0, gw - sw) : Math.min(0, gw + sw);
              return (
              <tr key={`${group.model}-${group.type}`} className="border-b border-slate-200 print-stripe">
                <td className="py-3 px-2 text-center text-slate-500 font-medium border-r border-slate-200">{idx + 1}</td>
                <td className="py-3 px-2 border-r border-slate-200">
                  <div className="font-bold text-slate-800">{group.model}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{group.type}</div>
                </td>
                <td className="py-3 px-2 font-bold text-center text-slate-700 border-r border-slate-200">{group.qty}</td>
                <td className="py-3 px-2 font-medium text-right text-slate-600 border-r border-slate-200">{gw.toFixed(2)}</td>
                <td className="py-3 px-2 text-right text-slate-500 border-r border-slate-200">{sw > 0 ? sw.toFixed(2) : '-'}</td>
                <td className="py-3 px-2 font-bold text-right text-slate-900">{nw.toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary & Signatures Section */}
        <div className="flex justify-between items-start mt-8">
          
          {/* Notes / T&C */}
          <div className="w-1/2 pr-4 text-slate-500">
            <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">Terms & Conditions</h4>
            <p className="leading-relaxed text-[10px]">
              1. Goods once sold cannot be returned but can be exchanged as per company policy.<br/>
              2. Please bring this invoice for any future references or exchanges.<br/>
              3. The purity of the gold is guaranteed as stated in the invoice.
            </p>
          </div>

          {/* Totals Box */}
          <div className="w-1/2">
            <table className="w-full text-right text-xs">
              <tbody>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-600">Total Items:</td>
                  <td className="py-2 font-bold text-slate-800 w-24">{printInvoiceData.items.length}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-600 border-b border-slate-200 pb-4">Total Gross Weight:</td>
                  <td className="py-2 font-bold text-slate-800 border-b border-slate-200 pb-4 w-24">
                    {printInvoiceData.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(2)} g
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-black text-slate-900 text-sm">TOTAL NET WEIGHT:</td>
                  <td className="py-4 font-black text-slate-900 text-base w-24">
                    {printInvoiceData.totalWeight.toFixed(2)} g
                  </td>
                </tr>
                {printInvoiceData.totalMakingCharge !== undefined && printInvoiceData.totalMakingCharge !== 0 && (
                  <tr>
                    <td className="py-2 pr-4 font-bold text-slate-700">Total Billed Amount (Cash):</td>
                    <td className="py-2 font-bold text-slate-900 text-sm w-24">
                      {printInvoiceData.totalMakingCharge.toFixed(2)} <span className="text-[10px]">{user?.shopCurrency || 'AED'}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-16 pt-8 flex justify-between items-center px-4">
          <div className="text-center w-32 border-t border-slate-400 pt-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Customer Signature</p>
          </div>
          <div className="text-center w-32 border-t border-slate-400 pt-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Authorized Signatory</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-400">
          <p className="font-semibold text-slate-500 uppercase tracking-widest mb-1">Thank you for your business!</p>
          {(user?.shopEmail || user?.shopPhone) && (
            <p>
              {user?.shopEmail && <span>Email: {user.shopEmail}</span>}
              {user?.shopEmail && user?.shopPhone && <span className="mx-2">|</span>}
              {user?.shopPhone && <span>Phone: {user.shopPhone}</span>}
            </p>
          )}
        </div>
        
      </div>
      </div>
    </>
  );
};

export default InvoicePrintLayout;
