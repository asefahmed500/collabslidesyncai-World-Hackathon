
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
  // writeBatch, // Not used in this iteration
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

const usersCollection = collection(db, 'users');
const teamsCollection = collection(db, 'teams');
const presentationsCollection = collection(db, 'presentations');

export async function createTeam(teamName: string, ownerId: string, ownerName: string): Promise<string> {
  const newTeamData: Omit<Team, 'id'> = {
    name: teamName,
    ownerId: ownerId,
    memberIds: [ownerId],
    branding: {
      colors: ['#3F51B5', '#FFC107', '#4CAF50'],
      fonts: ['Space Grotesk', 'PT Sans'],
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

export async function createPresentation(userId: string, title: string, teamId?: string, description: string = ''): Promise<string> {
  const initialSlideId = `slide-initial-${Date.now()}`;
  const newSlide: Omit<Slide, 'presentationId'> = {
    id: initialSlideId,
    slideNumber: 1,
    elements: [{
      id: `elem-${initialSlideId}-1`,
      type: 'text',
      content: `Welcome to '${title}'!`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 100 },
      style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333', backgroundColor: 'transparent' },
      zIndex: 1,
    }],
    speakerNotes: "",
    comments: [],
    thumbnailUrl: `https://placehold.co/160x90.png?text=S1`,
    backgroundColor: '#FFFFFF',
  };
  
  const newPresentationData: Omit<Presentation, 'id' | 'slides'> & { slides: Omit<Slide, 'presentationId'>[] } = {
    title,
    description,
    creatorId: userId,
    teamId: teamId || '',
    access: { [userId]: 'owner' },
    settings: {
      isPublic: false,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: `https://placehold.co/320x180.png?text=${title.substring(0,10)}`,
    version: 1,
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
    slides: [newSlide], // Store the slide without presentationId initially
    collaborators: [],
  };

  const docRef = await addDoc(presentationsCollection, newPresentationData);
  
  const finalSlide: Slide = {
    ...newSlide,
    presentationId: docRef.id, // Add the generated presentationId
  };
  // Update the presentation with the slide now containing the presentationId
  await updateDoc(docRef, { slides: [finalSlide], lastUpdatedAt: serverTimestamp() });
  
  return docRef.id;
}

export async function getPresentationsForUser(userId: string): Promise<Presentation[]> {
  const user = await getUserProfile(userId);
  if (!user) return [];

  const queries = [];
  queries.push(query(presentationsCollection, where('creatorId', '==', userId)));
  queries.push(query(presentationsCollection, where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer'])));
  
  if (user.teamId) {
    queries.push(query(presentationsCollection, where('teamId', '==', user.teamId)));
  }

  const allSnapshots = await Promise.all(queries.map(q => getDocs(q)));
  
  const presentationsMap = new Map<string, Presentation>();
  allSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(docSnap => { // Renamed doc to docSnap to avoid conflict
      if (!presentationsMap.has(docSnap.id)) {
        presentationsMap.set(docSnap.id, { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Presentation);
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
  // Ensure slides elements have zIndex if not present
  if (data.slides) {
    data.slides = data.slides.map(slide => ({
      ...slide,
      elements: slide.elements.map(el => ({
        ...el,
        zIndex: el.zIndex === undefined ? 0 : el.zIndex,
        style: {
            fontFamily: el.style.fontFamily || 'PT Sans',
            fontSize: el.style.fontSize || '16px',
            color: el.style.color || '#000000',
            backgroundColor: el.style.backgroundColor || 'transparent', // Default to transparent
            ...el.style,
        }
      }))
    }));
  }
  await updateDoc(docRef, { ...data, lastUpdatedAt: serverTimestamp() });
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  await deleteDoc(docRef);
}

export async function addSlideToPresentation(presentationId: string, newSlideData: Partial<Omit<Slide, 'id' | 'presentationId' | 'slideNumber'>> = {}): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);

  if (!presDoc.exists()) {
    throw new Error("Presentation not found");
  }
  const presentation = presDoc.data() as Presentation;
  const slideId = `slide-${presentationId}-${Date.now()}`;
  const slideNumber = (presentation.slides?.length || 0) + 1;

  const defaultElementId = `elem-${slideId}-default-${Date.now()}`;
  const defaultElement: SlideElement = {
    id: defaultElementId,
    type: 'text',
    content: `Slide ${slideNumber}`,
    position: { x: 50, y: 50 },
    size: { width: 400, height: 50 },
    style: { fontFamily: 'Space Grotesk', fontSize: '24px', color: '#333333', backgroundColor: 'transparent' },
    zIndex: 1,
  };

  const newSlide: Slide = {
    id: slideId,
    presentationId: presentationId,
    slideNumber: slideNumber,
    elements: newSlideData.elements || [defaultElement],
    speakerNotes: newSlideData.speakerNotes || "",
    comments: newSlideData.comments || [],
    thumbnailUrl: newSlideData.thumbnailUrl || `https://placehold.co/160x90.png?text=S${slideNumber}`,
    backgroundColor: newSlideData.backgroundColor || '#FFFFFF',
    aiSuggestions: newSlideData.aiSuggestions || [],
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
    // Ensure elements have zIndex and default styles if not present
    updatedSlide.elements = updatedSlide.elements.map(el => ({
      ...el,
      zIndex: el.zIndex === undefined ? 0 : el.zIndex,
      style: {
          fontFamily: el.style.fontFamily || 'PT Sans',
          fontSize: el.style.fontSize || '16px',
          color: el.style.color || '#000000',
          backgroundColor: el.style.backgroundColor || 'transparent',
          ...el.style,
      }
    }));
    const updatedSlides = presentation.slides.map(s => s.id === updatedSlide.id ? updatedSlide : s);
    await updateDoc(presRef, {
      slides: updatedSlides,
      lastUpdatedAt: serverTimestamp()
    });
  }
}

export async function updateElementInSlide(presentationId: string, slideId: string, updatedElementPartial: Partial<SlideElement>): Promise<void> {
  if (!updatedElementPartial.id) {
    console.error("updateElementInSlide called without element ID");
    return;
  }
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);

  if (presDoc.exists()) {
    const presentationData = presDoc.data() as Presentation;
    let slideFound = false;
    const updatedSlides = presentationData.slides.map(s => {
      if (s.id === slideId) {
        slideFound = true;
        let elementFound = false;
        const newElements = s.elements.map(el => {
          if (el.id === updatedElementPartial.id) {
            elementFound = true;
            return { 
                ...el, 
                ...updatedElementPartial,
                style: { // Ensure new style merges with old, and provide defaults
                    ...(el.style || {}),
                    ...(updatedElementPartial.style || {}),
                    fontFamily: updatedElementPartial.style?.fontFamily || el.style?.fontFamily || 'PT Sans',
                    fontSize: updatedElementPartial.style?.fontSize || el.style?.fontSize || '16px',
                    color: updatedElementPartial.style?.color || el.style?.color || '#000000',
                    backgroundColor: updatedElementPartial.style?.backgroundColor || el.style?.backgroundColor || 'transparent',
                },
                zIndex: updatedElementPartial.zIndex === undefined ? (el.zIndex === undefined ? 0 : el.zIndex) : updatedElementPartial.zIndex,
             };
          }
          return el;
        });
        if (!elementFound) {
            console.warn(`Element with ID ${updatedElementPartial.id} not found in slide ${slideId}`);
        }
        return { ...s, elements: newElements };
      }
      return s;
    });

    if (!slideFound) {
        console.warn(`Slide with ID ${slideId} not found in presentation ${presentationId}`);
        return;
    }

    await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  } else {
    console.error(`Presentation with ID ${presentationId} not found.`);
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
        const updatedSlides = [...slides];
        const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = [...(targetSlide.comments || []), {...comment, createdAt: serverTimestamp()}];
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
