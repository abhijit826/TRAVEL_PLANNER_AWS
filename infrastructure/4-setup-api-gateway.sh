#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Create API Gateway (HTTP API) + connect to EC2 and Lambda
# Run from your local machine after EC2 and Lambda are deployed.
# ─────────────────────────────────────────────────────────────────────────────

set -e
REGION="ap-south-1"
PROFILE="${AWS_PROFILE:-default}"
EC2_PUBLIC_IP="REPLACE_WITH_YOUR_EC2_PUBLIC_IP"   # e.g., 13.200.xx.xx
LAMBDA_ARN="REPLACE_WITH_LAMBDA_ARN"               # from Step 3 output
API_NAME="travel-planner-api"

echo "Creating HTTP API Gateway: $API_NAME"

# Create the API
API_ID=$(aws apigatewayv2 create-api \
  --name "$API_NAME" \
  --protocol-type HTTP \
  --cors-configuration "AllowOrigins=*,AllowMethods=GET POST PUT DELETE OPTIONS,AllowHeaders=Content-Type Authorization" \
  --region "$REGION" --profile "$PROFILE" \
  --query 'ApiId' --output text)

echo "✅ API created: $API_ID"

# ── EC2 Integration (HTTP proxy to EC2) ──────────────────────────────────────
EC2_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type HTTP_PROXY \
  --integration-method ANY \
  --integration-uri "http://${EC2_PUBLIC_IP}/{proxy}" \
  --payload-format-version "1.0" \
  --region "$REGION" --profile "$PROFILE" \
  --query 'IntegrationId' --output text)

# Route all /api/* to EC2 (except /api/generate-itinerary)
aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key "ANY /api/{proxy+}" \
  --target "integrations/$EC2_INTEGRATION_ID" \
  --region "$REGION" --profile "$PROFILE"

echo "✅ EC2 routes created"

# ── Lambda Integration ────────────────────────────────────────────────────────
LAMBDA_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type AWS_PROXY \
  --integration-uri "$LAMBDA_ARN" \
  --payload-format-version "2.0" \
  --region "$REGION" --profile "$PROFILE" \
  --query 'IntegrationId' --output text)

# Route /api/generate-itinerary → Lambda
aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key "POST /api/generate-itinerary" \
  --target "integrations/$LAMBDA_INTEGRATION_ID" \
  --region "$REGION" --profile "$PROFILE"

echo "✅ Lambda route created"

# ── Deploy to $default stage ──────────────────────────────────────────────────
aws apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --auto-deploy \
  --region "$REGION" --profile "$PROFILE"

# Allow API Gateway to invoke Lambda
aws lambda add-permission \
  --function-name "travel-planner-generate-itinerary" \
  --statement-id "api-gateway-invoke" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:*:${API_ID}/*" \
  --region "$REGION" --profile "$PROFILE" 2>/dev/null || true

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com"
echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ API Gateway deployed!"
echo "  Endpoint: $API_URL"
echo ""
echo "  Set VITE_API_URL=$API_URL in .env.production"
echo "  Set FRONTEND_URL=<CloudFront URL> in EC2 .env"
echo "══════════════════════════════════════════════"
