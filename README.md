
# CollabDeck

CollabDeck is a powerful, collaborative presentation editor built with Next.js, React, Tailwind CSS, ShadCN UI components, Firebase, MongoDB, and Genkit for AI-powered assistance. It enables users to create, share, and present dynamic slideshows with ease, leveraging real-time collaboration and intelligent features.

## Core Technologies

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** ShadCN UI, Tailwind CSS
*   **Backend/Database:**
    *   **Firebase:** Authentication, Firestore (for presentation content, real-time collaboration, asset metadata, notifications, user feedback), Storage (for file uploads)
    *   **MongoDB (Mongoose):** User profiles, Team information, Team activity logs
*   **Generative AI:** Genkit (for AI flows like content generation, design suggestions, etc.)
*   **Payment Processing:** Stripe (for subscriptions)
*   **Deployment:** Firebase App Hosting (configured for basic Next.js export)

## How It Works

This section details the architecture and flow for key User and Admin features.

### User Features - How They Work

#### 1. Authentication & Account Management
*   **Authentication (Sign Up, Login, Social Login):**
    *   Firebase Authentication handles the core auth process (email/password, Google, GitHub).
    *   Next.js Server Actions (`src/app/(auth)/actions.ts`) interface with Firebase Auth SDK.
    *   Upon successful Firebase authentication:
        *   A user profile is created or retrieved in **MongoDB** via `mongoUserService.ts` (called by `getOrCreateAppUserFromMongoDB` server action). This profile stores user details like name, team associations, roles (within their team), and the `isAppAdmin` flag (defaulting to `false`).
        *   During email/password signup, a new team is also created in MongoDB for the user via `createTeamInMongoDB`, and they are set as the owner of that team.
    *   The `useAuth` hook (`src/hooks/useAuth.tsx`) provides client-side access to the current user's Firebase Auth state and their MongoDB profile. It includes a `refreshCurrentUser` function to sync client-side state with backend updates.
*   **Password Management (Forgot/Reset, Change):**
    *   Server Actions call Firebase Auth functions for sending reset emails or updating passwords.
    *   Password changes require re-authentication for security.
*   **Profile Updates (Display Name, Profile Picture):**
    *   Server Actions update the Firebase Auth profile and the corresponding user document in MongoDB.
*   **Account Deletion:**
    *   A Server Action handles this:
        *   Checks if the user is a team owner (prevents deletion if so, requiring team transfer/deletion first).
        *   Removes the user from their team in MongoDB.
        *   Deletes the user's profile from MongoDB.
        *   Deletes the user from Firebase Authentication.

#### 2. Dashboard & Presentation Management
*   **Data Source:** Presentation metadata (title, creator, team, last updated, etc.) is primarily fetched from **Firestore** (`presentations` collection).
*   **Dashboard Page (`src/app/dashboard/page.tsx`):**
    *   Fetches presentations relevant to the logged-in user (created by them, shared with them, or accessible via their team) using `firestoreService.getPresentationsForUser()`.
    *   If user is not in a team, displays options to create a team (using `createTeamForExistingUser` Server Action) or accept pending team invitations (using Server Action `getPendingInvitationsAction` to fetch, then `/api/teams/invitations/respond` API route to respond).
    *   Client-side filtering, sorting, and search are applied. View mode can be toggled between grid and list.
*   **Create Presentation:**
    *   Handled by `createPresentationAction` Server Action, which calls `firestoreService.originalCreatePresentation` and logs activity to Firestore and MongoDB.
*   **Duplicate, Delete, Favorite Presentation:**
    *   Handled by Server Actions (`duplicatePresentationAction`, `deletePresentationAction`, `toggleFavoriteStatusAction`) which call respective `firestoreService` functions (e.g., `originalDuplicatePresentation`) and log activity.
*   **User Analytics (Presentations Created, Slides Created):**
    *   Calculated client-side on the dashboard based on the fetched presentation data for the current user.

