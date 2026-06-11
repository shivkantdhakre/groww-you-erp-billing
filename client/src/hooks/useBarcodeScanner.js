import { useEffect, useRef } from 'react';

/**
 * Custom hook to intercept high-speed keystrokes from USB barcode scanners
 * @param {Function} onScan - Callback when a barcode is successfully read
 */
export function useBarcodeScanner(onScan) {
  const bufferRef = useRef([]);
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Ignore modifier keys (Shift, Ctrl, Alt, Meta)
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      // 2. Conflict Prevention: If user has cursor inside any standard form input element,
      // return immediately and let the browser process the manual typing normally.
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Clear any pending timeout processing
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 3. Velocity check: Keystrokes from scanners are extremely fast (typically < 15ms interval)
      // If the difference between keys is > 50ms, it is manual human typing. Reset buffer.
      if (timeDiff > 50) {
        bufferRef.current = [];
      }

      // 4. Check for Enter Suffix (most barcode scanners append an Enter carriage return)
      if (e.key === 'Enter') {
        if (bufferRef.current.length > 0) {
          const barcode = bufferRef.current.join('');
          bufferRef.current = [];
          onScan(barcode);
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        // Append printable characters to the buffer
        bufferRef.current.push(e.key);

        // 5. Inactivity Timeout: If the scanner does not send an Enter suffix,
        // compile and trigger scan once keys stop arriving for 50ms.
        timeoutRef.current = setTimeout(() => {
          if (bufferRef.current.length >= 3) { // Ignore scans shorter than 3 characters (noise)
            const barcode = bufferRef.current.join('');
            onScan(barcode);
          }
          bufferRef.current = [];
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan]);
}
