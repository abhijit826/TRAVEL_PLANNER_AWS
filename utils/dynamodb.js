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

const rawDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Strip undefined fields before writing
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Logging Wrapper around rawDocClient to track all database queries
const docClient = {
  async send(command) {
    const cmdName = command.constructor.name;
    const params = command.input;
    console.log(`🗄️ [${new Date().toISOString()}] [DynamoDB Request] Command: ${cmdName}, Table: ${params.TableName || 'N/A'}`);
    if (params.Key) {
      console.log(`   Key:`, JSON.stringify(params.Key));
    }
    if (params.KeyConditionExpression) {
      console.log(`   KeyCondition: ${params.KeyConditionExpression}`);
      if (params.ExpressionAttributeValues) {
        console.log(`   ExpressionValues:`, JSON.stringify(params.ExpressionAttributeValues));
      }
    }
    if (cmdName === 'PutCommand' && params.Item) {
      console.log(`   PutItem:`, JSON.stringify(params.Item).substring(0, 300) + (JSON.stringify(params.Item).length > 300 ? '...' : ''));
    }
    if (cmdName === 'UpdateCommand') {
      console.log(`   UpdateExpression: ${params.UpdateExpression}`);
      if (params.ExpressionAttributeValues) {
        console.log(`   UpdateValues:`, JSON.stringify(params.ExpressionAttributeValues));
      }
    }

    const startTime = Date.now();
    try {
      const result = await rawDocClient.send(command);
      const duration = Date.now() - startTime;
      console.log(`✅ [${new Date().toISOString()}] [DynamoDB Response] Command: ${cmdName} succeeded in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${new Date().toISOString()}] [DynamoDB Error] Command: ${cmdName} failed in ${duration}ms. Error:`, error.message);
      throw error;
    }
  }
};

module.exports = { docClient };
