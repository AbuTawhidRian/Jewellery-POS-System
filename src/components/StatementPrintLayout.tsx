import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { format } from 'date-fns';
import { Diamond } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const StatementPrintLayout: React.FC = () => {
  const { printStatementData } = useInventory();
  const { user } = useAuth();

  if (!printStatementData) return null;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 15mm; }
          body * { visibility: hidden; }
          #statement-print-area, #statement-print-area * { visibility: visible; }
          #statement-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        `}
      </style>
      <div id="statement-print-area" className="hidden print:block bg-white text-black min-h-screen font-sans">
        <div className="max-w-[21cm] mx-auto p-12 bg-white">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
            <div className="flex items-center gap-3">
              <Diamond className="w-10 h-10 text-slate-800" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{user?.shopName || 'Jewellery Shop'}</h1>
                <p className="text-sm text-slate-500 mt-1">Wholesale & Retail Trading</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-400 tracking-widest uppercase mb-2">Statement of Account</h2>
              <p className="text-sm text-slate-600"><strong>Date Printed:</strong> {format(new Date(), 'MMM dd, yyyy')}</p>
            </div>
          </div>

          {/* Bill To & Date Range */}
          <div className="flex justify-between mb-10">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Account</h3>
              <p className="text-xl font-bold text-slate-800">{printStatementData.buyerName}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Period</h3>
              <p className="text-lg font-medium text-slate-700">{printStatementData.dateRange}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse mb-10">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-800">
                <th className="py-3 px-2 font-bold w-32">Date</th>
                <th className="py-3 px-2 font-bold">Transaction Type</th>
                <th className="py-3 px-2 font-bold text-center">Items</th>
                <th className="py-3 px-2 font-bold text-right">Given Wt (g)</th>
                <th className="py-3 px-2 font-bold text-right">Received Wt (g)</th>
                <th className="py-3 px-2 font-bold text-right">Balance (g)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(() => {
                let runningBalance = 0;
                // Sort transactions chronologically (oldest to newest) to calculate running balance
                const sortedTx = [...printStatementData.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                return sortedTx.map((tx, idx) => {
                  runningBalance += tx.netWeight;
                  return (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="py-4 px-2 text-slate-700">{format(new Date(tx.date), 'MMM dd, yyyy')}</td>
                      <td className="py-4 px-2 font-bold">
                        <span className={tx.type === 'Return' ? 'text-red-600' : 'text-slate-800'}>
                          {tx.type === 'Return' ? 'Sales Return' : 'Sale'}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-medium text-center text-slate-700">{tx.totalItems}</td>
                      <td className="py-4 px-2 font-medium text-right text-slate-900">
                        {tx.netWeight > 0 ? tx.netWeight.toFixed(2) : '-'}
                      </td>
                      <td className="py-4 px-2 font-medium text-right text-slate-900">
                        {tx.netWeight < 0 ? Math.abs(tx.netWeight).toFixed(2) : '-'}
                      </td>
                      <td className="py-4 px-2 font-bold text-right text-slate-900">{runningBalance.toFixed(2)}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-1/2 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2 text-slate-600">
                <span>Total Transactions:</span>
                <span className="font-medium">{printStatementData.transactions.length}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <span className="font-bold text-slate-800">Final Balance:</span>
                <span className="text-xl font-bold text-slate-900">
                  {printStatementData.totalNetWeight.toFixed(2)} g
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any inquiries, please contact us at contact@rianjewellery.com</p>
          </div>

        </div>
      </div>
    </>
  );
};

export default StatementPrintLayout;