#### 3. Presentation Editor
*   **Core Data & Real-time Sync:** All slide content (elements, styles, positions, comments, speaker notes, background) is stored in **Firestore** within the specific presentation document.
    *   **Real-time updates:** The editor page (`src/app/editor/[id]/page.tsx`) establishes a real-time listener (`onSnapshot`) to the presentation document in Firestore. Changes made by any collaborator are reflected for all connected clients. Data from Firestore Timestamps is converted to JS Dates.
*   **Element Manipulation:**
    *   Adding, deleting, or modifying elements (text, images, shapes, charts, icons) triggers updates to the `slides` array within the presentation document in Firestore via functions in `firestoreService.ts` (e.g., `addElementToSlide`, `updateElementInSlide`).
*   **Slide Management:**
    *   Users can add (blank or from template), delete, duplicate, and reorder slides through the `SlideThumbnailList` component, which interacts with `firestoreService` functions.

#### 4. Real-Time Collaboration
*   **Presence:** Each active user in the editor updates their presence (name, cursor color, lastSeen) in the `activeCollaborators` map within the presentation document in Firestore. Handled by `firestoreService.updateUserPresence` and `removeUserPresence`.
*   **Live Cursors:** Mouse movements are throttled and sent to Firestore to update `cursorPosition`.
*   **Element Locking:** When a user selects an element, `firestoreService.acquireLock` attempts to set `lockedBy` and `lockTimestamp` on that element. Locks expire and are periodically checked/released by `releaseExpiredLocks`.

#### 5. Sharing & Publishing
*   **Share Dialog (`src/components/editor/ShareDialog.tsx`):**
    *   Uses `updatePresentationShareSettingsAction` Server Action to manage:
        *   **Public Access & Password Protection:** Modifies `settings.isPublic`, `settings.passwordProtected`, `settings.password` in the presentation document (Firestore).
        *   **Collaborator Invites:** Invites users by email. The system looks up the user in **MongoDB** (via `getUserByEmailFromMongoDB`). If found, their ID and role are added to the `access` map in the presentation document (Firestore). Notifications and emails are sent.
*   **Access Control (Editor & Presentation View):**
    *   Determined by: public status, password (if set), direct user access grants, team membership, and platform admin override. Presentations marked `taken_down` are inaccessible.
*   **Export Options:**
    *   **PDF:** Opens a print-friendly view `/present/[id]?print=true`.
    *   **PPTX:** Client-side generation using `PptxGenJS`.
    *   **Images (ZIP):** Client-side generation using `html2canvas` and `jszip` via `/present/[id]?exportAllImages=true`.
*   **Embed Code:** Provided for view-only embedding.

#### 6. Presentation Viewing Mode (`/present/[id]`)
*   **Data Source:** Fetches the presentation from Firestore, including real-time listener for live updates.
*   **Navigation & Display:** Client-side logic for slide transitions, speaker notes, and fullscreen mode.

#### 7. Team & Asset Management
*   **Team Creation & Management:**
    *   Teams are created in **MongoDB** during user signup or via the "Manage Team" page if the user has no team.
    *   The "Manage Team" page (`src/app/dashboard/manage-team/page.tsx`) uses **Server Actions** (`getTeamDataAction`, `getTeamActivitiesAction`) to fetch initial data, and **API Routes** (`/api/teams/...`) for updates:
        *   Update team name, branding, and settings (MongoDB - `mongoTeamService.updateTeamInMongoDB` via `PUT /api/teams/[teamId]`).
        *   Add/remove members, change roles (MongoDB - `mongoTeamService` functions via `POST /api/teams/[teamId]/members` and `PUT/DELETE /api/teams/[teamId]/members/[memberId]`).
*   **Team Asset Library:**
    *   Asset metadata (filename, URLs, uploader, teamId) stored in **Firestore** (`assets` collection).
    *   Actual asset files (images) uploaded to **Firebase Storage**.
    *   "Asset Library" page (`src/app/dashboard/assets/page.tsx`) fetches assets for the user's team from Firestore and uses Server Actions (`createAssetMetadataAction`, `deleteAssetAction`) for uploads/deletions.
