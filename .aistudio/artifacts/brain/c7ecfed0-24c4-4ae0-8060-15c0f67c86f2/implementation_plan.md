# Island Map Plotter & Coordinate Dashboard

A responsive, minimalist web application for exploring maps, plotting custom landmark pins with configurable categories and icons, and saving coordinate data directly to a personal Firebase dashboard with support for custom map image uploads and landmark solving.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed based on your preferences:
> - **Default Map**: The application will load the Wingfril Island Beach map by default with a clean slate (no pre-existing pins), with an instant "Upload Custom Map" switcher.
> - **Persistence**: Coordinate pins and user categories will be stored in Firebase Firestore linked to your user account, complemented by offline LocalStorage caching and JSON export/import for zero data loss on Vercel deployments.
> - **Custom Categories & Icons**: Users can create customized landmark categories with custom color palettes and icon selections (e.g., Quest, Monster, NPC, Portal, Treasure, Camp, Hazard, Point of Interest).
> - **Minimalist Interface & Solver Tab**: Clean, uncluttered design respecting your instruction to keep the solver tab simple, intuitive, and not overcomplicated.

- **Confirmed Decision 1**: Clean initial canvas featuring Wingfril Island Beach with click-to-drop pin creation.
- **Confirmed Decision 2**: Firebase Firestore persistence with real-time sync and easy JSON backup export/import.
- **Confirmed Decision 3**: Custom user-defined categories with dedicated colors, icons, and live search filtering.
- **Confirmed Decision 4**: Responsive dual-mode viewport (desktop multi-pane split, mobile bottom drawer and thumb-friendly controls) adhering to Vercel static hosting compatibility.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an interactive, high-precision 2D map viewport where players and cartographers can pan, zoom, click to drop pins, assign names and custom category tags, inspect coordinates $(X, Y)$, filter landmarks with an instant search bar, view hover tooltips, and manage all saved coordinates in a personal dashboard and solver view.
- **Target Audience**: Gamers, MMORPG / RPG adventurers (e.g. The World of Magic / Wingfril Island players), tabletop mapmakers, and game strategists needing exact coordinate logs.
- **Key Value**: Eliminates lost game notes and messy coordinate lists by providing a visual, drag-and-zoom plotter that saves directly to Firebase with instant search filtering.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Viewing & Navigating the Map**:
   - The user arrives on the Map Plotter. The Wingfril Island Beach map is displayed centered in an interactive pan-and-zoom viewport with zoom controls ($+$, $-$, Reset, Fit to Screen) and mousewheel / pinch-to-zoom support.
   - Users can drag to pan around the island or toggle "Upload Map" to replace the canvas with any custom game map image (stored locally in memory/indexedDB).

2. **Dropping & Customizing Pins**:
   - Clicking anywhere on the map activates the "New Pin" modal or inline placement card showing the exact calculated coordinates $(X, Y)$ and percentage position $(X\%, Y\%)$.
   - The user types a Pin Name (e.g., "Pirate Ship Wreck", "Elder NPC", "Secret Shore Portal"), picks a category (e.g., "Portals", "Boss Spawns", "Quests", or "+ New Category"), selects an icon and accent color, and saves.
   - The pin appears immediately on the map with a glowing marker. Hovering reveals a clean tooltip with its name and category.

3. **Searching & Filtering Pins**:
   - An intuitive search bar at the top allows instant text filtering by pin title or category.
   - Category chips allow quick toggling of visible pins on the map (e.g., hide all monsters, show only portals).

4. **Personal Coordinate Dashboard**:
   - Switching to the "Dashboard" tab presents a clean tabular list of all saved coordinates with tabular numerals, category tags, creation dates, quick "Center on Map" jump buttons, edit modals, and one-click JSON export.

5. **Solver Tab**:
   - A minimalist, clean "Solver" tab designed as-is without overcomplication. Allows users to calculate distances between pins, find nearest landmarks to a given $(X, Y)$ coordinate, and inspect route sequences.

### Visual Identity & Theme

- **Aesthetic Direction**: Minimalist cartography meets clean modern SaaS. Light, airy, unobtrusive borders and crisp typography so the map remains the dominant focal point.
- **Color Palette**:
  - Dominant Neutral Canvas (60%): `#F8FAFC` (slate-50 canvas), `#FFFFFF` (card surfaces)
  - Structural Borders & Hairlines (30%): `#E2E8F0` (slate-200), subtle `#0F172A` headings
  - Intentional Accent (10%): `#0284C7` (Sky blue primary) for interactive controls, with vibrant user-chosen pin colors (Emerald, Amber, Violet, Rose, Cyan).
- **Typography**: Clean sans-serif (`system-ui` / `Plus Jakarta Sans`) with monospace tabular numerals (`font-mono tabular-nums`) for coordinate precision.
- **Mobile Ergonomics**: 44px minimum tap targets, floating bottom toolbar for zoom and pin placement, and sliding sheet for pin inspection.

