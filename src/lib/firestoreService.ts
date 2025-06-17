
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
  // arrayRemove, // Keep if needed for other features
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import type { Presentation, Slide, SlideElement, SlideComment, User, Team } from '@/types';

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

// Users Collection (already partially used by auth)
const usersCollection = collection(db, 'users');

// Teams Collection
const teamsCollection = collection(db, 'teams');

export async function createTeam(teamName: string, ownerId: string, ownerName: string): Promise<string> {
  const newTeamData: Omit<Team, 'id'> = {
    name: teamName,
    ownerId: ownerId,
    memberIds: [ownerId], // Owner is the first member
    branding: {
      colors: ['#3F51B5', '#FFC107', '#4CAF50'], // Default brand colors
      fonts: ['Space Grotesk', 'PT Sans'],      // Default brand fonts
      logoUrl: `https://placehold.co/200x100.png?text=${teamName.charAt(0).toUpperCase()}`
    },
    settings: {
      allowGuestEdits: false,
      aiFeaturesEnabled: true,
    },
    createdAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(teamsCollection, newTeamData);
  return docRef.id;
}


// Presentations Collection
const presentationsCollection = collection(db, 'presentations');

export async function createPresentation(userId: string, title: string, teamId?: string, description: string = ''): Promise<string> {
  const newSlide: Omit<Slide, 'presentationId'> = { // presentationId will be set after doc creation
    id: `slide-initial-${Date.now()}`,
    // presentationId: '', // Will be updated after presentation is created
    slideNumber: 1,
    elements: [{
      id: `elem-initial-1-${Date.now()}`,
      type: 'text',
      content: `Welcome to '${title}'!`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 100 },
      style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333' }
    }],
    speakerNotes: "",
    comments: [],
    thumbnailUrl: `https://placehold.co/160x90.png?text=Slide1`,
    backgroundColor: '#FFFFFF',
  };
  
  const newPresentationData: Omit<Presentation, 'id' | 'slides'> & { slides: Omit<Slide, 'presentationId'>[] } = {
    title,
    description,
    creatorId: userId,
    teamId: teamId || '', // Store teamId if provided
    access: { [userId]: 'owner' }, // Creator is owner
    settings: {
      isPublic: false,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: `https://placehold.co/320x180.png?text=${title.substring(0,10)}`,
    version: 1,
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
    slides: [newSlide],
    collaborators: [], // Will be populated based on team/sharing
  };

  const docRef = await addDoc(presentationsCollection, newPresentationData);
  
  // Update the slide with the actual presentationId
  const finalSlide: Slide = {
    ...newSlide,
    presentationId: docRef.id,
  };
  await updateDoc(docRef, { slides: [finalSlide] });
  
  return docRef.id;
}

export async function getPresentationsForUser(userId: string): Promise<Presentation[]> {
  const user = await getUserProfile(userId);
  if (!user) return [];

  const queries = [];
  // Presentations created by the user
  queries.push(query(presentationsCollection, where('creatorId', '==', userId)));
  // Presentations where user has direct access
  queries.push(query(presentationsCollection, where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer'])));
  
  // Presentations belonging to the user's team (if they have a teamId)
  // This requires a more complex query or multiple queries if roles are considered.
  // For now, let's keep it simple: if user has a teamId, fetch presentations for that team.
  // A more robust solution would check team membership and roles for access.
  if (user.teamId) {
    queries.push(query(presentationsCollection, where('teamId', '==', user.teamId)));
  }

  const allSnapshots = await Promise.all(queries.map(q => getDocs(q)));
  
  const presentationsMap = new Map<string, Presentation>();
  allSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      if (!presentationsMap.has(doc.id)) {
        presentationsMap.set(doc.id, { id: doc.id, ...convertTimestamps(doc.data()) } as Presentation);
      }
    });
  });
  
  return Array.from(presentationsMap.values());
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

export async function addSlideToPresentation(presentationId: string, newSlideData: Omit<Slide, 'id' | 'presentationId' | 'slideNumber'>): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);

  if (!presDoc.exists()) {
    throw new Error("Presentation not found");
  }
  const presentation = presDoc.data() as Presentation;
  const slideId = `slide-${presentationId}-${Date.now()}`;
  const slideNumber = (presentation.slides?.length || 0) + 1;

  const newSlide: Slide = {
    ...newSlideData,
    id: slideId,
    presentationId: presentationId,
    slideNumber: slideNumber,
    elements: newSlideData.elements || [], // Ensure elements is an array
    comments: newSlideData.comments || [], // Ensure comments is an array
    thumbnailUrl: newSlideData.thumbnailUrl || `https://placehold.co/160x90.png?text=S${slideNumber}`,
    backgroundColor: newSlideData.backgroundColor || '#FFFFFF',
  };

  await updateDoc(presRef, {
    slides: arrayUnion(newSlide),
    lastUpdatedAt: serverTimestamp()
  });
  return slideId;
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
    const presentationData = presDoc.data();
    const slides = (presentationData?.slides || []) as Slide[];
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

export async function addCommentToSlide(presentationId: string, slideId: string, comment: SlideComment): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentationData = presDoc.data();
    const slides = (presentationData?.slides || []) as Slide[];
    const slideIndex = slides.findIndex(s => s.id === slideId);
    
    if (slideIndex > -1) {
        const updatedSlides = [...slides]; // Create a new array for slides
        const targetSlide = {...updatedSlides[slideIndex]}; // Create a new object for the target slide
        targetSlide.comments = [...(targetSlide.comments || []), comment]; // Create a new comments array
        updatedSlides[slideIndex] = targetSlide;
        
        await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    } else {
        console.warn(`Slide with ID ${slideId} not found in presentation ${presentationId}`);
    }
  }
}

export async function resolveCommentOnSlide(presentationId: string, slideId: string, commentId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentationData = presDoc.data();
    const slides = (presentationData?.slides || []) as Slide[];
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex > -1) {
        const updatedSlides = [...slides];
        const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = (targetSlide.comments || []).map(c => c.id === commentId ? { ...c, resolved: true } : c);
        updatedSlides[slideIndex] = targetSlide;
        await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = convertTimestamps(userSnap.data());
        return { id: userSnap.id, ...userData } as User;
    }
    return null;
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {...data, lastActive: serverTimestamp()});
}
