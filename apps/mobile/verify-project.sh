#!/bin/bash

# Pokemon Card Grader - Project Verification Script
# Run this to verify all files are present

echo "🎮 Pokemon Card Grader - Project Verification"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
total=0
found=0

# Function to check file
check_file() {
    total=$((total + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        found=$((found + 1))
    else
        echo -e "${RED}✗${NC} $1 ${RED}(MISSING)${NC}"
    fi
}

echo "📱 Core Application Files:"
check_file "App.tsx"
check_file "src/types/index.ts"
check_file "src/constants/grading.ts"
echo ""

echo "🎨 Screen Components:"
check_file "src/screens/HomeScreen.tsx"
check_file "src/screens/CameraScreen.tsx"
check_file "src/screens/AnalysisScreen.tsx"
check_file "src/screens/ResultsScreen.tsx"
echo ""

echo "⚙️ Services:"
check_file "src/services/imageAnalysis.ts"
check_file "src/services/imageProcessing.ts"
echo ""

echo "🔧 Configuration:"
check_file "package.json"
check_file "tsconfig.json"
check_file "app.json"
check_file "babel.config.js"
check_file ".eslintrc.js"
check_file ".prettierrc.js"
check_file ".npmrc"
check_file ".gitignore"
echo ""

echo "📚 Documentation:"
check_file "README.md"
check_file "START_HERE.md"
check_file "QUICKSTART.md"
check_file "SETUP.md"
check_file "DEVELOPMENT.md"
check_file "PROJECT_STRUCTURE.md"
check_file "SUMMARY.md"
echo ""

echo "📊 Project Statistics:"
echo "=============================================="
echo "Files checked: $total"
echo -e "Files found: ${GREEN}$found${NC}"
echo "Files missing: $((total - found))"
echo ""

if [ $found -eq $total ]; then
    echo -e "${GREEN}✅ All files present! Project is complete.${NC}"
    echo ""
    echo "📦 Next steps:"
    echo "1. Run: npm install"
    echo "2. Run: npm start"
    echo "3. Scan QR code with Expo Go app"
    echo ""
    echo "📖 Read START_HERE.md to get started!"
else
    echo -e "${RED}⚠️  Some files are missing!${NC}"
    echo "Please check the missing files above."
fi

echo ""
echo "🎯 Quick Start Commands:"
echo "=============================================="
echo "Install dependencies:  npm install"
echo "Start dev server:      npm start"
echo "Run on iOS:            npm run ios"
echo "Run on Android:        npm run android"
echo ""
