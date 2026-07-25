import React, { useEffect, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const PaymentPrintLayout: React.FC = () => {
  const { printPaymentData } = useInventory();
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

  if (!printPaymentData) return null;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 15mm; }
          body * { visibility: hidden; }
          #payment-print-area, #payment-print-area * { visibility: visible; }
          #payment-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        `}
      </style>
      <div id="payment-print-area" className="hidden print:block bg-white text-black min-h-screen font-sans">
        <div className="max-w-[15cm] mx-auto p-12 bg-white border border-slate-200">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center border-b-2 border-slate-200 pb-6 mb-6">
            {user?.shopLogo ? (
              <img src={user.shopLogo} alt="Shop Logo" className="w-16 h-16 object-contain mb-4" />
            ) : (
              <img src="/logo.jpg" alt="Logo" className="w-20 h-20 object-contain rounded-[22%] mb-4" />
            )}
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{activeBranchName || user?.shopName || 'Jewellery Shop'}</h1>
            <p className="text-sm text-slate-500">{user?.shopSlogan || 'Wholesale & Retail Trading'}</p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-700 tracking-widest uppercase mb-1">
              {printPaymentData.type === 'received' ? 'Cash Receipt' : 'Payment Voucher'}
            </h2>
            <p className="text-sm text-slate-500">Ref: {printPaymentData.id.slice(-8).toUpperCase()}</p>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-8 text-base">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-600">Date:</span>
              <span className="font-bold text-slate-800">{format(new Date(printPaymentData.date), 'dd/MM/yyyy hh:mm a')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-600">Account / Buyer:</span>
              <span className="font-bold text-slate-800">{printPaymentData.buyerName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-600">Transaction Type:</span>
              <span className="font-bold text-slate-800">{printPaymentData.type === 'received' ? 'Cash Received' : 'Cash Paid Out'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-600">Description / Notes:</span>
              <span className="font-bold text-slate-800 text-right max-w-[60%]">{printPaymentData.notes || '-'}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center mb-12">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-2">Amount</p>
            <p className="text-4xl font-extrabold text-slate-900">
              {user?.shopCurrency || 'AED'} {printPaymentData.amount.toFixed(2)}
            </p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between mt-20 pt-8 border-t border-slate-200">
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-2"></div>
              <p className="text-sm text-slate-600">Authorized Signature</p>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-2"></div>
              <p className="text-sm text-slate-600">Customer Signature</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default PaymentPrintLayout;
