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
  isAppAdmin?: boolean; 
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  role: TeamRole;
  joinedAt: Timestamp;
  addedBy: string; 
  name?: string; 
  email?: string; 
  profilePictureUrl?: string; 
}

export interface Team {
  id: string;
  name: string;
  ownerId: string; 
  members: {
    [userId: string]: TeamMember;
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string; 
    secondaryColor?: string; 
    fontPrimary?: string;
    fontSecondary?: string;
  };
  settings: {
    allowGuestEdits: boolean;
    aiFeaturesEnabled: boolean;
  };
  createdAt: Timestamp;
  lastUpdatedAt?: Timestamp;
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart';
export type PresentationAccessRole = 'owner' | 'editor' | 'viewer';

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
  lockedBy?: string | null;
  lockTimestamp?: Timestamp | null;
}

export interface SlideComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: Timestamp;
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
  id: string;
  name: string;
  profilePictureUrl?: string;
  cursorPosition?: { slideId: string; x: number; y: number } | null;
  lastSeen: Timestamp;
  color: string;
  email?: string; // Added email for ShareDialog collaborator list
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  teamId?: string;
  access: {
    [userId: string]: PresentationAccessRole;
  };
  settings: {
    isPublic: boolean;
    passwordProtected: boolean;
    password?: string; 
    commentsAllowed: boolean;
  };
  thumbnailUrl?: string;
  version: number;
  createdAt?: Timestamp;
  lastUpdatedAt: Timestamp;
  slides: Slide[];
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo };
  collaborators?: User[]; // For PresentationCard, if needed for simpler display
}

export type TeamActivityType =
  | 'team_created'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'team_profile_updated'
  | 'presentation_created' 
  | 'presentation_deleted'; 

export interface TeamActivity {
  id: string;
  teamId: string;
  actorId: string; 
  actorName?: string; 
  actionType: TeamActivityType;
  targetType?: 'user' | 'presentation' | 'team_profile';
  targetId?: string; 
  targetName?: string; 
  details?: {
    oldRole?: TeamRole;
    newRole?: TeamRole;
    changedFields?: string[]; 
    [key: string]: any;
  };
  createdAt: Timestamp;
}

export type PresentationActivityType =
  | 'presentation_viewed'
  | 'sharing_settings_updated' 
  | 'password_set'
  | 'password_removed'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'collaborator_role_changed';

export interface PresentationActivity {
  id: string;
  presentationId: string;
  actorId: string; 
  actorName?: string; 
  actionType: PresentationActivityType;
  targetUserId?: string; 
  targetUserName?: string; 
  details?: {
    oldRole?: PresentationAccessRole;
    newRole?: PresentationAccessRole;
    changedSetting?: keyof Presentation['settings']; 
    oldValue?: any;
    newValue?: any;
    ipAddress?: string; 
    userAgent?: string; 
    accessMethod?: 'direct' | 'public_link' | 'team_access' | 'public_link_password';
    [key: string]: any;
  };
  createdAt: Timestamp;
}

export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'other';

export interface Asset {
  id: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string; // Denormalized for convenience
  fileName: string;
  fileType: string; // MIME type
  assetType: AssetType; // Categorized type
  storagePath: string; // Full path in Firebase Storage
  downloadURL: string;
  size: number; // in bytes
  thumbnailURL?: string; // Optional, e.g., for images or video stills
  dimensions?: { width: number; height: number }; // For images
  duration?: number; // For audio/video in seconds
  tags?: string[];
  description?: string;
  createdAt: Timestamp;
  lastUpdatedAt?: Timestamp;
}
