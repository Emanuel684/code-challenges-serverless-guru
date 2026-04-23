/**
 * DynamoDB client wiring for all CRUD Lambdas.
 *
 * Context:
 * - `ITEMS_TABLE_NAME` is injected by Serverless (`serverless.yml` → `provider.environment`)
 *   so each stage (dev/prod) reads/writes its own table without code changes.
 * - Handlers use the Document Client so items are plain JS objects (attribute names in code
 *   match DynamoDB attribute names).
 *
 * @see serverless.yml (DynamoDB resource + IAM + ITEMS_TABLE_NAME)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

/**
 * Shared Document Client: marshalls JS values to DynamoDB attribute values.
 *
 * `removeUndefinedValues: true` avoids accidental "empty map" writes when optional
 * fields are omitted from partial updates (defensive for future schema growth).
 */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

/**
 * Resolves the physical table name for the current Lambda invocation.
 *
 * @returns DynamoDB table name from `process.env.ITEMS_TABLE_NAME`
 * @throws Error if the environment variable is missing (misconfigured deployment)
 */
export const getTableName = (): string => {
  const tableName = process.env.ITEMS_TABLE_NAME;
  if (!tableName) {
    throw new Error("ITEMS_TABLE_NAME is not configured.");
  }

  return tableName;
};
