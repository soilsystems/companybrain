# Reference UI Analysis

**Reference:** `docs/design/reference/index.html`, `styles.css`, `app.js`  
**Analyzed:** 2026-07-17

## Interpretation

The reference is a visual and interaction specification, not production code. Its
composition, density, hierarchy, transitions, and responsive intent will be retained.
Its Wexora branding, mutable global state, hardcoded workspaces, inline handlers,
string-built HTML, alerts, unsafe formatting, and legacy endpoints will not be copied.

All visible branding becomes **Company Brain**. Dashboard and navigation hierarchy are
adapted from chat-first to document-search-first.

## Global design language

| Token | Light | Dark | Production mapping |
|---|---|---|---|
| Body font | Plus Jakarta Sans | Same | `font-sans` / `--font-body` |
| Display font | Space Grotesk | Same | `font-display` |
| Background | `hsl(220 20% 97%)` | `hsl(222 47% 7%)` | `background` |
| Surface | translucent white | translucent navy | `surface` |
| Surface hover | `hsl(220 15% 94%)` | `hsl(222 35% 16%)` | `surface-muted` |
| Border | `hsl(220 13% 89%)` | `hsl(222 30% 18%)` | `border` |
| Strong border | `hsl(220 12% 80%)` | `hsl(222 25% 28%)` | `border-strong` |
| Text | `hsl(224 71% 4%)` | `hsl(210 40% 98%)` | `foreground` |
| Secondary text | `hsl(220 10% 30%)` | `hsl(217 20% 82%)` | `foreground-muted` |
| Accent | `hsl(224 76% 48%)` | `hsl(217 91% 60%)` | `primary` |
| Success | green | brighter green | `success` |
| Danger | red | brighter red | `destructive` |
| Base radius | 12px | 12px | `rounded-base` |
| Large radius | 18px | 18px | `rounded-panel` |
| Small shadow | subtle 2px/8px | stronger black | `shadow-sm` |
| Panel shadow | restrained 10px/30px | stronger black | `shadow-panel` |

The reference uses a compact 64px top bar, 260px sidebar, 280px right rail, 1200px
dashboard content width, 850px chat width, and 800px composer width. Main page spacing
is 32px desktop and 16px mobile. Common gaps are 4, 6, 8, 10, 12, 16, 20, 24, 28,
32, and 36px.

## Typography

- Display heading: Space Grotesk, 700–800, 24–32px.
- Product brand: Space Grotesk, 700, 16–20px.
- Panel headings: 14–16px, 700.
- Body: Plus Jakarta Sans, 13–15px, 400–600, 1.5–1.65 line height.
- Labels/eyebrows: 11–12px, 700–800, uppercase, 0.05–0.08em tracking.
- KPI values: Space Grotesk, 32px, 800.
- No viewport-scaled type; compact containers use compact headings.

## Layout and responsive intent

```text
64px top bar
├── 260px persistent sidebar
├── flexible main region
│   ├── breadcrumb and tab header
│   └── active route content
└── 280px context rail
```

- At 992px the right rail becomes an overlay and two-column panels stack.
- At 768px the sidebar becomes an overlay and page padding reduces to 16px.
- Production adds an explicit mobile menu button, backdrop, escape handling, and focus
  management because the reference only changes positioning.
- Tables gain horizontal overflow and compact card alternatives where necessary.

## Interaction states

- Hover: subtle surface change; important cards lift at most 3px.
- Focus: accent border plus a 3px translucent ring.
- Active navigation: pale accent background and accent text.
- Active tab: raised surface on a muted segmented-control track.
- Menus: short downward fade using an ease-out cubic curve.
- Theme changes: 200–400ms background/color transitions.
- Loading: reference uses text placeholders; production uses stable skeleton geometry.
- Empty: muted centered content with one relevant action.
- Error: bounded panel with safe message and retry action, never raw provider text.
- Disabled: reduced contrast and no movement.

## Reference composition mapped to Company Brain

