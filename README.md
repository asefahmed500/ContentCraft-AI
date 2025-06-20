
# ContentCraft AI 🚀

ContentCraft AI is a revolutionary multi-agent content creation system designed to streamline and enhance your content strategy. Leveraging the power of AI, multiple specialized agents collaborate, debate, and generate compelling multi-format content campaigns tailored to your brand and objectives. The platform now includes comprehensive admin functionalities for user management, campaign oversight, and platform monitoring.

## ✨ Key Features

### User-Facing Features
*   **User Authentication & Role Management**: Secure login via Google or email/password using NextAuth.js. Supports 'viewer', 'editor', and 'admin' roles with distinct permissions.
*   **Campaign Management**: Create, view, edit (editors/admins), and manage content campaigns. Track status from 'draft' through 'agent debate', 'content generation', and 'review'.
*   **Creative Brief Input**: Define campaign goals, target audience, tone, and provide product/service descriptions to guide AI agents.
*   **Brand DNA Analysis**: Upload brand content (text, PDFs) to extract core voice, style, values, and visual cues using AI (Gemini via Genkit).
*   **Simulated Creative War Room**: Observe (simulated) AI agents with distinct roles (Creative Director, Content Writer, Brand Persona, Analytics, SEO, QA) debate strategy and refine content ideas.
*   **Multi-Format Content Generation**: AI generates various content pieces from a single brief (e.g., blog posts, tweets, LinkedIn articles, Instagram captions, TikTok scripts, emails, ad copy) using Genkit.
*   **Content Evolution Timeline**: Track versions of generated content, see (simulated) changes by agents, and view previous snapshots.
*   **Performance Predictor**: Get AI-driven estimations for potential CTR, engagement, conversion, and audience match for generated content formats (uses mock API and Recharts).
*   **User Feedback Loop**: Provide 👍/👎 ratings and comments on generated content, stored in `feedback_logs` collection.
*   **Content Translation**: Translate generated content into multiple languages using AI, preserving tone, and save as new versions.
*   **Private Mode**: Mark campaigns as private to (conceptually) exclude their data from future AI agent learning.
*   **Gamification System**: Earn XP for actions like content generation and feedback, level up (tracked in user DB), and (conceptually) unlock badges. XP and level are displayed in the user profile.
*   **Content Import (Simulated)**: Placeholder UI to import content from URLs or video to bootstrap campaign briefs.
*   **Compliance Check (Simulated)**: Quality Assurance agent provides simulated compliance feedback during debates.
*   **Placeholders for Future Features**:
    *   Content Calendar & Scheduling
    *   A/B Testing Simulation (Level-locked feature)
    *   Content Template Library (with mock templates)
    *   Campaign Intelligence / Memory Mode

### Admin Features
*   **Admin Dashboard**: Centralized view for platform oversight, including user lists, all campaigns, and (mocked) platform activity statistics.
*   **User Management**: Admins can view all users, manage their roles (viewer, editor, admin), and ban/unban users. User `isBanned` status is stored and enforced.
*   **Campaign Oversight**: Admins can view all campaigns created by any user, filter them by status or flag status, and inspect campaign details including debates and content versions.
*   **Content Moderation (Campaign Level)**: Admins can flag/unflag entire campaigns and add moderation notes. Flagged status is visible in admin views.
*   **Platform Analytics (Admin View)**: The admin dashboard displays (mocked) charts for weekly platform activity, top content formats, and key metrics like total users, campaigns, and AI flow executions.
*   **Admin Search**: Admins can search for users (by name, email, ID) and campaigns (by title, brief, user ID, campaign ID) within the admin dashboard.
*   **Data Export (Conceptual)**: Placeholder buttons for admins to download campaign, feedback, or user data as CSV.
*   **Secure Admin Routes**: Admin-specific routes (e.g., `/admin/dashboard`) are protected by middleware, ensuring only users with the 'admin' role can access them.

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
│   │   ├── flows/              # Specific AI agent flows
│   │   ├── dev.ts              # Genkit development server entry point
│   │   └── genkit.ts           # Genkit global instance configuration
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/            # Admin-only routes group (e.g., /admin/dashboard)
│   │   │   └── dashboard/      # Admin dashboard page and sub-components
│   │   ├── (app)/              # Authenticated user routes group (e.g., /dashboard)
│   │   │   ├── dashboard/      # Main user dashboard page and sub-components
│   │   │   └── settings/       # User settings page
│   │   ├── api/                # API route handlers
│   │   │   ├── admin/          # Admin-specific API endpoints (users, campaigns)
│   │   │   ├── agents/         # Agent-related API endpoints
│   │   │   ├── auth/           # NextAuth.js API routes (login, register, session)
│   │   │   ├── brand/          # Brand DNA analysis API
│   │   │   ├── campaigns/      # User-specific campaign CRUD API
│   │   │   ├── content/        # Content revision & translation APIs
│   │   │   ├── feedback/       # User feedback API
│   │   │   └── user/           # User-specific APIs (e.g., update-xp)
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── globals.css         # Global styles & ShadCN theme variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing/Home page
│   ├── components/             # Shared React components
│   │   ├── ui/                 # ShadCN UI primitives (button, card, etc.)
│   │   ├── AgentAvatar.tsx
│   │   ├── ContentCard.tsx
│   │   ├── Logo.tsx
│   │   ├── SessionProviderWrapper.tsx
│   │   ├── SiteHeader.tsx
│   │   └── UserXPDisplay.tsx
│   ├── hooks/                  # Custom React hooks (useMobile, useToast)
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
# ContentCraft-AI
# ContentCraft-AI

