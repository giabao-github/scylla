# Scylla

Scylla is an AI-powered customer support platform that provides embeddable chat widgets, voice calls, and intelligent automated responses for websites. Built as a modern monorepo using Next.js, Convex, and Clerk.

## Architecture

This project is organized as a pnpm workspace monorepo with the following structure:

### Applications

- **`apps/web`** - Next.js dashboard application for managing conversations, customization, and billing
  - Built with Next.js 16, React 19, and Tailwind CSS
  - Authentication via Clerk
  - Real-time data sync with Convex
  - Features: conversation management, widget customization, billing, and analytics

- **`apps/embed`** - Embeddable chat widget
  - Vanilla TypeScript widget built with Vite
  - Generates `widget.js` that customers embed on their websites
  - Provides floating chat button and iframe-based chat interface
  - Supports customizable positioning (bottom-left/bottom-right)
  - Includes voice call integration via Vapi

### Packages

- **`packages/backend`** - Convex backend (serverless database + API)
  - Real-time database with Convex
  - AI agent integration using `@convex-dev/agent`
  - Webhook handlers for Clerk authentication
  - Cron jobs for cleanup and maintenance
  - Voice call integration with Vapi
  - Data model: organizations, conversations, messages, contact sessions, subscriptions

- **`packages/ui`** - Shared UI component library
  - Built with shadcn/ui and Radix UI
  - Tailwind CSS styling
  - Reusable components across web and embed apps

- **`packages/shared`** - Shared utilities and constants
  - Type definitions
  - Constants and configuration
  - Utility functions used across the monorepo

- **`packages/eslint-config`** - Shared ESLint configuration
- **`packages/typescript-config`** - Shared TypeScript configuration

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm 10.33.2 or higher

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter web dev
pnpm --filter embed dev
pnpm --filter @workspace/backend dev
```

### Building

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter web build
pnpm --filter embed build
```

## Adding UI Components

To add shadcn/ui components to your app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the UI components in the `packages/ui/src/components` directory.

### Using Components

Import components from the `ui` package:

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Environment Variables

This project uses environment variables for configuration. Copy the `.env.example` files to `.env.local` in the respective directories and fill in the values.

### Web App (`apps/web`)

Create `apps/web/.env.local`:

| Variable                            | Description                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | The URL of your Convex deployment (get from Convex dashboard)                                                                                                      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (get from Clerk dashboard)                                                                                                               |
| `NEXT_PUBLIC_WIDGET_SCRIPT_URL`     | **Required for Production.** The absolute URL to the hosted `widget.js` (e.g., `https://scylla.chat/widget.js`). This is used to generate the integration snippets |

### Backend (`packages/backend`)

Create `packages/backend/.env.local`:

| Variable                       | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `CONVEX_DEPLOYMENT`            | Your Convex deployment name (e.g., `dev:happy-animal-123`) |
| `CLERK_SECRET_KEY`             | Your Clerk secret key (get from Clerk dashboard) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Secret for verifying Clerk webhooks              |

### Embed Widget (`apps/embed`)

Create `apps/embed/.env.local`:

| Variable                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL`    | The URL of your Convex deployment                |

## How It Works

### Customer Integration Flow

1. **Widget Embedding**: Customers add a script tag to their website:
   ```html
   <script 
     src="https://your-domain.com/widget.js" 
     data-organization-id="org_xxxxx"
     data-position="bottom-right"
   ></script>
   ```

2. **Widget Initialization**: The widget script (`apps/embed`) creates:
   - A floating chat button (bottom-left or bottom-right)
   - An iframe container for the chat interface
   - Message handlers for communication between host page and iframe

3. **Real-time Communication**: 
   - User messages are sent to Convex backend
   - AI agent processes messages using `@convex-dev/agent`
   - Responses stream back in real-time via Convex subscriptions
   - Support for voice calls via Vapi integration

4. **Dashboard Management**: 
   - Business owners log in to `apps/web` dashboard
   - View and manage conversations
   - Customize widget appearance and behavior
   - Configure AI agent settings
   - Monitor analytics and billing

### Data Flow

```
Customer Website → Widget (embed) → Convex Backend → AI Agent
                                          ↓
Dashboard (web) ← Convex Real-time Sync ←┘
```

### Key Technologies

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Convex (serverless database + real-time sync)
- **Authentication**: Clerk
- **AI**: Convex AI Agents with OpenAI/Google AI
- **Voice**: Vapi integration
- **Build Tool**: Turborepo for monorepo orchestration
- **Package Manager**: pnpm with workspaces

## Deployment

### Prerequisites

1. Set up a [Convex](https://convex.dev) account and create a deployment
2. Set up a [Clerk](https://clerk.com) account and create an application
3. Configure Clerk webhook to sync users to Convex

### Web App Deployment

Deploy `apps/web` to Vercel, Netlify, or any Next.js-compatible platform:

```bash
cd apps/web
pnpm build
```

**Important**: Set `NEXT_PUBLIC_WIDGET_SCRIPT_URL` to the URL where your widget.js is hosted (e.g., `https://scylla.chat/widget.js`). Without this, the dashboard cannot generate integration snippets.

### Widget Deployment

Build and deploy the widget:

```bash
cd apps/embed
pnpm build
```

The build outputs `dist/widget.js` which should be hosted on a CDN or static hosting service. The build script automatically syncs the widget bundle to `apps/web/public/widget.js` for convenience.

### Backend Deployment

The Convex backend deploys automatically when you run:

```bash
cd packages/backend
pnpm dev  # for development
# or
npx convex deploy  # for production
```

## Development Tips

- **Tailwind CSS**: Configuration is shared via `packages/ui/postcss.config.mjs`
- **Type Safety**: TypeScript is configured across all packages with shared configs
- **Linting**: Run `pnpm lint` to check all packages
- **Formatting**: Run `pnpm format` to format all files with Prettier

## License

Private - All rights reserved
