import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { NavigationParams } from './src/types';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ResultsScreen from './src/screens/ResultsScreen';

const Stack = createNativeStackNavigator<NavigationParams>();

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Pokemon Card Grader',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{
              title: 'Capture Photo',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Analysis"
            component={AnalysisScreen}
            options={{
              title: 'Analyzing Card',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            options={{
              title: 'Grading Results',
              headerLeft: () => null,
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
