import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigationParams } from '../types';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<NavigationParams, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const handleStartGrading = () => {
    navigation.navigate('Camera', { side: 'front' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Pokemon Card Grader</Text>
          <Text style={styles.subtitle}>Professional Card Authentication</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Take photos of your card's front and back
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Our AI analyzes the card locally on your device
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Receive a detailed PCA grade from 1-10
            </Text>
          </View>
        </View>

        <View style={styles.criteriaSection}>
          <Text style={styles.sectionTitle}>Evaluation Criteria</Text>
          <View style={styles.criteriaGrid}>
            <View style={styles.criteriaItem}>
              <Text style={styles.criteriaIcon}>⬜</Text>
              <Text style={styles.criteriaText}>Borders</Text>
              <Text style={styles.criteriaDesc}>Uniformity & thickness</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Text style={styles.criteriaIcon}>✨</Text>
              <Text style={styles.criteriaText}>Defects</Text>
              <Text style={styles.criteriaDesc}>Scratches & stains</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Text style={styles.criteriaIcon}>🎯</Text>
              <Text style={styles.criteriaText}>Centering</Text>
              <Text style={styles.criteriaDesc}>Image alignment</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Text style={styles.criteriaIcon}>✂️</Text>
              <Text style={styles.criteriaText}>Cut Quality</Text>
              <Text style={styles.criteriaDesc}>Edge straightness</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartGrading}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Grading</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          All analysis is performed locally on your device
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  criteriaSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  criteriaItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  criteriaIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  criteriaDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 16,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginBottom: 20,
  },
});
