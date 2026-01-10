# Development Guide

## Project Overview

This Pokemon Card Grader is a React Native proof-of-concept that demonstrates local AI image analysis for card grading. The app is built with modern React patterns and TypeScript for production-ready code quality.

## Architecture Decisions

### Why Expo?

- **Rapid Development**: Managed workflow eliminates native configuration
- **Camera Access**: Built-in expo-camera with simple API
- **Image Processing**: expo-image-manipulator for local processing
- **Cross-Platform**: Single codebase for iOS and Android
- **Easy Testing**: Expo Go app for instant device testing

### Why Local Processing?

- **Privacy**: No card images sent to servers
- **Speed**: Instant analysis without network latency
- **Offline**: Works without internet connection
- **Cost**: No cloud API costs
- **Scalability**: No server infrastructure needed

### Navigation Structure

```
Home Screen (Entry)
    ↓
Camera Screen (Front)
    ↓
Camera Screen (Back)
    ↓
Analysis Screen (Processing)
    ↓
Results Screen (Final)
    ↓
Home Screen (Restart)
```

## Code Organization

### Directory Structure

```
src/
├── constants/
│   └── grading.ts          # Grading scales, thresholds, helper functions
├── services/
│   ├── imageAnalysis.ts    # Main grading logic
│   └── imageProcessing.ts  # Image preprocessing utilities
├── screens/
│   ├── HomeScreen.tsx      # Welcome and introduction
│   ├── CameraScreen.tsx    # Photo capture with live preview
│   ├── AnalysisScreen.tsx  # Processing animation
│   └── ResultsScreen.tsx   # Detailed results display
└── types/
    └── index.ts            # TypeScript type definitions
```

### Key Components

#### 1. Image Analysis Service (`imageAnalysis.ts`)

The core grading engine that:
- Analyzes card borders for uniformity
- Detects surface defects
- Evaluates centering/symmetry
- Assesses cut quality
- Calculates weighted final grade

```typescript
// Main entry point
export async function gradeCard(photos: CardPhotos): Promise<GradingResult>

// Individual analysis functions
analyzeBorders() // Edge uniformity
analyzeDefects() // Surface scratches/stains
analyzeCentering() // Image alignment
analyzeCutQuality() // Edge/corner quality
```

#### 2. Camera Screen

Handles photo capture with:
- Live camera preview
- Framing guides for card positioning
- Front/back photo sequence
- Permission management
- Image preprocessing

#### 3. Results Screen

Displays:
- Final PCA grade (1-10)
- Individual criterion scores
- Detailed breakdowns
- Captured photos
- Share functionality

## Data Flow

```
1. User captures photos
   ↓
2. Images preprocessed (resize, compress)
   ↓
3. Both images analyzed in parallel
   ↓
4. Results combined and weighted
   ↓
5. Final grade calculated
   ↓
6. Results displayed with details
```

## Grading Algorithm

### Weighted Scoring

```typescript
Final Grade =
  (Borders × 0.25) +
  (Defects × 0.30) +    // Highest weight
  (Centering × 0.25) +
  (Cut Quality × 0.20)
```

### Criterion Analysis

**Borders (25%)**:
- Edge uniformity detection
- Border thickness consistency
- Score based on variation from ideal

**Defects (30%)**: *Highest impact*
- Surface variance analysis
- Scratch/stain detection
- Penalty based on defect count and severity

**Centering (25%)**:
- Symmetry measurement
- Horizontal/vertical offset calculation
- Penalty for asymmetry

**Cut Quality (20%)**:
- Edge straightness evaluation
- Corner sharpness assessment
- Manufacturing precision scoring

## POC vs Production

### Current Implementation (POC)

The current version uses **simulated analysis** that:
- Generates realistic but random scores
- Demonstrates the full user experience
- Shows the grading methodology
- Validates the app architecture

### Production Implementation

For a real grading app, implement:

#### 1. Real Computer Vision

```typescript
// Replace simulated functions with actual CV algorithms

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Edge Detection (Canny)
async function detectEdges(imageData: ImageData) {
  // Apply Sobel operators for gradient detection
  // Use non-maximum suppression
  // Apply hysteresis thresholding
  return edges;
}

// Defect Detection
async function detectDefects(imageData: ImageData) {
  // Calculate local variance
  // Identify high-contrast anomalies
  // Classify defect types
  return defects;
}
```

#### 2. Machine Learning Models

```typescript
// Load trained model for card analysis
const model = await tf.loadLayersModel('model.json');

// Classify card condition
const prediction = model.predict(preprocessedImage);
const grade = processPrediction(prediction);
```

#### 3. Advanced Image Processing

- **Sharpness Detection**: Laplacian variance
- **Perspective Correction**: Homography transformation
- **Color Normalization**: Histogram equalization
- **Noise Reduction**: Gaussian blur

