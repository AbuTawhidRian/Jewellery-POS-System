import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { useInventory } from '../store/InventoryContext';

const ThermalPrintLayout: React.FC = () => {
  const { printItem } = useInventory();
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (printItem && barcodeRef.current) {
      JsBarcode(barcodeRef.current, printItem.barcode, {
        format: "CODE128",
        width: 1.5,
        height: 25,
        displayValue: true,
        fontSize: 10,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000"
      });
    }
  }, [printItem]);

  if (!printItem) return null;

  return (
    <div id="print-area" className="fixed top-0 -left-[9999px] print:static print:flex print:w-full print:h-full bg-white text-black font-sans box-border overflow-hidden p-1 z-[-1] print:z-50 w-[150px]">
      <div className="flex flex-col items-center justify-center w-full">
        <h1 className="text-[10px] font-bold leading-none mb-1 uppercase tracking-tight">Alex Gold FZC</h1>
        <svg ref={barcodeRef} className="max-w-full h-auto"></svg>
        <div className="flex flex-col items-center w-full px-1 mt-1 text-[9px] font-semibold">
          <div className="flex justify-between w-full">
            <span className="truncate max-w-[50%]">{printItem.type}</span>
            <span>GW: {printItem.weight.toFixed(2)}g</span>
          </div>
          {printItem.stone_weight > 0 && (
            <div className="flex justify-end w-full mt-[1px] text-[8px]">
              <span>NW: {(printItem.weight - printItem.stone_weight).toFixed(2)}g</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThermalPrintLayout;
