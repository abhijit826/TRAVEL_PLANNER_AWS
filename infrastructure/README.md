# AWS Deployment Guide — AI Travel Planner

## Architecture Overview

```
Browser
  │
  ▼
CloudFront (https://xxxx.cloudfront.net)
  │
  ├── /  ──────────────► S3 (React build)
  │
  └── /api/* ──────────► API Gateway (ap-south-1)
                              │
                 ┌────────────┴───────────────────┐
                 ▼                                 ▼
       EC2 t3.small                         Lambda (256MB)
       (Express.js)                    generate-itinerary
       /api/auth/*                     /api/generate-itinerary
       /api/trips/*
       /api/travel-wallet/*
       /api/users/*
                 │
                 ▼
          DynamoDB (ap-south-1)
          ├── travelplanner-users
          ├── travelplanner-trips
          └── travelplanner-documents
```

---

## Pre-requisites

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   # Access Key ID: <your key>
   # Secret Access Key: <your secret>
   # Region: ap-south-1
   ```

2. **Node.js 20+** on your local machine

3. **Git** access to push code to the repo

---

## Step-by-Step Deployment

### Step 1 — Create DynamoDB Tables
```bash
bash infrastructure/1-create-dynamodb-tables.sh
```

### Step 2 — Create IAM Role for EC2

In AWS Console → IAM → Roles → Create role:
- **Trusted entity**: EC2
- **Permissions**: `AmazonDynamoDBFullAccess`
- **Name**: `TravelPlannerEC2Role`

### Step 3 — Launch EC2 Instance

In AWS Console → EC2 → Launch Instance:
- **AMI**: Amazon Linux 2023 (64-bit x86)
- **Type**: t3.small
- **Region**: ap-south-1 (Mumbai)
- **Storage**: 20 GB gp3
- **IAM Role**: TravelPlannerEC2Role
- **Security Group**:
  - Inbound: SSH (22), HTTP (80), Custom TCP 5000 from API Gateway IPs
  - Outbound: All

SSH in and run:
```bash
# Copy and run the setup script
scp -i your-key.pem infrastructure/2-setup-ec2.sh ec2-user@<EC2-IP>:~/
ssh -i your-key.pem ec2-user@<EC2-IP>
bash 2-setup-ec2.sh
```

### Step 4 — Deploy Lambda

Create IAM Role for Lambda in console:
- **Trusted entity**: Lambda
- **Permissions**: `AWSLambdaBasicExecutionRole`
- **Name**: `TravelPlannerLambdaRole`
- Copy the ARN and paste into script

```bash
# Edit script first: set LAMBDA_ROLE_ARN
bash infrastructure/3-deploy-lambda.sh

# Then in AWS Console → Lambda → travel-planner-generate-itinerary
# → Configuration → Environment variables → Add:
#   OPENWEATHERMAP_API_KEY = <your key>
#   GEMINI_API_KEY = <your key>
```

### Step 5 — Setup API Gateway

```bash
# Edit script first: set EC2_PUBLIC_IP and LAMBDA_ARN
bash infrastructure/4-setup-api-gateway.sh

# Copy the output API URL, e.g.:
# https://abc123.execute-api.ap-south-1.amazonaws.com
```

### Step 6 — Build & Deploy Frontend

```bash
# Create production env file
cp .env.example .env.production

# Edit .env.production:
# VITE_API_URL=https://abc123.execute-api.ap-south-1.amazonaws.com
# VITE_GOOGLE_MAPS_API_KEY=AIzaSyAo0Gz0je0QxyNRXTKIB6czxDXEObxaGgg

# Build
npm run build  # (from root saksh directory - needs frontend deps)

# Deploy to S3 + CloudFront
bash infrastructure/5-setup-s3-cloudfront.sh
```

### Step 7 — Final EC2 Config Update

SSH into EC2 and update FRONTEND_URL in `.env`:
```bash
nano /home/ec2-user/travel-planner/.env
# Set: FRONTEND_URL=https://xxxx.cloudfront.net
pm2 restart travel-planner-api
```

---

## Re-deployment (After Code Changes)

### Backend update:
```bash
ssh -i key.pem ec2-user@<EC2-IP>
cd travel-planner && git pull && pm2 restart travel-planner-api
```

### Frontend update:
```bash
npm run build
aws s3 sync dist/ s3://<your-bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

### Lambda update:
```bash
bash infrastructure/3-deploy-lambda.sh
```

---

## Environment Variables Summary

| Variable | Where Set | Example |
|----------|-----------|---------|
| `JWT_SECRET` | EC2 `.env` | `super_secret_key` |
| `AWS_REGION` | EC2 `.env` | `ap-south-1` |
| `DYNAMODB_USERS_TABLE` | EC2 `.env` | `travelplanner-users` |
| `OPENWEATHERMAP_API_KEY` | EC2 `.env` + Lambda | `abc123` |
| `GEMINI_API_KEY` | Lambda env var | `AIza...` |
| `FRONTEND_URL` | EC2 `.env` | `https://xxxx.cloudfront.net` |
| `VITE_API_URL` | `.env.production` | `https://abc.execute-api.ap-south-1.amazonaws.com` |
| `VITE_GOOGLE_MAPS_API_KEY` | `.env.production` | `AIzaSy...` |
