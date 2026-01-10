import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Share
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationParams } from '../types';

type ResultsScreenProps = {
  navigation: NativeStackNavigationProp<NavigationParams, 'Results'>;
  route: RouteProp<NavigationParams, 'Results'>;
};

export default function ResultsScreen({ navigation, route }: ResultsScreenProps) {
  const { result } = route.params;

  const getGradeColor = (grade: number): string => {
    if (grade >= 9) return '#4CAF50'; // Excellent
    if (grade >= 7) return '#8BC34A'; // Good
    if (grade >= 5) return '#FFC107'; // Average
    if (grade >= 3) return '#FF9800'; // Below Average
    return '#F44336'; // Poor
  };

  const getGradeLabel = (grade: number): string => {
    if (grade >= 9) return 'Gem Mint';
    if (grade >= 8) return 'Near Mint/Mint';
    if (grade >= 7) return 'Near Mint';
    if (grade >= 6) return 'Excellent/Mint';
    if (grade >= 5) return 'Excellent';
    if (grade >= 4) return 'Very Good/Excellent';
    if (grade >= 3) return 'Very Good';
    if (grade >= 2) return 'Good';
    return 'Poor';
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Pokemon card received a PCA grade of ${result.finalGrade}/10 (${getGradeLabel(result.finalGrade)})!\n\nBorders: ${result.criteria.borders}\nDefects: ${result.criteria.defects}\nCentering: ${result.criteria.centering}\nCut Quality: ${result.criteria.cutQuality}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGradeAnother = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Grading Complete</Text>
          <Text style={styles.timestamp}>
            {new Date(result.timestamp).toLocaleDateString()} {new Date(result.timestamp).toLocaleTimeString()}
          </Text>
        </View>

        <View style={[styles.gradeCard, { borderColor: getGradeColor(result.finalGrade) }]}>
          <Text style={styles.gradeLabel}>PCA Grade</Text>
          <Text style={[styles.gradeValue, { color: getGradeColor(result.finalGrade) }]}>
            {result.finalGrade}
          </Text>
          <Text style={styles.gradeDescription}>{getGradeLabel(result.finalGrade)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Criteria</Text>

          <CriteriaCard
            title="Borders"
            score={result.criteria.borders}
            details={result.details.borders}
            icon="⬜"
          />
          <CriteriaCard
            title="Defects"
            score={result.criteria.defects}
            details={result.details.defects}
            icon="✨"
          />
          <CriteriaCard
            title="Centering"
            score={result.criteria.centering}
            details={result.details.centering}
            icon="🎯"
          />
          <CriteriaCard
            title="Cut Quality"
            score={result.criteria.cutQuality}
            details={result.details.cutQuality}
            icon="✂️"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Photos</Text>
          <View style={styles.photosContainer}>
            {result.photos.front && (
              <View style={styles.photoCard}>
                <Image
                  source={{ uri: result.photos.front.uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <Text style={styles.photoLabel}>Front</Text>
              </View>
            )}
            {result.photos.back && (
              <View style={styles.photoCard}>
                <Image
                  source={{ uri: result.photos.back.uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <Text style={styles.photoLabel}>Back</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Text style={styles.shareButtonText}>Share Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gradeAnotherButton}
            onPress={handleGradeAnother}
            activeOpacity={0.8}
          >
            <Text style={styles.gradeAnotherButtonText}>Grade Another Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type CriteriaCardProps = {
  title: string;
  score: number;
  details: string;
  icon: string;
};

function CriteriaCard({ title, score, details, icon }: CriteriaCardProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 9) return '#4CAF50';
    if (score >= 7) return '#8BC34A';
    if (score >= 5) return '#FFC107';
    if (score >= 3) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.criteriaCard}>
      <View style={styles.criteriaHeader}>
        <Text style={styles.criteriaIcon}>{icon}</Text>
        <View style={styles.criteriaInfo}>
          <Text style={styles.criteriaTitle}>{title}</Text>
          <Text style={styles.criteriaDetails}>{details}</Text>
        </View>
        <Text style={[styles.criteriaScore, { color: getScoreColor(score) }]}>
          {score}
        </Text>
      </View>
      <View style={styles.scoreBar}>
        <View
          style={[
            styles.scoreBarFill,
            {
              width: `${(score / 10) * 100}%`,
              backgroundColor: getScoreColor(score),
            },
          ]}
        />
      </View>
    </View>
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  gradeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  gradeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  gradeValue: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gradeDescription: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  criteriaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criteriaIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  criteriaInfo: {
    flex: 1,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  criteriaDetails: {
    fontSize: 13,
    color: '#666',
  },
  criteriaScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  photosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    marginTop: 10,
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gradeAnotherButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gradeAnotherButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
