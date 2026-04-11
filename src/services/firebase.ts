/**
 * Firebase configuration for IronPath community features.
 *
 * SETUP INSTRUCTIONS
 * ──────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project named "ironpath"
 * 3. Add a Web app to the project
 * 4. Copy the firebaseConfig object and paste it below
 * 5. Enable these services in the Firebase console:
 *    • Authentication → Anonymous (enable)
 *    • Firestore Database → create in production mode
 * 6. Deploy the Firestore security rules below:
 *
 * Firestore Rules (firestore.rules):
 * ─────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /communityWorkouts/{workoutId} {
 *       allow read: if true;
 *       allow create: if request.auth != null
 *                     && request.resource.data.authorId == request.auth.uid;
 *       allow update: if request.auth != null
 *                     && (resource.data.authorId == request.auth.uid
 *                         || request.resource.data.diff(resource.data).affectedKeys()
 *                            .hasOnly(['likes', 'likedBy']));
 *       allow delete: if request.auth != null
 *                     && resource.data.authorId == request.auth.uid;
 *     }
 *   }
 * }
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  Auth,
  User,
  onAuthStateChanged,
} from 'firebase/auth';

import type { CommunityWorkout } from '../types';

// ─── Firebase config — replace with your project's config ────────────────────
// Get this from: Firebase Console → Project Settings → Your Apps → Web App

const FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// ─── Detect if Firebase is configured ────────────────────────────────────────

export const FIREBASE_CONFIGURED =
  FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
  FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID';

// ─── Initialize (singleton) ───────────────────────────────────────────────────

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (FIREBASE_CONFIGURED) {
  app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!FIREBASE_CONFIGURED) return null;
  const current = auth.currentUser;
  if (current) return current;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export function getCurrentUser(): User | null {
  if (!FIREBASE_CONFIGURED) return null;
  return auth.currentUser;
}

export function onUserChange(cb: (user: User | null) => void): () => void {
  if (!FIREBASE_CONFIGURED) return () => {};
  return onAuthStateChanged(auth, cb);
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

const COLLECTION = 'communityWorkouts';

function docToWorkout(id: string, data: DocumentData): CommunityWorkout {
  return {
    id,
    title: data.title ?? '',
    description: data.description ?? '',
    authorName: data.authorName ?? 'Anonymous',
    authorId: data.authorId ?? '',
    exercises: data.exercises ?? [],
    estimatedMinutes: data.estimatedMinutes ?? 0,
    likes: data.likes ?? 0,
    likedBy: data.likedBy ?? [],
    tags: data.tags ?? [],
    category: data.category ?? 'custom',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? new Date().toISOString(),
  };
}

/** Fetch the most recent N community workouts. */
export async function fetchCommunityWorkouts(
  limitCount = 30,
): Promise<CommunityWorkout[]> {
  if (!FIREBASE_CONFIGURED) return getMockWorkouts();
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToWorkout(d.id, d.data()));
}

/** Fetch workouts sorted by most-liked. */
export async function fetchTopWorkouts(limitCount = 20): Promise<CommunityWorkout[]> {
  if (!FIREBASE_CONFIGURED) return getMockWorkouts();
  const q = query(
    collection(db, COLLECTION),
    orderBy('likes', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToWorkout(d.id, d.data()));
}

/** Subscribe to real-time updates of the community feed. */
export function subscribeCommunityFeed(
  cb: (workouts: CommunityWorkout[]) => void,
  limitCount = 30,
): () => void {
  if (!FIREBASE_CONFIGURED) {
    cb(getMockWorkouts());
    return () => {};
  }
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(q, (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => docToWorkout(d.id, d.data())));
  });
}

