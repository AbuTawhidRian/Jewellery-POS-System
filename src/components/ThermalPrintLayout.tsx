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
          width: 1.2,
          height: 25,
          displayValue: true,
          fontSize: 8,
          margin: 5,
          textMargin: 0,
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
              width: 1.2,
              height: 25,
              displayValue: true,
              fontSize: 8,
              margin: 5,
              textMargin: 0,
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
        <div className="flex items-center justify-between w-full h-full px-1">
          
          {/* Left Column */}
          <div className="flex flex-col text-[7px] font-bold w-[30%] leading-tight">
            <span className="truncate w-full">{printItem.model}</span>
            <span className="truncate w-full">{printItem.type}</span>
          </div>
          
          {/* Middle Column (Barcode + Shop Name) */}
          <div className="flex flex-col items-center justify-center w-[40%]">
            <h1 className="text-[6px] font-bold leading-none mb-[1px] uppercase tracking-tight truncate w-full text-center">{user?.shopName || 'Jewellery Shop'}</h1>
            {barcodeError ? (
              <div className="text-center my-[1px] border border-black p-[1px] w-full">
                <div className="text-[8px] font-mono">{printItem.barcode}</div>
              </div>
            ) : (
              <svg ref={barcodeRef} className="max-w-full h-auto" style={{ maxHeight: '0.35in', shapeRendering: 'crispEdges' }}></svg>
            )}
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col text-[7px] font-bold text-right w-[30%] leading-tight">
            <span>GW: {parseFloat(printItem.weight as any || '0').toFixed(2)}g</span>
            {parseFloat(printItem.stone_weight as any || '0') > 0 && (
              <span>NW: {(parseFloat(printItem.weight as any || '0') - parseFloat(printItem.stone_weight as any || '0')).toFixed(2)}g</span>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default ThermalPrintLayout;
