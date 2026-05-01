# shadcn/ui monorepo template

This template is for creating a monorepo with shadcn/ui.

## Usage

```bash
pnpm dlx shadcn@latest init
```

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Environment Variables

This project uses environment variables for configuration. Copy the `.env.example` files to `.env.local` in the respective directories and fill in the values.

### Web App (`apps/web`)

| Variable                            | Description                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | The URL of your Convex deployment.                                                                                                                                  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key.                                                                                                                                         |
| `NEXT_PUBLIC_WIDGET_SCRIPT_URL`     | **Required for Production.** The absolute URL to the hosted `widget.js` (e.g., `https://scylla.chat/widget.js`). This is used to generate the integration snippets. |

### Backend (`packages/backend`)

| Variable                       | Description                          |
| ------------------------------ | ------------------------------------ |
| `CONVEX_DEPLOYMENT`            | Your Convex deployment name.         |
| `CLERK_SECRET_KEY`             | Your Clerk secret key.               |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Secret for verifying Clerk webhooks. |

## Deployment

When deploying to production, ensure that `NEXT_PUBLIC_WIDGET_SCRIPT_URL` is set in your environment variables. If this is not set, the dashboard will fail to generate integration snippets for users, as it cannot determine where the widget script is hosted.
