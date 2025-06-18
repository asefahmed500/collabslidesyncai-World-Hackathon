
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

## User Features

### Account & Profile
*   **Authentication:** Secure sign-up, login (email/password), Google social login.
*   **Password Management:** Forgot password and password reset functionality.
*   **Profile Management:** Update display name, profile picture URL, and change account password.
*   **Account Deletion:** Users can delete their own accounts (with safeguards for team owners).

### Dashboard & Presentation Management
*   **Personal Dashboard:** Overview of recent presentations and quick access to features.
*   **User Analytics:** View personal stats like presentations created and total slides.
*   **Create Presentations:** Easily start new presentations from the dashboard.
*   **View & Organize:** List, search, filter, and sort presentations (by last updated, title, creation date).
*   **Presentation Cards:** Visual previews and quick actions for each presentation.

### Presentation Editor
*   **Intuitive WYSIWYG Editor:** Modern interface for slide creation and editing.
*   **Slide Management:** Add, delete, duplicate, and reorder slides.
*   **Element Manipulation:**
    *   Add and style text, images, and shapes (rectangles, circles).
    *   (Placeholders for charts and icons).
    *   Rich styling options: font family, size, color, alignment, fill/background color, border, opacity, rotation, stacking order (z-index).
*   **Slide Background:** Customize slide background colors.

### Real-Time Collaboration
*   **Simultaneous Editing:** Multiple users can work on the same presentation concurrently (element-level locking prevents direct conflicts on the same element).
*   **Live Cursors:** See where other collaborators are pointing on the current slide.
*   **Presence Indicators:** View active collaborators in the editor.
*   **Element Locking:** Elements being edited by one user are temporarily locked, preventing others from modifying them simultaneously.
*   **In-Slide Comments:** Add, view, and resolve comments directly on slides for contextual feedback.

### Sharing & Publishing
*   **Share Dialog:** Centralized modal for managing presentation access.
*   **Public Sharing:** Generate a view-only link for public access.
*   **Password Protection:** Secure public links with a password.
*   **Collaborator Invites:** Invite users by email with "editor" or "viewer" roles.
*   **Manage Access:** View and modify collaborator roles or remove access.
*   **Embed Presentations:** Generate iframe code to embed presentations on websites (view-only).
*   **(Placeholders for Export):** PDF, PPT, and Image export options are planned.

### Presentation Viewing Mode (`/present/[id]`)
*   **Focused View:** Dedicated mode for presenting slides.
*   **Fullscreen Support:** Utilize browser fullscreen capabilities.
*   **Navigation:**
    *   Keyboard controls (Arrow keys, Spacebar).
    *   Click-to-navigate (left/right screen areas).
    *   On-screen navigation buttons.
*   **Speaker Notes:** View presenter notes for the current slide.
*   **Real-time Updates:** Viewers see live content changes if collaborators are editing.

### Team & Asset Management
*   **Team Creation:** Users create a team upon initial signup.
*   **Team Management Dashboard (for Team Owners/Admins):**
    *   Update team name, logo, branding colors, and fonts.
    *   Manage team members: add new members by email, change roles (editor, viewer, admin), remove members.
    *   View a log of team activities.
*   **Team Asset Library:**
    *   Upload images to a shared team library.
    *   View, search, and manage uploaded assets.
    *   Delete assets from the library and storage.

### Notifications & Communication
*   **In-App Notification Center:** Real-time alerts via a bell icon in the site header.
    *   Notifications for team invitations, presentation shares, and new comments on owned/collaborated presentations.
    *   Unread notification count and "Mark all as read" functionality.
*   **(Email Notification Stubs):** Backend logic includes points for future email notification integration.

### AI-Powered Assistance (Genkit)
*   **Design Suggestions:** Get AI-powered layout and color scheme ideas for slides.
*   **Smart Tips:** Receive overall presentation improvement suggestions.
*   **Text Improvement:** Enhance text for clarity, grammar, professionalism, or conciseness.
*   **Content Generation:** Rewrite content, summarize, or generate bullet points from text or a topic.
*   **Tone Adjustment:** Modify text to be formal, casual, enthusiastic, or neutral.
*   **Speaker Notes Generation:** Automatically create speaker notes for slides.
*   **Icon Generation:** Generate simple icons from text descriptions.
*   **Chart Suggestions:** Get recommendations for chart types based on data descriptions.

### Support & Help
*   **In-App Help Center Page:** Access FAQs and support options.
*   **Feedback/Bug Reporting:** Submit feedback or bug reports via a dialog.
*   **(Placeholders):** Sections for Tutorials, Live Chat, and a more interactive AI Chatbot Assistant are included for future development.

## Admin Features (Platform Level - `isAppAdmin`)

### Dedicated Admin Dashboard (`/admin`)
*   Separate interface for platform administrators.

### User Management
*   **View All Users:** List all registered users with search and filtering.
*   **User Profiles:** Inspect individual user details (email, team, role, activity).
*   **Account Control:**
    *   Enable or disable user accounts.
    *   (Placeholder for triggering user password resets).
*   **Role Management:**
    *   Promote regular users to Platform Admin status.
    *   Demote Platform Admins to regular users.
*   **Delete User Accounts:** Permanently remove user accounts from the system (with checks for team ownership).

### Team Oversight
*   **View All Teams:** List all teams created on the platform with search.
*   **Delete Teams:** Platform Admins can delete any team. This action also disassociates members and updates presentation team links.

### Presentation Oversight
*   **View All Presentations:** Access and manage every presentation on the platform.
*   **Search & Filter:** Basic filtering by Owner ID and Team ID.
*   **Direct Access:** View, edit (opens in editor), or delete any presentation.
*   **Soft Delete Management:**
    *   Soft delete presentations (marks as deleted, hides from users).
    *   View soft-deleted presentations.
    *   Restore soft-deleted presentations.
    *   Permanently delete presentations.

### Content Moderation
*   **Manual Moderation:** Platform Admins can change a presentation's moderation status (`active`, `under_review`, `taken_down`).
*   **Content Takedown:** "Taken down" presentations are inaccessible to regular users.
*   **(Placeholder Moderation Dashboard):** Outlines future features like automated content scanning and review queues.

### System Management (Placeholders)
*   **Billing & Subscriptions:** Placeholder page for future Stripe integration to manage plans, payments, and subscriptions.
*   **Security Logs:** Placeholder for viewing system-wide security events.
*   **Usage Statistics:** Placeholder for platform-level analytics.
*   **Global Activity Feed:** Placeholder for viewing significant system-wide events.

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
