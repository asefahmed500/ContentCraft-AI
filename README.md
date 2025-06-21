# ContentCraft AI 🚀

ContentCraft AI is a revolutionary multi-agent content creation system designed to streamline and enhance your content strategy. Leveraging the power of AI, multiple specialized agents collaborate, debate, and generate compelling multi-format content campaigns tailored to your brand and objectives.

**Project Update**: The application now features a dedicated User Dashboard at `/creator-dashboard` where authenticated users can create, manage, and utilize all AI-powered creative tools for their campaigns. The separate Admin Dashboard at `/admin/dashboard` is focused on platform oversight, user management, and content moderation.

## ✨ Key Features

### User Features (in Creator Dashboard)
*   **User Authentication & Role Management**: Secure login via Google or email/password. New users default to the 'editor' role, allowing them to create content immediately.
*   **Campaign Management**: Create, view, edit, and delete your own content campaigns from the dashboard at `/creator-dashboard`.
*   **Creative Brief Input**: Define campaign goals, target audience, and tone to guide the AI agents.
*   **Brand DNA Analysis**: Generate a detailed brand profile (voice, style, values) by providing reference text to the AI.
*   **Simulated Creative War Room**: Initiate and observe a debate between specialized AI agents to refine your content strategy.
*   **Content Strategy Calendar**: Automatically generate a 7-day content plan with platform and format recommendations based on your campaign goals.
*   **Multi-Format Content Generation**: Generate diverse content pieces (e.g., blog posts, tweets) from a refined brief using Genkit.
*   **Content Interaction Tools**: For any piece of generated content, you can:
    *   **Revise**: Rewrite the content with new instructions.
    *   **Audit**: Check how well the content aligns with your generated Brand Profile.
    *   **Translate**: Localize the content into different languages.
    *   **Optimize**: Improve the content for a specific goal like engagement or click-through-rate.
*   **Gamification System**: Earn Creative XP for actions like generating content, using AI tools, or providing feedback. Level up and track your progress in the site header.
*   **Persistent Feedback Loop**: Provide direct feedback (👍/👎) on generated content to guide future AI improvements and earn XP. The system prevents duplicate feedback submissions.

### Admin Features
*   **Comprehensive Admin Dashboard**: Centralized control panel at `/admin/dashboard` for platform oversight, including usage statistics and analytics charts.
*   **AI-Powered Admin Agents**:
    *   **Smart Analytics Agent**: The dashboard overview includes an "AI-Powered Insights" section with natural language summaries of platform trends.
    *   **User Behavior Auditor**: Admins can perform an "AI Audit" on any user from the User Management table to get a risk score and behavioral analysis.
    *   **Flagged Content Reviewer**: For any piece of content flagged for moderation, an AI agent can provide a recommendation (e.g., Keep, Delete) and justification.
    *   **Campaign Quality Auditor**: Admins can run an AI audit on a specific campaign to get a quality score and a recommendation to improve or archive it.
    *   **Smart Data Exporter**: Before exporting platform data, an AI agent generates a natural-language summary of the dataset to provide context.
*   **User Management**: View all users, manage their roles (viewer, editor, admin), and ban/unban accounts.
*   **Campaign Oversight**: View, search, and filter all campaigns created by any user. Admins can inspect full campaign details, flag campaigns for review, and delete any campaign.
*   **Content Version Moderation**: Review all individually flagged content versions from across the platform in a dedicated "Flagged Content" table.
*   **Secure Admin Routes & APIs**: Admin-specific routes and APIs are protected by authentication and role checks.
*   **Data Export (Conceptual)**: Placeholder buttons for admins to simulate downloading platform data as CSV, enhanced with an AI-generated summary.

## 🛠 Tech Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI**: ShadCN UI Components, Tailwind CSS
*   **State Management**: React Context, `useState`, `useEffect`, NextAuth.js session
*   **AI Integration**: Genkit, Google Gemini (via `@genkit-ai/googleai`)
*   **Authentication**: NextAuth.js (with JWT sessions and MongoDB adapter)
*   **Database**: MongoDB (via official `mongodb` driver and `clientPromise`)
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
    Create a `.env.local` file in the root of your project and add the required variables from `.env.local.example`.

### Running the Development Server

1.  **Start the Genkit development server (for AI flows):**
    In one terminal:
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes
    # npm run genkit:watch
    ```

2.  **Start the Next.js development server:**
    In another terminal:
    ```bash
    npm run dev
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the application.

## 📂 Project Structure

```
/
├── src/
│   ├── ai/                     # Genkit AI flows and configuration
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/            # Admin-only routes (e.g., /admin/dashboard)
│   │   │   └── dashboard/
│   │   ├── creator-dashboard/  # User-facing dashboard and components
│   │   ├── api/                # API route handlers
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── globals.css         # Global styles & ShadCN theme variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing/Home page
│   ├── components/             # Shared React components (Logo, SiteHeader etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions and libraries (mongodb, utils)
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── middleware.ts               # Next.js middleware (for route protection)
└── README.md
```

## 🤖 AI Flows (Genkit)

Located in `src/ai/flows/`:

*   `brand-learning.ts`: Analyzes brand content to extract voice, style, and patterns.
*   `agent-debate.ts`: Simulates a debate between AI agents to refine content strategy.
*   `content-generation.ts`: Generates multi-format content based on a brief.
*   `content-strategy-flow.ts`: Creates a 7-day content schedule.
*   `revise-content-flow.ts`: Revises existing content based on specific instructions.
*   `brand-audit-flow.ts`: Audits content against a brand profile for alignment.
*   `translate-content-flow.ts`: Translates content to different languages.
*   `optimize-content-flow.ts`: Rewrites content to improve performance against a specific goal.
*   And more...

## 🤝 Contributing

Contributions are welcome! Please follow standard fork/PR process.

## 📄 License

(Specify license, e.g., MIT, Apache 2.0, or proprietary). This project is currently under (default/unspecified license).
