
import { db, storage as fbStorage } from './firebaseConfig'; // Renamed storage to fbStorage to avoid name clash
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
  Timestamp,
  writeBatch,
  FieldValue,
  deleteField,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import type { Presentation, Slide, SlideElement, SlideComment, User, Team, ActiveCollaboratorInfo, TeamRole, TeamMember, TeamActivity, TeamActivityType, PresentationActivity, PresentationActivityType, PresentationAccessRole, Asset, AssetType } from '@/types';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA',
  '#F0B67F', '#8A6EAF', '#A3D9FF', '#FF9671', '#C44569'
];
let userColorIndex = 0;

const getNextUserColor = () => {
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
    converted[key] = convertTimestamps(data[key]);
  }
  return converted;
};

const usersCollection = collection(db, 'users');
const teamsCollection = collection(db, 'teams');
const presentationsCollection = collection(db, 'presentations');
const teamActivitiesCollection = collection(db, 'teamActivities');
const presentationActivitiesCollection = collection(db, 'presentationActivities');
const assetsCollection = collection(db, 'assets');


export async function createTeam(teamName: string, owner: User): Promise<string> {
  const ownerMemberInfo: TeamMember = {
    role: 'owner',
    joinedAt: serverTimestamp() as Timestamp,
    addedBy: owner.id,
    name: owner.name,
    email: owner.email,
    profilePictureUrl: owner.profilePictureUrl
  };

  const newTeamData: Omit<Team, 'id'> = {
    name: teamName,
    ownerId: owner.id,
    members: {
      [owner.id]: ownerMemberInfo,
    },
    branding: {
      logoUrl: `https://placehold.co/200x100.png?text=${teamName.charAt(0).toUpperCase()}`,
      primaryColor: '#3F51B5',
      secondaryColor: '#FFC107',
      fontPrimary: 'Space Grotesk',
      fontSecondary: 'PT Sans',
    },
    settings: {
      allowGuestEdits: false,
      aiFeaturesEnabled: true,
    },
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(teamsCollection, newTeamData);
  await logTeamActivity(docRef.id, owner.id, 'team_created', 'team_profile', docRef.id, { teamName });
  return docRef.id;
}

export async function getTeamById(teamId: string): Promise<Team | null> {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (teamSnap.exists()) {
        return { id: teamSnap.id, ...convertTimestamps(teamSnap.data()) } as Team;
    }
    return null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const q = query(usersCollection, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...convertTimestamps(userDoc.data()) } as User;
    }
    return null;
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
    await logTeamActivity(teamId, userId, 'presentation_created', 'presentation', docRef.id, { presentationTitle: title });
  }
  return docRef.id;
}

export async function getPresentationsForUser(userId: string): Promise<Presentation[]> {
  const user = await getUserProfile(userId);
  if (!user) return [];

  const queries = [];
  
  queries.push(query(presentationsCollection, where('creatorId', '==', userId)));
  
  queries.push(query(presentationsCollection, where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer'])));

  
  if (user.teamId) {
    const team = await getTeamById(user.teamId);
    if (team && team.members[userId]) { 
        queries.push(query(presentationsCollection, where('teamId', '==', user.teamId)));
    }
  }

  const allSnapshots = await Promise.all(queries.map(q => getDocs(q)));

  const presentationsMap = new Map<string, Presentation>();
  allSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(docSnap => {
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
  
  const updatePayload: { [key:string]: any } = { lastUpdatedAt: serverTimestamp() };

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const typedKey = key as keyof Presentation;
      if (typedKey === 'settings') {
        const newSettings = data.settings;
        if (newSettings) {
          for (const settingKey in newSettings) {
            updatePayload[`settings.${settingKey}`] = newSettings[settingKey as keyof Presentation['settings']];
          }
        }
      } else if (typedKey === 'access') {
        const newAccess = data.access;
        if (newAccess) {
          for (const accessKey in newAccess) {
             if (newAccess[accessKey] === null || newAccess[accessKey] === undefined) { 
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
            style: {
                fontFamily: el.style?.fontFamily || 'PT Sans',
                fontSize: el.style?.fontSize || '16px',
                color: el.style?.color || '#000000',
                backgroundColor: el.style?.backgroundColor || 'transparent',
                ...el.style,
            }
          }))
        }));
      } else if (typedKey !== 'id' && typedKey !== 'lastUpdatedAt' && typedKey !== 'createdAt') {
        updatePayload[typedKey] = data[typedKey];
      }
    }
  }
  
  if (Object.keys(updatePayload).length > 1) { 
    await updateDoc(docRef, updatePayload);
  }
}


export async function deletePresentation(presentationId: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  await deleteDoc(docRef);
}

export async function addSlideToPresentation(presentationId: string, newSlideData: Partial<Omit<Slide, 'id' | 'presentationId' | 'slideNumber'>> = {}): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);

  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
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

    const updatedSlides = arrayUnion(newSlide);
    transaction.update(presRef, {
      slides: updatedSlides,
      lastUpdatedAt: serverTimestamp()
    });
    return slideId;
  });
}

