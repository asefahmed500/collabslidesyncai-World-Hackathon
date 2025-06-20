
import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { Types } from 'mongoose';

export interface User {
  id: string;
  _id?: Types.ObjectId | string;
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  profilePictureUrl?: string | null;
  teamId?: string | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
  lastActive: Date;
  createdAt?: Date;
  updatedAt?: Date;
  settings: {
    darkMode: boolean;
    aiFeatures: boolean;
    notifications: boolean;
  };
  isAppAdmin?: boolean;
  disabled?: boolean;
  googleId?: string | null;
  githubId?: string | null;
  twoFactorEnabled?: boolean;

  isPremium?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionPlan?: 'premium_monthly' | 'premium_yearly' | null;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  role: TeamRole;
  joinedAt: Date;
  addedBy: string;
  name?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
}

export interface Team {
  id: string;
  _id?: Types.ObjectId | string;
  name: string;
  ownerId: string;
  members: {
    [userId: string]: TeamMember;
  };
  pendingInvitations?: {
    [userId: string]: {
      inviteId: string;
      email: string;
      role: TeamRole;
      invitedBy: string;
      invitedAt: Date;
      token?: string;
    }
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontPrimary?: string;
    fontSecondary?: string;
  };
  settings: {
    allowGuestEdits: boolean;
    aiFeaturesEnabled: boolean;
  };
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

export type SlideElementType = 'text' | 'image' | 'shape' | 'chart' | 'icon';
export type PresentationAccessRole = 'owner' | 'editor' | 'viewer';
export type PresentationModerationStatus = 'active' | 'under_review' | 'taken_down';

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartContent {
  type: ChartType;
  data: any;
  options?: any;
  label?: string;
  aiSuggestionNotes?: string;
}

export interface IconContent {
  name: string;
}


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
  'data-ai-hint'?: string;
}

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content: string | ChartContent | IconContent | any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: SlideElementStyle;
  zIndex?: number;
  lockedBy?: string | null;
  lockTimestamp?: Date | null; 
  rotation?: number;
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

export interface SlideBackgroundGradient {
  type: 'linear' | 'radial';
  startColor: string;
  endColor: string;
  angle?: number;
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
  backgroundImageUrl?: string;
  backgroundGradient?: SlideBackgroundGradient | null;
}

export interface ActiveCollaboratorInfo {
  id: string;
  name: string;
  profilePictureUrl?: string;
  cursorPosition?: { slideId: string; x: number; y: number } | null;
  lastSeen: Date; 
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
  branding?: Team['branding'];
  thumbnailUrl?: string;
  version: number;
  createdAt?: Date; 
  lastUpdatedAt: Date; 
  slides: Slide[];
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo };
  deleted?: boolean;
  deletedAt?: Date | null; 
  moderationStatus: PresentationModerationStatus;
  moderationNotes?: string;
  favoritedBy?: { [userId: string]: true };
}

export type TeamActivityType =
  | 'team_created'
  | 'member_invited'
  | 'invitation_declined'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'team_profile_updated'
  | 'presentation_created'
  | 'presentation_deleted'
  | 'presentation_restored'
  | 'presentation_permanently_deleted'
  | 'presentation_status_changed'
  | 'asset_uploaded'
  | 'asset_deleted'
  | 'team_deleted';

export interface TeamActivity {
  id: string;
  _id?: Types.ObjectId | string;
  teamId: string;
  actorId: string;
  actorName?: string;
  actionType: TeamActivityType;
  targetType?: 'user' | 'presentation' | 'team_profile' | 'asset' | 'invitation';
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
    oldStatus?: PresentationModerationStatus;
    newStatus?: PresentationModerationStatus;
    moderationNotes?: string;
    invitedEmail?: string;
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
  | 'presentation_created'
  | 'presentation_deleted'
  | 'presentation_restored'
  | 'presentation_permanently_deleted'
  | 'moderation_status_changed'
  | 'presentation_favorited'
  | 'presentation_unfavorited';


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
    oldStatus?: PresentationModerationStatus;
    newStatus?: PresentationModerationStatus;
    moderationNotes?: string;
    [key: string]: any;
  };
  createdAt: Date; 
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
  createdAt: Date; 
  lastUpdatedAt?: Date; 
}

export type NotificationEnumType =
  | 'team_invite'
  | 'team_invitation'
  | 'comment_new'
  | 'comment_mention'
  | 'presentation_shared'
  | 'role_changed'
  | 'ai_suggestion_ready'
  | 'moderation_update'
  | 'generic_info';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationEnumType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date; 
  icon?: string;
  actorId?: string;
  actorName?: string;
  actorProfilePictureUrl?: string;
  teamIdForAction?: string;
  roleForAction?: TeamRole;
}

export type FeedbackType = "bug" | "feature_request" | "question" | "other";

export interface FeedbackSubmission {
  id?: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  type: FeedbackType;
  subject: string;
  description: string;
  createdAt: Date; 
  updatedAt?: Date; 
  status?: 'new' | 'seen' | 'in_progress' | 'resolved' | 'wont_fix';
  userAgent?: string;
  pageUrl?: string;
}


export type { SuggestedChartConfig };
