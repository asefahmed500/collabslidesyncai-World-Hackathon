
import { db, storage as fbStorage } from './firebaseConfig';
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
  Timestamp,
  writeBatch,
  FieldValue,
  deleteField, 
  orderBy,
  limit,
  runTransaction,
  or,
  onSnapshot, 
  Unsubscribe,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import type { Presentation, Slide, SlideElement, SlideComment, User as AppUserTypeFromFirestore, Team, ActiveCollaboratorInfo, TeamRole, TeamMember, TeamActivity, TeamActivityType, PresentationActivity, PresentationActivityType, PresentationAccessRole, Asset, AssetType, SlideElementType, Notification, NotificationType as NotificationEnumType, PresentationModerationStatus, FeedbackSubmission, SlideBackgroundGradient } from '@/types';
import { logTeamActivityInMongoDB } from './mongoTeamService'; 
import { getUserByEmailFromMongoDB } from './mongoUserService'; 
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, createNewCommentEmail } from './emailService'; 

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA',
  '#F0B67F', '#8A6EAF', '#A3D9FF', '#FF9671', '#C44569'
];
let userColorIndex = 0;

export const getNextUserColor = () => {
  const color = USER_COLORS[userColorIndex % USER_COLORS.length];
  userColorIndex++;
  return color;
};

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
    if (Object.prototype.hasOwnProperty.call(data, key)) {
        converted[key] = convertTimestamps(data[key]);
    }
  }
  return converted;
};

const renumberSlides = (slides: Slide[]): Slide[] => {
  return slides.map((slide, index) => ({ ...slide, slideNumber: index + 1 }));
};

const presentationsCollection = collection(db, 'presentations');
const presentationActivitiesCollection = collection(db, 'presentationActivities');
const assetsCollection = collection(db, 'assets');
const notificationsCollection = collection(db, 'notifications');
const feedbackSubmissionsCollection = collection(db, 'feedbackSubmissions');


export async function createPresentation(userId: string, title: string, teamId?: string, description: string = ''): Promise<string> {
  const initialSlideId = uuidv4();
  const newSlide: Omit<Slide, 'presentationId'> = {
    id: initialSlideId,
    slideNumber: 1,
    elements: [{
      id: uuidv4(),
      type: 'text',
      content: `Welcome to '${title}'!`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 100 },
      style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333', backgroundColor: 'transparent', textAlign: 'left', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', opacity: 1 },
      zIndex: 1, rotation: 0,
      lockedBy: null,
      lockTimestamp: null,
    }],
    speakerNotes: "",
    comments: [],
    thumbnailUrl: `https://placehold.co/160x90.png?text=S1`,
    backgroundColor: '#FFFFFF',
    backgroundGradient: null,
  };

  const newPresentationData: Omit<Presentation, 'id' | 'slides' | 'activeCollaborators'> & { slides: Omit<Slide, 'presentationId'>[] } = {
    title,
    description,
    creatorId: userId,
    teamId: teamId || undefined, 
    access: { [userId]: 'owner' },
    settings: {
      isPublic: false,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: `https://placehold.co/320x180.png?text=${title.substring(0,10)}`,
    version: 1,
    deleted: false,
    deletedAt: null,
    moderationStatus: 'active', 
    moderationNotes: '',
    favoritedBy: {},
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
    slides: [newSlide],
  };

  const docRef = await addDoc(presentationsCollection, newPresentationData);

  const finalSlide: Slide = {
    ...newSlide,
    presentationId: docRef.id,
  };
  await updateDoc(docRef, { slides: [finalSlide], lastUpdatedAt: serverTimestamp() });

  if (teamId) {
    await logTeamActivityInMongoDB(teamId, userId, 'presentation_created', { presentationTitle: title }, 'presentation', docRef.id);
  }
  await logPresentationActivity(docRef.id, userId, 'presentation_created', { presentationTitle: title });
  return docRef.id;
}

export async function getPresentationsForUser(userId: string, userTeamId?: string | null): Promise<Presentation[]> {
  const baseConditions = [ 
    where('deleted', '==', false),
    where('moderationStatus', '!=', 'taken_down') 
  ];
  
  const userAccessClauses = [
    where('creatorId', '==', userId),
    where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer'])
  ];

  if (userTeamId) {
    userAccessClauses.push(where('teamId', '==', userTeamId));
  }

  const q = query(
    presentationsCollection, 
    ...baseConditions, 
    or(...userAccessClauses), 
    orderBy('lastUpdatedAt', 'desc')
  );


  const snapshot = await getDocs(q);
  const presentationsMap = new Map<string, Presentation>();

  snapshot.docs.forEach(docSnap => {
      if (!presentationsMap.has(docSnap.id)) {
        const data = convertTimestamps(docSnap.data());
        if (!data.access) data.access = {};
        if (!data.favoritedBy) data.favoritedBy = {};
        presentationsMap.set(docSnap.id, { id: docSnap.id, ...data } as Presentation);
      }
  });

  return Array.from(presentationsMap.values());
}


