import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { format } from 'date-fns';
import { Diamond } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const InvoicePrintLayout: React.FC = () => {
  const { printInvoiceData } = useInventory();
  const { user } = useAuth();

  if (!printInvoiceData) return null;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 15mm; }
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        `}
      </style>
      <div id="invoice-print-area" className="hidden print:block bg-white text-black min-h-screen font-sans">
      <div className="max-w-[21cm] mx-auto p-12 bg-white">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
          <div className="flex items-center gap-3">
            <Diamond className="w-10 h-10 text-slate-800" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{user?.shopName || 'Jewellery Shop'}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Wholesale & Retail Trading</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-400 tracking-widest uppercase mb-2">Invoice</h2>
            <p className="text-sm text-slate-600"><strong>Date:</strong> {format(new Date(printInvoiceData.date), 'MMM dd, yyyy')}</p>
            <p className="text-sm text-slate-600"><strong>Time:</strong> {format(new Date(printInvoiceData.date), 'hh:mm a')}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-10">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
          <p className="text-xl font-bold text-slate-800">{printInvoiceData.buyerName}</p>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse mb-10">
          <thead>
            <tr className="border-b-2 border-slate-800 text-slate-800">
              <th className="py-3 px-2 font-bold w-16">#</th>
              <th className="py-3 px-2 font-bold">Model</th>
              <th className="py-3 px-2 font-bold">Item Type</th>
              <th className="py-3 px-2 font-bold text-center">Qty</th>
              <th className="py-3 px-2 font-bold text-right">Gross Wt (g)</th>
              <th className="py-3 px-2 font-bold text-right">Stone Wt (g)</th>
              <th className="py-3 px-2 font-bold text-right">Net Wt (g)</th>
            </tr>
          </thead>
          <tbody className="text-sm">
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
              <tr key={`${group.model}-${group.type}`} className="border-b border-slate-200">
                <td className="py-4 px-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                <td className="py-4 px-2 font-bold text-slate-800">{group.model}</td>
                <td className="py-4 px-2 text-slate-600">{group.type}</td>
                <td className="py-4 px-2 font-medium text-center text-slate-700">{group.qty}</td>
                <td className="py-4 px-2 font-medium text-right text-slate-700">{gw.toFixed(2)}</td>
                <td className="py-4 px-2 text-right text-slate-500 dark:text-slate-400">{sw > 0 ? sw.toFixed(2) : '-'}</td>
                <td className="py-4 px-2 font-medium text-right text-slate-900">{nw.toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-1/2 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center mb-2 text-slate-600">
              <span>Total Items:</span>
              <span className="font-medium">{printInvoiceData.items.length}</span>
            </div>
            <div className="flex justify-between items-center mb-2 text-slate-600">
              <span>Total Gross Weight:</span>
              <span className="font-medium">
                {printInvoiceData.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(2)} g
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <span className="font-bold text-slate-800">Total Net Weight:</span>
              <span className="text-xl font-bold text-slate-900">
                {printInvoiceData.totalWeight.toFixed(2)} g
              </span>
            </div>
            {printInvoiceData.totalMakingCharge !== undefined && printInvoiceData.totalMakingCharge !== 0 && (
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-200">
                <span className="font-bold text-slate-800">Total Making Charge:</span>
                <span className="text-xl font-bold text-slate-900">
                  {printInvoiceData.totalMakingCharge.toFixed(2)} AED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-slate-200 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Thank you for your business!</p>
          {(user?.shopEmail || user?.shopPhone) && (
            <p className="mt-1">
              For any inquiries, please contact us at 
              {user?.shopEmail && <span className="font-medium ml-1">{user.shopEmail}</span>}
              {user?.shopEmail && user?.shopPhone && <span> or </span>}
              {user?.shopPhone && <span className="font-medium ml-1">{user.shopPhone}</span>}
            </p>
          )}
        </div>

      </div>
    </div>
    </>
  );
};

export default InvoicePrintLayout;
