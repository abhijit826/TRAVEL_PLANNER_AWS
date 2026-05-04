const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'travelplanner-users';

const User = {
  /**
   * Create a new user. Checks for existing email first.
   * Returns the new user object (without password).
   */
  async create({ name, email, password }) {
    // Check for duplicate email
    const existing = await User.findByEmail(email);
    if (existing) {
      const err = new Error('User already exists');
      err.code = 'DUPLICATE_EMAIL';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = randomUUID();
    const now = new Date().toISOString();

    const item = {
      userId,
      _id: userId, // alias for MongoDB compatibility
      name,
      email,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    const { password: _, ...userWithoutPassword } = item;
    return userWithoutPassword;
  },

  /**
   * Find a user by email (via GSI 'email-index').
   * Returns full user object including hashed password (for auth comparison).
   */
  async findByEmail(email) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }));
    return result.Items?.[0] || null;
  },

  /**
   * Find a user by userId (PK). Returns user without password.
   */
  async findById(userId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    }));
    if (!result.Item) return null;
    const { password: _, ...userWithoutPassword } = result.Item;
    return userWithoutPassword;
  },

  /**
   * Update a user's name and/or email.
   */
  async update(userId, updates) {
    const expressions = [];
    const names = {};
    const values = { ':updatedAt': new Date().toISOString() };
    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';

    if (updates.name) {
      expressions.push('#name = :name');
      names['#name'] = 'name';
      values[':name'] = updates.name;
    }
    if (updates.email) {
      expressions.push('#email = :email');
      names['#email'] = 'email';
      values[':email'] = updates.email;
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    const { password: _, ...userWithoutPassword } = result.Attributes;
    return userWithoutPassword;
  },

  /**
   * Compare a plain-text password against a stored bcrypt hash.
   */
  async matchPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },
};

module.exports = User;