export async function getPresentationById(presentationId: string): Promise<Presentation | null> {
  const docRef = doc(db, 'presentations', presentationId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as Presentation;
    if (data.deleted) return null; 
    if (data.moderationStatus === 'taken_down') {
        return {
            id: docSnap.id,
            title: data.title,
            creatorId: data.creatorId, 
            moderationStatus: 'taken_down',
            settings: { isPublic: false, passwordProtected: false, commentsAllowed: false },
            slides: [], 
            access: {}, 
            favoritedBy: {},
            lastUpdatedAt: data.lastUpdatedAt, 
        } as Presentation;
    }
    return { id: docSnap.id, ...convertTimestamps(data), favoritedBy: data.favoritedBy || {} } as Presentation;
  }
  return null;
}

export async function getPresentationByIdAdmin(presentationId: string): Promise<Presentation | null> {
  const docRef = doc(db, 'presentations', presentationId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as Presentation;
    return { id: docSnap.id, ...convertTimestamps(data), favoritedBy: data.favoritedBy || {} } as Presentation;
  }
  return null;
}


export async function updatePresentation(presentationId: string, data: Partial<Presentation>): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  const updatePayload: { [key:string]: any } = { lastUpdatedAt: serverTimestamp() };

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const typedKey = key as keyof Presentation;
      if (typedKey === 'settings') {
        const newSettings = data.settings;
        if (newSettings) {
          for (const settingKey in newSettings) {
             const typedSettingKey = settingKey as keyof Presentation['settings'];
             if (typedSettingKey === 'password' && (newSettings.password === undefined || newSettings.password === null || newSettings.password === '')) {
                 updatePayload[`settings.password`] = deleteField(); 
             } else if (newSettings[typedSettingKey] !== undefined) {
                 updatePayload[`settings.${typedSettingKey}`] = newSettings[typedSettingKey];
             }
          }
        }
      } else if (typedKey === 'access') {
        const newAccess = data.access;
        if (newAccess) {
          for (const accessKey in newAccess) {
             if (newAccess[accessKey] === null || newAccess[accessKey] === undefined || (newAccess[accessKey] as any) === deleteField()) { 
                updatePayload[`access.${accessKey}`] = deleteField();
             } else {
                updatePayload[`access.${accessKey}`] = newAccess[accessKey];
             }
          }
        }
      } else if (typedKey === 'slides' && data.slides) {
        updatePayload.slides = data.slides.map(slide => ({
          ...slide,
          elements: slide.elements.map(el => ({
            ...el,
            zIndex: el.zIndex === undefined ? 0 : el.zIndex,
            lockedBy: el.lockedBy || null,
            lockTimestamp: el.lockTimestamp || null,
            rotation: el.rotation || 0,
            style: {
                fontFamily: el.style?.fontFamily || 'PT Sans',
                fontSize: el.style?.fontSize || '16px',
                color: el.style?.color || '#000000',
                backgroundColor: el.style?.backgroundColor || 'transparent',
                textAlign: el.style?.textAlign || 'left',
                fontWeight: el.style?.fontWeight || 'normal',
                fontStyle: el.style?.fontStyle || 'normal',
                textDecoration: el.style?.textDecoration || 'none',
                opacity: el.style?.opacity === undefined ? 1 : el.style.opacity,
                shapeType: el.style?.shapeType || 'rectangle',
                borderColor: el.style?.borderColor,
                borderWidth: el.style?.borderWidth,
                borderRadius: el.style?.borderRadius,
                ...(el.style?.['data-ai-hint'] && { 'data-ai-hint': el.style['data-ai-hint'] }),
                ...el.style,
            }
          }))
        }));
      } else if (typedKey === 'favoritedBy') {
      } else if (typedKey !== 'id' && typedKey !== 'lastUpdatedAt' && typedKey !== 'createdAt') {
        updatePayload[typedKey] = data[typedKey];
      }
    }
  }
  if (Object.keys(updatePayload).length > 1) { 
    await updateDoc(docRef, updatePayload);
  }
}

