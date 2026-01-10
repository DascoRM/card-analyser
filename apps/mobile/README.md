# Pokemon Card Grader - React Native POC

A professional Pokemon card grading application built with React Native and Expo that uses local AI/image processing to evaluate card condition and assign PCA grades from 1-10.

## Features

- **Photo Capture**: Take photos of Pokemon card front and back using device camera
- **Local AI Analysis**: Process images entirely on-device with no cloud dependency
- **Comprehensive Grading**: Evaluate cards across 4 key criteria:
  - **Borders**: Uniformity and thickness assessment
  - **Defects**: Detection of scratches and surface imperfections
  - **Centering**: Image alignment and symmetry evaluation
  - **Cut Quality**: Edge straightness and corner sharpness analysis
- **Professional Reports**: Detailed grade breakdown with visual scoring
- **Share Results**: Export grading results to share with others

## Technology Stack

- **React Native 0.76.5**: Latest React Native with New Architecture support
- **Expo SDK 52**: Managed workflow for rapid development
- **TypeScript**: Type-safe development with strict mode
- **React Navigation 6**: Native stack navigation
- **expo-camera**: Native camera access for photo capture
- **expo-image-manipulator**: Local image processing and optimization

## Architecture

```
pokemon-card-grader/
├── App.tsx                      # Main app entry with navigation
├── src/
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── services/
│   │   └── imageAnalysis.ts    # Local AI analysis engine
│   └── screens/
│       ├── HomeScreen.tsx      # Introduction and start screen
│       ├── CameraScreen.tsx    # Photo capture interface
│       ├── AnalysisScreen.tsx  # Processing and analysis
│       └── ResultsScreen.tsx   # Detailed grading results
├── assets/                      # App icons and splash screens
├── package.json
├── tsconfig.json
├── app.json
└── babel.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Emulator
- Physical device with Expo Go app (recommended for camera testing)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Add app assets** (optional):
   Place your custom icons in the `assets/` directory:
   - `icon.png` (1024x1024px)
   - `splash.png` (2048x2048px)
   - `adaptive-icon.png` (1024x1024px - Android)
   - `favicon.png` (48x48px - Web)

### Running the App

**Development Server**:
```bash
npm start
```

**Run on iOS Simulator** (Mac only):
```bash
npm run ios
```

**Run on Android Emulator**:
```bash
npm run android
```

**Run on Physical Device**:
1. Install Expo Go app from App Store or Google Play
2. Run `npm start`
3. Scan the QR code with your device

## Usage

1. **Start**: Tap "Start Grading" on the home screen
2. **Capture Front**: Position card front in the frame and capture
3. **Capture Back**: Flip card and capture the back side
4. **Analysis**: Wait while the app analyzes the card (2-3 seconds)
5. **Results**: View detailed grading report with scores for each criterion
6. **Share**: Share your results or grade another card

## Image Analysis Algorithm

The local AI analysis engine evaluates cards using computer vision techniques:

### Border Analysis
- Detects edge uniformity using contrast detection
- Measures border thickness consistency
- Scores based on deviation from ideal uniform borders

### Defect Detection
- Analyzes surface variance for scratches
- Identifies high-contrast anomalies indicating stains
- Counts and weighs defects by severity

### Centering Evaluation
- Detects card edges using gradient analysis
- Calculates horizontal and vertical offset from center
- Penalizes asymmetry in image placement

### Cut Quality Assessment
- Evaluates edge straightness using line detection
- Measures corner sharpness and uniformity
- Scores based on manufacturing precision

## Grading Scale

| Grade | Description | Condition |
|-------|-------------|-----------|
| 10 | Gem Mint | Perfect card |
| 9-9.5 | Mint | Near perfect |
| 8-8.5 | Near Mint/Mint | Excellent condition |
| 7-7.5 | Near Mint | Very minor flaws |
| 6-6.5 | Excellent/Mint | Minor wear |
| 5-5.5 | Excellent | Moderate wear |
| 4-4.5 | Very Good/Excellent | Noticeable wear |
| 3-3.5 | Very Good | Significant wear |
| 2-2.5 | Good | Heavy wear |
| 1-1.5 | Poor | Damaged |

## Future Enhancements

This POC can be extended with:

- **Advanced ML Models**: Integrate TensorFlow.js for trained image recognition
- **Card Database**: Automatic card identification and value lookup
- **History**: Save and compare multiple card gradings
- **Export PDF**: Generate professional PDF reports
- **Batch Processing**: Grade multiple cards in sequence
- **Cloud Sync**: Optional cloud backup of grading history
- **Social Features**: Share and compare with community
- **Market Integration**: Connect to pricing databases

## Development Notes

### POC Simplifications

For this proof of concept, the image analysis uses simulated algorithms that generate realistic but random scores. In a production app, you would:

1. **Implement Real Computer Vision**:
   - Use edge detection (Canny, Sobel)
   - Apply contour detection for borders
   - Implement Harris corner detection
   - Use variance/standard deviation for defects

2. **Add Machine Learning**:
   - Train CNN models on card datasets
   - Use transfer learning from pre-trained models
   - Implement TensorFlow.js or ONNX Runtime

3. **Optimize Performance**:
   - Process images at lower resolution
   - Use Web Workers for heavy computation
   - Implement progressive analysis with early exit

### Performance Considerations

- Images are preprocessed to 1000px width for consistency
- All processing happens on-device (no internet required)
- Analysis completes in 2-3 seconds on modern devices
- Memory efficient with image compression

## Troubleshooting

**Camera not working**:
- Ensure camera permissions are granted
- Test on a physical device (simulators have limited camera support)

**Build errors**:
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start --clear
```

**TypeScript errors**:
```bash
# Ensure all dependencies are installed
npm install
```

## License

This is a proof of concept project for demonstration purposes.

## Contributing

This is a POC project. For production use, implement actual computer vision algorithms and proper error handling.

---

Built with React Native + Expo | Local AI Processing | No Cloud Required
