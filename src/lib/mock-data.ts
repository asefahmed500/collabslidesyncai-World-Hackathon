import type { Presentation, User, Team, Slide, SlideElement } from '@/types';

export const mockUser: User = {
  id: 'user-1',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  profilePictureUrl: 'https://placehold.co/100x100.png',
  teamId: 'team-1',
  role: 'owner',
  lastActive: new Date(),
  settings: {
    darkMode: false,
    aiFeatures: true,
    notifications: true,
  },
};

export const mockTeam: Team = {
  id: 'team-1',
  name: 'Innovate Solutions',
  ownerId: 'user-1',
  memberIds: ['user-1', 'user-2', 'user-3'],
  rules: {
    allowGuestEdits: true,
    aiAllowed: true,
    maxMembers: 10,
  },
  branding: {
    logoUrl: 'https://placehold.co/150x50.png?text=InnovateLogo',
    colors: ['#3F51B5', '#9C27B0', '#E8EAF6'],
    fonts: ['Space Grotesk', 'PT Sans'],
  },
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
};

const generateMockElements = (slideNum: number): SlideElement[] => [
  {
    id: `elem-${slideNum}-1`,
    type: 'text',
    content: `Title for Slide ${slideNum}`,
    position: { x: 50, y: 50 },
    size: { width: 700, height: 100 },
    style: { fontFamily: 'Space Grotesk', fontSize: '48px', color: '#333333' },
    zIndex: 1,
  },
  {
    id: `elem-${slideNum}-2`,
    type: 'text',
    content: 'This is some sample bullet point text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    position: { x: 50, y: 180 },
    size: { width: 700, height: 150 },
    style: { fontFamily: 'PT Sans', fontSize: '24px', color: '#555555' },
    zIndex: 1,
  },
  {
    id: `elem-${slideNum}-3`,
    type: 'image',
    content: `https://placehold.co/300x200.png?text=Image+${slideNum}`,
    position: { x: 450, y: 350 },
    size: { width: 300, height: 200 },
    style: {},
    zIndex: 2,
  },
];

const generateMockSlides = (presentationId: string, count: number): Slide[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${presentationId}-${i + 1}`,
    presentationId,
    slideNumber: i + 1,
    elements: generateMockElements(i + 1),
    speakerNotes: `Speaker notes for slide ${i + 1}.`,
    comments: [
      { id: `comment-${i+1}-1`, userId: 'user-2', userName: 'Jane Doe', text: 'Great point!', createdAt: new Date(), resolved: false, userAvatarUrl: 'https://placehold.co/40x40.png' },
    ],
    aiSuggestions: [],
    thumbnailUrl: `https://placehold.co/160x90.png?text=Slide${i+1}`,
    backgroundColor: '#FFFFFF',
  }));
};

export const mockPresentations: Presentation[] = [
  {
    id: 'pres-1',
    title: 'Quarterly Business Review',
    description: 'A review of Q1 performance and Q2 goals.',
    creatorId: 'user-1',
    teamId: 'team-1',
    access: { 'user-1': 'owner', 'user-2': 'editor' },
    settings: {
      isPublic: false,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: 'https://placehold.co/320x180.png?text=QBR',
    version: 3,
    lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    slides: generateMockSlides('pres-1', 5),
    collaborators: [mockUser, { ...mockUser, id: 'user-2', name: 'Jane Doe', profilePictureUrl: 'https://placehold.co/100x100.png'}]
  },
  {
    id: 'pres-2',
    title: 'New Product Launch Strategy',
    description: 'Marketing and sales strategy for the upcoming product.',
    creatorId: 'user-2',
    teamId: 'team-1',
    access: { 'user-1': 'viewer', 'user-2': 'owner' },
    settings: {
      isPublic: true,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: 'https://placehold.co/320x180.png?text=Launch',
    version: 1,
    lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    slides: generateMockSlides('pres-2', 8),
    collaborators: [{ ...mockUser, id: 'user-2', name: 'Jane Doe', profilePictureUrl: 'https://placehold.co/100x100.png'}]
  },
  {
    id: 'pres-3',
    title: 'Team Building Workshop Ideas',
    description: 'Brainstorming session for team activities.',
    creatorId: 'user-1',
    teamId: 'team-1',
    access: { 'user-1': 'owner' },
    settings: {
      isPublic: false,
      passwordProtected: true,
      password: 'secure',
      commentsAllowed: false,
    },
    thumbnailUrl: 'https://placehold.co/320x180.png?text=Workshop',
    version: 5,
    lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    slides: generateMockSlides('pres-3', 3),
    collaborators: [mockUser]
  },
];

export const getPresentationById = (id: string): Presentation | undefined => {
  return mockPresentations.find(p => p.id === id);
};

export const getSlideById = (presentationId: string, slideId: string): Slide | undefined => {
  const presentation = getPresentationById(presentationId);
  return presentation?.slides.find(s => s.id === slideId);
}
