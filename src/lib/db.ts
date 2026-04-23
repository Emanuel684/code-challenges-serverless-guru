import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

/**
 * Table name from `MENU_ITEMS_TABLE_NAME` (set in `serverless.yml` per stage).
 */
export const getTableName = (): string => {
  const tableName = process.env.MENU_ITEMS_TABLE_NAME;
  if (!tableName) {
    throw new Error("MENU_ITEMS_TABLE_NAME is not configured.");
  }

  return tableName;
};
