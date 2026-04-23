/**
 * Coffee shop **menu item** domain types.
 *
 * **Persistence**
 * - Stored in DynamoDB with partition key `id` (string UUID generated on create).
 *
 * **Requests**
 * - `MenuItemRequest` is the HTTP JSON shape for create/update; fields are validated in handlers before writes.
 */

/** Persisted menu row (e.g. latte, pastry). */
export interface MenuItem {
  /** Primary key (UUID). */
  id: string;
  /** Display name (required on create/update). */
  name: string;
  /** Free text; may be empty string. */
  description: string;
  /** Non-negative finite number (currency left to clients). */
  price: number;
  /** Whether the item is offered for sale. */
  available: boolean;
  /** ISO-8601 timestamps. */
  createdAt: string;
  /** ISO-8601 timestamps. */
  updatedAt: string;
}

/** Client payload for create/update (subset of `MenuItem`). */
export interface MenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  available?: boolean;
}
