/**
 * Shared Amazon DynamoDB low-level client wiring for all menu-item Lambdas.
 *
 * **Why DocumentClient**
 * - `DynamoDBDocumentClient` marshalls plain JS objects to DynamoDB attribute format and supports `removeUndefinedValues`
 *   so optional fields do not overwrite attributes with `NULL` unintentionally when omitted from command inputs.
 *
 * **Lifecycle**
 * - `DynamoDBClient` is module-scoped (reused across warm invocations within the same execution environment).
 * - Table name comes from `MENU_ITEMS_TABLE_NAME`, set per stage in Serverless `provider.environment` (see IaC).
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

/** Document-style client used by handlers (`PutCommand`, `GetCommand`, etc.). */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

/**
 * Resolves the DynamoDB table name for the current deployment stage.
 *
 * @returns Value of `MENU_ITEMS_TABLE_NAME` from Lambda environment.
 * @throws If the variable is unset (misconfigured deploy).
 */
export const getTableName = (): string => {
  const tableName = process.env.MENU_ITEMS_TABLE_NAME;
  if (!tableName) {
    throw new Error("MENU_ITEMS_TABLE_NAME is not configured.");
  }

  return tableName;
};
