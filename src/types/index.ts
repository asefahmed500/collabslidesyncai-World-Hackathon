
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  teamId?: string; 
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; 
  lastActive: Date | Timestamp;
  createdAt?: Date | Timestamp;
  settings: {
    darkMode: boolean;
    aiFeatures: boolean;
    notifications: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  ownerId: string; 
  memberIds: string[]; 
  branding: {
    logoUrl?: string;
    colors: string[]; 
    fonts: string[]; 
  };
  settings: {
    allowGuestEdits: boolean;
    aiFeaturesEnabled: boolean; 
  };
  createdAt: Date | Timestamp;
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart';

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content: any; 
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    color?: string; 
    fontFamily?: string;
    fontSize?: string; 
    backgroundColor?: string; 
    borderColor?: string; 
  };
  zIndex?: number;
  lockedBy?: string | null; // UserID of the user who locked this element
  lockTimestamp?: Timestamp | null; // Timestamp when the lock was acquired
}

export interface SlideComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: Date | Timestamp;
  resolved: boolean;
}

export interface Slide {
  id:string;
  presentationId: string;
  slideNumber: number;
  elements: SlideElement[];
  speakerNotes?: string;
  comments: SlideComment[];
  aiSuggestions?: string[];
  thumbnailUrl?: string;
  backgroundColor?: string; 
}

export interface ActiveCollaboratorInfo {
  id: string; // userId
  name: string;
  profilePictureUrl?: string;
  cursorPosition?: { slideId: string; x: number; y: number } | null;
  lastSeen: Timestamp;
  color: string; // A unique color for this collaborator's cursor/presence
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  creatorId: string; 
  teamId?: string; 
  access: { 
    [userId: string]: 'owner' | 'editor' | 'viewer';
  };
  settings: {
    isPublic: boolean;
    passwordProtected: boolean;
    password?: string;
    commentsAllowed: boolean;
  };
  thumbnailUrl?: string;
  version: number;
  createdAt?: Date | Timestamp;
  lastUpdatedAt: Date | Timestamp;
  slides: Slide[];
  // Store active collaborators directly in the presentation document for simplicity with listeners
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo }; 
}
