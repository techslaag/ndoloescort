#!/bin/bash

# Deploy Flutterwave Payment Function to Appwrite

echo "🚀 Deploying Flutterwave Payment Function..."

# Check if Appwrite CLI is installed
if ! command -v appwrite &> /dev/null
then
    echo "❌ Appwrite CLI not found. Installing..."
    npm install -g appwrite
fi

# Check if logged in
echo "🔐 Checking Appwrite login status..."
if ! appwrite account get &> /dev/null; then
    echo "Please login to Appwrite:"
    appwrite login
fi

# Install dependencies first
echo "📦 Installing function dependencies..."
cd functions/flutterwave-payment
npm install
cd ../..

# Deploy the function using appwrite.json configuration
echo "📤 Deploying function..."
appwrite deploy function --functionId="flutterwave-payment" --yes

echo "✅ Function deployed successfully!"
echo ""
echo "⚠️  IMPORTANT: Next steps:"
echo "1. Go to Appwrite Console > Functions > Flutterwave Payment > Settings > Variables"
echo "2. Add the following environment variables:"
echo "   - FLUTTERWAVE_SECRET_KEY: Your Flutterwave Secret Key"
echo "   - APPWRITE_FUNCTION_ENDPOINT: https://fra.cloud.appwrite.io/v1"
echo "   - APPWRITE_FUNCTION_PROJECT_ID: 68874aa60018d306519d"
echo "   - APPWRITE_FUNCTION_API_KEY: Your API key with database read/write permissions"
echo ""
echo "3. The function ID 'flutterwave-payment' is already configured in the code"