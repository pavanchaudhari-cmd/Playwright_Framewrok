// Auto-generated TypeScript types
// Source:    https://api.eventhub.rahulshettyacademy.com/api/docs/
// API:       EventHub API v1.0.0
// Generated: 2026-05-05T10:20:40.324Z
// DO NOT EDIT — re-run generate-types.ts to update

// =============================================================================
// Schemas
// =============================================================================

export interface AuthInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success?: boolean;
  /** JWT bearer token — valid for 7 days. Pass as Authorization header on all protected routes. */
  token?: string;
  user?: {
    id?: number;
    email?: string;
  };
}

export interface MeResponse {
  success?: boolean;
  user?: {
    userId?: number;
    email?: string;
  };
}

export interface Booking {
  id?: number;
  eventId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  quantity?: number;
  totalPrice?: number;
  status?: "confirmed" | "cancelled";
  bookingRef?: string;
  createdAt?: string;
  updatedAt?: string;
  event?: Event;
}

export interface CreateBookingInput {
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
}

export interface Event {
  id?: number;
  title?: string;
  description?: string;
  category?: string;
  venue?: string;
  city?: string;
  eventDate?: string;
  price?: number;
  totalSeats?: number;
  availableSeats?: number;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  category: string;
  venue: string;
  city: string;
  eventDate: string;
  price: number;
  totalSeats: number;
  imageUrl?: string;
}

export interface PaginationMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ErrorResponse {
  success?: boolean;
  error?: string;
}

export interface ValidationErrorResponse {
  success?: boolean;
  error?: string;
  details?: {
    field?: string;
    message?: string;
  }[];
}