export async function deletePresentation(presentationId: string, teamId?: string, actorId?: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  const pres = await getPresentationByIdAdmin(presentationId); 
  await updateDoc(docRef, {
    deleted: true,
    deletedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp()
  });

  if (actorId && pres) {
    const activityDetails = { presentationTitle: pres.title };
    await logPresentationActivity(presentationId, actorId, 'presentation_deleted', activityDetails);
    if (teamId) {
      await logTeamActivityInMongoDB(teamId, actorId, 'presentation_deleted', activityDetails, 'presentation', presentationId);
    }
  }
}

export async function restorePresentation(presentationId: string, actorId: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  await updateDoc(docRef, {
    deleted: false,
    deletedAt: deleteField(), 
    lastUpdatedAt: serverTimestamp(),
    moderationStatus: 'active', 
    moderationNotes: 'Presentation restored from deletion.'
  });
  const pres = await getPresentationByIdAdmin(presentationId);
  if (pres) {
      await logPresentationActivity(presentationId, actorId, 'presentation_restored', { presentationTitle: pres.title });
      if (pres.teamId) {
          await logTeamActivityInMongoDB(pres.teamId, actorId, 'presentation_restored', { presentationTitle: pres.title }, 'presentation', presentationId);
      }
  }
}

export async function permanentlyDeletePresentation(presentationId: string, actorId?: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  const pres = await getPresentationByIdAdmin(presentationId); 
  await deleteDoc(docRef);

  if (actorId && pres) {
    const activityDetails = { presentationTitle: pres.title };
    await logPresentationActivity(presentationId, actorId, 'presentation_permanently_deleted', activityDetails);
    if (pres.teamId) {
      await logTeamActivityInMongoDB(pres.teamId, actorId, 'presentation_permanently_deleted', activityDetails, 'presentation', presentationId);
    }
  }
}

export async function updatePresentationModerationStatus(
  presentationId: string,
  status: PresentationModerationStatus,
  actorId: string,
  notes?: string
): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  const pres = await getPresentationByIdAdmin(presentationId);
  if (!pres) throw new Error("Presentation not found to update moderation status.");

  const oldStatus = pres.moderationStatus;
  await updateDoc(docRef, {
    moderationStatus: status,
    moderationNotes: notes || (status === 'active' ? 'Moderation status reset to active.' : ''), 
    lastUpdatedAt: serverTimestamp()
  });
  await logPresentationActivity(presentationId, actorId, 'moderation_status_changed', {
    presentationTitle: pres.title,
    oldStatus: oldStatus,
    newStatus: status,
    moderationNotes: notes
  });
  if (pres.teamId) {
     await logTeamActivityInMongoDB(pres.teamId, actorId, 'presentation_status_changed', {
        presentationTitle: pres.title,
        oldStatus: oldStatus,
        newStatus: status,
        moderationNotes: notes
    }, 'presentation', presentationId);
  }
}


export async function addSlideToPresentation(presentationId: string, newSlideData: Partial<Omit<Slide, 'id' | 'presentationId' | 'slideNumber'>> = {}): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    let currentSlides = presentationData.slides || [];

    const slideId = uuidv4();
    const slideNumber = currentSlides.length + 1;
    
    let finalElements: SlideElement[] = [];
    if (newSlideData.elements && newSlideData.elements.length > 0) {
      finalElements = newSlideData.elements.map(el => ({
        ...el,
        id: uuidv4(), // Ensure new ID for each element from template
        lockedBy: null,
        lockTimestamp: null,
      }));
    } else {
       finalElements.push({
        id: uuidv4(), type: 'text', content: `Slide ${slideNumber}`,
        position: { x: 50, y: 50 }, size: { width: 400, height: 50 },
        style: { fontFamily: 'Space Grotesk', fontSize: '24px', color: '#333333', backgroundColor: 'transparent', textAlign: 'left', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', opacity: 1 }, zIndex: 1, rotation: 0,
        lockedBy: null, lockTimestamp: null,
      });
    }


    const newSlide: Slide = {
      id: slideId, presentationId: presentationId, slideNumber: slideNumber,
      elements: finalElements,
      speakerNotes: newSlideData.speakerNotes || "", comments: newSlideData.comments || [],
      thumbnailUrl: newSlideData.thumbnailUrl || `https://placehold.co/160x90.png?text=S${slideNumber}`,
      backgroundColor: newSlideData.backgroundColor || '#FFFFFF',
      backgroundGradient: newSlideData.backgroundGradient || null,
    };

    const updatedSlidesArray = [...currentSlides, newSlide];
    const finalSlides = renumberSlides(updatedSlidesArray);

    transaction.update(presRef, { slides: finalSlides, lastUpdatedAt: serverTimestamp() });
    return slideId;
  });
}

