# Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm start
```

### 3. Run on Device

**Option A: Physical Device (Recommended for camera testing)**
1. Install "Expo Go" from App Store (iOS) or Google Play (Android)
2. Scan the QR code shown in terminal
3. App will load on your device

**Option B: Simulator/Emulator**
```bash
# iOS (Mac only)
npm run ios

# Android
npm run android
```

## Detailed Setup

### Prerequisites Check

Verify you have the required tools:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Install Expo CLI globally (optional but recommended)
npm install -g expo-cli
```

### Project Structure

After installation, you should see:

```
pokemon-card-grader/
├── node_modules/          # Dependencies (created after npm install)
├── .expo/                 # Expo cache (created on first run)
├── assets/                # App icons and images
├── src/
│   ├── screens/          # App screens (4 screens)
│   ├── services/         # Business logic
│   └── types/            # TypeScript definitions
├── App.tsx               # Main entry point
├── package.json          # Dependencies
└── README.md            # Documentation
```

### First Run

When you first start the app:

1. Terminal will show a QR code
2. Press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - Scan QR with Expo Go app
   - `w` for web (limited camera support)

### Camera Permissions

The app requires camera access:

- **iOS**: Will automatically prompt for permission
- **Android**: Will automatically prompt for permission
- **Web**: Browser will ask for camera access

If permissions are denied, you can grant them in:
- **iOS**: Settings > Privacy > Camera
- **Android**: Settings > Apps > Expo Go > Permissions

## Testing the App

### Manual Test Flow

1. **Home Screen**
   - Should see welcome screen
   - Tap "Start Grading" button

2. **Camera Screen (Front)**
   - Grant camera permission if prompted
   - Position a card (or any rectangular object) in frame
   - Tap large green button to capture

3. **Camera Screen (Back)**
   - Flip the card/object
   - Capture back photo
   - Tap "Continue" when ready

4. **Analysis Screen**
   - Watch progress bar animate
   - Should complete in 2-3 seconds
   - Automatically advances to results

5. **Results Screen**
   - View final grade (1-10)
   - Check individual criterion scores
   - See captured photos
   - Test "Share Results" button
   - Tap "Grade Another Card" to restart

### Expected Behavior

- All navigation should be smooth
- Camera preview should be live
- Photos should be clear and properly sized
- Analysis should complete without errors
- Results should show realistic grades (varies each time)

## Common Issues

### Issue: "Metro bundler failed to start"

**Solution**:
```bash
# Clear cache
npm start --clear
```

### Issue: "Camera not working in simulator"

**Solution**: Use a physical device. iOS Simulator and Android Emulator have limited camera support.

### Issue: "Module not found" errors

**Solution**:
```bash
rm -rf node_modules
npm install
```

### Issue: "TypeScript errors"

**Solution**: Ensure you're using TypeScript 5.3+:
```bash
npm install typescript@~5.3.3
```

### Issue: Slow installation

**Solution**: Dependencies are large (~300MB). Ensure stable internet connection.

## Development Tips

### Hot Reload

The app supports hot reload:
- Save any file to see changes instantly
- No need to restart the app
- State is preserved during reload

### Debug Menu

Shake your device or press:
- iOS: `Cmd+D` (simulator)
- Android: `Cmd+M` or `Ctrl+M`

Options include:
- Reload
- Debug Remote JS
- Show Performance Monitor
- Toggle Inspector

### Logs

View console logs:
```bash
# The terminal running "npm start" shows logs
# Or use React Native Debugger
```

### Making Changes

**Modify UI**: Edit files in `src/screens/`
**Change Analysis Logic**: Edit `src/services/imageAnalysis.ts`
**Add Navigation**: Edit `App.tsx`
**Update Types**: Edit `src/types/index.ts`

## Building for Production

### Create Standalone Apps

**iOS (requires Mac + Apple Developer account)**:
```bash
expo build:ios
```

**Android**:
```bash
expo build:android
```

### EAS Build (Recommended)

Modern Expo build system:
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build
eas build --platform ios
eas build --platform android
```

## Next Steps

After setup:

1. **Test thoroughly**: Try different lighting conditions, card angles
2. **Customize branding**: Replace icons in `assets/`
3. **Enhance analysis**: Implement real computer vision in `imageAnalysis.ts`
4. **Add features**: History, batch processing, PDF export
5. **Deploy**: Submit to App Store / Google Play

## Support

- **Expo Docs**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **React Native**: https://reactnative.dev/

---

Ready to start? Run `npm install` then `npm start`!
