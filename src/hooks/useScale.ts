import { useState, useCallback, useRef } from 'react';

export const useScale = () => {
  const [weight, setWeight] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(true);

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // Request a port and open a connection
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 }); // Common baud rate for scales
      portRef.current = port;
      
      setIsConnected(true);
      setError(null);
      keepReadingRef.current = true;

      // Start reading
      readLoop(port);
    } catch (err: any) {
      console.error('Scale connection error:', err);
      setError(err.message || 'Failed to connect to scale');
      setIsConnected(false);
    }
  }, []);

  const readLoop = async (port: any) => {
    while (port.readable && keepReadingRef.current) {
      const decoder = new TextDecoderStream();
      const inputDone = port.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();
      readerRef.current = reader;

      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            buffer += value;
            // Most scales send a carriage return or newline at the end of the weight string
            const lines = buffer.split(/\r\n|\n|\r/);
            if (lines.length > 1) {
              // Get the last complete line
              const lastLine = lines[lines.length - 2].trim();
              buffer = lines[lines.length - 1]; // Keep the incomplete part
              
              // Try to extract a number from the line
              // Matches things like "ST,GS,+  12.345 g" -> "12.345"
              const match = lastLine.match(/[-+]?[0-9]*\.?[0-9]+/);
              if (match) {
                 const parsedWeight = parseFloat(match[0]);
                 if (!isNaN(parsedWeight)) {
                   setWeight(parsedWeight.toString());
                 }
              }
            }
          }
        }
      } catch (error) {
        console.error("Scale read error:", error);
      } finally {
        reader.releaseLock();
      }
    }
  };

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }
    
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {
        console.error("Error closing port:", e);
      }
      portRef.current = null;
    }
    setIsConnected(false);
    setWeight('');
  }, []);

  return { weight, isConnected, error, connect, disconnect };
};
