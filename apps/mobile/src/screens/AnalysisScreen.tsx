import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationParams, GradingResult } from '../types';
import { gradeCard } from '../services/imageAnalysis';

type AnalysisScreenProps = {
  navigation: NativeStackNavigationProp<NavigationParams, 'Analysis'>;
  route: RouteProp<NavigationParams, 'Analysis'>;
};

export default function AnalysisScreen({ navigation, route }: AnalysisScreenProps) {
  const { photos } = route.params;
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const progressAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    analyzeCard();
  }, []);

  const updateProgress = (step: string, value: number) => {
    setCurrentStep(step);
    setProgress(value);
    Animated.timing(progressAnim, {
      toValue: value,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const analyzeCard = async () => {
    try {
      // Simulate analysis steps with progress updates
      updateProgress('Analyzing borders...', 0.2);
      await sleep(800);

      updateProgress('Detecting defects...', 0.4);
      await sleep(800);

      updateProgress('Checking centering...', 0.6);
      await sleep(800);

      updateProgress('Evaluating cut quality...', 0.8);
      await sleep(800);

      updateProgress('Calculating final grade...', 0.9);

      // Perform actual analysis
      const result: GradingResult = await gradeCard(photos);

      updateProgress('Complete!', 1.0);
      await sleep(500);

      // Navigate to results
      navigation.replace('Results', { result });
    } catch (error) {
      console.error('Analysis error:', error);
      // In production, show error screen
      navigation.goBack();
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>

        <Text style={styles.title}>Analyzing Card</Text>
        <Text style={styles.subtitle}>{currentStep}</Text>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progressWidth }
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {Math.round(progress * 100)}%
        </Text>

        <View style={styles.stepsContainer}>
          <AnalysisStep
            label="Borders"
            completed={progress > 0.2}
            active={progress >= 0.0 && progress <= 0.2}
          />
          <AnalysisStep
            label="Defects"
            completed={progress > 0.4}
            active={progress > 0.2 && progress <= 0.4}
          />
          <AnalysisStep
            label="Centering"
            completed={progress > 0.6}
            active={progress > 0.4 && progress <= 0.6}
          />
          <AnalysisStep
            label="Cut Quality"
            completed={progress > 0.8}
            active={progress > 0.6 && progress <= 0.8}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

type AnalysisStepProps = {
  label: string;
  completed: boolean;
  active: boolean;
};

function AnalysisStep({ label, completed, active }: AnalysisStepProps) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepIndicator,
          completed && styles.stepIndicatorCompleted,
          active && styles.stepIndicatorActive,
        ]}
      >
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text
        style={[
          styles.stepLabel,
          (completed || active) && styles.stepLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 40,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  stepIndicatorCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 16,
    color: '#999',
  },
  stepLabelActive: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
});
