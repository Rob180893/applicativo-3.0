import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BoardsState, DiscState, User } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on startup (as mandated by skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, check network connection.');
    }
  }
}
testConnection();

// Convert Firebase User to App User
export const mapFirebaseUser = (fbUser: FirebaseUser): User => {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Estudante',
    email: fbUser.email || '',
    avatar: fbUser.photoURL || undefined,
    createdAt: new Date().toISOString(),
  };
};

// Sign in with Google Popup
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const fbUser = result.user;
  const user = mapFirebaseUser(fbUser);

  // Sync / create profile in Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();
  try {
    const existingSnap = await getDoc(userDocRef);
    if (!existingSnap.exists()) {
      await setDoc(userDocRef, {
        id: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || user.name,
        photoURL: fbUser.photoURL || '',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await setDoc(
        userDocRef,
        {
          displayName: fbUser.displayName || user.name,
          photoURL: fbUser.photoURL || '',
          updatedAt: now,
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Could not sync user profile in Firestore:', err);
  }

  return user;
};

// Sign out from Firebase
export const signOutFirebase = async (): Promise<void> => {
  await signOut(auth);
};

// Listen to Firebase Auth state
export const onFirebaseAuthStateChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      callback(mapFirebaseUser(fbUser));
    } else {
      callback(null);
    }
  });
};

// Save study data to Firestore
export const saveStudyDataToFirestore = async (
  userId: string,
  boards: BoardsState,
  disc: DiscState
): Promise<boolean> => {
  const path = `users/${userId}/data/study_state`;
  try {
    const stateJson = JSON.stringify({ boards, disc });
    const dataRef = doc(db, 'users', userId, 'data', 'study_state');
    await setDoc(dataRef, {
      userId,
      discStateJson: stateJson,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('saveStudyDataToFirestore error:', err);
    return false;
  }
};

// Load study data from Firestore
export const loadStudyDataFromFirestore = async (
  userId: string
): Promise<{ boards: BoardsState; disc: DiscState } | null> => {
  const path = `users/${userId}/data/study_state`;
  try {
    const dataRef = doc(db, 'users', userId, 'data', 'study_state');
    const snap = await getDoc(dataRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.discStateJson) {
        return JSON.parse(data.discStateJson);
      }
    }
    return null;
  } catch (err) {
    console.warn('loadStudyDataFromFirestore error:', err);
    return null;
  }
};
