# Project Structure

Complete file tree for Pokemon Card Grader POC.

```
pokemon-card-grader/
│
├── 📱 App Entry
│   └── App.tsx                      # Main app with navigation setup
│
├── 🎨 Source Code
│   └── src/
│       ├── constants/
│       │   └── grading.ts           # Grading scales, colors, labels
│       │
│       ├── services/
│       │   ├── imageAnalysis.ts     # Core grading logic (main service)
│       │   └── imageProcessing.ts   # Image preprocessing utilities
│       │
│       ├── screens/
│       │   ├── HomeScreen.tsx       # Welcome screen (entry point)
│       │   ├── CameraScreen.tsx     # Photo capture (front & back)
│       │   ├── AnalysisScreen.tsx   # Processing animation
│       │   └── ResultsScreen.tsx    # Final grading results
│       │
│       └── types/
│           └── index.ts             # TypeScript type definitions
│
├── 🖼️ Assets
│   └── assets/
│       └── .gitkeep                 # Placeholder for icons/images
│
├── ⚙️ Configuration
│   ├── app.json                     # Expo configuration
│   ├── package.json                 # Dependencies and scripts
│   ├── tsconfig.json                # TypeScript configuration
│   ├── babel.config.js              # Babel configuration
│   ├── .eslintrc.js                 # ESLint rules
│   ├── .prettierrc.js               # Prettier formatting
│   └── .npmrc                       # NPM configuration
│
├── 📚 Documentation
│   ├── README.md                    # Main project documentation
│   ├── SETUP.md                     # Step-by-step setup guide
│   ├── DEVELOPMENT.md               # Development guide
│   └── PROJECT_STRUCTURE.md         # This file
│
└── 🚫 Ignored
    ├── .gitignore                   # Git ignore rules
    ├── node_modules/                # Dependencies (after npm install)
    └── .expo/                       # Expo cache (after first run)
```

## File Descriptions

### Core Application Files

#### `App.tsx`
Main application entry point with React Navigation stack.
- Configures navigation
- Defines screen flow
- Sets header styling

#### `src/types/index.ts`
Complete TypeScript type definitions for:
- Card images and photos
- Grading criteria and results
- Navigation parameters
- Image analysis results

### Services Layer

#### `src/services/imageAnalysis.ts` (Main Service)
Core grading engine with:
- `gradeCard()` - Main entry point for grading
- `analyzeBorders()` - Border uniformity evaluation
- `analyzeDefects()` - Surface defect detection
- `analyzeCentering()` - Image alignment analysis
- `analyzeCutQuality()` - Edge and corner quality
- `calculateFinalGrade()` - Weighted grade calculation

#### `src/services/imageProcessing.ts`
Image preprocessing utilities:
- Image normalization
- Edge detection simulation
- Corner detection simulation
- Variance analysis
- Quality metrics

### Screen Components

#### `src/screens/HomeScreen.tsx`
Welcome screen featuring:
- App introduction
- How it works section
- Evaluation criteria overview
- Start grading button

#### `src/screens/CameraScreen.tsx`
Photo capture interface:
- Live camera preview
- Framing guides
- Front/back sequence
- Permission handling
- Image preprocessing

#### `src/screens/AnalysisScreen.tsx`
Processing screen with:
- Progress animation
- Status updates
- Loading indicators
- Step-by-step progress

#### `src/screens/ResultsScreen.tsx`
Final results display:
- Final grade (1-10)
- Individual criterion scores
- Detailed metrics
- Photo thumbnails
- Share functionality

### Constants

#### `src/constants/grading.ts`
Grading system constants:
- Grade scale definitions
- Criteria weights
- Defect penalties
- Helper functions (labels, colors)

### Configuration Files

#### `package.json`
Dependencies and scripts:
- React Native 0.76.5
- Expo SDK 52
- React Navigation 6
- Camera and image processing

#### `tsconfig.json`
TypeScript strict mode enabled:
- ES modules
- React Native JSX
- Strict type checking

#### `app.json`
Expo configuration:
- App metadata
- Camera permissions
- Platform settings

## Data Flow

```
User Journey:
HomeScreen
    ↓ (Tap "Start Grading")
CameraScreen (Front)
    ↓ (Capture photo)
CameraScreen (Back)
    ↓ (Capture photo)
AnalysisScreen
    ↓ (Process images - 2-3 seconds)
ResultsScreen
    ↓ (View results or grade another)
HomeScreen
```

```
Code Flow:
1. CameraScreen captures photos
2. Images preprocessed (resize, compress)
3. AnalysisScreen calls gradeCard()
4. imageAnalysis.ts runs all analyses
5. Results combined and weighted
6. ResultsScreen displays final grade
```

## Key Dependencies

### Production
- `react-native`: 0.76.5 - Framework
- `expo`: ~52.0.0 - Managed workflow
- `expo-camera`: ~16.0.0 - Camera access
- `expo-image-manipulator`: ~13.0.0 - Image processing
- `@react-navigation/native`: ^6.1.9 - Navigation

### Development
- `typescript`: ~5.3.3 - Type safety
- `@types/react`: ~18.3.12 - React types

## File Sizes (Estimated)

```
Source Code:
- App.tsx:                 ~1 KB
- All screens:             ~15 KB
- Services:                ~10 KB
- Types:                   ~2 KB
- Total source:            ~30 KB

Dependencies:
- node_modules:            ~300 MB
- Production bundle:       ~50 MB (iOS/Android)
```

## Build Output

After building:
```
iOS:
- .app bundle:            ~50 MB
- IPA file:               ~40 MB

Android:
- APK:                    ~45 MB
- AAB:                    ~40 MB
```

## Scripts

Available npm scripts:
```bash
npm start              # Start development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser
```

## Customization Points

Easy to customize:
1. **Colors**: Change in screen styles
2. **Grading weights**: Modify `CRITERIA_WEIGHTS` in grading.ts
3. **Analysis logic**: Update functions in imageAnalysis.ts
4. **UI text**: All strings are inline, easy to find
5. **Icons**: Replace in assets/ folder

## Extension Points

Add features by:
1. **New screens**: Create in src/screens/, add to App.tsx
2. **New services**: Add to src/services/
3. **New types**: Extend src/types/index.ts
4. **New constants**: Add to src/constants/

## Testing Checklist

- [ ] Install dependencies (npm install)
- [ ] Start dev server (npm start)
- [ ] Test on physical device (recommended)
- [ ] Grant camera permissions
- [ ] Capture card front
- [ ] Capture card back
- [ ] View analysis animation
- [ ] Check results screen
- [ ] Test share functionality
- [ ] Grade another card

## Common Modifications

### Change grading weights
Edit `src/constants/grading.ts`:
```typescript
export const CRITERIA_WEIGHTS = {
  BORDERS: 0.25,      // Adjust these
  DEFECTS: 0.30,      // Sum should = 1.0
  CENTERING: 0.25,
  CUT_QUALITY: 0.20,
};
```

### Add new criterion
1. Update types in `src/types/index.ts`
2. Add analysis function in `src/services/imageAnalysis.ts`
3. Update UI in `src/screens/ResultsScreen.tsx`
4. Add weight in `src/constants/grading.ts`

### Customize colors
Edit screen styles, search for color codes:
- Primary: `#4CAF50` (green)
- Success: `#8BC34A` (light green)
- Warning: `#FFC107` (amber)
- Error: `#F44336` (red)

---

This structure is designed for easy understanding and modification. All files are well-commented and follow React best practices.
