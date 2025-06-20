
# ContentCraft AI 🚀

ContentCraft AI is a revolutionary multi-agent content creation system designed to streamline and enhance your content strategy. Leveraging the power of AI, multiple specialized agents collaborate, debate, and generate compelling multi-format content campaigns tailored to your brand and objectives. The platform includes comprehensive admin functionalities for user management, campaign oversight, content moderation, and platform monitoring. User-facing features are primarily accessed through the admin dashboard or direct API interactions after the removal of the dedicated user dashboard.

## ✨ Key Features

### User-Facing Features (Primarily accessed via Admin Dashboard or APIs)
*   **User Authentication & Role Management**: Secure login via Google or email/password using NextAuth.js. Supports 'viewer', 'editor', and 'admin' roles with distinct permissions.
*   **Core AI Functionality**:
    *   **Campaign Management**: Create, view, edit (editors/admins), and delete content campaigns (managed via Admin Dashboard). Track status from 'draft' through 'agent debate', 'content generation', and 'review'.
    *   **Creative Brief Input**: Define campaign goals, target audience, tone, and provide product/service descriptions to guide AI agents effectively.
    *   **Brand DNA Analysis**: Upload brand content (text files/PDFs) to have AI (Gemini via Genkit) extract core voice, style, values, and visual cues, creating a reusable brand profile.
    *   **Simulated Creative War Room**: Observe simulated AI agents with distinct roles debate strategy and refine content ideas for your campaigns.
    *   **Multi-Format Content Generation**: AI generates diverse content pieces from a single, refined brief (e.g., blog posts, tweets, etc.) using Genkit.
    *   **Content Evolution Timeline**: Track versions of generated content (viewable in Admin Campaign Detail).
    *   **Performance Predictor (Simulated)**: Get AI-driven estimations for content performance (mock API, viewable in Admin Campaign Detail).
    *   **User Feedback Loop**: Provide 👍/👎 ratings and comments on generated content (API exists, UI integration conceptual without user dashboard). Awards XP for engagement.
    *   **Content Translation**: Translate generated content into multiple languages using AI.
    *   **Private Mode**: Mark campaigns as private, conceptually excluding their data from broader AI agent learning.
*   **Gamification System**: Earn Creative XP for actions like content generation and providing feedback. Level up, track progress. XP and level are displayed in the user profile section of the site header.
*   **User Profile Settings**: APIs exist for updating account name and changing password (for credential-based accounts). Direct UI for this was part of the removed user dashboard.
*   **A/B Testing Panel (Conceptual)**: A level-locked placeholder (Level 3) in the original user dashboard design.

### Admin Features
*   **Comprehensive Admin Dashboard**: Centralized control panel for platform oversight, including summary statistics (total users, campaigns, mocked activity), charts for platform activity, XP Leaderboard, and navigation to detailed management sections.
*   **User Management**: Admins can view a sortable and searchable table of all users, manage their roles (viewer, editor, admin), and ban/unban users. User `isBanned` status is stored and enforced by middleware and login checks.
*   **Campaign Oversight**: Admins can view, search, and filter all campaigns created by any user. They can inspect full campaign details including brief, agent debates (raw data), and all content versions (raw data if UI components from `(app)` folder are missing).
*   **Campaign Moderation**: Admins can flag/unflag entire campaigns and add moderation notes. Flagged status is visible in admin views. Admins can also delete any campaign.
*   **Content Version Moderation**:
    *   Admins can flag/unflag individual content versions within any campaign and add specific moderation notes via the campaign detail view (simplified if components are missing).
    *   A dedicated "Flagged Content" tab in the admin dashboard lists all flagged content versions across the platform for centralized review and action (unflagging, previewing).
*   **Platform Analytics (Admin View)**: The admin dashboard displays key metrics and charts:
    *   Total users, total campaigns.
    *   (Mocked) Weekly platform activity (users, campaigns, AI flows).
    *   (Mocked) Top content formats generated.
    *   XP Leaderboard showing top users by Creative XP.
*   **Secure Admin Routes & APIs**: Admin-specific routes (e.g., `/admin/dashboard`) and APIs are protected by middleware and token checks, ensuring only users with the 'admin' role can access them.
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
*   **Linting/Formatting**: ESLint (configured by Next.js), Prettier (implied)
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

## 📂 Project Structure (Simplified Overview)

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
Note: The `src/app/(app)/` directory (which previously housed the user dashboard and settings) has been removed to resolve routing conflicts. User-specific campaign interactions are now primarily managed through the admin dashboard or direct API calls.

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

    