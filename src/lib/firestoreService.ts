
import { db } from './firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import type { Presentation, Slide, SlideElement, SlideComment, User } from '@/types';

// Helper to convert Firestore Timestamps in deeply nested objects
const convertTimestamps = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate();
  }

  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }

  const converted: { [key: string]: any } = {};
  for (const key in data) {
    converted[key] = convertTimestamps(data[key]);
  }
  return converted;
};


// Presentations Collection
const presentationsCollection = collection(db, 'presentations');

export async function createPresentation(userId: string, title: string, description: string = ''): Promise<string> {
  const newSlide: Slide = {
    id: `slide-initial-${Date.now()}`,
    presentationId: '', // Will be updated after presentation is created
    slideNumber: 1,
    elements: [{
      id: `elem-initial-1`,
      type: 'text',
      content: `Welcome to your new presentation!`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 100 },
      style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333' }
    }],
    speakerNotes: "",
    comments: [],
    thumbnailUrl: `https://placehold.co/160x90.png?text=NewSlide`,
    backgroundColor: '#FFFFFF',
  };
  
  const newPresentationData = {
    title,
    description,
    creatorId: userId,
    teamId: '', // To be implemented with team features
    access: { [userId]: 'owner' },
    settings: {
      isPublic: false,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: 'https://placehold.co/320x180.png?text=New',
    version: 1,
    createdAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
    slides: [newSlide], // Add the initial slide
    collaborators: [{
        id: userId,
        // Fetch more user details if needed, or simplify
        name: 'Creator (You)', // Placeholder, ideally fetch user's name
        email: '', // Placeholder
        role: 'owner',
        lastActive: new Date(),
        settings: { darkMode: false, aiFeatures: true, notifications: true },
        profilePictureUrl: 'https://placehold.co/40x40.png'
    }] as User[],
  };

  const docRef = await addDoc(presentationsCollection, newPresentationData);
  // Update the presentationId in the initial slide
  const initialSlideWithPresId = { ...newSlide, presentationId: docRef.id };
  await updateDoc(docRef, { slides: [initialSlideWithPresId] });
  return docRef.id;
}

export async function getPresentationsForUser(userId: string): Promise<Presentation[]> {
  // This query fetches presentations where the user is an owner or has explicit access.
  // For 'public' presentations, you might need a different or combined query.
  const q = query(presentationsCollection, where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer']));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Presentation));
}

export async function getPresentationById(presentationId: string): Promise<Presentation | null> {
  const docRef = doc(db, 'presentations', presentationId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Presentation;
  }
  return null;
}

export async function updatePresentation(presentationId: string, data: Partial<Presentation>): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  await updateDoc(docRef, { ...data, lastUpdatedAt: serverTimestamp() });
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  await deleteDoc(docRef);
}

// Slide specific updates (within a presentation)
export async function addSlideToPresentation(presentationId: string, newSlide: Slide): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  await updateDoc(presRef, {
    slides: arrayUnion(newSlide),
    lastUpdatedAt: serverTimestamp()
  });
}

export async function updateSlideInPresentation(presentationId: string, updatedSlide: Slide): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentation = presDoc.data() as Presentation;
    const updatedSlides = presentation.slides.map(s => s.id === updatedSlide.id ? updatedSlide : s);
    await updateDoc(presRef, {
      slides: updatedSlides,
      lastUpdatedAt: serverTimestamp()
    });
  }
}

export async function updateElementInSlide(presentationId: string, slideId: string, updatedElement: Partial<SlideElement>): Promise<void> {
  if (!updatedElement.id) return;
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentation = presDoc.data() as Presentation;
    const slides = presentation.slides || [];
    const updatedSlides = slides.map(s => {
      if (s.id === slideId) {
        return {
          ...s,
          elements: s.elements.map(el =>
            el.id === updatedElement.id ? { ...el, ...updatedElement } : el
          ),
        };
      }
      return s;
    });
    await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  }
}

// Comments
export async function addCommentToSlide(presentationId: string, slideId: string, comment: SlideComment): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentation = presDoc.data() as Presentation;
    const slides = presentation.slides || [];
    const updatedSlides = slides.map(s => {
      if (s.id === slideId) {
        return {
          ...s,
          comments: arrayUnion(comment) // Firestore will handle adding to the array
        };
      }
      return s;
    });
     // If using arrayUnion directly on a nested field:
    // Construct the path to the comments array of the specific slide
    // This is more complex if slides are not guaranteed to be in order or if slideId is not index
    // The map approach above is safer if slide order can change or IDs are not array indices.
    // For a robust solution with arrayUnion on a specific slide's comments:
    // You might need to read, modify, and write the whole slides array.
    // Or, structure comments as a subcollection if they become very numerous.
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex > -1) {
        // Create a new comments array for the specific slide
        const newCommentsArray = [...(slides[slideIndex].comments || []), comment];
        slides[slideIndex].comments = newCommentsArray;
        await updateDoc(presRef, { slides: slides, lastUpdatedAt: serverTimestamp() });
    }
  }
}

export async function resolveCommentOnSlide(presentationId: string, slideId: string, commentId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentation = presDoc.data() as Presentation;
    const slides = presentation.slides || [];
    const updatedSlides = slides.map(s => {
      if (s.id === slideId) {
        return {
          ...s,
          comments: s.comments.map(c => c.id === commentId ? { ...c, resolved: true } : c)
        };
      }
      return s;
    });
    await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  }
}

// User Profile
export async function getUserProfile(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = convertTimestamps(userSnap.data());
        return { id: userSnap.id, ...userData } as User;
    }
    return null;
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
}
