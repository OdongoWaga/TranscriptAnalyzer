#!/bin/bash

# Transcript Analyzer Setup Script
echo "🎓 Setting up Transcript Analyzer..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI..."
    npm install -g @expo/cli
fi

echo "✅ Expo CLI is available"

# Check API key configuration
echo "🔑 Checking API key configuration..."
if grep -q "YOUR_GEMINI_API_KEY" src/config/env.ts; then
    echo "⚠️  WARNING: Gemini API key not configured!"
    echo ""
    echo "To configure your API key:"
    echo "1. Visit https://makersuite.google.com/app/apikey"
    echo "2. Create a new API key"
    echo "3. Open src/config/env.ts"
    echo "4. Replace 'YOUR_GEMINI_API_KEY' with your actual key"
    echo ""
    echo "The app will not work without a valid API key."
else
    echo "✅ API key appears to be configured"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the app:"
echo "  npm start          # Start Expo development server"
echo "  npm run ios        # Run on iOS simulator"
echo "  npm run android    # Run on Android emulator"
echo "  npm run web        # Run in web browser"
echo ""
echo "For more information, see README.md"
