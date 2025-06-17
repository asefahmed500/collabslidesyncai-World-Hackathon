import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  teamId?: string; // ID of the primary team they created or were last active in contextually
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; // Role within their primary/contextual team
  lastActive: Date | Timestamp;
  createdAt?: Date | Timestamp;
  settings: {
    darkMode: boolean;
    aiFeatures: boolean;
    notifications: boolean;
  };
  isAppAdmin?: boolean; // New flag for application-level admin
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  role: TeamRole;
  joinedAt: Timestamp;
  addedBy: string; // User ID of who added this member
  name?: string; // Denormalized for easier display
  email?: string; // Denormalized
  profilePictureUrl?: string; // Denormalized
}

export interface Team {
  id: string;
  name: string;
  ownerId: string; // Original creator, owner role is managed in 'members'
  members: {
    [userId: string]: TeamMember;
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string; // e.g., hex code
    secondaryColor?: string; // e.g., hex code
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
  | 'presentation_created' // Example of other relevant activity
  | 'presentation_deleted'; // Example

export interface TeamActivity {
  id: string;
  teamId: string;
  actorId: string; // User who performed the action
  actorName?: string; // Denormalized
  actionType: TeamActivityType;
  targetType?: 'user' | 'presentation' | 'team_profile';
  targetId?: string; // e.g., userId of affected member, presentationId
  targetName?: string; // e.g., name of affected member or presentation
  details?: {
    oldRole?: TeamRole;
    newRole?: TeamRole;
    changedFields?: string[]; // For profile updates
    [key: string]: any;
  };
  createdAt: Timestamp;
}