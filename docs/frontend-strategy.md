# PipeLedger Frontend Strategy

PIPELEDGER AI
Frontend Strategy
Audience: Contract developers building the MVP with Claude Code • March 2026
This document defines the frontend architecture, design system, performance strategy, and component patterns for the PipeLedger web application. The goals are: low-latency interactions even with large financial datasets, a polished and professional UI that earns CFO trust, dark mode from day one, and a design token system that lets a designer change the look of the entire application by editing CSS variables — not component code.

# 1. Technology Stack
The frontend stack is established in the Tech Stack document. This section confirms the versions and adds the supporting libraries for the interactive features defined here.

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Next.js 14 (App Router) | Server-side rendering, API routes, file-based routing. Deployed on Cloud Run as a single container. |
| UI Library | React 18 + TypeScript | Component model, hooks, Suspense boundaries for loading states. |
| Styling | Tailwind CSS 3.4 | Utility-first CSS. All custom styles use design tokens via CSS variables — no hardcoded colors or spacing in component code. |
| Component Library | shadcn/ui (Radix UI primitives) | Accessible, composable base components. Copied into the project (not npm dependency) so every component is editable. |
| Data Tables | TanStack Table v8 | Headless table engine for sort, filter, pagination, column visibility, row selection. Paired with virtual scrolling. |
| Virtual Scrolling | @tanstack/react-virtual | Renders only visible rows in large datasets. Powers the Data Review and Activity pages. |
| State Management | TanStack Query v5 | Server state caching, background refetching, optimistic updates. See State Management doc. |
| Real-time | Supabase Realtime (WebSocket) | Pipeline status changes, approval notifications, activity feed updates. See State Management doc. |
| Animations | Tailwind transitions + Framer Motion (selective) | Tailwind for micro-interactions (hover, focus, transitions). Framer Motion only for pipeline progress animations and page transitions. |
| Icons | Lucide React | Consistent icon set. Tree-shakeable — only used icons are bundled. |
| Charts | Recharts | Data visualization for pipeline metrics, budget variance charts, data quality summaries on Data Review page. |
| Forms | React Hook Form + Zod | Form state management with schema validation. Used in Settings, Connector setup, Security Rule builder. |
| Drag and Drop | dnd-kit | Accessible drag-and-drop for taxonomy mapping and dimension label editors in the Schemas page. |
| Toasts | Sonner | Toast notifications for approvals, errors, and success confirmations. |


# 2. Design Token System
PipeLedger AI’s initial brand palette is defined as:
Primary (Deep Navy): #0B1F3A
Accent (Blue): #3B82F6
Background Base: #FFFFFF

These values serve as the foundational primitives of the MVP design system.
The application will implement these through a semantic token architecture (e.g., --primary, --surface, --foreground) to ensure:

Accessibility compliance
Theming flexibility (e.g., dark mode)
Future brand evolution without component refactoring
Strict separation between brand primitives and UI semantics

The hex values above represent the initial brand definition and may evolve as the product matures.Every visual property in PipeLedger is controlled by CSS custom properties (design tokens) defined in a single file. A designer can change the entire look of the application — colors, typography, spacing, border radii, shadows — by editing this file. No component code changes required. Tailwind classes reference these tokens via the theme configuration.

## 2.1 Token Categories

| Category | Tokens | File Location | How Designers Edit |
| --- | --- | --- | --- |
| Surface colors | background, foreground, card, muted, popover | app/globals.css :root and .dark selectors | Change HSL values in CSS variables. Both light and dark values must be updated together. |
| Interactive colors | primary, secondary, accent, destructive | app/globals.css | Change primary color to rebrand. All buttons, links, and active states update automatically. |
| Semantic colors | status-queued, status-running, status-blocked, status-succeeded, status-failed, status-cancelled, variance-favorable, variance-unfavorable, confidence-high/medium/low | app/globals.css | PipeLedger-specific. Maps to pipeline statuses, variance indicators, and confidence scores. |
| Typography | font-sans (Inter), font-mono (JetBrains Mono), text size scale (xs through 2xl) | app/globals.css + tailwind.config.ts | Swap font families by changing the variable. Size scale follows Tailwind default. |
| Spacing | space-xs through space-2xl (0.25rem to 3rem) | app/globals.css | Adjust spacing scale to tighten or loosen the overall layout density. |
| Borders and radius | border color, radius-sm, radius-md, radius-lg | app/globals.css | Increase radius for rounder feel, decrease for sharper. Affects all components globally. |
| Shadows | shadow-sm, shadow-md | app/globals.css | Separate light and dark values. Dark mode uses higher opacity shadows for depth. |


