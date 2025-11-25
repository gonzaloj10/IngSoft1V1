import { Event, User } from './index';

export interface PurchaseDetails {
  orderNumber: string;
  user: User;
  event: Event;
  quantity: number;
  serviceCharge: number;
  totalPrice: number;
  purchaseDate: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
  pdfUrl?: string;
}

export interface PDFResult {
  success: boolean;
  message: string;
  pdfUrl?: string;
  pdfBlob?: Blob;
  pdfBase64?: string;
}