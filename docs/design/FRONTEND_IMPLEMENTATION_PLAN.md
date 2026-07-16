# Frontend Implementation Plan

## Objective

Convert the supplied reference into a responsive Next.js App Router experience where
document and survey-number search is primary and every sensitive action is backed by
FastAPI authorization.

## Delivery slices

1. **Design foundation**: fonts, color/radius/shadow tokens, light/dark/system themes,
   application shell, top bar, navigation, breadcrumbs, tabs, and responsive overlays.
2. **Document surfaces**: dashboard search, search results, library table/cards, upload
   form, processing states, detail viewer, metadata rail, and secure actions.
3. **Trusted API**: typed identifiers, normalization, ranked search, detail, signed
   view/download, and audit persistence.
4. **Chat connection**: likely survey parsing, exact resolution, document cards,
   citations, and secure actions supplied by the backend.
5. **Verification**: unit/integration tests, 10k-record query plan, desktop/tablet/mobile
   screenshots, reference comparison, and correction loops.

## Component boundaries

- `components/shell`: app chrome and scope/navigation controls.
- `components/documents`: search, rows/cards, filters, upload, viewer, metadata/actions.
- `components/chat`: composer, messages, citations, and evidence panel.
- `components/ui`: small reusable primitives and stable states.
- `lib/api`: typed client and response schemas; no storage service key.
- `lib/documents`: formatting and query-state helpers only; ranking remains server-side.

## Responsive targets

- Desktop: 1440x1000, persistent 260px sidebar and 280px rail.
- Tablet: 1024x900, rail overlay/drawer.
- Mobile: 390x844, sidebar and rail drawers, single-column content, overflow-safe tables.

## Completion evidence

Screenshot paths, visual differences, browser console results, test commands, and
remaining limitations are recorded in `REFERENCE_UI_IMPLEMENTATION_REPORT.md`.
