#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Create DynamoDB Tables in ap-south-1 (Mumbai)
# Prerequisites: AWS CLI installed + configured (aws configure)
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Stop immediately on any error

REGION="ap-south-1"

# ── Verify AWS CLI is installed ───────────────────────────────────────────────
if ! command -v aws &> /dev/null; then
  echo ""
  echo "❌ ERROR: AWS CLI is not installed!"
  echo ""
  echo "Install it with these commands:"
  echo "  curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip"
  echo "  unzip awscliv2.zip"
  echo "  sudo ./aws/install"
  echo ""
  exit 1
fi

# ── Verify AWS credentials are configured ─────────────────────────────────────
echo "Verifying AWS credentials..."
if ! aws sts get-caller-identity --region "$REGION" > /dev/null 2>&1; then
  echo ""
  echo "❌ ERROR: AWS credentials not configured or invalid!"
  echo "Run: aws configure"
  echo ""
  exit 1
fi
echo "✅ AWS credentials verified"
echo ""
echo "Creating DynamoDB tables in $REGION..."

# ── Helper function ───────────────────────────────────────────────────────────
create_table_or_skip() {
  local TABLE_NAME=$1
  local CREATE_CMD=$2

  if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "⚠️  Table '$TABLE_NAME' already exists — skipping"
  else
    eval "$CREATE_CMD"
    echo "✅ $TABLE_NAME created"
  fi
}

# ── 1. Users Table ────────────────────────────────────────────────────────────
create_table_or_skip "travelplanner-users" \
  "aws dynamodb create-table \
    --region '$REGION' \
    --table-name travelplanner-users \
    --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=email,AttributeType=S \
    --key-schema \
      AttributeName=userId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[
      {
        \"IndexName\": \"email-index\",
        \"KeySchema\": [{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]'"

# ── 2. Trips Table ────────────────────────────────────────────────────────────
create_table_or_skip "travelplanner-trips" \
  "aws dynamodb create-table \
    --region '$REGION' \
    --table-name travelplanner-trips \
    --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=_id,AttributeType=S \
    --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST"

# ── 3. Travel Documents Table ─────────────────────────────────────────────────
create_table_or_skip "travelplanner-documents" \
  "aws dynamodb create-table \
    --region '$REGION' \
    --table-name travelplanner-documents \
    --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=_id,AttributeType=S \
    --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST"

# ── Wait for tables to be ACTIVE ──────────────────────────────────────────────
echo ""
echo "Waiting for all tables to be ACTIVE (this takes ~10 seconds)..."
aws dynamodb wait table-exists --region "$REGION" --table-name travelplanner-users
aws dynamodb wait table-exists --region "$REGION" --table-name travelplanner-trips
aws dynamodb wait table-exists --region "$REGION" --table-name travelplanner-documents

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ All 3 DynamoDB tables are ACTIVE!"
echo "  Region: $REGION"
echo ""
echo "  Tables created:"
echo "    - travelplanner-users (with email-index GSI)"
echo "    - travelplanner-trips"
echo "    - travelplanner-documents"
echo "══════════════════════════════════════════════"