## 2.2 Dark Mode Implementation
Dark mode ships at launch. The theme toggle lives in the top navigation bar. The user’s preference is persisted in localStorage and respected on page load via a script in the HTML head that prevents flash of wrong theme. Implementation uses the class strategy: a .dark class on the <html> element causes all token references to resolve to their dark variants.
Implementation: The next-themes library (already compatible with shadcn/ui) wraps the application in a ThemeProvider with attribute="class" and defaultTheme="system". The user can choose Light, Dark, or System (follows OS preference).
Design rule: No component may use hardcoded color values (hex, rgb, hsl literals). Every color reference must go through a Tailwind class that maps to a CSS variable: bg-background, text-foreground, border-border. This ensures dark mode works everywhere automatically and a designer can retheme without touching components.

## 2.3 Color Pallet
PipeLedger AI logo has been designed with main color Primary dark navy: #0B1F3A, Accent blue: #3B82F6 (used minimally as a structural highlight on one plane) and white background. These colors should be used 

# 3. Responsive Layout
PipeLedger targets desktop viewports. Phone layouts are out of scope for MVP. The minimum supported viewport is 1024px (small desktop). The primary experience is optimized for 1280px+ (laptop/desktop).

| Breakpoint | Tailwind Prefix | Viewport | Layout Behavior |
| --- | --- | --- | --- |
| Tablet | md: (768px) | 768px – 1023px | Sidebar collapses to icon-only rail (56px). Data tables reduce visible columns (non-essential columns hidden). Mapping editor switches from side-by-side to stacked layout. |
| Small desktop | lg: (1024px) | 1024px – 1279px | Sidebar expanded (240px). Full data table columns. Side-by-side mapping editor. |
| Desktop | xl: (1280px+) | 1280px and above | Full layout. Max content width 1400px centered. All features at full fidelity. |


## 3.1 Layout Shell
The application uses a fixed sidebar plus scrollable main content pattern. The sidebar contains navigation and the organization switcher. The main content area scrolls independently. On tablet, the sidebar collapses to an icon rail with tooltips, and a hamburger menu reveals the full sidebar as an overlay.
// Root layout structure (simplified)
<div className="flex h-screen overflow-hidden">
  <aside className="hidden md:flex md:w-14 lg:w-60 flex-col
    border-r border-border bg-card transition-all duration-200">
    <SidebarNav collapsed={isTablet} />
  </aside>
  <main className="flex-1 overflow-y-auto bg-background">
    <TopNav />
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      {children}
    </div>
  </main>
</div>

# 4. Component Architecture
Components are organized in four tiers. Each tier has clear responsibilities and import rules. Higher tiers can import from lower tiers but never the reverse.

| Tier | Directory | Contains | Import Rules |
| --- | --- | --- | --- |
| Primitives | components/ui/ | shadcn/ui base components: Button, Input, Dialog, Select, Table, Tooltip, DropdownMenu, Sheet, Badge, Skeleton, Toast (Sonner). | Import from Radix primitives and design tokens only. No business logic. No data fetching. |
| Patterns | components/patterns/ | Reusable compositions: DataTable (TanStack Table + virtual scroll), StatusBadge (pipeline status to color mapping), ConfirmDialog (two-step confirmation), ErrorMessage (tiered visibility), LoadingSkeleton (page-specific shapes). | Import from Primitives. May include UI logic (sorting, filtering). No data fetching. No business logic. |
| Features | components/features/ | Page-specific feature blocks: PipelineRunCard, ReviewCheckpointPanel, TaxonomyMappingEditor, SecurityRuleBuilder, ActivityLogTable, ConnectorSetupWizard, ExportVersionTimeline. | Import from Primitives and Patterns. Contains business logic. Uses TanStack Query hooks for data. Each feature is self-contained. |
| Pages | app/(dashboard)/ | Next.js App Router pages: Home, Pipelines, Data Review, Connectors, Schemas, Activity, Settings. | Compose Features. Handle route params and page-level layout. Use Suspense boundaries for loading. |