| Reference element | New component | Route | Reuse strategy | Status |
|---|---|---|---|---|
| Auth viewport/card | `LoginPanel` | `/login` | Standalone auth layout | Planned |
| Wexora brand mark | `CompanyBrainMark` | Global | Shared top bar/login | Planned |
| Top bar | `TopBar` | `/app/**` | App shell | Planned |
| Region selector | `OrganizationSelector` | `/app/**` | Authorized scope control | Planned |
| Project selector | `WorkspaceSelector` | `/app/**` | Authorized business control | Planned |
| Global search | `SearchBar` | `/app/**` | Navigates to document search | Planned |
| Sidebar | `Sidebar` | `/app/**` | Responsive navigation shell | Planned |
| Project folders | `DocumentCollections` | Sidebar | Optional collections | Planned |
| Workspace chats | `RecentChats` | Sidebar/chat | Secondary content | Planned |
| Breadcrumb row | `Breadcrumbs` | `/app/**` | Route-aware header | Planned |
| Dashboard/chat tabs | `ViewTabs` | `/app/**` | Five primary routes | Planned |
| Dashboard title/KPIs | `DashboardOverview`, `KpiCard` | `/app` | Server-backed summaries | Planned |
| Dashboard document panel | `RecentDocuments` | `/app` | Shared document rows | Planned |
| Dashboard query panel | `RecentSearches` | `/app` | Survey searches first | Planned |
| Quick upload | `QuickUpload` | `/app` | Links to upload flow | Planned |
| Ledger table style | `DocumentTable` | `/app/documents` | Sort/filter/action rows | Planned |
| Chat stream | `ChatWorkspace` | `/app/chat` | Evidence-grounded messages | Planned |
| Composer | `ChatComposer` | `/app/chat` | Accessible controlled form | Planned |
| Citation pills | `CitationChip` | Chat/detail | Opens source evidence | Planned |
| Right metadata rail | `RightRail` | `/app/**` | Route-sensitive slots | Planned |
| Source viewer overlay | `SourceViewer` | Chat/detail | Safe text and secure actions | Planned |
| Theme menu | `ThemeSwitcher` | Global | Light/dark/system | Planned |
| Document upload control | `UploadDropzone` | `/app/documents/upload` | Direct private upload | Planned |
| Document row | `DocumentRow`, `DocumentCard` | Search/library/dashboard | Shared typed result | Planned |
| Missing in reference | `SurveySearchBar` | Dashboard/search | Dominant product control | Planned |
| Missing in reference | `DocumentViewer` | Document detail | Safe preview surface | Planned |
| Missing in reference | `SignedDownloadButton` | Detail/search/chat | Backend-authorized action | Planned |
| Missing in reference | `FilterDrawer`, `Pagination` | Search/library | Query-state components | Planned |

## Product hierarchy adaptation

Primary navigation becomes:

1. Dashboard
2. Document Search
3. Document Library
4. Upload
5. Chat

Settings remains in the sidebar footer. The dashboard begins with a large survey and
document search surface before KPIs. Recent chats remain visible but subordinate to
recent documents and searches. The right rail displays filters on search, document
metadata/actions on detail, and citations/groundedness on chat.

## Accessibility conversion

- All icon controls use Lucide icons, accessible names, and tooltips where meaning is
  not obvious.
- Menus use buttons and semantic lists instead of clickable `div` elements.
- Route navigation uses links and active-page semantics.
- Form inputs have visible labels or accessible names and persistent error text.
- Focus rings remain visible in both themes.
- Overlays close with Escape and restore focus.
- Motion respects `prefers-reduced-motion`.
- Text and controls target WCAG AA contrast.

## Production-state rules

- No fabricated counts or workspace records are presented as live data.
- Empty server-backed states are explicit and still demonstrate the intended layout.
- Search query and filter state are URL-addressable.
- Sensitive state and signed URLs are never persisted in local storage.
- Document text is rendered as escaped text, never raw HTML.
- View and download actions are generated by FastAPI after authorization.

## Visual comparison checklist

- 64px top bar, 260px sidebar, and 280px desktop right rail proportions.
- Space Grotesk display hierarchy and Plus Jakarta Sans body rhythm.
- Blue accent, neutral blue-gray background, translucent white/dark surfaces.
- 12px controls, 18px major panels, restrained borders and shadows.
- Dense route header and segmented tabs.
- Dominant search focus state.
- Correct overlay behavior at 992px and 768px.
- Stable loading/empty/error geometry.
- Light, dark, and system theme screenshots at desktop; light theme at tablet/mobile.

Final measured differences and screenshot paths will be recorded in
`REFERENCE_UI_IMPLEMENTATION_REPORT.md` after browser verification.