export async function deleteSlideFromPresentation(presentationId: string, slideIdToDelete: string): Promise<Slide[] | null> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    let slides = presentationData.slides || [];
    const initialLength = slides.length;

    slides = slides.filter(s => s.id !== slideIdToDelete);

    if (slides.length === initialLength) {
        console.warn(`Slide ${slideIdToDelete} not found in presentation ${presentationId} for deletion.`);
        return presentationData.slides;
    }

    const updatedSlides = renumberSlides(slides);
    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    return updatedSlides;
  });
}

export async function duplicateSlideInPresentation(presentationId: string, slideIdToDuplicate: string): Promise<{ newSlideId: string, updatedSlides: Slide[] } | null> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    let slides = presentationData.slides || [];
    const originalSlideIndex = slides.findIndex(s => s.id === slideIdToDuplicate);

    if (originalSlideIndex === -1) {
      console.warn(`Slide ${slideIdToDuplicate} not found in presentation ${presentationId} for duplication.`);
      return null;
    }

    const originalSlide = slides[originalSlideIndex];
    const newSlideId = uuidv4();
    const duplicatedElements = originalSlide.elements.map(el => ({
      ...JSON.parse(JSON.stringify(el)), 
      id: uuidv4(),
      lockedBy: null, 
      lockTimestamp: null,
    }));

    const duplicatedSlide: Slide = {
      ...JSON.parse(JSON.stringify(originalSlide)),
      id: newSlideId,
      slideNumber: 0, 
      elements: duplicatedElements,
      comments: [], 
      thumbnailUrl: originalSlide.thumbnailUrl ? `${originalSlide.thumbnailUrl.split('?')[0]}?text=Copy` : `https://placehold.co/160x90.png?text=Copy`,
      backgroundGradient: originalSlide.backgroundGradient || null,
    };

    slides.splice(originalSlideIndex + 1, 0, duplicatedSlide);
    const updatedSlides = renumberSlides(slides);

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    return { newSlideId, updatedSlides };
  });
}

export async function moveSlideInPresentation(presentationId: string, slideId: string, direction: 'up' | 'down'): Promise<Slide[] | null> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    let slides = [...(presentationData.slides || [])];
    const currentIndex = slides.findIndex(s => s.id === slideId);

    if (currentIndex === -1) {
      console.warn(`Slide ${slideId} not found for move operation.`);
      return presentationData.slides;
    }

    if (direction === 'up' && currentIndex > 0) {
      const temp = slides[currentIndex];
      slides[currentIndex] = slides[currentIndex - 1];
      slides[currentIndex - 1] = temp;
    } else if (direction === 'down' && currentIndex < slides.length - 1) {
      const temp = slides[currentIndex];
      slides[currentIndex] = slides[currentIndex + 1];
      slides[currentIndex + 1] = temp;
    } else {
      return presentationData.slides; 
    }

    const updatedSlides = renumberSlides(slides);
    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    return updatedSlides;
  });
}

export async function addElementToSlide(presentationId: string, slideId: string, elementData: Omit<SlideElement, 'id'>): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  const newElementId = uuidv4();
  const newElement: SlideElement = {
    ...elementData,
    id: newElementId,
    lockedBy: null, 
    lockTimestamp: null,
   };

  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    const slides = presentationData.slides || [];
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex === -1) throw new Error("Slide not found");

    const updatedSlides = [...slides];
    const targetSlide = { ...updatedSlides[slideIndex] };
    targetSlide.elements = [...(targetSlide.elements || []), newElement];
    updatedSlides[slideIndex] = targetSlide;

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
  return newElementId;
}

export async function deleteElementFromSlide(presentationId: string, slideId: string, elementId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    const slides = presentationData.slides || [];
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex === -1) throw new Error("Slide not found");

    const updatedSlides = [...slides];
    const targetSlide = { ...updatedSlides[slideIndex] };
    targetSlide.elements = (targetSlide.elements || []).filter(el => el.id !== elementId);
    updatedSlides[slideIndex] = targetSlide;

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
}


