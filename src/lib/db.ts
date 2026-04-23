import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

export const getTableName = (): string => {
  const tableName = process.env.ITEMS_TABLE_NAME;
  if (!tableName) {
    throw new Error("ITEMS_TABLE_NAME is not configured.");
  }

  return tableName;
};
