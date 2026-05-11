// Auto-generated TypeScript types
// Source:    https://api.eventhub.rahulshettyacademy.com/api/docs/
// API:       EventHub API v1.0.0
// DO NOT EDIT — regenerate from context-swagger.md to update

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

// =============================================================================
// Auth endpoint types  —  POST /auth/register  |  POST /auth/login  |  GET /auth/me
// =============================================================================

export type RegisterRequestBody = AuthInput;

export interface RegisterResponse201 extends AuthResponse {}

export interface RegisterResponse400 {
  success: boolean;
  error: string;
  details: unknown[];
}

export type LoginRequestBody = AuthInput;

export interface LoginResponse200 extends AuthResponse {}

export interface LoginResponse400 {
  success: boolean;
  error: string;
}

export interface LoginResponse404 {
  success: boolean;
  error: string;
}

export interface MeResponse401 {
  success: boolean;
  error: string;
}

// =============================================================================
// Bookings endpoint types  —  GET /bookings  |  POST /bookings
//   GET /bookings/ref/{ref}  |  GET /bookings/{id}  |  DELETE /bookings/{id}
// =============================================================================

export interface GetBookingsParams {
  eventId?: number;
  status?: "confirmed" | "cancelled";
  page?: number;
  limit?: number;
}

export interface GetBookingsResponse200 {
  success: boolean;
  data: Booking[];
  pagination: PaginationMeta;
}

export type CreateBookingRequestBody = CreateBookingInput;

export interface CreateBookingResponse201 {
  success: boolean;
  data: Booking;
  message: string;
}

export interface GetBookingByRefResponse200 {
  success: boolean;
  data: Booking;
}

export interface GetBookingByIdResponse200 {
  success: boolean;
  data: Booking;
}

export interface DeleteBookingResponse200 {
  success: boolean;
  message: string;
}

// =============================================================================
// Config endpoint types  —  GET /config
// =============================================================================

export interface GetConfigResponse200 {
  showExploreLinks: boolean;
}

// =============================================================================
// Events endpoint types  —  GET /events  |  POST /events
//   GET /events/{id}  |  PUT /events/{id}  |  DELETE /events/{id}
// =============================================================================

export type EventCategory =
  | "Conference"
  | "Concert"
  | "Sports"
  | "Workshop"
  | "Festival";

export interface GetEventsParams {
  category?: EventCategory;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetEventsResponse200 {
  success: boolean;
  data: Event[];
  pagination: PaginationMeta;
}

export type CreateEventRequestBody = CreateEventInput;

export interface CreateEventResponse201 {
  success: boolean;
  data: Event;
  message: string;
}

export interface GetEventByIdResponse200 {
  success: boolean;
  data: Event;
}

export type UpdateEventRequestBody = CreateEventInput;

export interface UpdateEventResponse200 {
  success: boolean;
  data: Event;
  message: string;
}

export interface DeleteEventResponse200 {
  success: boolean;
  message: string;
}

// =============================================================================
// Health endpoint types  —  GET /health
// =============================================================================

export interface HealthResponse200 {
  status: string;
  /** ISO 8601 date-time string */
  timestamp: string;
  dbStatus: string;
}
