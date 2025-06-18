
import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore'; // Firestore Timestamp for existing fields
import type { Types } from 'mongoose'; // Mongoose ObjectId type

export interface User {
  id: string; // Firebase UID, maps to _id in MongoDB schema
  _id?: Types.ObjectId | string; // Mongoose _id - internal representation
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  profilePictureUrl?: string | null;
  teamId?: string | null; // ID of the primary team the user belongs to
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; // Role within their primary team
  lastActive: Date; // Changed from Date | Timestamp to just Date for MongoDB
  createdAt?: Date; // Mongoose timestamp
  updatedAt?: Date; // Mongoose timestamp
  settings: {
    darkMode: boolean;
    aiFeatures: boolean;
    notifications: boolean;
  };
  isAppAdmin?: boolean;
  disabled?: boolean; // New field for disabling user account
  googleId?: string | null;
  githubId?: string | null;
  twoFactorEnabled?: boolean;
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  // userId is the key in the members map
  role: TeamRole;
  joinedAt: Date;
  addedBy: string; // User.id (Firebase UID) of who added them
  name?: string | null; // Denormalized
  email?: string | null; // Denormalized
  profilePictureUrl?: string | null; // Denormalized
}

export interface Team {
  id: string; // Mongoose virtual _id.toHexString()
  _id?: Types.ObjectId | string;
  name: string;
  ownerId: string; // User.id (Firebase UID)
  members: { // Mongoose Map: keys are User.id (Firebase UID)
    [userId: string]: TeamMember;
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string; // Deep blue (#3F51B5)
    secondaryColor?: string; // Accent color for other highlights, not the main accent
    accentColor?: string; // Vibrant purple (#9C27B0)
    fontPrimary?: string; // Headline font e.g., 'Space Grotesk'
    fontSecondary?: string; // Body font e.g., 'PT Sans'
  };
  settings: {
    allowGuestEdits: boolean;
    aiFeaturesEnabled: boolean;
  };
  createdAt?: Date; // Mongoose timestamp
  lastUpdatedAt?: Date; // Mongoose timestamp
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart' | 'icon';
export type PresentationAccessRole = 'owner' | 'editor' | 'viewer';

export interface SlideElementStyle {
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  backgroundColor?: string;
  borderColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  opacity?: number;
  shapeType?: 'rectangle' | 'circle' | 'triangle';
  borderWidth?: number;
  borderRadius?: number;
}

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: SlideElementStyle;
  zIndex?: number;
  lockedBy?: string | null; // UserID of the person editing
  lockTimestamp?: FirestoreTimestamp | null; // Timestamp of when the lock was acquired
  rotation?: number;
}

export interface SlideComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: FirestoreTimestamp;
  resolved: boolean;
}

export interface Slide {
  id:string;
  presentationId: string;
  slideNumber: number;
  elements: SlideElement[];
  speakerNotes?: string;
  comments: SlideComment[];
  thumbnailUrl?: string;
  backgroundColor?: string;
}

export interface ActiveCollaboratorInfo {
  id: string;
  name: string;
  profilePictureUrl?: string;
  cursorPosition?: { slideId: string; x: number; y: number } | null;
  lastSeen: FirestoreTimestamp;
  color: string; // Unique color for this collaborator's cursor/presence
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
    password?: string; // Store password directly for simplicity; hash in real app
    commentsAllowed: boolean;
  };
  branding?: Team['branding']; // Store a copy of team branding at time of creation/last update
  thumbnailUrl?: string;
  version: number;
  createdAt?: FirestoreTimestamp;
  lastUpdatedAt: FirestoreTimestamp;
  slides: Slide[];
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo }; // Map of active users
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
  _id?: Types.ObjectId | string;
  teamId: string;
  actorId: string;
  actorName?: string;
  actionType: TeamActivityType;
  targetType?: 'user' | 'presentation' | 'team_profile' | 'asset';
  targetId?: string;
  targetName?: string;
  details?: {
    oldRole?: TeamRole | PresentationAccessRole;
    newRole?: TeamRole | PresentationAccessRole;
    changedFields?: string[];
    teamName?: string;
    memberName?: string;
    memberEmail?: string;
    presentationTitle?: string;
    fileName?: string;
    assetType?: AssetType;
    [key: string]: any;
  };
  createdAt: Date;
}

export type PresentationActivityType =
  | 'presentation_viewed'
  | 'sharing_settings_updated'
  | 'password_set'
  | 'password_removed'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'collaborator_role_changed'
  | 'element_added'
  | 'element_updated'
  | 'element_deleted'
  | 'slide_background_updated'
  | 'presentation_created';


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
    accessMethod?: 'direct' | 'public_link' | 'team_access' | 'public_link_password' | 'public_link_anonymous';
    elementType?: SlideElementType;
    elementId?: string;
    changedProperty?: string;
    [key: string]: any;
  };
  createdAt: FirestoreTimestamp;
}

export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'other';

export interface Asset {
  id: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string;
  fileName: string;
  fileType: string;
  assetType: AssetType;
  storagePath: string;
  downloadURL: string;
  size: number;
  thumbnailURL?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  tags?: string[];
  description?: string;
  createdAt: FirestoreTimestamp;
  lastUpdatedAt?: FirestoreTimestamp;
}

export type NotificationType =
  | 'team_invite'
  | 'comment_new' // Generic for new comments
  | 'comment_mention' // For @mentions, future enhancement
  | 'presentation_shared'
  | 'ai_suggestion_ready' // Placeholder
  | 'generic_info'; // For general app info/updates

export interface Notification {
  id: string;
  userId: string; // The ID of the user who should receive this notification
  type: NotificationType;
  title: string; // A concise title for the notification
  message: string; // Detailed message
  link?: string; // Optional URL to navigate to when clicked
  isRead: boolean;
  createdAt: FirestoreTimestamp;
  icon?: string; // Optional: Lucide icon name string, or path to an image
  actorId?: string; // User ID of who performed the action (optional)
  actorName?: string; // Name of the actor (optional)
  actorProfilePictureUrl?: string; // Profile picture of the actor (optional)
}
