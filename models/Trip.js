const { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { randomUUID } = require('crypto');

const TABLE_NAME = process.env.DYNAMODB_TRIPS_TABLE || 'travelplanner-trips';

const Trip = {
  /**
   * Create a new trip for a user.
   * DynamoDB key: PK = userId, SK = _id (tripId)
   */
  async create({ userId, destination, duration, budget, companions, activities }) {
    const tripId = randomUUID();
    const now = new Date().toISOString();

    const item = {
      userId,
      _id: tripId,
      destination,
      duration,
      budget,
      companions,
      activities,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return item;
  },

  /**
   * Get all trips for a specific user.
   */
  async findByUserId(userId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    }));
    return result.Items || [];
  },

  /**
   * Get a single trip by userId + tripId (_id).
   */
  async findById(userId, tripId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, _id: tripId },
    }));
    return result.Item || null;
  },

  /**
   * Delete a trip by userId + tripId (_id).
   * Returns the deleted item or null if not found.
   */
  async findByIdAndDelete(userId, tripId) {
    const result = await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, _id: tripId },
      ReturnValues: 'ALL_OLD',
    }));
    return result.Attributes || null;
  },

  /**
   * Update a trip by userId + tripId (_id).
   */
  async update(userId, tripId, updates) {
    const expressions = [];
    const names = {};
    const values = { ':updatedAt': new Date().toISOString() };
    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';

    const updatableFields = [
      'destination', 'duration', 'budget', 'companions', 'activities',
      'baseCurrency', 'expenses', 'predictions', 'packingList'
    ];

    updatableFields.forEach((field) => {
      if (updates[field] !== undefined) {
        expressions.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = updates[field];
      }
    });

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, _id: tripId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes || null;
  },
};

module.exports = Trip;