*   **Team Activity Logs:**
    *   Team-related activities logged to `teamActivities` collection in **MongoDB**. Viewable on "Manage Team" page.

#### 8. Notifications & Communication
*   **In-App Notifications (`NotificationBell.tsx`):**
    *   Notifications (team invites, shares, role changes, comments) stored in **Firestore** (`notifications` collection).
    *   `NotificationBell` uses a real-time listener (`onSnapshot`) to fetch/display notifications. Users can mark all as read.
    *   Actionable team invite notifications use API route `/api/teams/invitations/respond`.
*   **Email Notifications (Placeholder):**
    *   Basic email sending via `src/lib/emailService.ts` (currently logs to console). Templates for invites, role changes.

#### 9. AI-Powered Assistance (Genkit)
*   **AI Flows (`src/ai/flows/...`):** Implemented as Genkit flows (server-side functions).
*   **Invocation:** Client-side `AIAssistantPanel.tsx` calls these flows.
*   **Functionality:** Design suggestions, smart tips, text improvement, content generation (rewrite, summarize, bullets), tone adjustment, speaker notes generation, icon generation (image), chart suggestions, background image generation.

#### 10. Support & Help
*   **Help Center Page (`/dashboard/help`):** FAQs, tutorial placeholders.
*   **Feedback/Bug Reporting:** `FeedbackDialog` submits to `feedbackSubmissions` collection in Firestore via `submitFeedbackAction` Server Action.
*   **AI Chatbot:** `AIChatbotWidget` uses `chatbotAssistantFlow` Genkit flow.

#### 11. Subscription Management (Stripe)
*   Users can upgrade to Premium plans (Monthly/Yearly) via `PricingCardClient`.
*   Checkout sessions handled by `/api/stripe/checkout-sessions`.
*   Users can manage their active subscriptions via Stripe Billing Portal, accessed through `/api/stripe/create-portal-link`.
*   Stripe webhooks (`/api/stripe/webhooks`) update user's premium status and subscription details in MongoDB.

### Admin Features - How They Work

Platform Admins (users with `isAppAdmin: true` in MongoDB) access `/admin`.

#### 1. Admin Dashboard Layout & Access Control
*   Layout `src/app/admin/layout.tsx` verifies `currentUser.isAppAdmin`.

#### 2. User Management (`/admin/users`)
*   **Data Source:** Fetches all users from **MongoDB** via `mongoUserService.getAllUsersFromMongoDB()`.
*   **Actions (Enable/Disable, Promote/Demote Admin, Reset Password, Delete):**
    *   Performed via **API Routes** (`/api/admin/users/[userId]/...`).
    *   APIs verify `actorUserId` is a platform admin.
    *   Call `mongoUserService.ts` for MongoDB updates and Firebase Admin SDK (`src/lib/firebaseAdmin.ts`) for Firebase Auth changes (disable, delete user, generate reset link).

#### 3. Team Oversight (`/admin/teams`)
*   **Data Source:** Fetches all teams from **MongoDB** via `mongoTeamService.getAllTeamsFromMongoDB()`.
*   **Delete Team:**
    *   Performed via `DELETE /api/admin/teams/[teamId]`.
    *   Verifies admin status. Calls `mongoTeamService.deleteTeamFromMongoDB` (updates members in MongoDB) and `firestoreService.removeTeamIdFromPresentations` (clears `teamId` in Firestore).

#### 4. Presentation Oversight (`/admin/presentations`)
*   **Data Source:** Fetches all presentations from **Firestore** via `firestoreService.getAllPresentationsForAdmin()`.
*   **Actions (Soft Delete, Restore, Permanent Delete, Change Moderation Status):**
    *   Via **API Routes** (`/api/admin/presentations/[presentationId]/...`).
    *   Verify admin status. Call `firestoreService.ts` functions.

