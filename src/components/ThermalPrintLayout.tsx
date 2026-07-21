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
          width: 1,
          height: 28,
          displayValue: true,
          fontSize: 10,
          fontOptions: "bold",
          margin: 0,
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
              width: 1,
              height: 28,
              displayValue: true,
              fontSize: 10,
              fontOptions: "bold",
              margin: 0,
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
            size: 95mm 15mm; 
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
            width: 95mm;
            height: 15mm;
            padding: 0;
            box-sizing: border-box;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area svg {
            image-rendering: pixelated;
          }
        `}
      </style>
      <div id="print-area" className="fixed top-0 -left-[9999px] print:static bg-white text-black font-sans z-[-1] print:z-50 flex items-center justify-start w-[95mm] h-[15mm]">
          
          {/* Non-usable Tail for Wrapping (25mm) */}
          <div className="w-[25mm] h-full flex-shrink-0 bg-transparent"></div>

          {/* Left Half (Front of Tag) - Shop Name and Barcode (35mm) */}
          <div className="flex flex-col items-center justify-center w-[35mm] h-full flex-shrink-0 px-[2mm]">
            <h1 className="text-[10px] font-extrabold leading-none mb-[1px] uppercase tracking-tight text-center">{user?.shopName || 'Jewellery'}</h1>
            {barcodeError ? (
              <div className="text-center my-[1px] border border-black p-[1px] w-full">
                <div className="text-[10px] font-mono font-bold">{printItem.barcode}</div>
              </div>
            ) : (
              <svg ref={barcodeRef} style={{ shapeRendering: 'crispEdges' }}></svg>
            )}
          </div>
          
          {/* Right Half (Back of Tag) - Details and Weight (35mm) */}
          <div className="flex flex-col justify-center w-[35mm] h-full flex-shrink-0 px-[3mm] text-[9px] font-bold leading-[1.3]">
            <div className="flex justify-between w-full mb-[1px]">
              <span className="truncate pr-1">{printItem.type}</span>
              <span className="truncate">{printItem.model}</span>
            </div>
            
            <div className="flex justify-between w-full">
              <span>GW:</span>
              <span>{parseFloat(printItem.weight as any || '0').toFixed(3)}g</span>
            </div>
            
            {parseFloat(printItem.stone_weight as any || '0') > 0 ? (
              <>
                <div className="flex justify-between w-full">
                  <span>SW:</span>
                  <span>{parseFloat(printItem.stone_weight as any || '0').toFixed(3)}g</span>
                </div>
                <div className="flex justify-between w-full border-t border-black/40 mt-[1px] pt-[1px]">
                  <span>NW:</span>
                  <span>{(parseFloat(printItem.weight as any || '0') - parseFloat(printItem.stone_weight as any || '0')).toFixed(3)}g</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between w-full border-t border-black/40 mt-[1px] pt-[1px]">
                <span>NW:</span>
                <span>{parseFloat(printItem.weight as any || '0').toFixed(3)}g</span>
              </div>
            )}
          </div>

      </div>
    </>
  );
};

export default ThermalPrintLayout;
