const express = require('express');
const router = express.Router();
const TravelDocument = require('../models/TravelDocument');
const { protect } = require('../middleware/authMiddleware');

// ── GET /api/travel-wallet/documents ─────────────────────────────────────────
router.get('/documents', protect, async (req, res) => {
  try {
    const documents = await TravelDocument.findByUserId(req.user.userId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/travel-wallet/documents ────────────────────────────────────────
router.post('/documents', protect, async (req, res) => {
  try {
    const document = await TravelDocument.create(req.user.userId, req.body);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(400).json({ message: 'Failed to add document', error: error.message });
  }
});

// ── PUT /api/travel-wallet/documents/:id ─────────────────────────────────────
router.put('/documents/:id', protect, async (req, res) => {
  try {
    const document = await TravelDocument.findOneAndUpdate(
      req.user.userId,
      req.params.id,
      req.body
    );
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(400).json({ message: 'Failed to update document', error: error.message });
  }
});

// ── DELETE /api/travel-wallet/documents/:id ───────────────────────────────────
router.delete('/documents/:id', protect, async (req, res) => {
  try {
    const document = await TravelDocument.findOneAndDelete(req.user.userId, req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const Trip = require('../models/Trip');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'apac.amazon.nova-pro-v1:0';

// ── POST /api/travel-wallet/documents/analyze (OCR + AI Extraction) ─────────────
router.post('/documents/analyze', protect, async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ message: 'Image data is required' });
  }

  try {
    let format = 'jpeg';
    let base64Data = image;

    // Parse base64 data URL
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      base64Data = matches[2];
      if (mimeType.includes('png')) format = 'png';
      else if (mimeType.includes('webp')) format = 'webp';
      else if (mimeType.includes('gif')) format = 'gif';
      else format = 'jpeg';
    }

    const systemPrompt = `You are an AI Document Intelligence assistant for the TravelAI application.
Analyze the uploaded travel document image and extract all relevant structured fields.
First, identify the document type. It MUST be one of these types:
- 'passport'
- 'visa'
- 'creditCard'
- 'vaccination'
- 'drivingLicense'
- 'internationalPermit'
- 'nationalId'
- 'insurance'

Extract as many of the following fields as possible based on the document type:
- type (the detected type from the list above)
- number (document number, passport number, card number, license number, policy number)
- expiryDate (format: YYYY-MM-DD)
- issueDate (format: YYYY-MM-DD)
- country (country of issue, e.g. USA, India, France)
- nationality (nationality of the holder, e.g. American, Indian, French)
- issuer (issuing authority or department)
- notes (any other relevant details, restrictions, or annotations)

If document type is 'visa', also extract:
- visaType (e.g. Tourist, Business, Student)
- entries (e.g. Single, Double, Multiple)

If document type is 'creditCard', also extract:
- bankName (e.g. Chase, HDFC, HSBC)
- cardType (e.g. Visa, Mastercard, Amex)

If document type is 'vaccination', also extract:
- vaccineType (e.g. COVID-19, Yellow Fever)
- manufacturer (e.g. Pfizer, Moderna, AstraZeneca)
- lotNumber
- doseDates (array of date strings in YYYY-MM-DD format)

If document type is 'drivingLicense', also extract:
- licenseClass (e.g. Class D, LMV)

If document type is 'insurance', also extract:
- insuranceProvider (e.g. Allianz, LIC)
- policyNumber
- coverageAmount
- emergencyPhone
- coverageDetails (brief summary of what is covered)

You MUST respond strictly with a valid JSON object matching the extracted fields. Do NOT include markdown code blocks, backticks, or any conversational text outside of the JSON object. Return null values for fields that are not present or cannot be identified.`;

    const body = JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: [{
        role: 'user',
        content: [
          {
            image: {
              format,
              source: {
                bytes: base64Data
              }
            }
          },
          {
            text: 'Extract the document details from this image.'
          }
        ]
      }],
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.2,
      }
    });

    console.log(`🤖 [${new Date().toISOString()}] [Bedrock Request - OCR] Invoking model for document analysis`);
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await bedrock.send(command);
    const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const responseText = decoded.output.message.content[0].text.trim();

    console.log(`✅ [${new Date().toISOString()}] [Bedrock Response - OCR] Succeeded`);
    
    let cleanText = responseText;
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsedData = JSON.parse(cleanText);
    res.json(parsedData);
  } catch (error) {
    console.error('OCR analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze document', error: error.message });
  }
});

