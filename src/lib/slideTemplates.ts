
import type { SlideElement } from '@/types';

// Note: IDs for elements will be generated when the slide is actually created.
// lockedBy and lockTimestamp should always be null for new template elements.

export interface SlideTemplate {
  key: string;
  name: string;
  description: string;
  previewImageUrl?: string; // Optional: for a visual preview
  elements: Omit<SlideElement, 'id' | 'lockedBy' | 'lockTimestamp'>[];
}

export const slideTemplates: SlideTemplate[] = [
  {
    key: 'blank',
    name: 'Blank Slide',
    description: 'A completely empty slide to start fresh.',
    previewImageUrl: 'https://placehold.co/160x90.png?text=Blank',
    elements: [],
  },
  {
    key: 'title-slide',
    name: 'Title Slide',
    description: 'A slide with a main title and a subtitle.',
    previewImageUrl: 'https://placehold.co/160x90.png?text=Title+Slide',
    elements: [
      {
        type: 'text', content: 'Click to add Title',
        position: { x: 50, y: 150 }, size: { width: 860, height: 100 },
        style: { fontFamily: 'Space Grotesk', fontSize: '60px', color: '#333333', textAlign: 'center', fontWeight: 'bold', opacity: 1 },
        zIndex: 1, rotation: 0,
      },
      {
        type: 'text', content: 'Subtitle or author name',
        position: { x: 50, y: 260 }, size: { width: 860, height: 50 },
        style: { fontFamily: 'PT Sans', fontSize: '24px', color: '#555555', textAlign: 'center', opacity: 1 },
        zIndex: 2, rotation: 0,
      },
    ],
  },
  {
    key: 'title-and-content',
    name: 'Title and Content',
    description: 'A title at the top and a content area below.',
    previewImageUrl: 'https://placehold.co/160x90.png?text=Title+%26+Content',
    elements: [
      {
        type: 'text', content: 'Main Title',
        position: { x: 40, y: 30 }, size: { width: 880, height: 60 },
        style: { fontFamily: 'Space Grotesk', fontSize: '40px', color: '#333333', fontWeight: 'bold', opacity: 1 },
        zIndex: 1, rotation: 0,
      },
      {
        type: 'text', content: '• Bullet point 1\n• Bullet point 2\n• Bullet point 3',
        position: { x: 40, y: 110 }, size: { width: 880, height: 390 },
        style: { fontFamily: 'PT Sans', fontSize: '22px', color: '#444444', textAlign: 'left', opacity: 1 },
        zIndex: 2, rotation: 0,
      },
    ],
  },
  {
    key: 'section-header',
    name: 'Section Header',
    description: 'A slide to introduce a new section, typically with a large title.',
    previewImageUrl: 'https://placehold.co/160x90.png?text=Section+Header',
    elements: [
      {
        type: 'text', content: 'SECTION TITLE',
        position: { x: 50, y: 200 }, size: { width: 860, height: 80 },
        style: { fontFamily: 'Space Grotesk', fontSize: '52px', color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#3F51B5', opacity: 1 },
        zIndex: 1, rotation: 0,
      },
       {
        type: 'text', content: 'Optional brief description',
        position: { x: 50, y: 290 }, size: { width: 860, height: 40 },
        style: { fontFamily: 'PT Sans', fontSize: '20px', color: '#777777', textAlign: 'center', opacity: 1 },
        zIndex: 2, rotation: 0,
      },
    ],
  },
  {
    key: 'two-column-text',
    name: 'Two Column Text',
    description: 'Two columns of text content, ideal for comparisons or lists.',
    previewImageUrl: 'https://placehold.co/160x90.png?text=Two+Columns',
    elements: [
      {
        type: 'text', content: 'Column 1 Title',
        position: { x: 40, y: 30 }, size: { width: 430, height: 40 },
        style: { fontFamily: 'Space Grotesk', fontSize: '28px', color: '#333333', fontWeight: 'bold', opacity: 1 },
        zIndex: 1, rotation: 0,
      },
      {
        type: 'text', content: 'Content for the first column goes here. You can add bullet points or paragraphs.',
        position: { x: 40, y: 80 }, size: { width: 430, height: 420 },
        style: { fontFamily: 'PT Sans', fontSize: '18px', color: '#444444', textAlign: 'left', opacity: 1 },
        zIndex: 2, rotation: 0,
      },
      {
        type: 'text', content: 'Column 2 Title',
        position: { x: 490, y: 30 }, size: { width: 430, height: 40 },
        style: { fontFamily: 'Space Grotesk', fontSize: '28px', color: '#333333', fontWeight: 'bold', opacity: 1 },
        zIndex: 3, rotation: 0,
      },
      {
        type: 'text', content: 'Content for the second column goes here. This layout is great for side-by-side information.',
        position: { x: 490, y: 80 }, size: { width: 430, height: 420 },
        style: { fontFamily: 'PT Sans', fontSize: '18px', color: '#444444', textAlign: 'left', opacity: 1 },
        zIndex: 4, rotation: 0,
      },
    ],
  },
];