## 4.1 File Organization
apps/web/
  app/
    (auth)/          # Login, signup, password reset (no sidebar)
    (dashboard)/     # Authenticated pages (with sidebar)
      home/page.tsx
      pipelines/page.tsx
      pipelines/[id]/page.tsx
      data-review/page.tsx
      connectors/page.tsx
      schemas/page.tsx
      activity/page.tsx
      settings/page.tsx
    layout.tsx        # Root layout with ThemeProvider, QueryProvider
    globals.css        # Design tokens (all CSS variables here)
  components/
    ui/               # Tier 1: shadcn/ui primitives
    patterns/         # Tier 2: DataTable, StatusBadge, ConfirmDialog, etc.
    features/         # Tier 3: PipelineRunCard/, TaxonomyEditor/, etc.
  hooks/              # Shared hooks: useOrg, useRole, useMediaQuery
  lib/                # Utilities: supabase client, api helpers, formatters
  tailwind.config.ts  # Maps CSS variables to Tailwind classes

# 5. Performance Strategy
PipeLedger handles large financial datasets. The Data Review page may display 100K+ GL records. The Activity page accumulates thousands of audit entries. Performance is not optional — a sluggish finance tool destroys user trust. The strategy combines server-side pagination with client-side virtual scrolling.

## 5.1 Data Table Performance (Hybrid Pagination)
The DataTable pattern component uses a two-layer approach. The server delivers paginated chunks (500 rows per page by default). Within each page, @tanstack/react-virtual renders only the rows visible in the viewport (approximately 30–50 rows depending on row height). The DOM never holds more than around 50 rendered rows, even when the user scrolls through 500 records on the current page.

| Concern | Strategy | Implementation |
| --- | --- | --- |
| Server pagination | API returns 500 rows per page with total_count and cursor. | TanStack Query with keepPreviousData: true. Previous data shown while next page loads — no loading spinner between pages. |
| Virtual scrolling | Only visible rows rendered. Overscan: 10 rows above and below viewport. | @tanstack/react-virtual with dynamic row height measurement. Scroll position preserved on re-render. |
| Sorting | Server-side only. Client sort disabled (would only sort current page, misleading). | Sort column and direction sent as query params. TanStack Query key includes sort state for cache isolation. |
| Filtering | Server-side. Debounced input (300ms delay). | Filters sent as query params. TanStack Query key includes filter state. Filter bar is sticky above the table. |
| Column visibility | Client-side toggle. Hidden columns not rendered but data still fetched. | TanStack Table columnVisibility state. Persisted in localStorage per user per page. |
| Full export | Server-side stream. Export button streams all matching records to CSV, not limited to current page. | Next.js API route with streaming response. Progress toast in UI. |


## 5.2 Bundle and Load Performance

| Concern | Strategy | Target |
| --- | --- | --- |
| Initial bundle | Next.js automatic code splitting per route. Dynamic imports for Recharts, dnd-kit, Framer Motion. | First load JS < 150KB gzipped. |
| Font loading | Inter and JetBrains Mono via next/font (self-hosted, no CLS). font-display: swap. | No layout shift. Fonts render within 100ms. |
| Client caching | TanStack Query staleTime: 30s pipelines, 5min reference data. See State Management doc. | Page navigation feels instant on cache hit. |
| Prefetching | Next.js Link prefetch on sidebar nav. TanStack Query prefetch on hover for pipeline detail. | Page transitions < 100ms for cached routes. |
| LCP | Server-side rendering of page shell. Critical CSS inlined. | < 1.5s on desktop. |
| CLS | Explicit dimensions on skeletons. Font-display swap with size-matched fallback. | < 0.1. |
| INP | Virtual scrolling prevents DOM thrashing. React transitions for non-urgent updates. | < 200ms. |


