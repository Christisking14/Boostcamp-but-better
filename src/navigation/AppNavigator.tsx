import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../theme';
import { RootStackParamList, TabParamList } from '../types';
import { useWorkoutStore } from '../store/workoutStore';

// ── Screens ───────────────────────────────────────────────────────────────────
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import ProgramsScreen from '../screens/ProgramsScreen';
import CommunityScreen from '../screens/CommunityScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ToolsScreen from '../screens/ToolsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProgramDetailScreen from '../screens/ProgramDetailScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ActiveCommunityWorkoutScreen from '../screens/ActiveCommunityWorkoutScreen';
import PaywallScreen from '../screens/PaywallScreen';
import WorkoutCompleteScreen from '../screens/WorkoutCompleteScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import CommunityWorkoutDetailScreen from '../screens/CommunityWorkoutDetailScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Programs"
        component={ProgramsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const hasCompletedOnboarding = useWorkoutStore(
    (state) => state.user.hasCompletedOnboarding,
  );

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.accent,
          background: Colors.background,
          card: Colors.surface,
          text: Colors.textPrimary,
          border: Colors.border,
          notification: Colors.accent,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: Colors.background },
          gestureEnabled: true,
        }}
        initialRouteName={hasCompletedOnboarding ? 'Main' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />

        {/* Program screens */}
        <Stack.Screen name="ProgramDetail" component={ProgramDetailScreen} />

        {/* Workout screens */}
        <Stack.Screen
          name="ActiveWorkout"
          component={ActiveWorkoutScreen}
          options={{ gestureEnabled: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="ActiveCommunityWorkout"
          component={ActiveCommunityWorkoutScreen}
          options={{ gestureEnabled: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="WorkoutComplete"
          component={WorkoutCompleteScreen}
          options={{ gestureEnabled: false, presentation: 'modal' }}
        />

        {/* Community screens */}
        <Stack.Screen
          name="CreateWorkout"
          component={CreateWorkoutScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="CommunityWorkoutDetail"
          component={CommunityWorkoutDetailScreen}
        />

        {/* Profile / History accessible from any tab */}
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />

        {/* Progress detail */}
        <Stack.Screen name="ExerciseProgress" component={ProgressScreen} />

        {/* Paywall */}
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
