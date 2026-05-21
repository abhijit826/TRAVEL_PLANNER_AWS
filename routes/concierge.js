const express = require('express');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const router = express.Router();

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0';

// Helper to format system prompt and build model payload for chat
const chatWithModel = async (modelId, systemPrompt, chatHistory, userMessage) => {
  // Combine existing chat history and the new user message
  const fullHistory = [...chatHistory, { role: 'user', content: userMessage }];

  let body;
  if (modelId.startsWith('anthropic.')) {
    // Format for Claude
    body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      temperature: 0.7,
      system: systemPrompt,
      messages: fullHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
    });
  } else if (modelId.includes('nova')) {
    // Format for Amazon Nova
    body = JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: fullHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: [{ text: msg.content }]
      })),
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9,
      },
    });
  } else {
    // Generic simple prompt fallback for Titan/Llama (single message style)
    let formattedPrompt = `${systemPrompt}\n\n`;
    for (const msg of fullHistory) {
      formattedPrompt += `${msg.role === 'assistant' ? 'Aria' : 'User'}: ${msg.content}\n`;
    }
    formattedPrompt += `Aria:`;

    if (modelId.includes('titan')) {
      body = JSON.stringify({
        inputText: formattedPrompt,
        textGenerationConfig: { maxTokenCount: 2048, temperature: 0.7, topP: 0.9 },
      });
    } else if (modelId.includes('llama')) {
      body = JSON.stringify({
        prompt: formattedPrompt,
        max_gen_len: 1024,
        temperature: 0.7
      });
    } else {
      throw new Error(`Unsupported model for concierge: ${modelId}`);
    }
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const response = await bedrock.send(command);
  const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));

  if (modelId.startsWith('anthropic.'))   return decoded.content[0].text;
  if (modelId.includes('nova'))            return decoded.output.message.content[0].text;
  if (modelId.includes('titan'))           return decoded.results[0].outputText;
  if (modelId.includes('llama'))           return decoded.generation;
};

// Route: POST /api/concierge/chat
router.post('/chat', async (req, res) => {
  const { message, history = [], tripContext } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    let systemPrompt = `You are "Aria", a premium, friendly 24/7 AI Travel Concierge for the TravelAI application.
Your goal is to assist the user with intelligent, personalized trip recommendations, conversational planning support, local suggestions (dining, sights, shopping, transportation), packing lists, and general travel Q&A.
Keep your answers engaging, helpful, and concise (under 250 words unless asked for detail). Use Markdown for headers, bullet points, and bold text to make your answers easy to scan.`;

    if (tripContext) {
      systemPrompt += `\n\n[TRIP CONTEXT]
The user is asking in the context of their upcoming/saved trip:
- Destination: ${tripContext.destination}
- Duration: ${tripContext.duration}
- Budget: ${tripContext.budget || 'Not specified'}
- Companions: ${tripContext.companions || 'Not specified'}
- Saved Activities: ${tripContext.activities?.join(', ') || 'None saved yet'}
- Date: ${tripContext.date || 'Not specified'}

Tailor your responses specifically to this destination and these constraints (e.g. if they ask for restaurant suggestions, suggest options in ${tripContext.destination}).`;
    }

    const reply = await chatWithModel(MODEL_ID, systemPrompt, history, message);
    res.json({ reply });
  } catch (error) {
    console.error('Concierge Bedrock Error:', error);
    res.status(500).json({ message: 'Failed to generate response from Bedrock', error: error.message });
  }
});

module.exports = router;
