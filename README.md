
# CollabSlideSyncAI

CollabSlideSyncAI is a powerful, collaborative presentation editor built with Next.js, React, Tailwind CSS, ShadCN UI components, Firebase, MongoDB, and Genkit for AI-powered assistance. It enables users to create, share, and present dynamic slideshows with ease, leveraging real-time collaboration and intelligent features.

## Core Technologies

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** ShadCN UI, Tailwind CSS
*   **Backend/Database:**
    *   **Firebase:** Authentication, Firestore (for presentation content, real-time collaboration, assets, notifications), Storage (for file uploads)
    *   **MongoDB (Mongoose):** User profiles, Team information, Team activity logs
*   **Generative AI:** Genkit (for AI flows like content generation, design suggestions, etc.)
*   **Deployment:** Firebase App Hosting (configured)

## How It Works

This section details the architecture and flow for key User and Admin features.

### User Features - How They Work

#### 1. Account & Profile Management
*   **Authentication (Sign Up, Login, Social Login):**
    *   Firebase Authentication handles the core auth process (email/password, Google).
    *   Next.js Server Actions (`src/app/(auth)/actions.ts`) interface with Firebase Auth SDK.
    *   Upon successful Firebase authentication:
        *   A user profile is created or retrieved in **MongoDB** via `mongoUserService.ts`. This profile stores user details like name, team associations, roles (within their team), and the `isAppAdmin` flag.
        *   During email/password signup, a new team is also created in MongoDB for the user, and they are set as the owner.
    *   The `useAuth` hook (`src/hooks/useAuth.tsx`) provides client-side access to the current user's Firebase Auth state and their MongoDB profile.
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
    *   Client-side filtering and sorting are applied to the fetched data.
*   **Create Presentation:**
    *   A button click triggers `firestoreService.createPresentation()`, which adds a new presentation document to Firestore with an initial slide. The creator is automatically set as the owner.
*   **User Analytics (Presentations Created, Slides Created):**
    *   Calculated client-side on the dashboard based on the fetched presentation data for the current user.

#### 3. Presentation Editor
*   **Core Data & Real-time Sync:** All slide content (elements, styles, positions, comments, speaker notes) is stored in **Firestore** within the specific presentation document.
    *   **Real-time updates:** The editor page (`src/app/editor/[id]/page.tsx`) establishes a real-time listener (using `onSnapshot`) to the presentation document in Firestore. Any changes made by any collaborator are pushed to all connected clients.
*   **Element Manipulation:**
    *   Adding, deleting, or modifying elements (text, images, shapes) triggers updates to the `slides` array within the presentation document in Firestore via functions in `firestoreService.ts` (e.g., `addElementToSlide`, `updateElementInSlide`).
*   **Real-Time Collaboration:**
    *   **Presence:** Each active user in the editor updates their presence (name, cursor color) in the `activeCollaborators` map within the presentation document in Firestore. This is handled by `firestoreService.updateUserPresence` and `removeUserPresence`.
    *   **Live Cursors:** Mouse movements are throttled and sent to Firestore to update the `cursorPosition` for the user in the `activeCollaborators` map. Other clients read this to display cursors.
    *   **Element Locking:** When a user selects an element, `firestoreService.acquireLock` attempts to set `lockedBy` (user ID) and `lockTimestamp` on that element in Firestore. Other users see the lock. Locks expire and are periodically checked/released by `releaseExpiredLocks`.
*   **Comments:** Added to a `comments` array on the specific slide object within Firestore.

#### 4. Sharing & Publishing
*   **Share Dialog (`src/components/editor/ShareDialog.tsx`):**
    *   Allows users to manage:
        *   **Public Access & Password Protection:** Modifies `settings.isPublic` and `settings.passwordProtected` (and `settings.password`) in the presentation document (Firestore).
        *   **Collaborator Invites:** Invites users by email. The system looks up the user in **MongoDB** (via `firestoreService.getUserByEmail`, which calls `mongoUserService`). If found, their ID and role are added to the `access` map in the presentation document (Firestore).
*   **Access Control (Editor & Presentation View):**
    *   When accessing `/editor/[id]` or `/present/[id]`, the system checks:
        *   If the presentation is public (and if password-protected, prompts for password if not verified in session).
        *   If the user is the creator.
        *   If the user is listed in the `access` map.
        *   If the presentation belongs to the user's team.
        *   Platform Admins have override access (unless content is taken down).
