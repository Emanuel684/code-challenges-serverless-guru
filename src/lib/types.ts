/**
 * Coffee shop **menu item** domain types.
 *
 * Stored in DynamoDB with partition key `id` (string UUID).
 */

/** Persisted menu row (e.g. latte, pastry). */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Client payload for create/update (subset of `MenuItem`). */
export interface MenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  available?: boolean;
}