# 6. Interactive Elements (Priority Order)
Interactive elements are built in priority order. Each uses the Patterns tier component where possible, with Feature-tier wrappers for business logic and data fetching.

## 6.1 P0: Data Tables
Data tables are the most-used component in PipeLedger. Every page except Settings has at least one. The DataTable pattern provides a consistent API across all pages.

| Page | Table Content | Key Interactions | Special Requirements |
| --- | --- | --- | --- |
| Home | Recent pipeline runs (5–10 rows) | Click to navigate to pipeline detail. Status badges update in real-time via Supabase Realtime. | Compact view, no pagination needed. |
| Pipelines | All pipeline runs for selected config | Sort by date/status. Filter by status. Click row for detail view with stage timeline. | Full hybrid pagination. Status badges animate on Realtime updates. |
| Data Review | GL records for current review checkpoint (up to 100K+ rows) | Sort, filter by account/department/period. Column visibility toggle. "Viewing as" role selector for RLS preview. | Largest table. Virtual scrolling critical. 500 rows per server page. |
| Connectors | Configured connectors with health status | Click to edit. Status badges (connected, error, disconnected). | Small dataset, simple table. |
| Schemas | Taxonomy mappings and dimension labels | Inline editing of mappings and labels. Confidence score badges. Unmapped filter. | Editable cells. Local draft state (see State Management doc). |
| Activity | Audit log entries | Filter by action type, pipeline, user, date range. Expandable rows for detail. | High volume, append-only growth. Virtual scrolling. Most recent first. |


## 6.2 P1: Toast Notifications and Confirmation Dialogs
Toasts provide non-blocking feedback for completed actions. Confirmation dialogs gate destructive or approval actions. Both patterns are critical for the audit-sensitive workflow.

| Pattern | When Used | Behavior |
| --- | --- | --- |
| Success toast | Pipeline started, checkpoint approved, delivery completed, connector connected. | Green accent. Auto-dismiss after 4 seconds. Bottom-right position. |
| Error toast | Pipeline failed (sanitized message), connector error, form validation failure. | Red accent. Persistent until dismissed. Includes link to Activity detail for Admin/Owner. |
| Warning toast | Approaching rate limits, long-running extraction (> 5 min), dbt test warnings (non-critical). | Yellow accent. Auto-dismiss after 6 seconds. |
| ConfirmDialog | Approve/reject checkpoint, retract export version, purge data, revoke delivery, delete connector. | Modal overlay with explicit action buttons. Destructive actions show red button with action name ("Retract Version", "Purge Data"). Two-step for purge (type confirmation). |
| Approval dialog | Input review approval, output review approval. | Shows summary: record count, period range, quality check results. Approve and Reject buttons with required rejection reason field. |


## 6.3 P2: Real-Time Pipeline Progress
When a pipeline is running, the UI shows a stage-by-stage progress indicator that updates in real-time via Supabase Realtime subscriptions. This is the most visually dynamic element in the application and the component where Framer Motion is used.

| Element | Behavior | Implementation |
| --- | --- | --- |
| Stage timeline | Horizontal step indicator showing all 7 stages (queued through succeeded). Current stage pulses. Completed stages show checkmark. Failed stage shows X with red highlight. | Framer Motion: AnimatePresence for stage transitions. layoutId for smooth position changes. Pulse animation on active stage via CSS keyframes. |
| Stage detail card | Below the timeline, shows current stage detail: record count progress (extraction), model name progress (transformation), endpoint status (delivery). | TanStack Query polling every 5s during active stages. Supabase Realtime for status transitions (instant). |
| Duration timer | Live elapsed time counter on active stages. Final duration shown on completed stages. | Client-side timer started on stage entry (from Realtime event). Server duration used for completed stages (accurate). |
| Blocked state | When pipeline is in input_review or output_review, the timeline shows an amber pulse with "Awaiting Review" label and a prominent "Review Now" button. | Button navigates to Data Review page with the correct checkpoint pre-selected. |


