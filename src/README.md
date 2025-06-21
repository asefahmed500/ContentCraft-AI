
# ContentCraft AI 🚀

ContentCraft AI is a revolutionary multi-agent content creation system designed to streamline and enhance your content strategy. Leveraging the power of AI, multiple specialized agents collaborate, debate, and generate compelling multi-format content campaigns tailored to your brand and objectives. 

**Project Update**: The dedicated user dashboard and settings pages previously under `src/app/(app)/` have been removed to resolve critical build errors. The application is now primarily admin-centric. User-facing features are accessed through the admin dashboard (for admins) or direct API interactions (conceptually for non-admin editors). User profile (name/password) changes are supported via API endpoints.

## ✨ Key Features

### Core AI & Content Features (Accessed via Admin Dashboard or APIs)
*   **User Authentication & Role Management**: Secure login via Google or email/password using NextAuth.js. Supports 'viewer', 'editor', and 'admin' roles. Role-based access control for features and APIs.
*   **Campaign Management**: Admins can create, view, edit, and delete content campaigns. Editors can conceptually manage campaigns via API. Campaign status tracks progress.
*   **Creative Brief Input**: Admins define campaign goals, target audience, tone, and product/service descriptions.
*   **Brand DNA Analysis**: Admins can initiate AI analysis of brand content (text files/PDFs via data URI) to extract voice, style, values, and visual cues using Genkit and Gemini.
*   **Simulated Creative War Room**: Admins can view raw data of simulated AI agent debates from campaign details.
*   **Multi-Format Content Generation**: AI generates diverse content pieces from a refined brief (e.g., blog posts, tweets, etc.) using Genkit.
*   **Content Evolution Tracking**: Admins can view raw data of content versions within a campaign.
*   **Performance Predictor (Simulated)**: AI-driven estimations for content performance (mocked API, raw data viewable in admin campaign detail).
*   **User Feedback Loop**: API exists for 👍/👎 ratings and comments on generated content (`POST /api/feedback`). Awards XP for engagement.
*   **Content Translation**: AI translates generated content into multiple languages.
*   **Private Mode**: Mark campaigns as private (boolean flag in campaign data).
*   **Gamification System**: Earn Creative XP for actions like providing feedback. Level up, track progress. XP and level displayed in site header for logged-in users and on Admin XP Leaderboard.
*   **User Profile Settings (API-only for users)**:
    *   APIs exist for updating account name (`PUT /api/user/profile`) and changing password (`POST /api/user/change-password`) for credential-based accounts.
    *   The UI for users to access these settings has been removed.

### Admin Features
*   **Comprehensive Admin Dashboard**: Centralized control panel at `/admin/dashboard` for platform oversight. Includes:
    *   Summary statistics (total users, campaigns, mocked activity).
    *   Charts for platform activity (mocked).
    *   XP Leaderboard (Top 10 users by XP).
    *   Navigation to User Management, Campaign Oversight, Flagged Content, and Data Export tabs.
*   **User Management**:
    *   View a sortable and searchable table of all users.
    *   Manage user roles (viewer, editor, admin). Admins cannot demote or ban themselves via this panel.
    *   Ban/unban users (enforced by middleware and login checks).
*   **Campaign Oversight**:
    *   View, search, and filter all campaigns created by any user.
    *   Inspect full campaign details (brief, raw agent debates, raw content versions in a simplified view).
    *   Flag/unflag entire campaigns and add moderation notes.
    *   Delete any campaign.
*   **Content Version Moderation**:
    *   Dedicated "Flagged Content" tab listing all `ContentVersion`s where `isFlagged` is true across the platform.
    *   Admins can preview flagged content, see moderation notes, and unflag versions (which also clears notes for that version).
*   **Platform Analytics (Admin View)**:
    *   Total users, total campaigns (from DB).
    *   (Mocked) Weekly platform activity (users, campaigns, AI flows).
    *   (Mocked) Top content formats generated (pie chart).
    *   XP Leaderboard showing top users by Creative XP.
