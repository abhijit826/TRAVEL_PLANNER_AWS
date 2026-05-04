#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: EC2 Setup Script (run this ON the EC2 instance after SSH-ing in)
#
# Recommended EC2 settings:
#   AMI    : Amazon Linux 2023 (64-bit x86)
#   Type   : t3.small
#   Region : ap-south-1 (Mumbai)
#   Storage: 20 GB gp3
#   SG     : Allow inbound 22 (SSH), 5000 (API), 80, 443
#   IAM    : Attach role "TravelPlannerEC2Role" (see below)
#
# IAM Role Permissions needed (TravelPlannerEC2Role):
#   - AmazonDynamoDBFullAccess
#   - AmazonSSMReadOnlyAccess (if using SSM Parameter Store)
#
# Run: bash infrastructure/2-setup-ec2.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "══════════════════════════════════════════════"
echo "  Travel Planner — EC2 Setup (Amazon Linux 2023)"
echo "══════════════════════════════════════════════"

# 1. Update system
sudo dnf update -y

# 2. Install Node.js 20 (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs git

echo "✅ Node.js $(node -v) installed"

# 3. Install PM2 globally
sudo npm install -g pm2

echo "✅ PM2 installed"

# 4. Install Nginx (reverse proxy: 80 → 5000)
sudo dnf install -y nginx

# 5. Configure Nginx
sudo tee /etc/nginx/conf.d/travelplanner.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
EOF

sudo systemctl enable nginx
sudo systemctl start nginx
echo "✅ Nginx configured as reverse proxy"

# 6. Clone / pull project
APP_DIR="/home/ec2-user/travel-planner"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone https://github.com/abhijit826/saksh.git "$APP_DIR"
  cd "$APP_DIR"
fi

# 7. Install dependencies
npm install --production
echo "✅ npm dependencies installed"

# 8. Create .env on EC2 — fill in your actual values!
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=5000
AWS_REGION=ap-south-1
JWT_SECRET=REPLACE_WITH_STRONG_SECRET
DYNAMODB_USERS_TABLE=travelplanner-users
DYNAMODB_TRIPS_TABLE=travelplanner-trips
DYNAMODB_DOCUMENTS_TABLE=travelplanner-documents
OPENWEATHERMAP_API_KEY=REPLACE_WITH_KEY
GEMINI_API_KEY=REPLACE_WITH_KEY
FRONTEND_URL=https://REPLACE_WITH_CLOUDFRONT_URL.cloudfront.net
ENVEOF

echo "⚠️  Edit .env and set your actual secrets before starting!"

# 9. Start app with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | sudo bash   # Auto-start on reboot

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ EC2 setup complete!"
echo "  App running on http://localhost:5000"
echo "  Check logs: pm2 logs travel-planner-api"
echo "══════════════════════════════════════════════"
