
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  teamId?: string; // ID of the team the user belongs to or owns
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; // Role within their primary team
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
  ownerId: string; // User ID of the team owner
  memberIds: string[]; // Array of user IDs who are members
  branding: {
    logoUrl?: string;
    colors: string[]; // hex codes, e.g., ['#FF0000', '#00FF00']
    fonts: string[]; // font names, e.g., ['Arial', 'Verdana']
  };
  settings: {
    allowGuestEdits: boolean;
    aiFeaturesEnabled: boolean; // e.g. team-wide AI setting
  };
  createdAt: Date | Timestamp;
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart';

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content: any; // For text: string, for image: URL string, for chart: chart data/config
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    color?: string; // Text color, shape border color (if applicable)
    fontFamily?: string;
    fontSize?: string; // e.g., '16px'
    backgroundColor?: string; // Shape fill color, text box background
    borderColor?: string; // For elements that might have a border
    // Future: textAlign, fontWeight, fontStyle, etc.
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
  backgroundColor?: string; // Overall background color for the slide
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  creatorId: string; // User ID of the original creator
  teamId?: string; // Team this presentation belongs to
  access: { // Defines specific user access if different from team role
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
  collaborators?: User[]; // Full User objects for active collaborators, might be simplified for just IDs/names for display
}