*   **Embed/Export:** Placeholders in the UI. Full implementation would require server-side rendering/conversion (e.g., using Puppeteer for PDF, or specific libraries for PPTX).

#### 5. Presentation Viewing Mode (`/present/[id]`)
*   **Data Source:** Fetches the presentation from Firestore, including a real-time listener for live updates if collaborators are editing.
*   **Navigation & Display:** Client-side logic handles slide transitions and rendering. Speaker notes are displayed from the slide data.

#### 6. Team & Asset Management
*   **Team Creation & Management:**
    *   Teams are created in **MongoDB** during user signup or via a dedicated interface (if built).
    *   The "Manage Team" page (`src/app/dashboard/manage-team/page.tsx`) uses **API Routes** (`/api/teams/...`) to:
        *   Update team name, branding (MongoDB - `mongoTeamService.updateTeamInMongoDB`).
        *   Add/remove members, change roles (MongoDB - `mongoTeamService.addMemberToTeamInMongoDB`, etc.).
*   **Team Asset Library:**
    *   Asset metadata (filename, URLs, uploader, teamId) is stored in **Firestore** (`assets` collection).
    *   Actual asset files are uploaded to **Firebase Storage**.
    *   The "Asset Library" page (`src/app/dashboard/assets/page.tsx`) fetches assets for the user's team from Firestore and allows uploads/deletions. Deletion also removes the file from Firebase Storage.

#### 7. Notifications & Communication
*   **In-App Notifications:**
    *   Notifications are stored in a `notifications` collection in **Firestore**.
    *   When an event occurs (e.g., team invite, presentation shared, new comment), a server action or API route calls `firestoreService.createNotification` to add a document for the recipient.
    *   The `NotificationBell` component in the `SiteHeader` uses a real-time listener (`onSnapshot`) to fetch and display notifications for the current user.
*   **Email Notifications:** Stubbed out. Would typically involve a backend service (e.g., Firebase Functions) triggered by Firestore events or called from API routes, integrated with an email provider (SendGrid, Resend, etc.).