---

## 3. Key Product Decisions & Trade-Offs

- **Client-Side Pan & Zoom Canvas**:
  - *Chosen Approach*: Lightweight CSS transform + pointer gesture state engine supporting mouse drag, scroll wheel, touch pinch, and touch drag.
  - *Why*: Ultra-fast 60 FPS performance without heavy external map libraries (like Leaflet or OpenLayers) that introduce complex coordinate projection friction for custom flat image maps.
  - *Alternatives Considered*: Leaflet with Simple CRS. Leaflet adds bulky CSS and bundle size and complicates custom pixel-coordinate math compared to a direct SVG/HTML5 interactive canvas.

- **Persistence Layer (Firebase Firestore + Local Fallback)**:
  - *Chosen Approach*: Firebase Firestore for persistent user cloud storage with automatic guest session / LocalStorage synchronization.
  - *Why*: Satisfies the user's explicit preference for Firebase while ensuring the app works instantly without blocking users who want to plot coordinates right away.
  - *Vercel Compatibility*: Fully client-side Firebase SDK configuration, ensuring seamless static hosting on Vercel's free tier with zero serverless timeout limits.

- **Coordinate System Normalization**:
  - *Chosen Approach*: Store coordinates both as normalized percentages $(0.0\% - 100.0\%)$ and as pixel integers based on native image resolution (e.g. $2048 \times 2048$).
  - *Why*: Normalized percentages ensure pins remain pixel-perfect across different window sizes, device displays, and zoom levels.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Navigation Header                             │
│   [Island Plotter]  ·  [Map View]  [Dashboard]  [Solver]  ·  [Search]   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Interactive Map Viewport       │  │    Coordinate Dashboard      │
│  - Pan & Zoom Gesture Surface        │  │  - Search & Category Filter  │
│  - Wingfril Island / Custom Image    │  │  - Tabular Coordinate Table  │
│  - Dropped Pin Markers with Icons    │  │  - JSON Export / Import      │
│  - Hover Tooltips & Click Inspector  │  │  - Edit / Delete Handlers    │
│  - Coordinate Reticle & Zoom HUD     │  └──────────────┬───────────────┘
└──────────────────┬───────────────────┘                 │
                   │                                     │
                   └─────────────────┬───────────────────┘
                                     ▼
                   ┌───────────────────────────────────┐
                   │        Solver & Path Tools        │
                   │  - Distance Calculator            │
                   │  - Nearest Landmark Resolver      │
                   │  - Simple Clean Layout            │
                   └─────────────────┬─────────────────┘
                                     ▼
                   ┌───────────────────────────────────┐
                   │    State & Persistence Layer      │
                   │  - Firebase Firestore Collections │
                   │  - LocalStorage Offline Mirror    │
                   │  - Pin & Category Data Schema     │
                   └───────────────────────────────────┘
```

### Data Model & Schema

```typescript
export interface Pin {
  id: string;
  name: string;
  description?: string;
  xPercent: number;     // 0 to 100 normalized
  yPercent: number;     // 0 to 100 normalized
  pixelX: number;       // calculated based on base image width
  pixelY: number;       // calculated based on base image height
  categoryId: string;
  color: string;        // Hex or Tailwind color token
  icon: string;         // Lucide icon identifier (e.g. 'MapPin', 'Shield', 'Sparkles', 'Anchor')
  createdAt: number;
  userId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface MapMetadata {
  id: string;
  title: string;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}
```

### Planned Implementation Steps

1. **Firebase Initialization & RPC Setup**:
   - Provision Firebase Firestore and Authentication following the `firebase-integration-rpc` guidelines (`show_aistudio_ui`, terms check, and `ProvisionFirebase`).
   - Configure `firebase-blueprint.json` and strict `firestore.rules` for pins and categories.

2. **Core Interactive Map Viewport**:
   - Create responsive Pan/Zoom canvas with smooth gesture handling, zoom limits (25% to 500%), coordinate readout at mouse pointer, and drop-pin crosshairs.
   - Embed high-resolution Wingfril Island Beach map asset with fallback custom image uploader.

3. **Pin Creation & Customization Modal**:
   - Modal for custom pin naming, icon picker (selection of 16 RPG/adventure icons like Anchor, Skull, Flag, Compass, Sparkles, Gem, Shield, Castle), and color palette.
   - Category management modal to add/edit user-defined categories.

4. **Personal Coordinate Dashboard**:
   - High-density table with search filter, category toggles, sorting by date or coordinate, jump-to-pin action, and JSON export/import.

5. **Landmark Solver Tab**:
   - Simple, uncluttered solver tool: point-to-point distance matrix, nearest neighbor search, and coordinate locator.
