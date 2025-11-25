export interface Event {
  id: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  price: number;
  image: string;
  description: string;
  category: string;
  availableTickets: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  // Chilean national ID (RUT), normalized as XXXXXXXX-K (optional for legacy users)
  rut?: string;
  isAdmin?: boolean;
}

export interface TicketSelection {
  eventId: string;
  quantity: number;
  totalPrice: number;
}

export interface Purchase {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  quantity: number;
  unitPrice: number;
  serviceCharge: number;
  totalPrice: number;
  purchaseDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  emailSent: boolean;
}

export interface EmailStatus {
  sent: boolean;
  sentAt?: string;
  error?: string;
}
