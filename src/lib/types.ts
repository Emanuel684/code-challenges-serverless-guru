/**
 * Domain types for the Notes CRUD API.
 *
 * - `Item` is the persisted shape stored in DynamoDB (includes server-generated fields).
 * - `ItemRequest` is the subset clients send on create/update (no `id` or timestamps).
 *
 * @see handlers/createItem.ts, handlers/updateItem.ts
 */

/** Full note record as stored in DynamoDB (partition key: `id`). */
export interface Item {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Request body fields accepted from clients for create/update operations. */
export interface ItemRequest {
  title?: string;
  content?: string;
}
