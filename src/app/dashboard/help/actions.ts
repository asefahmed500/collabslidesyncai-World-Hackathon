
"use server";

import { auth, db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FeedbackSubmission, FeedbackType } from '@/types';

interface FeedbackActionResponse {
  success: boolean;
  message: string;
}

export async function submitFeedbackAction(
  prevState: any,
  formData: FormData
): Promise<FeedbackActionResponse> {
  const firebaseUser = auth.currentUser;

  const type = formData.get('type') as FeedbackType | null;
  const subject = formData.get('subject') as string | null;
  const description = formData.get('description') as string | null;
  const email = formData.get('email') as string | null; // Email from form

  if (!type || !subject || !description) {
    return { success: false, message: 'Type, subject, and description are required.' };
  }

  if (subject.length < 5 || subject.length > 100) {
    return { success: false, message: 'Subject must be between 5 and 100 characters.' };
  }
  if (description.length < 20 || description.length > 2000) {
    return { success: false, message: 'Description must be between 20 and 2000 characters.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address or leave it blank.' };
  }


  const feedbackData: Omit<FeedbackSubmission, 'id' | 'createdAt'> = {
    type,
    subject,
    description,
    userId: firebaseUser?.uid || null,
    userEmail: email || firebaseUser?.email || null, // Prefer form email, fallback to logged-in user's email
    userName: firebaseUser?.displayName || null,
    createdAt: serverTimestamp() as Timestamp,
    status: 'new',
    // pageUrl: formData.get('pageUrl') as string || undefined, // If you add this to your form
    // userAgent: formData.get('userAgent') as string || undefined, // If you add this
  };

  try {
    await addDoc(collection(db, 'feedbackSubmissions'), feedbackData);
    return { success: true, message: 'Feedback submitted successfully! Thank you.' };
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return { success: false, message: error.message || 'Failed to submit feedback. Please try again.' };
  }
}

    