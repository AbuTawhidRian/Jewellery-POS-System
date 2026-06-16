import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { useInventory } from '../store/InventoryContext';
import { useAuth } from '../contexts/AuthContext';

const ThermalPrintLayout: React.FC = () => {
  const { printItem } = useInventory();
  const { user } = useAuth();
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [barcodeError, setBarcodeError] = useState(false);

  useEffect(() => {
    if (printItem && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, String(printItem.barcode), {
          format: "CODE128",
          width: 1.5,
          height: 25,
          displayValue: true,
          fontSize: 10,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000"
        });
        setBarcodeError(false);
      } catch (err) {
        console.error("JsBarcode rendering error:", err);
        setBarcodeError(true);
        // Fallback in case JsBarcode is nested
        if (typeof (JsBarcode as any).default === 'function') {
          try {
            (JsBarcode as any).default(barcodeRef.current, String(printItem.barcode), {
              format: "CODE128",
              width: 1.5,
              height: 25,
              displayValue: true,
              fontSize: 10,
              margin: 0,
              background: "#ffffff",
              lineColor: "#000000"
            });
            setBarcodeError(false);
          } catch (e) {
            console.error("JsBarcode fallback rendering error:", e);
            setBarcodeError(true);
          }
        }
      }
    }
  }, [printItem]);

  if (!printItem) return null;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { 
            size: 2.25in 0.5in; 
            margin: 0; 
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }
          body * { 
            visibility: hidden; 
          }
          #print-area, #print-area * { 
            visibility: visible; 
            color: black !important;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 2.25in;
            height: 0.5in;
            padding: 0.05in;
            box-sizing: border-box;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}
      </style>
      <div id="print-area" className="fixed top-0 -left-[9999px] print:static bg-white text-black font-sans z-[-1] print:z-50 flex flex-col items-center justify-center w-[2.25in] h-[0.5in]">
        <div className="flex flex-col items-center justify-center w-full h-full">
          <h1 className="text-[9px] font-bold leading-none mb-[1px] uppercase tracking-tight truncate w-full text-center">{user?.shopName || 'Jewellery Shop'}</h1>
          
          {barcodeError ? (
            <div className="text-center my-[1px] border border-black p-[1px] w-full">
              <div className="text-[8px] font-mono">{printItem.barcode}</div>
            </div>
          ) : (
            <svg ref={barcodeRef} className="max-w-full h-auto" style={{ maxHeight: '0.25in' }}></svg>
          )}
          
          <div className="flex flex-col w-full mt-[1px] text-[7px] font-bold leading-none">
            <div className="flex justify-between w-full">
              <span className="truncate max-w-[60%]">{printItem.model}</span>
              <span>GW: {parseFloat(printItem.weight as any || '0').toFixed(2)}g</span>
            </div>
            <div className="flex justify-between w-full mt-[1px]">
              <span className="text-[6px] truncate max-w-[50%]">{printItem.type}</span>
              {parseFloat(printItem.stone_weight as any || '0') > 0 && (
                <span>NW: {(parseFloat(printItem.weight as any || '0') - parseFloat(printItem.stone_weight as any || '0')).toFixed(2)}g</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThermalPrintLayout;