export async function updateElementInSlide(presentationId: string, slideId: string, updatedElementPartial: Partial<SlideElement>): Promise<void> {
  if (!updatedElementPartial.id) {
    console.error("updateElementInSlide called without element ID");
    return;
  }
  const presRef = doc(db, 'presentations', presentationId);

  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) {
        throw new Error(`Presentation with ID ${presentationId} not found.`);
    }

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
                style: {
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
        if (!elementFound && updatedElementPartial.id) { 
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

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
}

export async function addCommentToSlide(presentationId: string, slideId: string, comment: Omit<SlideComment, 'id' | 'createdAt'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) {
        throw new Error("Presentation not found");
    }
    const presentationData = presDoc.data() as Presentation;
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex > -1) {
        const newComment: SlideComment = {
            ...comment,
            id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            createdAt: serverTimestamp() as Timestamp,
        };
        const updatedSlides = [...slides]; 
        const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = [...(targetSlide.comments || []), newComment];
        updatedSlides[slideIndex] = targetSlide;

        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    } else {
        console.warn(`Slide with ID ${slideId} not found in presentation ${presentationId}`);
    }
  });
}

export async function resolveCommentOnSlide(presentationId: string, slideId: string, commentId: string): Promise<void> {
 const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) {
        throw new Error("Presentation not found");
    }
    const presentationData = presDoc.data() as Presentation;
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex > -1) {
        const updatedSlides = [...slides];
        const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = (targetSlide.comments || []).map(c => c.id === commentId ? { ...c, resolved: true } : c);
        updatedSlides[slideIndex] = targetSlide;
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }
  });
}

export async function getUserProfile(userId: string): Promise<User | null> {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = convertTimestamps(userSnap.data());
        return {
          id: userSnap.id,
          ...userData,
          isAppAdmin: userData.isAppAdmin || false, 
        } as User;
    }
    return null;
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {...data, lastActive: serverTimestamp()});
}

// --- Collaboration Features ---

export async function updateUserPresence(presentationId: string, userId: string, userInfo: Pick<ActiveCollaboratorInfo, 'name' | 'profilePictureUrl' | 'color' | 'email'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const collaboratorPath = `activeCollaborators.${userId}`;
  await updateDoc(presRef, {
    [collaboratorPath]: {
      ...userInfo,
      id: userId,
      lastSeen: serverTimestamp(),
      cursorPosition: null, // Reset cursor on presence update, let client send new position
    },
    lastUpdatedAt: serverTimestamp() 
  });
}

export async function removeUserPresence(presentationId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const collaboratorPath = `activeCollaborators.${userId}`;
  await updateDoc(presRef, {
    [collaboratorPath]: deleteField(),
    lastUpdatedAt: serverTimestamp()
  });
}

export async function updateUserCursorPosition(presentationId: string, userId: string, slideId: string, position: { x: number; y: number }): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const cursorPath = `activeCollaborators.${userId}.cursorPosition`;
  const lastSeenPath = `activeCollaborators.${userId}.lastSeen`; // Also update lastSeen
  await updateDoc(presRef, {
    [cursorPath]: { slideId, ...position },
    [lastSeenPath]: serverTimestamp()
  });
}

const LOCK_DURATION_MS = 30 * 1000;

export async function acquireLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<boolean> {
  const presRef = doc(db, 'presentations', presentationId);

  try {
    await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef);
        if (!presDoc.exists()) {
          throw new Error("Presentation not found for lock acquisition.");
        }

        const presentation = presDoc.data() as Presentation;
        let lockAcquired = false;
        let alreadyLockedByOther = false;

        const updatedSlides = presentation.slides.map(s => {
          if (s.id === slideId) {
            return {
              ...s,
              elements: s.elements.map(el => {
                if (el.id === elementId) {
                  if (el.lockedBy && el.lockedBy !== userId && el.lockTimestamp && (el.lockTimestamp.toMillis() + LOCK_DURATION_MS > Date.now())) {
                    alreadyLockedByOther = true;
                    return el; 
                  }
                  
                  lockAcquired = true;
                  return { ...el, lockedBy: userId, lockTimestamp: serverTimestamp() as Timestamp };
                }
                return el;
              })
            };
          }
          return s;
        });

        if (alreadyLockedByOther) {
            throw new Error("Element already locked by another user.");
        }
        if (!lockAcquired) {
             throw new Error("Element not found to acquire lock."); 
        }

        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    });
    return true; 
  } catch (error) {
    console.error("Failed to acquire lock:", error);
    return false; 
  }
}

export async function releaseLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
     await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef);
        if (!presDoc.exists()) return;

        const presentation = presDoc.data() as Presentation;
        const updatedSlides = presentation.slides.map(s => {
          if (s.id === slideId) {
            return {
              ...s,
              elements: s.elements.map(el => {
                if (el.id === elementId && el.lockedBy === userId) {
                  return { ...el, lockedBy: null, lockTimestamp: null };
                }
                return el;
              })
            };
          }
          return s;
        });
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    });
  } catch (error) {
    console.error("Failed to release lock:", error);
  }
}

