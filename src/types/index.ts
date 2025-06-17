
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name?: string | null; // Firebase displayName can be null
  email?: string | null; // Firebase email can be null
  profilePictureUrl?: string | null;
  teamId?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
  lastActive: Date | Timestamp; // Firestore uses Timestamp
  createdAt?: Date | Timestamp; // For user creation date
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
  rules: {
    allowGuestEdits: boolean;
    aiAllowed: boolean;
    maxMembers?: number;
  };
  branding: {
    logoUrl?: string;
    colors: string[]; // hex codes
    fonts: string[]; // font names
  };
  createdAt: Date | Timestamp;
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart';

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content: any; // Text content, image URL, shape data, chart data
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    backgroundColor?: string;
    borderColor?: string;
    // ... other style properties
  };
  zIndex?: number;
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

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  teamId?: string; // Optional for now
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
  collaborators?: User[]; // Simplified for now
}
