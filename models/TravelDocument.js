const { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { randomUUID } = require('crypto');

const TABLE_NAME = process.env.DYNAMODB_DOCUMENTS_TABLE || 'travelplanner-documents';

const TravelDocument = {
  /**
   * Get all documents for a user.
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
   * Create a new travel document.
   * DynamoDB key: PK = userId, SK = _id (documentId)
   */
  async create(userId, data) {
    const documentId = randomUUID();
    const now = new Date().toISOString();

    const item = {
      userId,
      _id: documentId,
      type: data.type,
      number: data.number,
      expiryDate: data.expiryDate,
      // Core optional fields
      issueDate: data.issueDate || null,
      country: data.country || null,
      nationality: data.nationality || null,
      issuer: data.issuer || null,
      notes: data.notes || null,
      // Visa
      visaType: data.visaType || null,
      entries: data.entries || null,
      embassy: data.embassy || null,
      // Credit card
      bankName: data.bankName || null,
      cardType: data.cardType || null,
      // Vaccination
      vaccineType: data.vaccineType || null,
      manufacturer: data.manufacturer || null,
      lotNumber: data.lotNumber || null,
      doseDates: data.doseDates || [],
      // Driving
      licenseClass: data.licenseClass || null,
      // Insurance
      insuranceProvider: data.insuranceProvider || null,
      policyNumber: data.policyNumber || null,
      coverageAmount: data.coverageAmount || null,
      emergencyPhone: data.emergencyPhone || null,
      coverageDetails: data.coverageDetails || null,
      // NOTE: photoUrl is intentionally excluded — stored in browser localStorage
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return item;
  },

  /**
   * Update a document. Only the owner (userId) can update.
   * Returns updated document or null if not found.
   */
  async findOneAndUpdate(userId, documentId, updates) {
    // Verify ownership first
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, _id: documentId },
    }));
    if (!existing.Item) return null;

    const expressions = [];
    const names = {};
    const values = { ':updatedAt': new Date().toISOString() };
    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';

    const updatableFields = [
      'type', 'number', 'expiryDate', 'issueDate', 'country', 'nationality',
      'issuer', 'notes', 'visaType', 'entries', 'embassy',
      'bankName', 'cardType',
      'vaccineType', 'manufacturer', 'lotNumber', 'doseDates',
      'licenseClass',
      'insuranceProvider', 'policyNumber', 'coverageAmount', 'emergencyPhone', 'coverageDetails',
      // photoUrl intentionally excluded — stored in browser localStorage
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
      Key: { userId, _id: documentId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes;
  },

  /**
   * Delete a document. Only the owner (userId) can delete.
   */
  async findOneAndDelete(userId, documentId) {
    const result = await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, _id: documentId },
      ReturnValues: 'ALL_OLD',
    }));
    return result.Attributes || null;
  },
};

module.exports = TravelDocument;