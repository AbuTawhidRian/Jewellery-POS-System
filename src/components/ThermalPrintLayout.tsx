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
    <div id="print-area" className="hidden print:flex w-full h-full bg-white text-black font-sans box-border overflow-hidden p-1">
      <div className="flex flex-col items-center justify-center w-full">
        <h1 className="text-[10px] font-bold leading-none mb-1 uppercase tracking-tight">Alex Gold FZC</h1>
        <svg ref={barcodeRef} className="max-w-full h-auto"></svg>
        <div className="flex justify-between w-full px-2 mt-1 text-[9px] font-semibold">
          <span>{printItem.type}</span>
          <span>W: {printItem.weight.toFixed(2)}g</span>
        </div>
      </div>
    </div>
  );
};

export default ThermalPrintLayout;
