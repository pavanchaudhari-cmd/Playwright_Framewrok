# EventHub API

> Generated from OpenAPI spec: `https://api.eventhub.rahulshettyacademy.com/api/docs/`  
> Spec version: `3.0.0`  
> API version: `1.0.0`

REST API for the EventHub ticket booking platform.

All event and booking operations are available here. Booking creation is atomic — seats are decremented in the same database transaction.

**Contact:** EventHub Support

## Table of Contents

- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Schemas](#schemas)

## Base URLs

- `https://api.eventhub.rahulshettyacademy.com/api` — Production server
- `http://localhost:3001/api` — Development server

## Authentication

### bearerAuth

- **Type:** http
- **Scheme:** bearer
- **Bearer format:** JWT

## Endpoints

## Auth

Authentication — register, login, and token validation

### POST `/auth/register`

**Register a new user**

Creates a new user account and returns a JWT token. Each registered user gets a fully isolated sandbox — events and bookings are private to their account.


**Request Body** *(required)*

_Content-Type: `application/json`_

```
[`AuthInput`](#schema-authinput)
```

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `201` | Account created successfully | [`AuthResponse`](#schema-authresponse) |
| `400` | Validation error — invalid email format or password too short, or email already registered | object
  - `success`: boolean
  - `error`: string
  - `details`: array |

---

### POST `/auth/login`

**Log in with existing credentials**

Authenticates a user and returns a JWT token. Store the token and send it as a Bearer token in the Authorization header on all subsequent requests.


**Request Body** *(required)*

_Content-Type: `application/json`_

```
[`AuthInput`](#schema-authinput)
```

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Login successful | [`AuthResponse`](#schema-authresponse) |
| `400` | Wrong password or validation error | object
  - `success`: boolean
  - `error`: string |
| `404` | No account found for this email | object
  - `success`: boolean
  - `error`: string |

---

### GET `/auth/me`

**Get the currently authenticated user**

Validates the bearer token and returns the decoded user identity. Useful for verifying a token is still valid.


**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Token is valid — returns user identity | [`MeResponse`](#schema-meresponse) |
| `401` | Missing or invalid token | object
  - `success`: boolean
  - `error`: string |

> **Security:** bearerAuth

---

## Bookings

Ticket booking — create, view, and cancel bookings

### GET `/bookings`

**List all bookings**

Returns a paginated list of all bookings, each including full event details.


**Query Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `eventId` | No | integer | Filter bookings by event ID |
| `status` | No | string — one of: `confirmed`, `cancelled` | Filter by booking status |
| `page` | No | integer | Page number |
| `limit` | No | integer | Number of bookings per page |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Paginated list of bookings | object
  - `success`: boolean
  - `data`: array
  - `pagination`: [`PaginationMeta`](#schema-paginationmeta) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### POST `/bookings`

**Create a booking (buy tickets)**

Books tickets for an event. The service will:
1. Verify the event exists
2. Check sufficient seats are available
3. Calculate the total price
4. Generate a unique booking reference (EVT-XXXXXX)
5. Atomically create the booking and decrement available seats



**Request Body** *(required)*

_Content-Type: `application/json`_

```
[`CreateBookingInput`](#schema-createbookinginput)
```

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `201` | Booking confirmed | object
  - `success`: boolean
  - `data`: [`Booking`](#schema-booking)
  - `message`: string |
| `400` | Validation error or insufficient seats | oneOf:
- [`ValidationErrorResponse`](#schema-validationerrorresponse)
- [`ErrorResponse`](#schema-errorresponse) |
| `404` | Event not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### GET `/bookings/ref/{ref}`

**Look up a booking by reference code**

Retrieves a booking using the unique booking reference (e.g. EVT-A1B2C3).


**Path Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `ref` | Yes | string | Booking reference code |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Booking found | object
  - `success`: boolean
  - `data`: [`Booking`](#schema-booking) |
| `404` | Booking not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### GET `/bookings/{id}`

**Get a single booking by ID**


**Path Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `id` | Yes | integer | Numeric booking ID |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Booking found | object
  - `success`: boolean
  - `data`: [`Booking`](#schema-booking) |
| `404` | Booking not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### DELETE `/bookings/{id}`

**Cancel a booking**

Cancels (permanently deletes) a booking and atomically restores the
released seats back to the event's `availableSeats` count.



**Path Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `id` | Yes | integer | Numeric ID of the booking to cancel |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Booking cancelled and seats restored | object
  - `success`: boolean
  - `message`: string |
| `404` | Booking not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

## Config

### GET `/config`

**Get public feature flags**


**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Feature flag values | object
  - `showExploreLinks`: boolean |

---

## Events

Event management — CRUD operations

### GET `/events`

**List all events**

Returns a paginated list of events. Supports filtering by category, city, and free-text search.


**Query Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `category` | No | string — one of: `Conference`, `Concert`, `Sports`, `Workshop`, `Festival` | Filter events by category |
| `city` | No | string | Filter events by city |
| `search` | No | string | Search events by title, description, or venue |
| `page` | No | integer | Page number |
| `limit` | No | integer | Number of events per page |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Paginated list of events | object
  - `success`: boolean
  - `data`: array
  - `pagination`: [`PaginationMeta`](#schema-paginationmeta) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### POST `/events`

**Create a new event**

Creates an event. `availableSeats` is automatically set equal to `totalSeats`.


**Request Body** *(required)*

_Content-Type: `application/json`_

```
[`CreateEventInput`](#schema-createeventinput)
```

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `201` | Event created successfully | object
  - `success`: boolean
  - `data`: [`Event`](#schema-event)
  - `message`: string |
| `400` | Validation error | [`ValidationErrorResponse`](#schema-validationerrorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### GET `/events/{id}`

**Get a single event by ID**


**Path Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `id` | Yes | integer | Numeric ID of the event |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Event found | object
  - `success`: boolean
  - `data`: [`Event`](#schema-event) |
| `404` | Event not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### PUT `/events/{id}`

**Update an event**


**Path Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `id` | Yes | integer | Numeric ID of the event to update |

**Request Body** *(required)*

_Content-Type: `application/json`_

```
[`CreateEventInput`](#schema-createeventinput)
```

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Event updated successfully | object
  - `success`: boolean
  - `data`: [`Event`](#schema-event)
  - `message`: string |
| `400` | Validation error | [`ValidationErrorResponse`](#schema-validationerrorresponse) |
| `404` | Event not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

### DELETE `/events/{id}`

**Delete an event**

Permanently deletes an event and all associated bookings (cascade).


**Path Parameters**

| Name | Required | Type | Description |
|------|----------|------|-------------|
| `id` | Yes | integer | Numeric ID of the event to delete |

**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | Event deleted successfully | object
  - `success`: boolean
  - `message`: string |
| `404` | Event not found | [`ErrorResponse`](#schema-errorresponse) |
| `500` | Internal server error | [`ErrorResponse`](#schema-errorresponse) |

---

## Health

API health check

### GET `/health`

**API health check**


**Responses**

| Status | Description | Schema |
|--------|-------------|--------|
| `200` | API is running | object
  - `status`: string
  - `timestamp`: string `date-time`
  - `dbStatus`: string |

---

## Schemas

### AuthInput {#schema-authinput}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `email` | string (email) | Yes |  |
| `password` | string | Yes |  |

### AuthResponse {#schema-authresponse}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `success` | boolean | No |  |
| `token` | string | No | JWT bearer token — valid for 7 days. Pass as Authorization header on all protected routes. |
| `user` | object
  - `id`: integer
  - `email`: string | No |  |

### MeResponse {#schema-meresponse}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `success` | boolean | No |  |
| `user` | object
  - `userId`: integer
  - `email`: string | No |  |

### Booking {#schema-booking}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | integer | No |  |
| `eventId` | integer | No |  |
| `customerName` | string | No |  |
| `customerEmail` | string | No |  |
| `customerPhone` | string | No |  |
| `quantity` | integer | No |  |
| `totalPrice` | number (float) | No |  |
| `status` | string — one of: `confirmed`, `cancelled` | No |  |
| `bookingRef` | string | No |  |
| `createdAt` | string (date-time) | No |  |
| `updatedAt` | string (date-time) | No |  |
| `event` | [`Event`](#schema-event) | No |  |

### CreateBookingInput {#schema-createbookinginput}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `eventId` | integer | Yes |  |
| `customerName` | string | Yes |  |
| `customerEmail` | string (email) | Yes |  |
| `customerPhone` | string | Yes |  |
| `quantity` | integer | Yes |  |

### Event {#schema-event}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | integer | No |  |
| `title` | string | No |  |
| `description` | string | No |  |
| `category` | string | No |  |
| `venue` | string | No |  |
| `city` | string | No |  |
| `eventDate` | string (date-time) | No |  |
| `price` | number (float) | No |  |
| `totalSeats` | integer | No |  |
| `availableSeats` | integer | No |  |
| `imageUrl` | string | No |  |
| `createdAt` | string (date-time) | No |  |
| `updatedAt` | string (date-time) | No |  |

### CreateEventInput {#schema-createeventinput}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes |  |
| `description` | string | No |  |
| `category` | string | Yes |  |
| `venue` | string | Yes |  |
| `city` | string | Yes |  |
| `eventDate` | string (date-time) | Yes |  |
| `price` | number | Yes |  |
| `totalSeats` | integer | Yes |  |
| `imageUrl` | string | No |  |

### PaginationMeta {#schema-paginationmeta}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `total` | integer | No |  |
| `page` | integer | No |  |
| `limit` | integer | No |  |
| `totalPages` | integer | No |  |

### ErrorResponse {#schema-errorresponse}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `success` | boolean | No |  |
| `error` | string | No |  |

### ValidationErrorResponse {#schema-validationerrorresponse}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `success` | boolean | No |  |
| `error` | string | No |  |
| `details` | array of object
  - `field`: string
  - `message`: string | No |  |


---
_Generated on 2026-05-05T10:04:20.631Z_