## 6.4 P3: Drag-and-Drop Mapping Interface
The taxonomy mapping and dimension label editors on the Schemas page use drag-and-drop to let finance teams map their accounts to the standard hierarchy. This is the most complex interactive component and uses dnd-kit for accessible, keyboard-navigable drag-and-drop.

| Element | Behavior | Implementation |
| --- | --- | --- |
| Two-panel layout | Left panel: company accounts (source). Right panel: standard taxonomy tree (target). User drags an account from left to a taxonomy node on right. | dnd-kit DndContext with two droppable containers. Side-by-side on desktop, stacked on tablet. |
| Auto-suggest highlights | Accounts with auto-suggested mappings show a dotted connector line to the suggested taxonomy node. Confidence score badge (high/medium/low) on each suggestion. | Confidence scores from taxonomy_mappings table. Lines drawn with SVG overlay. Color-coded by confidence token. |
| Bulk mapping | Select multiple accounts (checkbox), drag the group to a taxonomy node. All selected accounts mapped at once. | dnd-kit SortableContext for multi-select. Drag preview shows count badge. |
| Search and filter | Both panels have search bars. Left: search by account name/number. Right: search taxonomy tree (expand matching paths). | Client-side filter on loaded data. Tree auto-expands to show search matches. |
| Draft state | All changes are local until user clicks Save. Dirty state indicator. Discard button resets to last saved version. | React useState for draft (exception to TanStack Query pattern, see State Management doc). isDirty flag tracked. |


# 7. Loading States and Skeletons
Every page and every data-dependent component has an explicit loading state. No blank screens, no spinners without context. The skeleton loaders match the exact shape of the content they replace, preventing layout shift when data arrives.

| Page / Component | Loading State | Implementation |
| --- | --- | --- |
| Page-level (first load) | Full-page skeleton matching the page layout: sidebar (static), content area with placeholder cards and table rows. | Next.js loading.tsx file per route segment. Uses the LoadingSkeleton pattern component. |
| DataTable (pagination) | Previous page data stays visible (no skeleton). Subtle loading bar at top of table. Next page data swaps in when ready. | TanStack Query keepPreviousData: true. CSS transition on data swap. |
| DataTable (initial load) | Table header rendered immediately. Body shows 10 skeleton rows matching column widths. | shadcn/ui Skeleton component with table-specific dimensions. |
| Pipeline progress | Stage timeline renders immediately with all stages in "pending" state. Detail card shows skeleton. | Timeline is client-rendered from pipeline_runs status (available instantly from Realtime cache). |
| Charts (Recharts) | Chart container with fixed dimensions. Animated shimmer placeholder inside. | React Suspense boundary wrapping dynamically imported Recharts component. |
| Schemas editor | Two-panel layout rendered. Left panel shows skeleton list. Right panel shows skeleton tree. | Skeleton matches the two-panel structure. Loads taxonomy data and account data in parallel. |


# 8. Accessibility
PipeLedger targets WCAG 2.1 AA compliance. shadcn/ui (built on Radix UI) provides accessible primitives by default. The development team must maintain this baseline and extend it for custom components.

| Requirement | Standard | Implementation |
| --- | --- | --- |
| Keyboard navigation | All interactive elements reachable and operable via keyboard. | Radix UI primitives handle focus management. dnd-kit provides keyboard-accessible drag-and-drop. DataTable supports arrow key navigation between cells. |
| Screen reader support | ARIA labels on all interactive elements. Live regions for dynamic content. | Radix UI provides ARIA attributes. Pipeline status changes announced via aria-live polite region. Toast notifications use role: alert. |
| Color contrast | Minimum 4.5:1 for normal text, 3:1 for large text. Both light and dark themes. | Design tokens tested for contrast ratios. Semantic status colors (succeeded, failed, blocked) meet 3:1 against both light and dark backgrounds. |
| Focus indicators | Visible focus ring on all interactive elements. | Tailwind focus-visible:ring-2 ring-primary. Never removed or hidden. Works in both themes. |
| Motion preferences | Respect prefers-reduced-motion. | Framer Motion animations wrapped in useReducedMotion check. Tailwind motion-safe: prefix on CSS transitions. |
| Text scaling | UI remains usable at 200% text zoom. | Layout uses rem units (via design tokens). No fixed-height containers that clip text at larger sizes. |


