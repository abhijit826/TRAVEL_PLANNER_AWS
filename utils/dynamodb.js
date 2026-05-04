const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

/**
 * Shared DynamoDB Document Client for the Travel Planner app.
 * On EC2 with an IAM Role attached, no access keys are needed —
 * the SDK uses the instance profile automatically.
 * For local development, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env
 */
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Strip undefined fields before writing
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

module.exports = { docClient };