export async function updateElementInSlide(presentationId: string, slideId: string, updatedElementPartial: Partial<SlideElement>): Promise<void> {
  if (!updatedElementPartial.id) {
    console.error("updateElementInSlide called without element ID.");
    return;
  }
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error(`Presentation ${presentationId} not found.`);
    const presentation = presDoc.data() as Presentation;
    if (presentation.deleted || presentation.moderationStatus === 'taken_down') throw new Error("Cannot modify this presentation.");
    
    let slideFound = false;
    const updatedSlides = presentation.slides.map(s => {
      if (s.id === slideId) {
        slideFound = true; 
        let elementFound = false;
        const newElements = s.elements.map(el => {
          if (el.id === updatedElementPartial.id) {
            elementFound = true;
            if (el.lockedBy && el.lockedBy !== updatedElementPartial.lockedBy && updatedElementPartial.lockedBy !== null && !(updatedElementPartial.hasOwnProperty('lockedBy'))) {
                 console.warn(`Element ${el.id} is locked by ${el.lockedBy}, update by potential user ${updatedElementPartial.lockedBy || 'unknown'} denied unless it's a lock release/acquire.`);
                 throw new Error("Element is locked by another user.");
            }
            
            const newStyle = { 
                ...(el.style || {}), 
                ...(updatedElementPartial.style || {}),
                fontFamily: updatedElementPartial.style?.fontFamily || el.style?.fontFamily || 'PT Sans',
                fontSize: updatedElementPartial.style?.fontSize || el.style?.fontSize || '16px',
                color: updatedElementPartial.style?.color || el.style?.color || '#000000',
                backgroundColor: updatedElementPartial.style?.backgroundColor || el.style?.backgroundColor || 'transparent',
                textAlign: updatedElementPartial.style?.textAlign || el.style?.textAlign || 'left',
                fontWeight: updatedElementPartial.style?.fontWeight || el.style?.fontWeight || 'normal',
                fontStyle: updatedElementPartial.style?.fontStyle || el.style?.fontStyle || 'normal',
                textDecoration: updatedElementPartial.style?.textDecoration || el.style?.textDecoration || 'none',
                opacity: updatedElementPartial.style?.opacity === undefined ? (el.style?.opacity === undefined ? 1 : el.style.opacity) : updatedElementPartial.style.opacity,
                shapeType: updatedElementPartial.style?.shapeType || el.style?.shapeType || 'rectangle',
                ...(updatedElementPartial.style?.['data-ai-hint'] && { 'data-ai-hint': updatedElementPartial.style['data-ai-hint'] }),
                ...updatedElementPartial.style,
            };

            return { 
              ...el, 
              ...updatedElementPartial,
              style: newStyle,
              zIndex: updatedElementPartial.zIndex === undefined ? (el.zIndex === undefined ? 0 : el.zIndex) : updatedElementPartial.zIndex,
              rotation: updatedElementPartial.rotation === undefined ? (el.rotation === undefined ? 0 : el.rotation) : updatedElementPartial.rotation,
              lockedBy: updatedElementPartial.hasOwnProperty('lockedBy') ? updatedElementPartial.lockedBy : el.lockedBy,
              lockTimestamp: updatedElementPartial.hasOwnProperty('lockTimestamp') 
                ? (updatedElementPartial.lockTimestamp === null ? null : serverTimestamp() as Timestamp) 
                : el.lockTimestamp,
            };
          } return el;
        });
        if (!elementFound) console.warn(`Element ${updatedElementPartial.id} not found in slide ${slideId}`);
        return { ...s, elements: newElements };
      } return s;
    });
    if (!slideFound) { console.warn(`Slide ${slideId} not found in presentation ${presentationId}`); return; }
    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
}