#### 5. Content Moderation Queue (`/admin/moderation`)
*   **Review Queue:** Displays presentations from Firestore with `moderationStatus: 'under_review'`.
*   **Actions:** Approve or take down presentations via API route, updating `moderationStatus` and `moderationNotes`.

#### 6. User Feedback Management (`/admin/feedback`)
*   **View Submissions:** Displays feedback from `feedbackSubmissions` collection in Firestore via `getFeedbackSubmissions`.
*   **Manage Status:** Admins update feedback item status via `updateFeedbackStatus`.

#### 7. System Management (Billing, Security, Stats, Global Activity, Platform Settings)
*   These are primarily placeholder pages in `/admin/...` (e.g., `/admin/billing`).
*   **Stripe Billing:** `package.json` includes Stripe SDKs. API routes `/api/stripe/checkout-sessions`, `/api/stripe/create-portal-link`, and `/api/stripe/webhooks` are set up for subscription management. Webhooks update user premium status in MongoDB.

## Getting Started

1.  **Prerequisites:**
    *   Node.js (version specified in `.nvmrc` or latest LTS)
    *   npm or yarn
    *   Firebase Project: Authentication, Firestore, Storage enabled.
    *   MongoDB Instance: MongoDB Atlas cluster or local instance.
    *   Google Cloud Project: For Genkit AI features, Vertex AI API enabled.
    *   Stripe Account: For payment processing, with products and prices configured.

2.  **Environment Variables:**
    *   Copy `.env.example` to `.env.local` or `.env`. **It is highly recommended to use `.env.local` which is gitignored and overrides `.env`.**
    *   Fill in:
        *   Firebase config (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`) - Get from Firebase Console > Project Settings > Your Apps > Web App.
        *   `MONGODB_URI` - Your MongoDB connection string.
        *   `GEMINI_API_KEY` (or `GOOGLE_API_KEY` if you named it that) - For Genkit/Google AI models from Google AI Studio or Google Cloud Console.
        *   `STRIPE_SECRET_KEY` - From Stripe Dashboard > Developers > API keys.
        *   `STRIPE_WEBHOOK_SECRET` - Generated when you create a webhook endpoint in Stripe Dashboard > Developers > Webhooks.
        *   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard > Developers > API keys.
        *   Stripe Price IDs for your subscription plans (e.g., `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID`) - Get these after creating products and prices in your Stripe Dashboard.
        *   `NEXT_PUBLIC_APP_URL` (e.g., `http://localhost:9002` for dev, or your deployed app URL).
    *   **Crucial for Admin Features:** Ensure `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set to the path of your Firebase service account key JSON file. This is required for Firebase Admin SDK functionality (e.g., in admin user management). Download this file from Firebase Console > Project Settings > Service accounts.

3.  **Installation:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Firestore Setup (if starting fresh):**
    *   Deploy Firestore security rules (`firestore.rules`).
    *   Deploy Firestore indexes (`firestore.indexes.json`) using the Firebase CLI: `firebase deploy --only firestore:indexes`. Alternatively, create them manually in the Firebase Console as prompted by errors. The `notifications`, `presentationActivities`, `assets`, and `feedbackSubmissions` indexes are pre-defined.

5.  **Running the Development Server:**
    *   For Next.js app:
        ```bash
        npm run dev
        # or
        yarn dev
        ```
    *   For Genkit AI flows (in a separate terminal):
        ```bash
        npm run genkit:watch
        # or
        yarn genkit:watch
        ```
    Open your configured port for Next.js (e.g., `http://localhost:9002`). Genkit UI is often at `http://localhost:4000`.

6.  **MongoDB Database Drop (Use with Caution):**
    *   Ensure `tsx` is installed (`npm install -D tsx`).
    *   Run: `npm run db:drop`
    *   This script will prompt you to confirm the database name derived from your `MONGODB_URI`.
    *   **Warning:** This permanently deletes all data in the specified database.

7.  **Building for Production:**
    ```bash
    npm run build
    # or
    yarn build
    ```

This README provides a detailed overview of CollabDeck.
