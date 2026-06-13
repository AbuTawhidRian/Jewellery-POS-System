import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { useInventory } from '../store/InventoryContext';

const ThermalPrintLayout: React.FC = () => {
  const { printItem } = useInventory();
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
          @page { size: 2.25in 0.5in landscape; margin: 0; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
        `}
      </style>
      <div id="print-area" className="fixed top-0 -left-[9999px] print:static print:flex print:w-full print:h-full bg-white text-black font-sans box-border overflow-hidden p-1 z-[-1] print:z-50 w-[150px]">
      <div className="flex flex-col items-center justify-center w-full">
        <h1 className="text-[10px] font-bold leading-none mb-1 uppercase tracking-tight">Alex Gold FZC</h1>
        
        {barcodeError ? (
          <div className="text-center my-1 border border-black p-1 w-full">
            <div className="text-[10px] font-mono">{printItem.barcode}</div>
          </div>
        ) : (
          <svg ref={barcodeRef} className="max-w-full h-auto"></svg>
        )}
        <div className="flex flex-col items-center w-full px-1 mt-1 text-[9px] font-semibold">
          <div className="flex justify-between w-full">
            <span className="truncate max-w-[50%]">{printItem.type}</span>
            <span>GW: {parseFloat(printItem.weight as any || '0').toFixed(2)}g</span>
          </div>
          {parseFloat(printItem.stone_weight as any || '0') > 0 && (
            <div className="flex justify-end w-full mt-[1px] text-[8px]">
              <span>NW: {(parseFloat(printItem.weight as any || '0') - parseFloat(printItem.stone_weight as any || '0')).toFixed(2)}g</span>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ThermalPrintLayout;