#### 8. AI-Powered Assistance (Genkit)
*   **AI Flows (`src/ai/flows/...`):** Implemented as Genkit flows. These are server-side functions.
*   **Invocation:** The client-side AI Assistant Panel (`src/components/editor/AIAssistantPanel.tsx`) makes calls to these Genkit flows (likely via Next.js API routes that wrap the Genkit calls or directly if Genkit's Next.js plugin is used effectively).
*   **Functionality:** Genkit interacts with LLMs (e.g., Gemini via Vertex AI) to provide design suggestions, text improvements, content generation, etc., based on the input provided from the editor.

#### 9. Support & Help
*   **Help Center Page:** Static content page with FAQs.
*   **Feedback/Bug Reporting:** A dialog collects user input. Currently, it logs to console; a real system would send this to a backend or ticketing service.
*   **AI Chatbot:** Placeholder UI; a functional version would require a Genkit flow and an LLM backend.

### Admin Features - How They Work

Platform Admins (users with `isAppAdmin: true` in their MongoDB profile) have access to a separate `/admin` dashboard.

#### 1. Admin Dashboard Layout & Access Control
*   The layout `src/app/admin/layout.tsx` acts as a gatekeeper. It checks `currentUser.isAppAdmin` from the `useAuth` hook. If false, the user is redirected or shown an access denied message.

#### 2. User Management (`/admin/users`)
*   **Data Source:** Fetches all user documents directly from **MongoDB** using `mongoUserService.getAllUsersFromMongoDB()`.
*   **Actions (Enable/Disable, Promote/Demote, Reset Password, Delete):**
    *   Performed via **API Routes** (`/api/admin/users/[userId]/...`).
    *   These API routes first verify the `actorUserId` (passed as a query param or in the body) is indeed a platform admin by checking their MongoDB profile.
    *   Then, they call functions in `mongoUserService.ts` to modify user data in MongoDB.
    *   Firebase Auth modifications (like actual password reset or disabling Firebase Auth user) are noted as placeholders requiring Firebase Admin SDK.

#### 3. Team Oversight (`/admin/teams`)
*   **Data Source:** Fetches all team documents directly from **MongoDB** using `mongoTeamService.getAllTeamsFromMongoDB()`.
*   **Delete Team:**
    *   Performed via the API Route `DELETE /api/admin/teams/[teamId]`.
    *   Verifies admin status of the caller.
    *   Calls `mongoTeamService.deleteTeamFromMongoDB` which:
        *   Removes the team document from MongoDB.
        *   Updates all member user documents in MongoDB to remove `teamId` and set their role to 'guest'.
        *   Logs team activities.
    *   Calls `firestoreService.removeTeamIdFromPresentations` to clear the `teamId` field from any presentations in Firestore that were associated with the deleted team.

#### 4. Presentation Oversight (`/admin/presentations`)
*   **Data Source:** Fetches all presentation documents from **Firestore** using `firestoreService.getAllPresentationsForAdmin()`. This function can fetch active or soft-deleted presentations.
*   **Actions (Soft Delete, Restore, Permanent Delete, Change Moderation Status):**
    *   Performed via **API Routes** (`/api/admin/presentations/[presentationId]/...`).
    *   These API routes verify the admin status of the caller.
    *   They call functions in `firestoreService.ts` (e.g., `softDeletePresentationInFirestore`, `restorePresentationInFirestore`, `updatePresentationModerationStatus`) to modify the presentation document in Firestore.
    *   Activity logging is done via `logPresentationActivity` and `logTeamActivityInMongoDB` (if applicable).

#### 5. Content Moderation (`/admin/moderation`)
*   **Manual Moderation:** Platform Admins use the "All Presentations" page to change a presentation's `moderationStatus` (active, under_review, taken_down) via the `/api/admin/presentations/[presentationId]/status` API route.
*   **Content Access:** Presentations marked `taken_down` are not accessible to regular users in the editor or presentation view mode (logic in `src/app/editor/[id]/page.tsx` and `src/app/present/[id]/page.tsx`).
*   **Automated Scanning/Review Queue:** Placeholder page; full implementation would involve AI services and a more complex backend.

#### 6. System Management (Billing, Security Logs, Stats, Global Activity)
*   These are primarily placeholder pages in the admin dashboard.
*   A full **Billing** system would require deep Stripe integration, webhook handling, and MongoDB schemas for subscriptions, plans, etc.
*   **Security Logs, Usage Statistics, and Global Activity** would require dedicated logging and data aggregation pipelines, likely involving both Firebase and MongoDB data, and potentially specialized analytics services.

This detailed breakdown should clarify how the different parts of the application interact to deliver the user and admin features. The combination of Next.js (frontend and API routes), MongoDB (user/team data), and Firebase (auth, real-time presentation data, storage, notifications) creates a powerful and scalable architecture.

## User Features
*Defined above in "How It Works"*

## Admin Features (Platform Level - `isAppAdmin`)
*Defined above in "How It Works"*

## Getting Started

1.  **Prerequisites:**
    *   Node.js (version specified in `.nvmrc` or latest LTS)
    *   npm or yarn
    *   Firebase Project: Set up a Firebase project with Authentication, Firestore, and Storage enabled.
    *   MongoDB Instance: Set up a MongoDB Atlas cluster or a local instance.
    *   Google Cloud Project: For Genkit AI features, ensure you have a Google Cloud project with the Vertex AI API enabled.

2.  **Environment Variables:**
    *   Copy `.env.example` to a new file named `.env` (or `.env.local`).
    *   Fill in your Firebase project configuration details (API Key, Auth Domain, Project ID, etc.).
    *   Add your `MONGODB_URI`.
    *   Add your `GOOGLE_API_KEY` for Genkit if using Google AI models.

3.  **Installation:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Firestore Setup (if starting fresh):**
    *   Ensure your Firestore security rules (`firestore.rules`) are deployed. A basic set of rules is provided.
    *   No specific indexes (`firestore.indexes.json`) are strictly required for initial setup beyond default Firestore behavior, but you may add them for query optimization as your app scales.

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
    Open [http://localhost:9002](http://localhost:9002) (or your configured port) to view the Next.js app.
    The Genkit UI will typically be available at [http://localhost:4000](http://localhost:4000).

6.  **Building for Production:**
    ```bash
    npm run build
    # or
    yarn build
    ```

## Important Notes for Firebase Studio Environment

*   **Firebase Configuration:** Ensure `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc., are correctly set in the environment configuration for the Firebase Studio.
*   **MongoDB URI:** The `MONGODB_URI` must also be configured in the environment where the Next.js backend runs.
*   **Genkit:** If AI features are used, the necessary Google Cloud credentials/API keys for Genkit must be available in the runtime environment.

This README provides a detailed overview of CollabSlideSyncAI's features and setup.
```# collabslidesyncai-World-Hackathon