// ── POST /api/travel-wallet/readiness/check (AI Travel Eligibility Check) ────────
router.post('/readiness/check', protect, async (req, res) => {
  const { tripId } = req.body;
  if (!tripId) {
    return res.status(400).json({ message: 'tripId is required' });
  }

  try {
    const trip = await Trip.findById(req.user.userId, tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const documents = await TravelDocument.findByUserId(req.user.userId);

    // Sanitize documents to avoid sharing credit cards or fully sensitive numbers to the LLM (first/last digits only)
    const safeDocs = documents.map(doc => {
      let maskedNum = doc.number || 'N/A';
      if (doc.number && doc.number.length > 4) {
        maskedNum = doc.number.substring(0, 2) + '*'.repeat(doc.number.length - 4) + doc.number.substring(doc.number.length - 2);
      }
      return {
        type: doc.type,
        number: maskedNum,
        expiryDate: doc.expiryDate,
        issueDate: doc.issueDate,
        country: doc.country,
        nationality: doc.nationality,
        visaType: doc.visaType,
        entries: doc.entries,
        vaccineType: doc.vaccineType,
        doseDates: doc.doseDates,
        insuranceProvider: doc.insuranceProvider,
        policyNumber: doc.policyNumber ? 'Policy-***' : undefined,
        coverageAmount: doc.coverageAmount,
        coverageDetails: doc.coverageDetails,
        notes: doc.notes
      };
    });

    const systemPrompt = `You are the "AI Travel Eligibility & Readiness Engine" for the TravelAI application.
Analyze the user's upcoming trip details and their uploaded travel documents to determine their readiness for travel and immigration confidence.

Key checks to evaluate:
1. Passport Validity: Passports should generally be valid for at least 6 months beyond the trip's return date. Flag if it is expiring soon or already expired.
2. Visa Eligibility: Check if the destination requires a visa for the traveler's nationality (assume traveler's nationality matches the passport nationality if available, or fall back to logical defaults). If a visa document exists, check if its dates and entries match the trip.
3. Transit Visa: Determine if layovers or transit points (if indicated in the trip destination, description, or notes) require a transit visa.
4. Insurance Coverage: Verify if they have a travel insurance policy covering the entire duration of the trip.
5. Vaccination Compliance: Identify any health advisories, required vaccines (e.g. Yellow Fever, COVID), or quarantine rules for the destination.
6. Missing Documents: Identify essential documents that are missing based on destination (e.g., if traveling internationally, a Passport is required; if driving, a Driving License is recommended).

You MUST respond strictly with a valid JSON object matching the following structure. Do NOT include markdown code blocks, backticks, or any conversational text outside of the JSON object:
{
  "readinessScore": 85, // Integer 0 to 100
  "confidenceScore": "High", // "High", "Medium", or "Low"
  "confidenceReason": "Passport and Visa are valid, but travel insurance is missing.",
  "alerts": [
    {
      "type": "danger", // "danger", "warning", "info"
      "message": "Passport expires in 4 months, which is less than the 6 months rule for many countries."
    },
    {
      "type": "warning",
      "message": "No travel insurance policy was found in your wallet."
    }
  ],
  "requirements": [
    { "name": "Passport", "status": "verified", "details": "Expires on 2028-12-10 (Valid)" },
    { "name": "Tourist Visa", "status": "verified", "details": "Multiple entry visa covers trip dates" },
    { "name": "Vaccination", "status": "warning", "details": "Yellow Fever vaccine recommended for Kenya" },
    { "name": "Travel Insurance", "status": "missing", "details": "Recommended for international trips" }
  ],
  "destinationRules": [
    "Passport must be valid for at least 6 months from arrival date.",
    "A tourist eVisa is required for visitors.",
    "Yellow Fever vaccination certificate required if arriving from transmission risk countries."
  ],
  "transitAdvice": [
    "No transit visa needed for layovers under 24 hours, provided you stay in the transit area."
  ]
}`;

    const userMessage = `Trip Details:
Destination: ${trip.destination}
Duration: ${trip.duration}
Budget: ${trip.budget}
Companions: ${trip.companions}
Activities: ${trip.activities ? trip.activities.join(', ') : 'None'}

User's Stored Documents:
${JSON.stringify(safeDocs, null, 2)}`;

    const body = JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: [{
        role: 'user',
        content: [{ text: userMessage }]
      }],
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.3,
      }
    });

    console.log(`🤖 [${new Date().toISOString()}] [Bedrock Request - Readiness] Checking readiness for trip ${trip._id}`);
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await bedrock.send(command);
    const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const responseText = decoded.output.message.content[0].text.trim();

    console.log(`✅ [${new Date().toISOString()}] [Bedrock Response - Readiness] Succeeded`);
    
    let cleanText = responseText;
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsedData = JSON.parse(cleanText);
    res.json(parsedData);
  } catch (error) {
    console.error('Readiness check error:', error);
    res.status(500).json({ message: 'Failed to verify travel readiness', error: error.message });
  }
});