*   **Secure Admin Routes & APIs**: Admin-specific routes and APIs are protected by authentication and role checks.
*   **Data Export (Conceptual)**: Placeholder buttons for admins to simulate downloading campaign, feedback, or user data as CSV.

## 🛠 Tech Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI**: ShadCN UI Components, Tailwind CSS
*   **State Management**: React Context, `useState`, `useEffect`, NextAuth.js session
*   **AI Integration**: Genkit, Google Gemini (via `@genkit-ai/googleai`)
*   **Authentication**: NextAuth.js (with JWT sessions and MongoDB adapter)
*   **Database**: MongoDB (via `mongodb` driver and `clientPromise`)
*   **Charting**: Recharts (for admin analytics)
*   **Styling**: Tailwind CSS, PostCSS
*   **Deployment**: Firebase App Hosting (configured via `apphosting.yaml`)

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   MongoDB instance (local or cloud-hosted like MongoDB Atlas)
*   Google Cloud Project with Gemini API enabled.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of your project and add the following variables:
    ```env
    # MongoDB
    MONGODB_URI=your_mongodb_connection_string
    MONGODB_DB_NAME=your_database_name # Optional, can be part of MONGODB_URI

    # NextAuth.js
    NEXTAUTH_SECRET=a_strong_random_secret_string_for_nextauth
    NEXTAUTH_URL=http://localhost:9002 # Or your deployment URL

    # Google OAuth Provider (for NextAuth.js)
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    # Genkit / Google AI (Gemini)
    # Ensure your environment is authenticated for Google Cloud,
    # or set GOOGLE_API_KEY if using API key-based auth for Gemini
    # GOOGLE_API_KEY=your_google_ai_studio_api_key
    ```
    *   Replace placeholders with your actual credentials and URIs.
    *   `NEXTAUTH_SECRET` can be generated using `openssl rand -base64 32`.

### Running the Development Server

1.  **Start the Genkit development server (for AI flows):**
    In one terminal:
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes
    # npm run genkit:watch
    ```
    This typically starts on port 3400.

2.  **Start the Next.js development server:**
    In another terminal:
    ```bash
    npm run dev
    ```
    This starts the Next.js app, usually on port 9002 (as configured in `package.json`).

Open [http://localhost:9002](http://localhost:9002) with your browser to see the application.
An initial admin user may need to be created or promoted directly in the database for first-time admin access, or you can implement a seeding script.

## 📂 Project Structure (Simplified Overview - Post `(app)` folder removal)

```
/
├── src/
│   ├── ai/                     # Genkit AI flows and configuration
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/            # Admin-only routes group (e.g., /admin/dashboard)
│   │   │   └── dashboard/      # Admin dashboard page and sub-components
│   │   ├── api/                # API route handlers
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── globals.css         # Global styles & ShadCN theme variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing/Home page
│   ├── components/             # Shared React components (ui, Logo, SiteHeader etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions and libraries (mongodb, utils)
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── .env.local.example          # Example environment variables
├── components.json             # ShadCN UI configuration
├── next.config.ts              # Next.js configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts               # Next.js middleware (for route protection)
└── README.md
```
Note: The `src/app/(app)/` directory (which previously housed the user dashboard and settings) has been removed. User-specific interactions are now primarily managed through the admin dashboard or direct API calls. User profile settings (name/password change) are available via API.

## 🤖 AI Flows (Genkit)

Located in `src/ai/flows/`:

*   `agent-debate.ts`: Simulates a debate between AI agents to refine content strategy.
*   `brand-learning.ts`: Analyzes brand content to extract voice, style, and patterns.
*   `content-generation.ts`: Generates multi-format content based on a brief.
*   `revise-content-flow.ts`: Revises existing content based on specific instructions.
*   `translate-content-flow.ts`: Translates content to different languages.

## 🤝 Contributing

Contributions are welcome! Please follow standard fork/PR process. (Further contribution guidelines TBD).

## 📄 License

(Specify license, e.g., MIT, Apache 2.0, or proprietary). This project is currently under (default/unspecified license).
