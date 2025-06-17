export interface User {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  teamId?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
  lastActive: Date;
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
  createdAt: Date;
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
  createdAt: Date;
  resolved: boolean;
}

export interface Slide {
  id:string;
  presentationId: string;
  slideNumber: number;
  elements: SlideElement[];
  speakerNotes?: string;
  comments: SlideComment[];
  aiSuggestions?: string[]; // Raw suggestions yet to be applied
  thumbnailUrl?: string; // Add this for consistency with proposal
  backgroundColor?: string;
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  teamId: string;
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
  lastUpdatedAt: Date;
  slides: Slide[]; // Keep slides data with presentation for simplicity in mock
  collaborators?: User[]; // For presence indicators
}
