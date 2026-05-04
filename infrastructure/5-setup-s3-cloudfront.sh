#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Create S3 bucket + CloudFront distribution for React frontend
# Run from your local machine AFTER building the frontend.
#
# Prerequisites:
#   1. Set VITE_API_URL in .env.production to your API Gateway URL
#   2. Run: npm run build  (from saksh/)
#   3. Then run this script
# ─────────────────────────────────────────────────────────────────────────────

set -e
REGION="ap-south-1"
PROFILE="${AWS_PROFILE:-default}"
BUCKET_NAME="travelplanner-frontend-$(date +%s)"  # Unique bucket name
DIST_DIR="dist"  # Vite build output

# ── 1. Create S3 Bucket ───────────────────────────────────────────────────────
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" \
  --profile "$PROFILE"

# Block all public access (CloudFront serves it, not direct S3)
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile "$PROFILE"

echo "✅ S3 bucket created: $BUCKET_NAME"

# ── 2. Upload build files ─────────────────────────────────────────────────────
echo "Uploading frontend build to S3..."
aws s3 sync "$DIST_DIR/" "s3://$BUCKET_NAME/" \
  --delete \
  --cache-control "max-age=31536000" \
  --profile "$PROFILE"

# index.html should NOT be cached
aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET_NAME/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile "$PROFILE"

echo "✅ Files uploaded"

# ── 3. Create CloudFront Origin Access Control ────────────────────────────────
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "TravelPlannerOAC",
    "Description": "OAC for Travel Planner S3",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' \
  --profile "$PROFILE" \
  --query 'OriginAccessControl.Id' --output text)

echo "✅ OAC created: $OAC_ID"

# ── 4. Create CloudFront Distribution ─────────────────────────────────────────
DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config "{
    \"CallerReference\": \"travel-planner-$(date +%s)\",
    \"Comment\": \"Travel Planner Frontend\",
    \"DefaultRootObject\": \"index.html\",
    \"Origins\": {
      \"Quantity\": 1,
      \"Items\": [{
        \"Id\": \"S3Origin\",
        \"DomainName\": \"${BUCKET_NAME}.s3.${REGION}.amazonaws.com\",
        \"S3OriginConfig\": {\"OriginAccessIdentity\": \"\"},
        \"OriginAccessControlId\": \"${OAC_ID}\"
      }]
    },
    \"DefaultCacheBehavior\": {
      \"TargetOriginId\": \"S3Origin\",
      \"ViewerProtocolPolicy\": \"redirect-to-https\",
      \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
      \"Compress\": true
    },
    \"CustomErrorResponses\": {
      \"Quantity\": 1,
      \"Items\": [{
        \"ErrorCode\": 404,
        \"ResponsePagePath\": \"/index.html\",
        \"ResponseCode\": \"200\",
        \"ErrorCachingMinTTL\": 0
      }]
    },
    \"Enabled\": true,
    \"PriceClass\": \"PriceClass_200\"
  }" \
  --profile "$PROFILE" \
  --query 'Distribution.{Id:Id,Domain:DomainName}' \
  --output json)

CLOUDFRONT_DOMAIN=$(echo "$DIST_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Domain'])")
CLOUDFRONT_ID=$(echo "$DIST_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Id'])")

# Attach S3 bucket policy to allow CloudFront OAC
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile "$PROFILE")
aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Principal\": {\"Service\": \"cloudfront.amazonaws.com\"},
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::${BUCKET_NAME}/*\",
      \"Condition\": {\"StringEquals\": {\"AWS:SourceArn\": \"arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${CLOUDFRONT_ID}\"}}
    }]
  }" \
  --profile "$PROFILE"

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ CloudFront distribution deployed!"
echo "  URL : https://$CLOUDFRONT_DOMAIN"
echo "  ID  : $CLOUDFRONT_ID"
echo "  Bucket: $BUCKET_NAME"
echo ""
echo "  Next:"
echo "  1. Set FRONTEND_URL=https://$CLOUDFRONT_DOMAIN in EC2 .env"
echo "  2. pm2 restart travel-planner-api (on EC2)"
echo "  3. To re-deploy frontend:"
echo "     npm run build && aws s3 sync dist/ s3://$BUCKET_NAME/ --delete"
echo "     aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths '/*'"
echo "══════════════════════════════════════════════"
