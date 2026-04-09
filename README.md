# IronPath — Fitness App

A production-ready React Native fitness app built with Expo, modeled after Boostcamp. Features structured workout programs, session logging, PR tracking, and a premium subscription paywall.

## Tech Stack

- **React Native + Expo SDK 52** (iOS & Android)
- **TypeScript** — fully typed
- **React Navigation 6** — Stack + Bottom Tabs
- **Zustand + AsyncStorage** — persistent state
- **expo-linear-gradient** — UI gradients
- **expo-haptics** — tactile feedback during workouts
- **@expo/vector-icons** — Ionicons

## Features

### Free
- StrongLifts 5x5 and Push/Pull/Legs programs
- Full workout logging (sets, reps, weight)
- Rest timer between sets
- Workout history
- Personal record tracking

### Pro ($7.99/mo · $49.99/yr — 7-day free trial)
- All 10+ programs (GZCLP, PHUL, nSuns, 5/3/1, PPL, etc.)
- Progress analytics
- Custom workout builder
- Plate calculator & 1RM tools

## Getting Started

```bash
npm install
npx expo start
```

### Required: Add App Icons
Place the following in `/assets/`:
- `icon.png` — 1024×1024 PNG (app icon)
- `splash.png` — 1242×2436 PNG (splash screen)
- `adaptive-icon.png` — 1024×1024 PNG (Android adaptive icon)
- `favicon.png` — 48×48 PNG (web)

### Monetization (Production)
The paywall currently uses a stub that grants premium on tap.
To go live, integrate [RevenueCat](https://www.revenuecat.com/):

```bash
npx expo install react-native-purchases
```

Then replace the stub in `src/screens/PaywallScreen.tsx` with the RevenueCat SDK calls (the file contains TODO comments marking exactly where).

## App Store Submission

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure build
eas build:configure

# Build for iOS (TestFlight → App Store)
eas build --platform ios

# Build for Android (Play Console)
eas build --platform android
```

## Project Structure

```
src/
├── data/
│   ├── exercises.ts      # 20+ exercise library with instructions
│   └── programs.ts       # 6 training programs (free & premium)
├── navigation/
│   └── AppNavigator.tsx  # Stack + Tab navigation
├── screens/
│   ├── OnboardingScreen.tsx
│   ├── HomeScreen.tsx
│   ├── ProgramsScreen.tsx
│   ├── ProgramDetailScreen.tsx
│   ├── ActiveWorkoutScreen.tsx   # Core workout logging
│   ├── HistoryScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── PaywallScreen.tsx
│   └── WorkoutCompleteScreen.tsx
├── store/
│   └── workoutStore.ts   # Zustand store with AsyncStorage
├── theme/
│   └── index.ts          # Colors, Typography, Spacing
├── types/
│   └── index.ts          # All TypeScript types
└── utils/
    ├── calculations.ts   # 1RM, plate calculator, formatters
    └── storage.ts        # AsyncStorage helpers
```
