#!/bin/bash

# Cloudflare Pages Deployment Script
# Run this script to deploy to Cloudflare Pages

echo "🚀 Deploying to Cloudflare Pages..."

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy with Wrangler (if installed)
if command -v wrangler &> /dev/null; then
    echo "🌐 Deploying to Cloudflare Pages..."
    # Note: For Pages, we use 'pages deploy' from the root, not the workers directory
    # The .wranglerignore file will exclude the Firebase functions directory
    wrangler pages deploy dist --project-name=motordash-b2b
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo "📊 Check your deployment at: https://motordash-b2b.pages.dev"
    else
        echo "❌ Deployment failed!"
        echo "💡 Try creating the Pages project first in the Cloudflare dashboard"
        exit 1
    fi
else
    echo "⚠️  Wrangler CLI not found."
    echo "Please install it with: npm install -g wrangler"
    echo "Then run: wrangler login"
    echo "And manually deploy the 'dist' folder to Cloudflare Pages"
fi
