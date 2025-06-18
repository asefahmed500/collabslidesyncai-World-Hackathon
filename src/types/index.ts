import type { Timestamp } from 'firebase/firestore'; // Firestore Timestamp
import type { Types } from 'mongoose'; // Mongoose ObjectId type

export interface User {
  id: string; // This will be Firebase UID, which corresponds to _id in MongoDB schema after toString()
  _id?: Types.ObjectId | string; // Mongoose _id
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean; // From Firebase Auth, can be synced
  profilePictureUrl?: string | null;
  teamId?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
  lastActive: Date | Timestamp; // Allow both for flexibility during transition if any
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp; // From Mongoose timestamps
  settings: {
    darkMode: boolean;
    aiFeatures: boolean;
    notifications: boolean;
  };
  isAppAdmin?: boolean;
  // For social logins, Firebase UID is the primary link.
  // Storing provider-specific IDs is optional but can be useful.
  googleId?: string | null;
  githubId?: string | null;
  twoFactorEnabled?: boolean;
  // twoFactorSecret, backupCodes etc. would go here if 2FA is fully implemented
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  userId: string; // Firebase UID
  role: TeamRole;
  joinedAt: Date | Timestamp;
  addedBy: string;
  name?: string;
  email?: string;
  profilePictureUrl?: string;
}

export interface Team {
  id: string; // Mongoose _id.toString()
  _id?: Types.ObjectId | string;
  name: string;
  ownerId: string;
  members: {
    [userId: string]: TeamMember; // userId here is Firebase UID
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
  createdAt?: Date | Timestamp;
  lastUpdatedAt?: Date | Timestamp;
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
  createdAt: Timestamp; // Firestore Timestamp
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
  lastSeen: Timestamp; // Firestore Timestamp
  color: string;
  email?: string;
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
  createdAt?: Timestamp; // Firestore Timestamp
  lastUpdatedAt: Timestamp; // Firestore Timestamp
  slides: Slide[];
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo };
  collaborators?: User[];
}

export type TeamActivityType =
  | 'team_created'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'team_profile_updated'
  | 'presentation_created'
  | 'presentation_deleted'
  | 'asset_uploaded'
  | 'asset_deleted';

export interface TeamActivity {
  id: string;
  teamId: string;
  actorId: string;
  actorName?: string;
  actionType: TeamActivityType;
  targetType?: 'user' | 'presentation' | 'team_profile' | 'asset';
  targetId?: string;
  targetName?: string;
  details?: {
    oldRole?: TeamRole;
    newRole?: TeamRole;
    changedFields?: string[];
    [key: string]: any;
  };
  createdAt: Timestamp; // Firestore Timestamp
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
  createdAt: Timestamp; // Firestore Timestamp
}

export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'other';

export interface Asset {
  id: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string;
  fileName: string;
  fileType: string; // MIME type
  assetType: AssetType;
  storagePath: string;
  downloadURL: string;
  size: number; // in bytes
  thumbnailURL?: string;
  dimensions?: { width: number; height: number };
  duration?: number; // For audio/video in seconds
  tags?: string[];
  description?: string;
  createdAt: Timestamp; // Firestore Timestamp
  lastUpdatedAt?: Timestamp; // Firestore Timestamp
}
