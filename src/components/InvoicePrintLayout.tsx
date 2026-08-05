import React, { useEffect, useState } from 'react';
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

  const currency = user?.shopCurrency || 'AED';

  // ── Build grouped rows ──────────────────────────────────────────────────
  type GroupedItem = {
    model: string;
    type: string;
    qty: number;
    grossWeight: number;    // sum of item.weight
    stoneWeight: number;    // sum of item.stone_weight
    netWeight: number;      // sum of (weight - stone_weight)
    goldRate: number;       // gold rate for this type
  };

  const groups: GroupedItem[] = Object.values(
    printInvoiceData.items.reduce((acc, item) => {
      const key = `${item.model || 'Unknown'}-${item.type}`;
      const goldRate = printInvoiceData.goldRates?.[item.type] || 0;
      const gw = Number(item.weight) || 0;
      const sw = Number(item.stone_weight) || 0;
      const nw = Math.max(0, gw - sw);
      if (!acc[key]) {
        acc[key] = { model: item.model || 'Unknown', type: item.type, qty: 0, grossWeight: 0, stoneWeight: 0, netWeight: 0, goldRate };
      }
      acc[key].qty += 1;
      acc[key].grossWeight += gw;
      acc[key].stoneWeight += sw;
      acc[key].netWeight += nw;
      return acc;
    }, {} as Record<string, GroupedItem>)
  );

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalGrossWeight = groups.reduce((s, g) => s + g.grossWeight, 0);
  const totalNetWeight = printInvoiceData.totalWeight;

  // Gold value per group (based on goldValueMode)
  const goldValueForGroup = (g: GroupedItem): number => {
    if (printInvoiceData.goldValueMode === 'gross') return g.grossWeight * g.goldRate;
    if (printInvoiceData.goldValueMode === 'net')   return g.netWeight   * g.goldRate;
    // If 'none' or missing but rates exist, show gross gold value for transparency
    if (g.goldRate > 0)                              return g.grossWeight * g.goldRate;
    return 0;
  };

  const totalGoldValue = groups.reduce((s, g) => s + goldValueForGroup(g), 0);

  // The actual billed amount is `totalMakingCharge` (which in POS represents
  // total cash = making + gold when goldValueMode is set, or just the custom total).
  // If we have gold value calculated, making portion = billed - goldValue.
  // If goldValueMode is 'none' and no rates → the billed total IS the making charge.
  const billedTotal = printInvoiceData.totalMakingCharge ?? totalGoldValue;
  const makingTotal = billedTotal - totalGoldValue;

  // Per-group making charge: prorate by netWeight share
  const makingForGroup = (g: GroupedItem): number => {
    if (totalNetWeight <= 0) return 0;
    return (g.netWeight / totalNetWeight) * makingTotal;
  };

  // Per-group final amount
  const amountForGroup = (g: GroupedItem): number => goldValueForGroup(g) + makingForGroup(g);

  const grandTotal = groups.reduce((s, g) => s + amountForGroup(g), 0);

  const invoiceNo    = printInvoiceData.invoiceNumber || `INV-${format(new Date(printInvoiceData.date), 'yyyyMMddHHmm')}`;
  const salesmanName = printInvoiceData.salesmanName || user?.name || user?.email || 'Staff';

  const rateEntries = Object.entries(printInvoiceData.goldRates || {}).filter(([, r]) => r > 0);

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: A5 portrait; margin: 10mm 12mm; }
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print-bg-header { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-stripe:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>

      <div id="invoice-print-area" className="hidden print:block bg-white text-black font-sans">
        <div className="max-w-[14.8cm] w-full mx-auto p-3 bg-white">

          {/* ── TOP HEADER ── */}
          <div className="flex justify-between items-start border-b-2 border-slate-300 pb-3 mb-3">
            <div>
              <h1 className="text-[22px] font-black tracking-tight text-slate-900 uppercase leading-tight">
                {activeBranchName || user?.shopName || 'Jewellery Shop'}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                {user?.shopSlogan || 'Wholesale & Retail Trading'}
              </p>
              {(user?.shopPhone || user?.shopEmail) && (
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {user?.shopPhone && <span>{user.shopPhone}</span>}
                  {user?.shopPhone && user?.shopEmail && <span className="mx-1">·</span>}
                  {user?.shopEmail && <span>{user.shopEmail}</span>}
                </p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-[20px] font-black text-slate-300 tracking-[0.2em] uppercase mb-1">INVOICE</h2>
              <table className="text-[10px] text-slate-600 ml-auto">
                <tbody>
                  <tr>
                    <td className="pr-3 font-semibold text-slate-700">Invoice No:</td>
                    <td className="text-right font-bold text-slate-900">{invoiceNo}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 font-semibold text-slate-700">Date:</td>
                    <td className="text-right">{format(new Date(printInvoiceData.date), 'MMM dd, yyyy')}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 font-semibold text-slate-700">Time:</td>
                    <td className="text-right">{format(new Date(printInvoiceData.date), 'hh:mm a')}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 font-semibold text-slate-700">Salesman:</td>
                    <td className="text-right">{salesmanName}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CUSTOMER + GOLD RATE ROW ── */}
          <div className="flex justify-between items-end mb-3 border-b border-slate-200 pb-3">
            <div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Billed To</p>
              <p className="text-[15px] font-bold text-slate-900 leading-tight">{printInvoiceData.buyerName}</p>
            </div>
            {rateEntries.length > 0 && (
              <div className="text-right">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Gold Rate ({currency}/g)
                </p>
                <div className="flex gap-3 justify-end flex-wrap">
                  {rateEntries.map(([type, rate]) => (
                    <span key={type} className="text-[10px] font-bold text-slate-700">
                      <span className="text-slate-400 font-medium">{type}:</span> {Number(rate).toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── ITEMS TABLE ── */}
          <table className="w-full text-left border-collapse mb-3 border border-slate-200">
            <thead>
              <tr className="print-bg-header text-slate-800 border-b-2 border-slate-300">
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider w-6 text-center border-r border-slate-200">#</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider border-r border-slate-200">Item Description</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider text-center border-r border-slate-200 w-7">Qty</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider text-right border-r border-slate-200 w-14">Gross Wt</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider text-right border-r border-slate-200 w-14">Stone Wt</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider text-right border-r border-slate-200 w-14">Net Wt (g)</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider text-right border-r border-slate-200 w-16">Making</th>
                <th className="py-2 px-1.5 font-bold text-[9px] uppercase tracking-wider text-right w-18">Amount</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {groups.map((group, idx) => {
                const goldVal  = goldValueForGroup(group);
                const making   = makingForGroup(group);
                const amount   = goldVal + making;
                return (
                  <tr key={`${group.model}-${group.type}-${idx}`} className="border-b border-slate-200 print-stripe">
                    <td className="py-2 px-1.5 text-center text-slate-500 font-medium border-r border-slate-200">{idx + 1}</td>
                    <td className="py-2 px-1.5 border-r border-slate-200">
                      <div className="font-bold text-slate-800">{group.model}</div>
                      <div className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wide">{group.type}</div>
                    </td>
                    <td className="py-2 px-1.5 font-bold text-center text-slate-700 border-r border-slate-200">{group.qty}</td>
                    <td className="py-2 px-1.5 font-medium text-right text-slate-600 border-r border-slate-200">{group.grossWeight.toFixed(2)}</td>
                    <td className="py-2 px-1.5 text-right text-slate-500 border-r border-slate-200">{group.stoneWeight > 0 ? group.stoneWeight.toFixed(2) : '-'}</td>
                    <td className="py-2 px-1.5 font-bold text-right text-slate-900 border-r border-slate-200">{group.netWeight.toFixed(2)}</td>
                    <td className="py-2 px-1.5 font-medium text-right text-slate-600 border-r border-slate-200">{making > 0 ? making.toFixed(2) : '-'}</td>
                    <td className="py-2 px-1.5 font-bold text-right text-slate-900">{amount > 0 ? amount.toFixed(2) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── SUMMARY + T&C ── */}
          <div className="flex justify-between items-start mt-2">

            {/* Left: Terms & Conditions */}
            <div className="w-[48%] text-slate-500">
              <h4 className="font-bold text-slate-700 mb-1 uppercase text-[9px] tracking-wider">Terms & Conditions</h4>
              <p className="leading-relaxed text-[9px]">
                1. Please bring this invoice for any future references or exchanges.<br />
                2. The purity of the gold is guaranteed as stated in the invoice.<br />
                3. Goods once sold will not be taken back without this invoice.
              </p>
            </div>

            {/* Right: Totals */}
            <div className="w-[48%]">
              <table className="w-full text-right text-[10px]">
                <tbody>
                  <tr>
                    <td className="py-1 pr-3 font-medium text-slate-600">Total Items:</td>
                    <td className="py-1 font-bold text-slate-800 w-24 text-right">{printInvoiceData.items.length}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-3 font-medium text-slate-600">Total Gross Weight:</td>
                    <td className="py-1 font-bold text-slate-800 w-24 text-right">{totalGrossWeight.toFixed(2)} g</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="py-1.5 pr-3 font-black text-slate-900 text-[11px]">Total Net Weight:</td>
                    <td className="py-1.5 font-black text-slate-900 text-[11px] w-24 text-right">{totalNetWeight.toFixed(2)} g</td>
                  </tr>
                  {totalGoldValue > 0 && (
                    <tr>
                      <td className="py-1 pr-3 font-medium text-slate-600">Gold Value:</td>
                      <td className="py-1 font-bold text-slate-700 w-24 text-right">{totalGoldValue.toFixed(2)}</td>
                    </tr>
                  )}
                  {makingTotal > 0 && (
                    <tr>
                      <td className="py-1 pr-3 font-medium text-slate-600">Making Charge:</td>
                      <td className="py-1 font-bold text-slate-700 w-24 text-right">{makingTotal.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-400">
                    <td className="py-2 pr-3 font-black text-slate-900 text-[12px]">Total Amount:</td>
                    <td className="py-2 font-black text-slate-900 text-[13px] w-24 text-right">
                      {grandTotal.toFixed(2)} <span className="text-[9px] font-bold">{currency}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SIGNATURES ── */}
          <div className="mt-10 flex justify-between items-end px-2">
            <div className="text-center" style={{ minWidth: '120px' }}>
              <div className="border-t border-slate-400 pt-1.5 mt-8">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Customer's Signature</p>
                <p className="text-[8px] text-slate-400 mt-0.5">{printInvoiceData.buyerName}</p>
              </div>
            </div>
            <div className="text-center" style={{ minWidth: '120px' }}>
              <div className="border-t border-slate-400 pt-1.5 mt-8">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Authorised Signatory</p>
                <p className="text-[8px] text-slate-400 mt-0.5">{activeBranchName || user?.shopName || ''}</p>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="mt-4 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2">
            <p className="font-semibold text-slate-500 uppercase tracking-widest">Thank you for your business!</p>
          </div>

        </div>
      </div>
    </>
  );
};

export default InvoicePrintLayout;