/** Upload a new community workout. */
export async function uploadWorkout(
  workout: Omit<CommunityWorkout, 'id' | 'likes' | 'likedBy' | 'createdAt'>,
): Promise<string> {
  if (!FIREBASE_CONFIGURED) {
    throw new Error(
      'Firebase is not configured. Add your Firebase project credentials to src/services/firebase.ts',
    );
  }
  const user = await ensureAnonymousAuth();
  if (!user) throw new Error('Authentication failed');

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...workout,
    authorId: user.uid,
    likes: 0,
    likedBy: [],
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/** Toggle like on a workout. Returns new like count. */
export async function toggleLike(
  workoutId: string,
  currentLikedBy: string[],
): Promise<number> {
  if (!FIREBASE_CONFIGURED) return 0;
  const user = await ensureAnonymousAuth();
  if (!user) return 0;

  const ref = doc(db, COLLECTION, workoutId);
  const alreadyLiked = currentLikedBy.includes(user.uid);

  await updateDoc(ref, {
    likes: increment(alreadyLiked ? -1 : 1),
    likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
  });

  const snap = await getDoc(ref);
  return (snap.data()?.likes as number) ?? 0;
}

/** Delete a workout (author only — enforced by Firestore rules). */
export async function deleteWorkout(workoutId: string): Promise<void> {
  if (!FIREBASE_CONFIGURED) return;
  await deleteDoc(doc(db, COLLECTION, workoutId));
}

// ─── Mock data (shown when Firebase is not configured) ────────────────────────

function getMockWorkouts(): CommunityWorkout[] {
  return [
    {
      id: 'mock-1',
      title: 'Quick Upper Body Pump',
      description: 'A fast 30-min upper body session focused on chest and back.',
      authorName: 'Alex M.',
      authorId: 'mock-user-1',
      exercises: [
        { exerciseId: 'barbell-bench-press', exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10' },
        { exerciseId: 'barbell-row', exerciseName: 'Barbell Bent-Over Row', sets: 4, reps: '8-10' },
        { exerciseId: 'incline-db-press', exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
        { exerciseId: 'lat-pulldown', exerciseName: 'Lat Pulldown', sets: 3, reps: '10-12' },
      ],
      estimatedMinutes: 35,
      likes: 47,
      likedBy: [],
      tags: ['chest', 'back', 'upper body'],
      category: 'hypertrophy',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-2',
      title: 'Leg Day Destroyer',
      description: 'High volume leg workout for serious quad and glute development.',
      authorName: 'Jordan K.',
      authorId: 'mock-user-2',
      exercises: [
        { exerciseId: 'barbell-squat', exerciseName: 'Barbell Back Squat', sets: 5, reps: '5' },
        { exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: 4, reps: '10-12' },
        { exerciseId: 'romanian-deadlift', exerciseName: 'Romanian Deadlift', sets: 3, reps: '8-10' },
        { exerciseId: 'leg-curl', exerciseName: 'Lying Leg Curl', sets: 3, reps: '12-15' },
        { exerciseId: 'calf-raise', exerciseName: 'Standing Calf Raise', sets: 4, reps: '15-20' },
      ],
      estimatedMinutes: 60,
      likes: 83,
      likedBy: [],
      tags: ['legs', 'quads', 'glutes'],
      category: 'hypertrophy',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-3',
      title: 'Shoulder & Arms Finisher',
      description: 'Isolate delts, bis and tris after a big compound session.',
      authorName: 'Sam R.',
      authorId: 'mock-user-3',
      exercises: [
        { exerciseId: 'lateral-raise', exerciseName: 'Lateral Raise', sets: 4, reps: '12-15' },
        { exerciseId: 'face-pull', exerciseName: 'Face Pull', sets: 3, reps: '15-20' },
        { exerciseId: 'dumbbell-curl', exerciseName: 'Dumbbell Bicep Curl', sets: 3, reps: '10-12' },
        { exerciseId: 'tricep-pushdown', exerciseName: 'Tricep Pushdown', sets: 3, reps: '10-12' },
      ],
      estimatedMinutes: 25,
      likes: 31,
      likedBy: [],
      tags: ['shoulders', 'arms', 'isolation'],
      category: 'hypertrophy',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-4',
      title: 'Powerlifting Meet Prep',
      description: 'Heavy singles and doubles to peak for competition.',
      authorName: 'Chris W.',
      authorId: 'mock-user-4',
      exercises: [
        { exerciseId: 'barbell-squat', exerciseName: 'Barbell Back Squat', sets: 5, reps: '2', notes: '90% 1RM' },
        { exerciseId: 'barbell-bench-press', exerciseName: 'Barbell Bench Press', sets: 5, reps: '2', notes: '90% 1RM' },
        { exerciseId: 'barbell-deadlift', exerciseName: 'Conventional Deadlift', sets: 3, reps: '1', notes: '95% 1RM' },
      ],
      estimatedMinutes: 90,
      likes: 62,
      likedBy: [],
      tags: ['powerlifting', 'strength', 'competition'],
      category: 'strength',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-5',
      title: 'Pull-Up Progression',
      description: 'Build from 0 to 10 strict pull-ups with this progressive program.',
      authorName: 'Taylor B.',
      authorId: 'mock-user-5',
      exercises: [
        { exerciseId: 'pull-up', exerciseName: 'Pull-Up', sets: 5, reps: 'AMRAP', notes: 'Rest 3 min between sets' },
        { exerciseId: 'lat-pulldown', exerciseName: 'Lat Pulldown', sets: 3, reps: '8-10', notes: 'Use a challenging weight' },
        { exerciseId: 'dumbbell-row', exerciseName: 'Single-Arm Dumbbell Row', sets: 3, reps: '10' },
        { exerciseId: 'face-pull', exerciseName: 'Face Pull', sets: 3, reps: '15' },
      ],
      estimatedMinutes: 40,
      likes: 119,
      likedBy: [],
      tags: ['calisthenics', 'back', 'bodyweight'],
      category: 'strength',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
