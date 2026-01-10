import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationParams, CardPhotos, CardImage } from '../types';
import { Asset } from 'expo-asset';

// Test images for POC
const TEST_IMAGES = {
  front: require('../../assets/test-card-front.png'),
  back: require('../../assets/test-card-back.png'),
};

type CameraScreenProps = {
  navigation: NativeStackNavigationProp<NavigationParams, 'Camera'>;
  route: RouteProp<NavigationParams, 'Camera'>;
};

export default function CameraScreen({ navigation, route }: CameraScreenProps) {
  const { side, existingPhotos } = route.params;
  const [photos, setPhotos] = useState<CardPhotos>(existingPhotos || { front: null, back: null });
  const [isProcessing, setIsProcessing] = useState(false);

  // Use test image for POC testing
  const handleUseTestImage = async () => {
    try {
      setIsProcessing(true);

      // Load the test image asset
      const asset = Asset.fromModule(TEST_IMAGES[side]);
      await asset.downloadAsync();

      const cardImage: CardImage = {
        uri: asset.localUri || asset.uri,
        width: 350,
        height: 490,
      };

      const updatedPhotos: CardPhotos = {
        ...photos,
        [side]: cardImage,
      };

      setPhotos(updatedPhotos);

      // If this is the front, move to back
      if (side === 'front') {
        navigation.replace('Camera', { side: 'back', existingPhotos: updatedPhotos });
      } else {
        // Both photos captured, move to analysis
        navigation.navigate('Analysis', { photos: updatedPhotos });
      }
    } catch (error) {
      console.error('Error loading test image:', error);
      Alert.alert('Error', 'Failed to load test image.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {side === 'front' ? 'Card Front' : 'Card Back'}
        </Text>
        <Text style={styles.headerSubtitle}>
          POC Mode - Using test images
        </Text>
      </View>

      <View style={styles.testModeContainer}>
        <View style={styles.testCardPreview}>
          <Image
            source={TEST_IMAGES[side]}
            style={styles.testCardImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.testModeText}>
          {side === 'front'
            ? 'Test Pokemon card (front side)'
            : 'Test Pokemon card (back side)'}
        </Text>

        <TouchableOpacity
          style={[styles.useTestButton, isProcessing && styles.buttonDisabled]}
          onPress={handleUseTestImage}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.useTestButtonText}>
              {side === 'front' ? 'Use Front Image' : 'Use Back Image'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.infoText}>
          In production, this screen will use the camera to capture real card photos
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressDot}>
          <View style={[styles.dot, photos.front && styles.dotActive]} />
          <Text style={styles.dotLabel}>Front</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDot}>
          <View style={[styles.dot, photos.back && styles.dotActive]} />
          <Text style={styles.dotLabel}>Back</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  testModeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  testCardPreview: {
    width: 260,
    height: 364,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#e94560',
    backgroundColor: '#0f3460',
    marginBottom: 24,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  testCardImage: {
    width: '100%',
    height: '100%',
  },
  testModeText: {
    color: '#e2e8f0',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  useTestButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 16,
    minWidth: 220,
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  useTestButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 40,
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  progressDot: {
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#475569',
  },
  dotActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  dotLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: '#334155',
    marginHorizontal: 12,
    marginBottom: 20,
    borderRadius: 2,
  },
});
