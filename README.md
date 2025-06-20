

# ContentCraft AI 🚀

ContentCraft AI is a revolutionary multi-agent content creation system designed to streamline and enhance your content strategy. Leveraging the power of AI, multiple specialized agents collaborate, debate, and generate compelling multi-format content campaigns tailored to your brand and objectives. The platform includes comprehensive user features and robust admin functionalities for user management, campaign oversight, content moderation, and platform monitoring.

## ✨ Key Features

### User-Facing Features
*   **User Authentication & Role Management**: Secure login via Google or email/password using NextAuth.js. Supports 'viewer', 'editor', and 'admin' roles with distinct permissions.
*   **Personalized Dashboard**: Central hub for users to view and manage *their own* content campaigns, track progress, and access key features.
*   **Campaign Management**: Create, view, edit (editors/admins), and delete content campaigns. Track status from 'draft' through 'agent debate', 'content generation', and 'review'.
*   **Creative Brief Input**: Define campaign goals, target audience, tone, and provide product/service descriptions to guide AI agents effectively.
*   **Brand DNA Analysis**: Upload brand content (text files/PDFs) to have AI (Gemini via Genkit) extract core voice, style, values, and visual cues, creating a reusable brand profile.
*   **Simulated Creative War Room**: Observe simulated AI agents with distinct roles (Creative Director, Content Writer, etc.) debate strategy and refine content ideas for your campaigns.
*   **Multi-Format Content Generation**: AI generates diverse content pieces from a single, refined brief (e.g., blog posts, tweets, LinkedIn articles, Instagram captions, TikTok scripts, emails, ad copy) using Genkit.
*   **Content Evolution Timeline**: Track versions of generated content, see changes, and revert to previous snapshots if needed.
*   **Performance Predictor (Simulated)**: Get AI-driven estimations for potential CTR, engagement, conversion, and audience match for generated content formats (uses mock API and Recharts).
*   **User Feedback Loop**: Provide 👍/👎 ratings and comments on generated content, which is stored and can (conceptually) refine future AI outputs. Awards XP for engagement.
*   **Content Translation**: Translate generated content into multiple languages using AI, preserving tone, and save as new versions.
*   **Private Mode**: Mark campaigns as private, conceptually excluding their data from broader AI agent learning.
*   **Gamification System**: Earn Creative XP for actions like content generation and providing feedback. Level up, track progress, and (conceptually) unlock badges and advanced features. XP and level are displayed in the user profile.
*   **User Profile Settings**: Update account name and change password (for credential-based accounts). Team Management is a conceptual placeholder.
*   **A/B Testing Panel (Conceptual)**: A level-locked placeholder (Level 3) for a future feature allowing users to test content variations.

### Admin Features
*   **Comprehensive Admin Dashboard**: Centralized control panel for platform oversight, including summary statistics (total users, campaigns, mocked activity), charts for platform activity, XP Leaderboard, and navigation to detailed management sections.
*   **User Management**: Admins can view a sortable and searchable table of all users, manage their roles (viewer, editor, admin), and ban/unban users. User `isBanned` status is stored and enforced by middleware and login checks.
*   **Campaign Oversight**: Admins can view, search, and filter all campaigns created by any user. They can inspect full campaign details including brief, agent debates, and all content versions.
*   **Campaign Moderation**: Admins can flag/unflag entire campaigns and add moderation notes. Flagged status is visible in admin views. Admins can also delete any campaign.
*   **Content Version Moderation**:
    *   Admins can flag/unflag individual content versions within any campaign and add specific moderation notes via the campaign detail view.
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
*   **Charting**: Recharts (for admin analytics and performance prediction graphs)
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

## 📂 Project Structure

```
/
├── src/
│   ├── ai/                     # Genkit AI flows and configuration
│   │   ├── flows/              # Specific AI agent flows (brand-learning, agent-debate, etc.)
│   │   ├── dev.ts              # Genkit development server entry point
│   │   └── genkit.ts           # Genkit global instance configuration
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/            # Admin-only routes group (e.g., /admin/dashboard)
│   │   │   └── dashboard/      # Admin dashboard page and sub-components (UserTable, AdminCampaignList, FlaggedContentTable)
│   │   ├── (app)/              # Authenticated user routes group (e.g., /dashboard)
│   │   │   ├── dashboard/      # Main user dashboard page and sub-components (CampaignGenerator, AgentDebatePanel, etc.)
│   │   │   └── settings/       # User settings page (profile, password)
│   │   ├── api/                # API route handlers
│   │   │   ├── admin/          # Admin-specific API endpoints (users, campaigns, content moderation)
│   │   │   ├── agents/         # Agent-related API endpoints
│   │   │   ├── auth/           # NextAuth.js API routes (login, register, session)
│   │   │   ├── brand/          # Brand DNA analysis API
│   │   │   ├── campaigns/      # User-specific campaign CRUD API
│   │   │   ├── content/        # Content revision & translation APIs
│   │   │   ├── feedback/       # User feedback API
│   │   │   └── user/           # User-specific APIs (update-xp, profile, change-password)
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── globals.css         # Global styles & ShadCN theme variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing/Home page
│   ├── components/             # Shared React components
│   │   ├── ui/                 # ShadCN UI primitives (button, card, etc.)
│   │   ├── AgentAvatar.tsx
│   │   ├── Logo.tsx
│   │   ├── SessionProviderWrapper.tsx
│   │   ├── SiteHeader.tsx
│   │   └── UserXPDisplay.tsx
│   ├── hooks/                  # Custom React hooks (useMobile, useToast)
│   ├── lib/                    # Utility functions and libraries (mongodb, utils)
│   └── types/                  # TypeScript type definitions (agent, brand, content)
├── public/                     # Static assets
├── .env.local.example          # Example environment variables
├── components.json             # ShadCN UI configuration
├── next.config.ts              # Next.js configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts               # Next.js middleware (for route protection and banned user handling)
└── README.md
```

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
```