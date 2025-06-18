
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
    primaryColor?: string;
    secondaryColor?: string;
    fontPrimary?: string;
    fontSecondary?: string;
  };
  settings: {
    allowGuestEdits: boolean;
    aiFeaturesEnabled: boolean;
  };
  createdAt?: Date; // Mongoose timestamp
  lastUpdatedAt?: Date; // Mongoose timestamp
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart' | 'icon'; // Added icon
export type PresentationAccessRole = 'owner' | 'editor' | 'viewer';

export interface SlideElementStyle {
  color?: string; // Text color for text, border color for shapes (optional)
  fontFamily?: string;
  fontSize?: string; // e.g., "16px"
  backgroundColor?: string; // Fill color for shapes, background for text box
  borderColor?: string; // Specifically for shape borders
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  opacity?: number; // 0 to 1
  // For shapes
  shapeType?: 'rectangle' | 'circle' | 'triangle'; // if element.type === 'shape'
  borderWidth?: number; // in px
  borderRadius?: number; // in px
}

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content: any; // Text string, image URL, shape type, chart data config, icon name/svg
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: SlideElementStyle;
  zIndex?: number;
  lockedBy?: string | null;
  lockTimestamp?: FirestoreTimestamp | null; // Firestore specific, may need adjustment if elements move to Mongo
  rotation?: number; // In degrees, optional
}

export interface SlideComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: FirestoreTimestamp; // Firestore specific
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
  lastSeen: FirestoreTimestamp; // Firestore specific
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
  createdAt?: FirestoreTimestamp; // Firestore specific
  lastUpdatedAt: FirestoreTimestamp; // Firestore specific
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
  id: string; // Mongoose ObjectId as string
  _id?: Types.ObjectId | string;
  teamId: string; // Team.id (Mongoose ObjectId as string)
  actorId: string; // User.id (Firebase UID)
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
  createdAt: Date; // Mongoose timestamp
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
    changedProperty?: string; // e.g. 'position', 'style.color'
    [key: string]: any;
  };
  createdAt: FirestoreTimestamp; // Firestore specific
}

export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'other';

export interface Asset {
  id: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string;
  fileName: string;
  fileType: string; // MIME type e.g. "image/png"
  assetType: AssetType; // Simplified category
  storagePath: string; // Full path in Firebase Storage
  downloadURL: string;
  size: number; // in bytes
  thumbnailURL?: string; // Optional: for non-image assets or smaller image versions
  dimensions?: { width: number; height: number }; // For images
  duration?: number; // For video/audio in seconds
  tags?: string[];
  description?: string;
  createdAt: FirestoreTimestamp;
  lastUpdatedAt?: FirestoreTimestamp;
}