export async function addCommentToSlide(presentationId: string, slideId: string, comment: Omit<SlideComment, 'id' | 'createdAt'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot add comments to this presentation.");
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex > -1) {
        const newComment: SlideComment = { ...comment, id: uuidv4(), createdAt: serverTimestamp() as Timestamp, };
        const updatedSlides = [...slides]; const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = [...(targetSlide.comments || []), newComment];
        updatedSlides[slideIndex] = targetSlide;
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
        
        await createNotification(
          presentationData.creatorId, 
          'comment_new',
          `New Comment on "${presentationData.title}"`,
          `${comment.userName} commented on slide ${targetSlide.slideNumber || slideIndex + 1}: "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
          `/editor/${presentationId}?slide=${slideId}`, 
          comment.userId,
          comment.userName,
          comment.userAvatarUrl
        );
    } else console.warn(`Slide ${slideId} not found in presentation ${presentationId}`);
  });
}

export async function resolveCommentOnSlide(presentationId: string, slideId: string, commentId: string): Promise<void> {
 const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    if (presentationData.deleted || presentationData.moderationStatus === 'taken_down') throw new Error("Cannot modify comments in this presentation.");
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex > -1) {
        const updatedSlides = [...slides]; const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = (targetSlide.comments || []).map(c => c.id === commentId ? { ...c, resolved: true } : c);
        updatedSlides[slideIndex] = targetSlide;
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }
  });
}

export async function updateUserPresence(presentationId: string, userId: string, userInfo: Pick<ActiveCollaboratorInfo, 'name' | 'profilePictureUrl' | 'color' | 'email'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const dataToSet: ActiveCollaboratorInfo = {
    ...userInfo,
    id: userId,
    lastSeen: serverTimestamp() as Timestamp,
    cursorPosition: null, 
  };
  try {
    await updateDoc(presRef, {
      [`activeCollaborators.${userId}`]: dataToSet,
      lastUpdatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("Error updating user presence:", error);
  }
}


export async function removeUserPresence(presentationId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
    await updateDoc(presRef, { 
        [`activeCollaborators.${userId}`]: deleteField(), 
        lastUpdatedAt: serverTimestamp() 
    });
  } catch (error) {
      console.warn(`Error removing user presence for user ${userId} in presentation ${presentationId}. Document might not exist or field already deleted.`, error);
  }
}

export async function updateUserCursorPosition(presentationId: string, userId: string, slideId: string, position: { x: number; y: number }): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
    const presDoc = await getDoc(presRef);
    if (presDoc.exists() && presDoc.data()?.activeCollaborators?.[userId]) {
        await updateDoc(presRef, {
        [`activeCollaborators.${userId}.cursorPosition`]: { slideId, ...position },
        [`activeCollaborators.${userId}.lastSeen`]: serverTimestamp() 
        });
    }
  } catch (error) {
      console.warn(`Error updating cursor position for user ${userId} in presentation ${presentationId}. User might not be active.`, error);
  }
}

const LOCK_DURATION_MS = 30 * 1000; 

export async function acquireLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<boolean> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
    await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef);
        if (!presDoc.exists()) throw new Error("Presentation not found for lock.");
        const presentation = presDoc.data() as Presentation;
        if (presentation.deleted || presentation.moderationStatus === 'taken_down') throw new Error("Cannot lock elements in this presentation.");
        
        let lockAcquired = false; 
        let alreadyLockedByOther = false;
        let targetElementExists = false;

        const updatedSlides = presentation.slides.map(s => {
          if (s.id === slideId) {
            return { ...s, elements: s.elements.map(el => {
                if (el.id === elementId) {
                  targetElementExists = true;
                  if (el.lockedBy && el.lockedBy !== userId && el.lockTimestamp && ((el.lockTimestamp as Timestamp).toMillis() + LOCK_DURATION_MS > Date.now())) {
                    alreadyLockedByOther = true; 
                    return el; 
                  }
                  lockAcquired = true; 
                  return { ...el, lockedBy: userId, lockTimestamp: serverTimestamp() as Timestamp };
                } 
                return el;
              })};
          } 
          return s;
        });

        if (!targetElementExists) throw new Error("Element not found to lock.");
        if (alreadyLockedByOther) throw new Error("Element is currently locked by another user.");
        if (!lockAcquired && targetElementExists) { 
            throw new Error("Failed to acquire lock for unknown reasons.");
        }
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }); 
    return true;
  } catch (error: any) {
    console.error("Lock acquisition failed:", error.message);
    throw error; 
  }
}

export async function releaseLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
     await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef); if (!presDoc.exists()) return;
        const presentation = presDoc.data() as Presentation;
        
        const updatedSlides = presentation.slides.map(s => {
          if (s.id === slideId) {
            return { ...s, elements: s.elements.map(el => {
                if (el.id === elementId && el.lockedBy === userId) {
                     return { ...el, lockedBy: null, lockTimestamp: null };
                }
                return el;
              })};
          } 
          return s;
        });
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    });
  } catch (error) { console.error("Lock release failed:", error); }
}

export async function releaseExpiredLocks(presentationId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
   try {
    await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef); if (!presDoc.exists()) return;
        const presentation = presDoc.data() as Presentation;
        if (presentation.deleted || presentation.moderationStatus === 'taken_down') return;
        
        let locksReleasedCount = 0;
        const now = Date.now();
        const updatedSlides = presentation.slides.map(s => {
          let slideModified = false;
          const elements = s.elements.map(el => {
            if (el.lockedBy && el.lockTimestamp && ((el.lockTimestamp as Timestamp).toMillis() + LOCK_DURATION_MS < now)) {
              slideModified = true; 
              locksReleasedCount++; 
              return { ...el, lockedBy: null, lockTimestamp: null };
            } 
            return el;
          });
          return slideModified ? { ...s, elements } : s;
        });

        if (locksReleasedCount > 0) {
          console.log(`Released ${locksReleasedCount} expired lock(s) for presentation ${presentationId}`);
          transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
        }
    });
  } catch (error) { console.error("Expired lock release check failed:", error); }
}


export async function logPresentationActivity(
  presentationId: string, actorId: string, actionType: PresentationActivityType, details?: PresentationActivity['details']
): Promise<string> {
  let actorNameResolved = 'System/Guest'; 
  const activityData: Omit<PresentationActivity, 'id'> = {
    presentationId, actorId, actorName: actorNameResolved, actionType, details: details || {}, createdAt: serverTimestamp() as Timestamp,
  };
  const activityRef = await addDoc(presentationActivitiesCollection, activityData);
  return activityRef.id;
}

export async function getPresentationActivities(presentationId: string, limitCount = 20): Promise<PresentationActivity[]> {
    const q = query( presentationActivitiesCollection, where('presentationId', '==', presentationId), orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data())} as PresentationActivity));
}

export async function createAssetMetadata(assetData: Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'>): Promise<string> {
  const docRef = await addDoc(assetsCollection, {
    ...assetData,
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
  });
  if (assetData.teamId && assetData.uploaderId) {
    await logTeamActivityInMongoDB(assetData.teamId, assetData.uploaderId, 'asset_uploaded', { fileName: assetData.fileName, assetType: assetData.assetType }, 'asset', docRef.id);
  }
  return docRef.id;
}

export async function getTeamAssets(teamId: string): Promise<Asset[]> {
  const q = query(assetsCollection, where('teamId', '==', teamId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Asset));
}

export async function deleteAsset(assetId: string, storagePath: string, teamId: string, actorId: string): Promise<void> {
  const assetDocRef = doc(db, 'assets', assetId);
  const assetDocSnap = await getDoc(assetDocRef);
  const assetData = assetDocSnap.data() as Asset | undefined;

  const fileRef = ref(fbStorage, storagePath);
  await deleteObject(fileRef);
  await deleteDoc(assetDocRef);

  if (teamId && actorId && assetData) {
    await logTeamActivityInMongoDB(teamId, actorId, 'asset_deleted', { fileName: assetData.fileName, assetType: assetData.assetType }, 'asset', assetId);
  }
}

export async function createNotification(
  userId: string, 
  type: NotificationEnumType,
  title: string,
  message: string,
  link?: string,
  actorId?: string, 
  actorName?: string,
  actorProfilePictureUrl?: string,
  teamIdForAction?: string, 
  roleForAction?: TeamRole   
): Promise<string> {
  const notificationData: Partial<Omit<Notification, 'id'>> = { 
    userId,
    type,
    title,
    message,
    link: link || undefined,
    isRead: false,
    createdAt: serverTimestamp() as Timestamp,
    actorId: actorId || undefined,
    actorName: actorName || undefined,
    actorProfilePictureUrl: actorProfilePictureUrl || undefined,
  };
  if (teamIdForAction) notificationData.teamIdForAction = teamIdForAction;
  if (roleForAction) notificationData.roleForAction = roleForAction;

  const docRef = await addDoc(notificationsCollection, notificationData as Omit<Notification, 'id'>);
  return docRef.id;
}

export function getUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount = 10
): Unsubscribe {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Notification));
    callback(notifications);
  }, (error) => {
    console.error("Error fetching notifications with listener:", error);
  });
  return unsubscribe;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { isRead: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(notificationsCollection, where('userId', '==', userId), where('isRead', '==', false));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return; 

  const batch = writeBatch(db);
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, { isRead: true });
  });
  await batch.commit();
}

export async function getUserByEmail(email: string): Promise<AppUserTypeFromFirestore | null> {
    return getUserByEmailFromMongoDB(email) as Promise<AppUserTypeFromFirestore | null>; 
}

export async function getAllPresentationsForAdmin(includeDeleted = false): Promise<Presentation[]> {
  let q;
  if (includeDeleted) {
    q = query(presentationsCollection, where('deleted', '==', true), orderBy('deletedAt', 'desc'));
  } else {
    q = query(presentationsCollection, where('deleted', '==', false), orderBy('lastUpdatedAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Presentation));
}

export async function getPresentationsForModerationReview(): Promise<Presentation[]> {
  const q = query(
    presentationsCollection,
    where('moderationStatus', '==', 'under_review'),
    where('deleted', '==', false), // Ensure not to review already soft-deleted items
    orderBy('lastUpdatedAt', 'desc') // Review more recent ones first or by flag date
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Presentation));
}


export async function removeTeamIdFromPresentations(teamId: string): Promise<void> {
  const q = query(presentationsCollection, where('teamId', '==', teamId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log(`No presentations found associated with teamId ${teamId} in Firestore.`);
    return; 
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, { teamId: deleteField(), lastUpdatedAt: serverTimestamp() });
  });
  await batch.commit();
  console.log(`Removed teamId ${teamId} from ${snapshot.size} presentations in Firestore.`);
}

export async function duplicatePresentation(originalPresentationId: string, newOwnerId: string, newOwnerTeamId?: string | null): Promise<string> {
  const originalPresRef = doc(db, 'presentations', originalPresentationId);
  const originalPresSnap = await getDoc(originalPresRef);

  if (!originalPresSnap.exists()) {
    throw new Error("Original presentation not found.");
  }

  const originalData = originalPresSnap.data() as Presentation;

  const newSlides = originalData.slides.map(slide => ({
    ...slide,
    id: uuidv4(),
    elements: slide.elements.map(el => ({
      ...el,
      id: uuidv4(),
      lockedBy: null,
      lockTimestamp: null,
    })),
    comments: [], 
    backgroundGradient: slide.backgroundGradient || null,
  }));

  const newPresentationData: Omit<Presentation, 'id' | 'activeCollaborators'> = {
    title: `Copy of ${originalData.title}`,
    description: originalData.description,
    creatorId: newOwnerId,
    teamId: newOwnerTeamId || undefined,
    access: { [newOwnerId]: 'owner' },
    settings: {
      isPublic: false, 
      passwordProtected: false,
      commentsAllowed: true,
    },
    branding: originalData.branding, 
    thumbnailUrl: originalData.thumbnailUrl || `https://placehold.co/320x180.png?text=Copy`,
    version: 1,
    slides: renumberSlides(newSlides),
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
    deleted: false,
    deletedAt: null,
    moderationStatus: 'active',
    favoritedBy: {}, 
  };

  const newPresRef = await addDoc(presentationsCollection, newPresentationData);
  
  await logPresentationActivity(newPresRef.id, newOwnerId, 'presentation_created', { 
    presentationTitle: newPresentationData.title, 
    source: 'duplication', 
    originalPresentationId 
  });
  
  if (newOwnerTeamId) {
    await logTeamActivityInMongoDB(newOwnerTeamId, newOwnerId, 'presentation_created', { 
      presentationTitle: newPresentationData.title,
      source: 'duplication',
      originalPresentationId,
    }, 'presentation', newPresRef.id);
  }
  
  return newPresRef.id;
}

