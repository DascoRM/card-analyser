# Quick Start Guide

Get the Pokemon Card Grader running in 5 minutes.

## Prerequisites

You need:
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)

Optional but recommended:
- **Physical iOS/Android device** with Expo Go app
- **iOS Simulator** (Mac only) or **Android Emulator**

## Installation (2 minutes)

### 1. Install dependencies
```bash
npm install
```

This downloads ~300MB of dependencies. Coffee break time!

### 2. Start the development server
```bash
npm start
```

You'll see:
- QR code in terminal
- Development menu
- Metro bundler logs

## Running the App (1 minute)

### Option A: Physical Device (Recommended)

**Why recommended?** Camera works best on real devices.

1. **Install Expo Go**:
   - iOS: App Store → Search "Expo Go"
   - Android: Google Play → Search "Expo Go"

2. **Scan QR code**:
   - iOS: Open Camera app → Point at QR code
   - Android: Open Expo Go → Tap "Scan QR Code"

3. **App loads automatically**

### Option B: iOS Simulator (Mac only)

```bash
npm run ios
```

Simulator opens automatically with app loaded.

**Note**: Simulator camera has limitations.

### Option C: Android Emulator

```bash
npm run android
```

Emulator opens with app loaded.

**Note**: Emulator camera has limitations.

## First Run (2 minutes)

### 1. Grant Camera Permission
- App asks for camera permission
- Tap "Allow" / "Grant Permission"

### 2. Test the App
Follow this flow:

**Home Screen**:
- Read the introduction
- Tap "Start Grading"

**Camera - Front**:
- Point camera at a Pokemon card (or any card)
- Position in the green frame
- Tap the green button to capture

**Camera - Back**:
- Flip the card
- Capture the back
- Tap "Continue"

**Analysis**:
- Watch the progress bar
- Takes 2-3 seconds
- Automatic advancement

**Results**:
- View your grade (1-10)
- See detailed breakdown
- Check individual scores
- View captured photos
- Test "Share Results"
- Tap "Grade Another Card"

### 3. Success!
You've graded your first card!

## Troubleshooting

### "Cannot find module" error
```bash
rm -rf node_modules
npm install
```

### "Metro bundler failed"
```bash
npm start --clear
```

### "Camera not working"
- Use physical device instead of simulator
- Check camera permissions in device settings
- Restart app

### "Expo Go won't connect"
- Ensure phone and computer on same WiFi
- Disable VPN
- Try typing the URL manually in Expo Go

### App crashes on startup
```bash
# Clear all caches
rm -rf node_modules .expo
npm install
npm start --clear
```

## What's Next?

### Explore the Code

**Start here**:
- `/App.tsx` - Main navigation setup
- `/src/screens/HomeScreen.tsx` - Entry point
- `/src/services/imageAnalysis.ts` - Grading logic

### Make Changes

Try these simple modifications:

**Change app colors**:
Edit any screen file, search for `#4CAF50` and replace with your color.

**Adjust grading weights**:
Edit `/src/constants/grading.ts`:
```typescript
export const CRITERIA_WEIGHTS = {
  BORDERS: 0.25,    // ← Change these numbers
  DEFECTS: 0.30,    // Make sure they sum to 1.0
  CENTERING: 0.25,
  CUT_QUALITY: 0.20,
};
```

Save the file → App reloads automatically → Test new grading!

### Read Documentation

- `README.md` - Project overview
- `SETUP.md` - Detailed setup
- `DEVELOPMENT.md` - Development guide
- `PROJECT_STRUCTURE.md` - Code organization

## Development Workflow

Standard workflow:

1. **Start dev server**: `npm start`
2. **Make code changes**: Edit any file
3. **See changes**: App reloads automatically
4. **Debug**: Shake device → "Debug Remote JS"
5. **Restart**: Press `r` in terminal

## Common Commands

```bash
# Start development
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Clear cache and restart
npm start --clear

# Install new package
npm install package-name

# Check for updates
npm outdated
```

## Tips for Success

1. **Use a real device**: Camera works better
2. **Good lighting**: Take photos in well-lit areas
3. **Hold steady**: Keep camera still for clear photos
4. **Frame properly**: Position card in green guide
5. **Read the docs**: Check DEVELOPMENT.md for details

## Quick Reference

### Project Structure
```
pokemon-card-grader/
├── App.tsx              # Navigation setup
├── src/
│   ├── screens/        # 4 screens (Home, Camera, Analysis, Results)
│   ├── services/       # Image analysis logic
│   ├── types/          # TypeScript types
│   └── constants/      # Grading scales
└── package.json        # Dependencies
```

### Key Files
- `imageAnalysis.ts` - Core grading algorithm
- `HomeScreen.tsx` - App entry point
- `CameraScreen.tsx` - Photo capture
- `ResultsScreen.tsx` - Grade display
- `grading.ts` - Grading constants

### Tech Stack
- React Native 0.76.5
- Expo SDK 52
- TypeScript 5.3
- React Navigation 6
- expo-camera

## Get Help

If stuck:
1. Check `SETUP.md` for detailed instructions
2. Read `DEVELOPMENT.md` for architecture details
3. Search error message online
4. Check Expo docs: https://docs.expo.dev/

## Success Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm start`)
- [ ] App loaded on device
- [ ] Camera permission granted
- [ ] Successfully graded a card
- [ ] Viewed results
- [ ] Explored the code

---

**Ready?** Run `npm install` and let's go!

Time to grade: ~5 minutes | Lines of code: ~1,500 | Files: 22