# 9. Error States in the UI
Every component that fetches data must handle three states: loading (Section 7), success (render data), and error. Error states follow the tiered visibility model from the Error Handling and Logging Strategy doc: sanitized messages for all roles, technical detail for Admin/Owner only.

| Error Context | UI Treatment | Recovery Action |
| --- | --- | --- |
| API request failure (transient) | Inline error banner above the affected component. Yellow warning style. Auto-retry indicator: "Retrying... (attempt 2 of 3)". | TanStack Query automatic retry (3 attempts). If all fail, banner turns red with "Retry" button. |
| API request failure (persistent) | Red error banner with sanitized message. Replaces the component content (no partial data shown). | Manual "Retry" button. Link to Activity page for Admin/Owner. |
| Page-level error | Next.js error.tsx boundary. Full-page error card with message and "Go to Home" button. | Error boundary with reset function. Navigation to other pages still works (sidebar remains functional). |
| Form validation | Inline field-level errors (red border + message below field). Form-level summary at top for multiple errors. | React Hook Form + Zod validation. Errors clear on correction. Submit button disabled until valid. |
| WebSocket disconnection | Subtle banner at top of page: "Real-time updates paused. Reconnecting..." Auto-reconnects. | Supabase Realtime auto-reconnect. On reconnect, TanStack Query invalidates stale keys to catch up. |
| Empty state (no data) | Illustration + message specific to the page context. "No pipelines yet — create your first pipeline" with CTA button. | Not an error, but must be designed. Every table and list has a distinct empty state with guidance. |


# 10. Developer Rules

| # | Rule |
| --- | --- |
| 1 | No hardcoded colors anywhere in component code. Every color must reference a design token via Tailwind class (bg-background, text-primary, border-border, etc.). Run a lint rule to catch hex/rgb/hsl literals in .tsx files. |
| 2 | Component tier boundaries are enforced: Pages import Features, Features import Patterns and Primitives, Patterns import Primitives. Never import upward. No circular dependencies. |
| 3 | Every data-fetching component must handle all three states: loading (skeleton), success (render data), and error (ErrorMessage pattern with tiered visibility). No blank screens. |
| 4 | Data tables always use the DataTable pattern component. No one-off table implementations. Column definitions live in the Feature tier; the table rendering logic lives in the Pattern tier. |
| 5 | Virtual scrolling is mandatory for any list or table that can exceed 100 rows. The DataTable pattern includes this by default. Custom lists must use @tanstack/react-virtual explicitly. |
| 6 | Framer Motion is only used for the pipeline progress timeline and page transitions. All other animations use Tailwind CSS transitions (transition-all, duration-200). Respect prefers-reduced-motion. |
| 7 | All forms use React Hook Form + Zod. Schema definitions live in shared/lib/schemas/ and are shared between frontend validation and API route validation. Single source of truth for validation rules. |
| 8 | Dark mode must be tested for every new component before merge. The design token system makes this automatic if Rule 1 is followed, but visual review is still required for contrast and readability. |
| 9 | Empty states are required for every table, list, and dashboard widget. Each empty state has a contextual message and a CTA pointing the user to the next action. No generic "No data" messages. |
| 10 | Responsive behavior must work at 768px minimum. Test every page at md (768px), lg (1024px), and xl (1280px) breakpoints. Sidebar collapse, table column hiding, and layout stacking must all function. |


END OF FRONTEND STRATEGY — v1.0