export async function toggleFavoriteStatus(presentationId: string, userId: string): Promise<boolean> {
  const presRef = doc(db, 'presentations', presentationId);
  let isNowFavorite = false;

  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) {
      throw new Error("Presentation not found.");
    }
    const presentation = presDoc.data() as Presentation;
    const currentFavoritedBy = presentation.favoritedBy || {};
    
    if (currentFavoritedBy[userId]) {
      transaction.update(presRef, { [`favoritedBy.${userId}`]: deleteField(), lastUpdatedAt: serverTimestamp() });
      isNowFavorite = false;
    } else {
      transaction.update(presRef, { [`favoritedBy.${userId}`]: true, lastUpdatedAt: serverTimestamp() });
      isNowFavorite = true;
    }
  });

  await logPresentationActivity(
    presentationId, 
    userId, 
    isNowFavorite ? 'presentation_favorited' : 'presentation_unfavorited', 
    { presentationTitle: (await getPresentationById(presentationId))?.title || "Unknown" }
  );

  return isNowFavorite;
}

export async function getFeedbackSubmissions(limitCount = 50): Promise<FeedbackSubmission[]> {
  const q = query(
    feedbackSubmissionsCollection,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...convertTimestamps(docSnap.data()),
  } as FeedbackSubmission));
}

export async function updateFeedbackStatus(feedbackId: string, status: FeedbackSubmission['status']): Promise<void> {
    const docRef = doc(db, 'feedbackSubmissions', feedbackId);
    await updateDoc(docRef, { status: status, updatedAt: serverTimestamp() as Timestamp });
}


export { uuidv4 };


    
