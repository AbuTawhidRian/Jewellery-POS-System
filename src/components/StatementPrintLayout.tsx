import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { format } from 'date-fns';
import { Diamond } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

const StatementPrintLayout: React.FC = () => {
  const { printStatementData } = useInventory();
  const { user } = useAuth();

  if (!printStatementData) return null;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: landscape; margin: 15mm; }
          body * { visibility: hidden; }
          #statement-print-area, #statement-print-area * { visibility: visible; }
          #statement-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        `}
      </style>
      <div id="statement-print-area" className="hidden print:block bg-white text-black min-h-screen font-sans text-xs">
        <div className="max-w-[29.7cm] mx-auto p-6 bg-white">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4 mb-4">
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
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Account</h3>
              <p className="text-xl font-bold text-slate-800">{printStatementData.buyerName}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Period</h3>
              <p className="text-lg font-medium text-slate-700">{printStatementData.dateRange}</p>
            </div>
          </div>

          {/* Gold Table */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 mb-1 border-b border-slate-200 pb-1">Gold Ledger</h3>
            <table className="w-full text-left border-collapse mb-2">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-800">
                  <th className="py-1.5 px-2 font-bold w-24">Date</th>
                  <th className="py-1.5 px-2 font-bold">Transaction Type</th>
                  <th className="py-1.5 px-2 font-bold text-center">Items</th>
                  <th className="py-1.5 px-2 font-bold text-right">Gross Wt (g)</th>
                  <th className="py-1.5 px-2 font-bold text-right">Stone Wt (g)</th>
                  <th className="py-1.5 px-2 font-bold text-right">Net Wt (g)</th>
                  <th className="py-1.5 px-2 font-bold text-right">Pure Given (g)</th>
                  <th className="py-1.5 px-2 font-bold text-right">Pure Recvd (g)</th>
                  <th className="py-1.5 px-2 font-bold text-right">Pure Bal (g)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(() => {
                  let runningBalance = 0;
                  
                  const allGoldEntries: any[] = [];
                  
                  printStatementData.transactions.forEach((tx: any) => {
                    allGoldEntries.push({
                      date: tx.date,
                      isTx: true,
                      ...tx
                    });
                  });
                  
                  if (printStatementData.metalReceipts) {
                    printStatementData.metalReceipts.forEach((mr: any) => {
                      allGoldEntries.push({
                        date: mr.date,
                        isMetalReceipt: true,
                        ...mr
                      });
                    });
                  }
                  
                  allGoldEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                  if (allGoldEntries.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">No gold transactions recorded.</td>
                      </tr>
                    );
                  }

                  return allGoldEntries.map((entry, idx) => {
                    if (entry.isMetalReceipt) {
                      const pureRecv = entry.weight * entry.purity;
                      runningBalance -= pureRecv; // Receipt reduces pure balance due
                      return (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1.5 px-2 text-slate-700">{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                          <td className="py-1.5 px-2">
                            <div className="font-bold text-amber-600">Metal Receipt</div>
                            {entry.notes && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-[150px] truncate">
                                {entry.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 font-medium text-center text-slate-700">-</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-900">{entry.weight.toFixed(2)}</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-500">-</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-900">{entry.weight.toFixed(2)}</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-900">-</td>
                          <td className="py-1.5 px-2 font-medium text-right text-emerald-600">{pureRecv.toFixed(2)}</td>
                          <td className={`py-1.5 px-2 font-bold text-right ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {runningBalance > 0 ? runningBalance.toFixed(2) : runningBalance < 0 ? `(${Math.abs(runningBalance).toFixed(2)})` : '0.00'}
                          </td>
                        </tr>
                      );
                    } else {
                      runningBalance += entry.pureWeight;
                      return (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1.5 px-2 text-slate-700">{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                          <td className="py-1.5 px-2">
                            <div className={clsx("font-bold", entry.type === 'Return' ? 'text-red-600' : 'text-slate-800')}>
                              {entry.type === 'Return' ? 'Sales Return' : 'Sale'}
                            </div>
                            {entry.items && entry.items.length > 0 && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {Array.from(new Set(entry.items.map((i: any) => i.type))).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 font-medium text-center text-slate-700">{entry.totalItems}</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-900">{entry.grossWeight?.toFixed(2) || '0.00'}</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-500">{entry.stoneWeight > 0 ? entry.stoneWeight.toFixed(2) : '-'}</td>
                          <td className="py-1.5 px-2 font-medium text-right text-slate-900">{entry.netWeight?.toFixed(2) || '0.00'}</td>
                          <td className="py-1.5 px-2 font-medium text-right text-red-600">
                            {entry.pureWeight > 0 ? entry.pureWeight.toFixed(2) : '-'}
                          </td>
                          <td className="py-1.5 px-2 font-medium text-right text-emerald-600">
                            {entry.pureWeight < 0 ? Math.abs(entry.pureWeight).toFixed(2) : '-'}
                          </td>
                          <td className={`py-1.5 px-2 font-bold text-right ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {runningBalance > 0 ? runningBalance.toFixed(2) : runningBalance < 0 ? `(${Math.abs(runningBalance).toFixed(2)})` : '0.00'}
                          </td>
                        </tr>
                      );
                    }
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Cash Table */}
          <div className="mb-4 page-break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-800 mb-1 border-b border-slate-200 pb-1">Cash Ledger</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-800">
                  <th className="py-1.5 px-2 font-bold w-24">Date</th>
                  <th className="py-1.5 px-2 font-bold">Type</th>
                  <th className="py-1.5 px-2 font-bold">Details</th>
                  <th className="py-1.5 px-2 font-bold text-right">Charges</th>
                  <th className="py-1.5 px-2 font-bold text-right">Paid Out</th>
                  <th className="py-1.5 px-2 font-bold text-right">Received</th>
                  <th className="py-1.5 px-2 font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(() => {
                  let cashBalance = 0;
                  const cashEntries: { date: string, type: string, details: string, charge: number, payment: number }[] = [];
                  
                  printStatementData.transactions.forEach(tx => {
                    if (tx.makingCharge && tx.makingCharge > 0) {
                      cashEntries.push({ date: tx.date, type: 'Making Charge', details: `${tx.totalItems} items`, charge: tx.makingCharge, payment: 0 });
                    }
                  });
                  
                  if (printStatementData.payments) {
                    printStatementData.payments.forEach(p => {
                      cashEntries.push({ date: p.date, type: 'Payment', details: p.notes || 'Cash / Transfer', charge: 0, payment: p.amount });
                    });
                  }
                  
                  cashEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  
                  if (cashEntries.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">No cash transactions recorded.</td>
                      </tr>
                    );
                  }

                  return cashEntries.map((entry, idx) => {
                    // charge increases balance (amount due), payment decreases balance
                    cashBalance = cashBalance + entry.charge - entry.payment;
                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 text-slate-700">{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{entry.type}</td>
                        <td className="py-1.5 px-2 text-slate-600 truncate max-w-[150px]">{entry.details}</td>
                        <td className="py-1.5 px-2 font-medium text-right text-slate-900">{entry.charge !== 0 ? entry.charge.toFixed(2) : '-'}</td>
                        <td className="py-1.5 px-2 font-medium text-right text-orange-600">{entry.payment < 0 ? Math.abs(entry.payment).toFixed(2) : '-'}</td>
                        <td className="py-1.5 px-2 font-medium text-right text-emerald-600">{entry.payment > 0 ? entry.payment.toFixed(2) : '-'}</td>
                        <td className={`py-1.5 px-2 font-bold text-right ${cashBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {cashBalance > 0 ? cashBalance.toFixed(2) : cashBalance < 0 ? `(${Math.abs(cashBalance).toFixed(2)})` : '0.00'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end page-break-inside-avoid">
            <div className="w-1/2 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Transactions:</span>
                <span className="font-medium">{printStatementData.transactions.length}</span>
              </div>
              {(() => {
                const pureBal = printStatementData.totalPureWeight || 0;
                const isPureDue = pureBal > 0;
                
                return (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="font-bold text-slate-800">
                      {isPureDue ? 'Final Pure Balance Due:' : 'Final Pure Balance:'}
                    </span>
                    <span className={`text-xl font-bold ${isPureDue ? 'text-red-600' : 'text-emerald-600'}`}>
                      {pureBal > 0 ? pureBal.toFixed(2) + ' g' : pureBal < 0 ? `(${Math.abs(pureBal).toFixed(2)}) g` : '0.00 g'}
                    </span>
                  </div>
                );
              })()}
              {(() => {
                let bal = 0;
                printStatementData.transactions.forEach(tx => { if(tx.makingCharge) bal += tx.makingCharge; });
                if(printStatementData.payments) printStatementData.payments.forEach(p => bal -= p.amount);
                
                const isDue = bal > 0;
                
                return (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800">
                      {isDue ? 'Final Cash Balance Due:' : 'Final Cash Balance:'}
                    </span>
                    <span className={`text-xl font-bold ${isDue ? 'text-red-600' : 'text-emerald-600'}`}>
                      {bal > 0 ? bal.toFixed(2) + ' AED' : bal < 0 ? `(${Math.abs(bal).toFixed(2)}) AED` : '0.00 AED'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any inquiries, please contact us at contact@rianjewellery.com</p>
          </div>

        </div>
      </div>
    </>
  );
};

export default StatementPrintLayout;
