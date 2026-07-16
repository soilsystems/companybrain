# Frontend Architecture

## Purpose

The Next.js App Router frontend is a professional records workspace based on the
supplied reference design. It is presentation only: FastAPI owns authorization,
document metadata, search ranking, private storage actions, chat resolution, and job
state.

## Route map

| Route | Primary component | Purpose |
| --- | --- | --- |
| `/login` | login page | Supabase password sign-in |
| `/app` | `DashboardOverview` | dominant survey/document search |
| `/app/search` | `SearchWorkspace` | ranked authorized search results |
| `/app/documents` | `DocumentLibrary` | records table and actions |
| `/app/documents/upload` | `UploadWorkspace` | metadata plus private upload |
| `/app/documents/[documentId]` | `DocumentDetailWorkspace` | secure preview and metadata |
| `/app/chat` | `DocumentChatWorkspace` | secondary grounded Q&A |
| `/app/settings` | settings page | service and security boundaries |

## Composition and state

`ScopeProvider` loads `/api/v1/auth/me` and exposes only organizations, businesses,
domains, role, and user data returned by FastAPI. `NavShell` supplies the 64px top
bar, 260px navigation rail, responsive main area, and 280px context rail. Drawers
replace side rails on narrow screens. Theme state supports light, dark, and system.

The token source is `app/globals.css` plus `tailwind.config.ts`. Plus Jakarta Sans is
the body face; Space Grotesk is the display face. Surfaces, border colors, 12px and
18px radii, shadows, focus rings, and semantic colors are centralized.

## API and security

`lib/api-client.ts` attaches the Supabase access token to FastAPI requests. Browser
code never sees the service-role key or storage path. View and download URLs are
created only after an explicit authorized action. The legacy Next.js `/api/chat`
provider route is retired with HTTP 410.

The current token is held in browser local storage. A production follow-up should
move auth to the supported Supabase client session flow with secure server-readable
cookies to reduce XSS exposure and support middleware redirects.
