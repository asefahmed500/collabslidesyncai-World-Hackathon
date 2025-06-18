
import type { Timestamp } from 'firebase/firestore'; // Firestore Timestamp
import type { Types } from 'mongoose'; // Mongoose ObjectId type

export interface User {
  id: string; // This will be Firebase UID, which corresponds to _id in MongoDB schema after toString()
  _id?: Types.ObjectId | string; // Mongoose _id. Mongoose documents have this, but our AppUser type primarily uses 'id'.
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean; // From Firebase Auth, can be synced
  profilePictureUrl?: string | null;
  teamId?: string; // ID of the primary team the user belongs to, if any.
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; // Role within their primary team or general app role.
  lastActive: Date | Timestamp; 
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp; // From Mongoose timestamps
  settings: {
    darkMode: boolean;
    aiFeatures: boolean;
    notifications: boolean;
  };
  isAppAdmin?: boolean; // Global application admin status
  googleId?: string | null; // UID from Google provider
  githubId?: string | null; // UID from GitHub provider
  twoFactorEnabled?: boolean;
  // twoFactorSecret, backupCodes etc. would go here if 2FA is fully implemented
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  // userId: string; // This was Firebase UID. For Mongoose subdocs, _id can be used or userId can be User.id
  role: TeamRole;
  joinedAt: Date | Timestamp;
  addedBy: string; // User.id of who added them
  name?: string; // Denormalized from User profile for quick display
  email?: string; // Denormalized
  profilePictureUrl?: string; // Denormalized
}

export interface Team {
  id: string; // Mongoose _id.toString()
  _id?: Types.ObjectId | string;
  name: string;
  ownerId: string; // User.id (Firebase UID) of the team creator/owner
  members: { // Mongoose Map: keys are User.id (Firebase UID)
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
  lockedBy?: string | null; // User.id (Firebase UID)
  lockTimestamp?: Timestamp | null;
}

export interface SlideComment {
  id: string;
  userId: string; // User.id (Firebase UID)
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
  id: string; // User.id (Firebase UID)
  name: string;
  profilePictureUrl?: string;
  cursorPosition?: { slideId: string; x: number; y: number } | null;
  lastSeen: Timestamp; // Firestore Timestamp
  color: string;
  email?: string; // Denormalized for display
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  creatorId: string; // User.id (Firebase UID)
  teamId?: string; // Team.id
  access: { // Keys are User.id (Firebase UID)
    [userId: string]: PresentationAccessRole;
  };
  settings: {
    isPublic: boolean;
    passwordProtected: boolean;
    password?: string; // Hashed password if stored, or flag for check
    commentsAllowed: boolean;
  };
  thumbnailUrl?: string;
  version: number;
  createdAt?: Timestamp; // Firestore Timestamp
  lastUpdatedAt: Timestamp; // Firestore Timestamp
  slides: Slide[];
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo }; // Keys are User.id (Firebase UID)
  collaborators?: User[]; // Potentially populated array of full User objects for access list display
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
  actorId: string; // User.id (Firebase UID)
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
  actorId: string; // User.id (Firebase UID) or 'system', 'guest'
  actorName?: string;
  actionType: PresentationActivityType;
  targetUserId?: string; // User.id (Firebase UID) if action targets a user
  targetUserName?: string;
  details?: {
    oldRole?: PresentationAccessRole;
    newRole?: PresentationAccessRole;
    changedSetting?: keyof Presentation['settings'];
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    accessMethod?: 'direct' | 'public_link' | 'team_access' | 'public_link_password' | 'public_link_anonymous';
    [key: string]: any;
  };
  createdAt: Timestamp; // Firestore Timestamp
}

export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'other';

export interface Asset {
  id: string;
  teamId: string;
  uploaderId: string; // User.id (Firebase UID)
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

    