export async function releaseExpiredLocks(presentationId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
   try {
    await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef);
        if (!presDoc.exists()) return;

        const presentation = presDoc.data() as Presentation;
        let locksReleased = false;
        const updatedSlides = presentation.slides.map(s => {
          let slideModified = false;
          const elements = s.elements.map(el => {
            if (el.lockedBy && el.lockTimestamp && (el.lockTimestamp.toMillis() + LOCK_DURATION_MS < Date.now())) {
              slideModified = true;
              locksReleased = true;
              return { ...el, lockedBy: null, lockTimestamp: null };
            }
            return el;
          });
          return slideModified ? { ...s, elements } : s;
        });

        if (locksReleased) {
          transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
          console.log(`Released expired locks for presentation ${presentationId}`);
        }
    });
  } catch (error) {
     console.error("Failed to release expired locks:", error);
  }
}

// --- Team Management Firestore Services ---

export async function logTeamActivity(
  teamId: string,
  actorId: string,
  actionType: TeamActivityType,
  targetType?: 'user' | 'presentation' | 'team_profile' | 'asset',
  targetId?: string,
  details?: object
): Promise<string> {
  const actor = await getUserProfile(actorId);
  const activityData: Omit<TeamActivity, 'id'> = {
    teamId,
    actorId,
    actorName: actor?.name || 'Unknown User',
    actionType,
    targetType,
    targetId,
    details: details || {},
    createdAt: serverTimestamp() as Timestamp,
  };
  if (targetType === 'user' && targetId) {
    const targetUser = await getUserProfile(targetId);
    activityData.targetName = targetUser?.name || targetId;
  } else if (targetType === 'presentation' && targetId) {
    // const pres = await getPresentationById(targetId);
    // activityData.targetName = pres?.title || targetId;
  }


  const activityRef = await addDoc(teamActivitiesCollection, activityData);
  return activityRef.id;
}

export async function getTeamActivities(teamId: string, limitCount = 20): Promise<TeamActivity[]> {
  const q = query(
    teamActivitiesCollection,
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as TeamActivity));
}


// --- Presentation Activity Logging ---
export async function logPresentationActivity(
  presentationId: string,
  actorId: string, 
  actionType: PresentationActivityType,
  details?: PresentationActivity['details']
): Promise<string> {
  let actorName = 'System';
  if (actorId !== 'system' && actorId !== 'guest' && actorId !== 'guest_password_verified') {
    const actor = await getUserProfile(actorId);
    actorName = actor?.name || 'Unknown User';
  } else if (actorId === 'guest' || actorId === 'guest_password_verified') {
    actorName = actorId === 'guest_password_verified' ? 'Guest (Password Verified)' : 'Guest Viewer';
  }

  const activityData: Omit<PresentationActivity, 'id'> = {
    presentationId,
    actorId,
    actorName,
    actionType,
    details: details || {},
    createdAt: serverTimestamp() as Timestamp,
  };
  
  if (details?.targetUserId) {
      const targetUser = await getUserProfile(details.targetUserId);
      activityData.targetUserName = targetUser?.name || details.targetUserId;
  }

  const activityRef = await addDoc(presentationActivitiesCollection, activityData);
  return activityRef.id;
}

export async function getPresentationActivities(presentationId: string, limitCount = 20): Promise<PresentationActivity[]> {
    const q = query(
        presentationActivitiesCollection,
        where('presentationId', '==', presentationId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data())} as PresentationActivity));
}


// --- Admin Firestore Services ---
export async function getAllUsers(): Promise<User[]> {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...convertTimestamps(docSnap.data()),
    isAppAdmin: docSnap.data().isAppAdmin || false, 
  } as User));
}

export async function getAllTeams(): Promise<Team[]> {
  const snapshot = await getDocs(teamsCollection);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Team));
}

// --- Asset Management Firestore Services ---
export async function createAssetMetadata(assetData: Omit<Asset, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(assetsCollection, {
    ...assetData,
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
  });
  if (assetData.teamId && assetData.uploaderId) {
    await logTeamActivity(assetData.teamId, assetData.uploaderId, 'asset_uploaded' as any, 'asset', docRef.id, { fileName: assetData.fileName, assetType: assetData.assetType });
  }
  return docRef.id;
}

export async function getTeamAssets(teamId: string): Promise<Asset[]> {
  const q = query(assetsCollection, where('teamId', '==', teamId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Asset));
}

export async function deleteAsset(assetId: string, storagePath: string, teamId: string, actorId: string): Promise<void> {
  const assetRef = doc(db, 'assets', assetId);
  const assetDoc = await getDoc(assetRef);
  const assetData = assetDoc.data() as Asset | undefined;

  // Delete from Firebase Storage
  const fileRef = ref(fbStorage, storagePath);
  await deleteObject(fileRef);

  // Delete from Firestore
  await deleteDoc(assetRef);

  if (teamId && actorId && assetData) {
    await logTeamActivity(teamId, actorId, 'asset_deleted' as any, 'asset', assetId, { fileName: assetData.fileName, assetType: assetData.assetType });
  }
}


export { getNextUserColor };
