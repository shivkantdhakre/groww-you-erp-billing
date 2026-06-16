import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from './secureStoreWrapper';
import api from './api';

interface ShareInvoiceOptions {
  invoiceId: number;
  invoiceNo: string;
  layout: 'A4' | 'Thermal';
}

export const shareInvoicePDF = async ({ invoiceId, invoiceNo, layout }: ShareInvoiceOptions): Promise<void> => {
  const baseURL = api.defaults.baseURL || '';
  const isWeb = (Platform.OS as string) === 'web';

  // 1. Web Platform Fallback: Retrieve PDF url and open in a new browser tab
  if (isWeb) {
    // This pre-flight request runs through our Axios instance, validating the token/biometrics
    const res = await api.get(`/pdf/invoices/${invoiceId}?layout=${layout}`);
    const pdfUrl = res.data.pdfUrl;
    if (!pdfUrl) throw new Error('Failed to retrieve PDF URL from server.');

    let absolutePdfUrl = pdfUrl;
    if (pdfUrl.startsWith('/')) {
      // Local dev fallback URL (relative path served by Express)
      const hostUrl = baseURL.replace('/api', '');
      absolutePdfUrl = `${hostUrl}${pdfUrl}`;
    }

    if (typeof window !== 'undefined') {
      window.open(absolutePdfUrl, '_blank');
    }
    return;
  }

  const sanitizedInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
  const localUri = `${FileSystem.cacheDirectory}invoice_${sanitizedInvoiceNo}.pdf`;

  try {
    // 2. Pre-flight verification token test via Axios instance to safeguard interceptors
    await api.get('/auth/verify-status'); 

    // 3. Fetch fresh token from secure container post potential re-auth check
    const token = await SecureStore.getItemAsync('token');
    if (!token) throw new Error('Authentication context missing.');

    const downloadUrl = `${baseURL}/pdf/invoices/${invoiceId}?download=true&layout=${layout}`;

    // 4. Native binary execution sequence
    const downloadResult = await FileSystem.downloadAsync(
      downloadUrl,
      localUri,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (downloadResult.status !== 200) {
      throw new Error(`Server returned error code status: ${downloadResult.status}`);
    }

    // 5. Verify application-sharing readiness
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      throw new Error('Native system sharing capabilities are disabled on this device.');
    }

    // 6. Fire immutable multi-platform target intent
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Groww You Invoice - ${invoiceNo}`,
      UTI: 'com.adobe.pdf'
    });

  } catch (error: any) {
    console.error('PDF Sharing Pipeline Interrupted:', error.message || error);
    throw error; // Propagate down to UI layer to dismiss loading overlays safely
  } finally {
    // 7. Proactive scavenging of localized memory footprint to protect disk allocations
    if (!isWeb) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localUri, { idempotent: true });
        }
      } catch (cleanupErr) {
        console.error('Failed to clean up temporary PDF file:', cleanupErr);
      }
    }
  }
};
