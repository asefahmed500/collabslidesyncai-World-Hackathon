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
  | 'sharing_settings_updated' // Generic for isPublic, passwordProtected changes
  | 'password_set'
  | 'password_removed'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'collaborator_role_changed';

export interface PresentationActivity {
  id: string;
  presentationId: string;
  actorId: string; // User ID of who performed action, or 'system' or 'guest_session_id'
  actorName?: string; // Denormalized name, or "Guest"
  actionType: PresentationActivityType;
  targetUserId?: string; // For collaborator related actions: the user being added/removed/role_changed
  targetUserName?: string; // Denormalized name of target user
  details?: {
    oldRole?: PresentationAccessRole;
    newRole?: PresentationAccessRole;
    changedSetting?: keyof Presentation['settings']; // e.g. 'isPublic', 'passwordProtected'
    oldValue?: any;
    newValue?: any;
    ipAddress?: string; // Consider privacy implications
    userAgent?: string; // Consider privacy implications
    accessMethod?: 'direct' | 'public_link' | 'team_access';
    [key: string]: any;
  };
  createdAt: Timestamp;
}