## Extension Ideas

### Near-Term Enhancements

1. **Better Image Validation**
   - Blur detection before accepting photo
   - Lighting quality checks
   - Card detection (ensure card is in frame)

2. **Grading History**
   - SQLite database for local storage
   - View past gradings
   - Compare cards

3. **Detailed Reports**
   - Generate PDF reports
   - Add more metrics
   - Include market value estimates

### Long-Term Features

1. **Card Recognition**
   - Identify card name/set
   - Integrate with Pokemon TCG database
   - Show market prices

2. **Batch Processing**
   - Grade multiple cards in sequence
   - Export batch results
   - Statistical analysis

3. **Social Features**
   - Share grades with community
   - Compare with other collectors
   - Leaderboards

4. **Advanced AI**
   - Train on real graded cards
   - Learn from PSA/BGS examples
   - Predict professional grade

## Performance Optimization

### Current Performance

- Initial load: < 2 seconds
- Photo capture: Instant
- Image processing: < 1 second per photo
- Analysis: 2-3 seconds (with animation)
- Total flow: ~30 seconds

### Optimization Strategies

1. **Image Optimization**
   ```typescript
   // Resize before processing
   const optimized = await manipulateAsync(uri, [
     { resize: { width: 800 } } // Smaller = faster
   ], { compress: 0.7 });
   ```

2. **Parallel Processing**
   ```typescript
   // Analyze both photos simultaneously
   const [front, back] = await Promise.all([
     analyzeImage(frontPhoto),
     analyzeImage(backPhoto)
   ]);
   ```

3. **Lazy Loading**
   - Only load screens when needed
   - Defer non-critical renders
   - Use React.memo for expensive components

4. **Memory Management**
   - Release image references after processing
   - Clear cache periodically
   - Optimize image formats

## Testing Strategy

### Manual Testing

1. **Happy Path**
   - Complete flow with good photos
   - Verify all screens work
   - Check grade calculations

2. **Edge Cases**
   - Deny camera permission
   - Take blurry photos
   - Test in poor lighting
   - Navigate back/forth

3. **Performance**
   - Test on older devices
   - Monitor memory usage
   - Check app size

### Automated Testing (Future)

```typescript
// Unit tests
describe('gradeCard', () => {
  it('should return grade between 1-10', async () => {
    const result = await gradeCard(mockPhotos);
    expect(result.finalGrade).toBeGreaterThanOrEqual(1);
    expect(result.finalGrade).toBeLessThanOrEqual(10);
  });
});

// Component tests
describe('ResultsScreen', () => {
  it('should display final grade', () => {
    render(<ResultsScreen result={mockResult} />);
    expect(screen.getByText(mockResult.finalGrade)).toBeTruthy();
  });
});
```

## Debugging Tips

### Common Issues

1. **Camera not working**
   ```typescript
   // Check permissions
   const { status } = await Camera.requestCameraPermissionsAsync();
   console.log('Camera permission:', status);
   ```

2. **Images not processing**
   ```typescript
   // Log image data
   console.log('Image URI:', photo.uri);
   console.log('Image size:', photo.width, 'x', photo.height);
   ```

3. **Analysis failing**
   ```typescript
   // Wrap in try-catch
   try {
     const result = await gradeCard(photos);
   } catch (error) {
     console.error('Grading failed:', error);
     Alert.alert('Error', error.message);
   }
   ```

### Debug Tools

- **React Native Debugger**: Full React DevTools
- **Flipper**: Network, layout, and performance debugging
- **Console logs**: Add liberally during development
- **Expo DevTools**: Network requests, logs, performance

## Code Style

### TypeScript

- Strict mode enabled
- Explicit return types
- No `any` types
- Proper null checking

### React

- Functional components only
- Custom hooks for reusable logic
- Props destructuring
- Meaningful component names

### Formatting

- ESLint for linting
- Prettier for formatting
- Consistent indentation
- Clear comments

## Contributing

When adding features:

1. **Follow existing patterns**: Match the code style
2. **Type everything**: No implicit `any` types
3. **Add comments**: Explain complex logic
4. **Test thoroughly**: Manual testing required
5. **Update docs**: Keep README current

## Resources

### React Native
- [React Native Docs](https://reactnative.dev/)
- [React Hooks Guide](https://react.dev/reference/react)
- [TypeScript + React](https://react-typescript-cheatsheet.netlify.app/)

### Expo
- [Expo Docs](https://docs.expo.dev/)
- [Camera API](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Image Manipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)

### Computer Vision
- [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Image Processing Basics](https://www.tutorialspoint.com/dip/)

### Card Grading
- [PSA Grading Standards](https://www.psacard.com/resources/gradingstandards)
- [BGS Grading Guide](https://www.beckett.com/grading/card-grading)

---

Happy coding! Remember: This is a POC. For production, implement real computer vision algorithms.