// ── POST /api/travel-wallet/risk-radar (AI Travel Risk Radar) ─────────────────────
router.post('/risk-radar', protect, async (req, res) => {
  const { destination: reqDestination, tripId, nationality } = req.body;
  let destination = reqDestination;

  try {
    if (tripId) {
      const trip = await Trip.findById(req.user.userId, tripId);
      if (trip) {
        destination = trip.destination;
      }
    }

    if (!destination) {
      return res.status(400).json({ message: 'destination or tripId is required' });
    }

    const systemPrompt = `You are the "AI Travel Risk Radar" security analyst for the TravelAI application.
Analyze the requested travel destination and generate a comprehensive travel risk assessment.

Provide:
1. Overall Risk Level: Must be exactly one of: "Low", "Moderate", "High", "Extreme".
2. Overall Risk Reason: A concise summary of the safety context.
3. Political Instability Alerts: Ongoing protests, active conflicts, strikes, or political events.
4. Natural Disaster Alerts: Active weather warnings, volcanic activity, earthquakes, or seasonal weather hazards.
5. Health Outbreak Warnings: Vaccine advisories, active outbreaks, quarantine requirements, or local disease advisories.
6. Scam Risk Index: An integer between 0 and 100 representing the likelihood/frequency of tourist scams.
7. Typical Scams list: Typical tourist scams and how to avoid them.
8. Unsafe Areas / Neighborhoods: Specific areas, roads, or districts that are unsafe or require high caution, labeled as "High" or "Extreme" risk, with a description of the danger.
9. Emergency Contacts: Local numbers for Police, Ambulance, Fire department, and user's embassy if a user nationality is provided.

You MUST respond strictly with a valid JSON object matching the following structure. Do NOT include markdown code blocks, backticks, or any conversational text outside of the JSON object:
{
  "overallRisk": "Moderate", 
  "riskReason": "Generally safe for tourists, but high caution is recommended due to pickpocketing and regional alerts.",
  "politicalAlerts": [
    "Public transit strikes planned for next Thursday",
    "Minor political demonstrations near the Parliament building"
  ],
  "naturalDisasters": [
    "Severe heatwave advisory active; drink plenty of water",
    "High risk of sudden thunderstorms and flooding in low-lying sectors"
  ],
  "healthWarnings": [
    "Dengue fever warning; use insect repellent",
    "Routine vaccinations recommended before entry"
  ],
  "scamIndex": 62,
  "typicalScams": [
    {
      "scam": "Unmetered Taxis",
      "avoidance": "Only use official airport taxi stands or pre-booked rideshare apps."
    },
    {
      "scam": "Petition Signature Distraction",
      "avoidance": "Ignore street groups attempting to get you to sign papers; this is a pickpocketing cover."
    }
  ],
  "unsafeAreas": [
    {
      "area": "Red Light District / Northern Outskirts",
      "risk": "High",
      "reason": "Increased rates of theft and street solicitation after dark."
    },
    {
      "area": "Central Transit Hub at Night",
      "risk": "Moderate",
      "reason": "Common target area for pickpockets and scammers."
    }
  ],
  "emergencyContacts": {
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "embassy": "Verify at the nearest diplomatic mission."
  }
}`;

    const userMessage = `Destination: ${destination}
User Nationality: ${nationality || 'Not specified'}`;

    const body = JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: [{
        role: 'user',
        content: [{ text: userMessage }]
      }],
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.3,
      }
    });

    console.log(`🤖 [${new Date().toISOString()}] [Bedrock Request - Risk Radar] Evaluating safety for ${destination}`);
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await bedrock.send(command);
    const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const responseText = decoded.output.message.content[0].text.trim();

    console.log(`✅ [${new Date().toISOString()}] [Bedrock Response - Risk Radar] Succeeded`);

    let cleanText = responseText;
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsedData = JSON.parse(cleanText);
    res.json(parsedData);
  } catch (error) {
    console.error('Risk radar error:', error);
    res.status(500).json({ message: 'Failed to retrieve travel risk radar', error: error.message });
  }
});

module.exports = router;