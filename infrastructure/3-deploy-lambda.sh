#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Package & Deploy Lambda Function
# Run from your local machine.
# Prerequisites: AWS CLI configured, zip utility installed
# ─────────────────────────────────────────────────────────────────────────────

set -e
REGION="ap-south-1"
FUNCTION_NAME="travel-planner-generate-itinerary"
PROFILE="${AWS_PROFILE:-default}"
LAMBDA_ROLE_ARN="REPLACE_WITH_YOUR_LAMBDA_EXECUTION_ROLE_ARN"
# Create this role in IAM with: AWSLambdaBasicExecutionRole policy

echo "Packaging Lambda function..."
cd lambda/generateItinerary
npm install --production
zip -r ../../lambda-itinerary.zip . -x "*.git*"
cd ../..
echo "✅ lambda-itinerary.zip created"

# Check if function exists
FUNC_EXISTS=$(aws lambda get-function --function-name "$FUNCTION_NAME" \
  --region "$REGION" --profile "$PROFILE" 2>/dev/null && echo "yes" || echo "no")

if [ "$FUNC_EXISTS" = "yes" ]; then
  echo "Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://lambda-itinerary.zip \
    --region "$REGION" \
    --profile "$PROFILE"
else
  echo "Creating Lambda function..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --handler index.handler \
    --zip-file fileb://lambda-itinerary.zip \
    --role "$LAMBDA_ROLE_ARN" \
    --timeout 60 \
    --memory-size 256 \
    --region "$REGION" \
    --profile "$PROFILE" \
    --environment "Variables={
      OPENWEATHERMAP_API_KEY=REPLACE,
      BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
    }"
fi

echo ""
echo "✅ Lambda deployed: $FUNCTION_NAME"
echo "⚠️  Set OPENWEATHERMAP_API_KEY and GEMINI_API_KEY in Lambda console > Environment variables"
