import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api from './api';

interface ShareInvoiceOptions {
  invoiceId: number;
  invoiceNo: string;
  layout: 'A4' | 'Thermal';
}

export const shareInvoicePDF = async ({ invoiceId, invoiceNo, layout }: ShareInvoiceOptions): Promise<void> => {
  const baseURL = api.defaults.baseURL || '';
  const isWeb = (Platform.OS as string) === 'web';

  // 1. Get the PDF URL from the server (goes through Axios interceptors: auth, x-branch-id, 401 re-auth)
  const res = await api.get(`/pdf/invoices/${invoiceId}?layout=${layout}`);
  const pdfUrl = res.data?.pdfUrl;
  if (!pdfUrl) throw new Error('Failed to retrieve PDF URL from server.');

  // 2. Web: open in new tab
  if (isWeb) {
    let absolutePdfUrl = pdfUrl;
    if (pdfUrl.startsWith('/')) {
      const hostUrl = baseURL.replace('/api', '');
      absolutePdfUrl = `${hostUrl}${pdfUrl}`;
    }
    if (typeof window !== 'undefined') {
      window.open(absolutePdfUrl, '_blank');
    }
    return;
  }

  // 3. Native: download the PDF from the returned URL
  if (!FileSystem.cacheDirectory) {
    throw new Error('File system is not available on this device.');
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const sanitizedInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
  const localUri = `${FileSystem.cacheDirectory}invoice_${sanitizedInvoiceNo}.pdf`;

  // Handle relative URLs from the server (dev mode or Render local fallback)
  let absoluteUrl = pdfUrl;
  if (typeof pdfUrl === 'string' && pdfUrl.startsWith('/')) {
    absoluteUrl = `${baseURL.replace('/api', '')}${pdfUrl}`;
  }

  try {
    const downloadResult = await FileSystem.downloadAsync(absoluteUrl, localUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Server returned status ${downloadResult.status}`);
    }

    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Groww You Invoice - ${invoiceNo}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error: any) {
    console.error('PDF Sharing Pipeline Interrupted:', error.message || error);
    throw error;
  } finally {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
    } catch (cleanupErr) {
      console.error('Failed to clean up temporary PDF file:', cleanupErr);
    }
  }
};
