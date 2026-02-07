# Home Inventory PWA — UI/UX Design Document

**Version:** 1.0  
**Date:** 7 February 2026  
**Author:** UI/UX Design Agent

---

## 1. Competitive Analysis

### Apps Reviewed

| App | Strengths | Weaknesses |
|-----|-----------|------------|
| **Sortly** | Polished UI, QR/barcode labels, multi-location, strong web interface | Business-focused pricing ($29–149/mo), no family sharing, no lending, sudden price hikes reported |
| **Encircle** | Unlimited photos/video, insurance-oriented tips, affordable | Insurance-claim focused — not a general "where's my stuff" tool, dated UI |
| **Spullio** | AI photo recognition, family households, lending tracker, PWA + native | New to market, English/Dutch only, 50-item free tier is tight |
| **HomeBox** | Free self-hosted, unlimited items, open source | Web-only, no mobile app, requires self-hosting — non-starter for normal people |
| **Under My Roof** | Beautiful UI, home maintenance + inventory combined, privacy-first | Apple-only, $35/yr, no AI features |
| **Find My Stuff** | Container metaphor, offline, Google Drive backup, Excel export | Android-only, no AI, ugly UI |
| **Nest Egg** | Simple, consumer-friendly | Limited free tier, stale development |
| **Airtable (as inventory)** | Infinitely flexible, AI builder | Not purpose-built — requires setup effort, no camera-first workflow |

### Key Insights from the Market

1. **Nobody nails the "snap and done" flow.** Even Spullio's AI recognition requires too many taps after identification. The gold standard should be: photo → AI fills everything → one-tap confirm.
2. **Location hierarchy is universally weak.** Most apps use flat folders or simple tags. Nobody does Property → Room → Spot (shelf, drawer, box) properly.
3. **"Where is my X?" is an afterthought.** No app puts search front and centre as the primary interaction. They all bury it behind navigation.
4. **Insurance value tracking is table stakes** but most apps treat it as a secondary field rather than surfacing total value prominently.
5. **Family/household sharing is rare** and poorly implemented when it exists.
6. **Offline is claimed but poorly executed** — most apps just cache a read-only list, not full CRUD.

### Our Opportunity

Build the app that **Spullio is trying to be** but with:
- A faster, more magical add-item flow (camera-first, AI-first)
- Proper 3-level location hierarchy
- Search as the hero interaction
- Genuinely good offline support
- A design quality level closer to Under My Roof

---

## 2. Information Architecture

```
App
├── Dashboard (home)
│   ├── Total value card
│   ├── Quick search bar (prominent)
│   ├── Recent items (horizontal scroll)
│   ├── Category breakdown (visual)
│   └── Quick actions
├── Add Item (camera FAB)
│   ├── Camera capture
│   ├── AI identification
│   ├── Detail confirmation/edit
│   └── Location assignment
├── Inventory (browse)
│   ├── Search + filters
│   ├── Grid/list view toggle
│   ├── Filter by location/category/tag
│   └── Item detail
│       ├── Photos
│       ├── Details (name, brand, model, serial, value, purchase date)
│       ├── Location breadcrumb
│       ├── Documents (receipts, manuals, warranty)
│       ├── Notes
│       └── Actions (move, lend, archive, delete)
├── Locations
│   ├── Properties list
│   ├── Property → Rooms
│   ├── Room → Spots
│   └── Spot → Items in this spot
└── Settings
    ├── Profile
    ├── Household members
    ├── Export data
    ├── Categories management
    └── About / Help
```

---

## 3. UX Flows

### 3.1 First-Time User Onboarding

**Philosophy:** Get to value in under 60 seconds. No sign-up wall for first use — let them add their first item before asking for an account.

**Flow:**

1. **Welcome screen** — Single illustration, headline: "Know what you own." Subline: "Snap a photo. We'll handle the rest." One button: "Get started"
2. **Create your first location** — "Where do you live?" → User types property name (e.g., "Home"). Suggest creating 3–4 rooms: "Living Room, Kitchen, Bedroom, Garage" with quick-add chips. Skip button available. **No room images required** — just names with auto-assigned icons.
3. **Add your first item** — Camera opens immediately. After successful add: celebration moment (confetti, subtle). "Your first item! Only 999 to go 😄"
4. **Account creation** — Prompted after first item is saved. "Create an account to sync across devices." Email + password or Sign in with Apple/Google. **Skip is allowed** — data stays local until they sign up.

**Edge cases:**
- User denies camera permission → show manual-add fallback with "Add photo from library" + text entry
- User skips everything → land on empty dashboard with prominent "Add your first item" CTA

### 3.2 Adding an Item (Core Flow)

This is the most important flow in the app. It must feel **magical and fast**.

**Flow:**

1. **Tap FAB** (floating action button, bottom-centre) → Camera viewfinder opens instantly (full-screen, no intermediate screen)
2. **Capture** — Large shutter button. Option to switch to photo library (small icon, top-right). Tap to capture.
3. **AI Processing** (1–3 seconds) — Photo shrinks to top of screen. Below it, a skeleton UI appears showing fields being "typed in" by AI with a shimmer animation. Fields populate one by one: Name, Category, Brand, Estimated Value. This feels alive and magical.
4. **Confirm/Edit** — All AI-suggested fields are shown as editable chips/fields. Correct suggestions have a subtle green checkmark. User can tap any field to edit. **Location picker** is a prominent button: "📍 Add location" → opens bottom sheet with Property → Room → Spot drill-down. User can also create new rooms/spots inline.
5. **Save** — Single "Save" button at bottom. Optional: "Save & Add Another" for batch adding.

**Timing target:** Photo to saved item in under 10 seconds if AI is accurate.

**Edge cases:**
- AI can't identify → show empty fields, user fills manually. Headline: "We couldn't identify this. Help us out?"
- Multiple items in photo → AI picks the most prominent, notes "We spotted multiple items. Tap to add others."
- Offline → item saved locally with photo, AI identification queued for when connection returns. Show "📡 Will identify when online" badge.
- Bad photo (blurry, dark) → after capture, show "This photo looks blurry. Retake?" with preview.

### 3.3 Browsing & Searching Inventory

**Default view:** Grid of item photos (2 columns), sorted by recently added. Each card shows: photo thumbnail, item name, location tag.

**Search:**
- Search bar is **always visible** at top of inventory screen (no need to tap an icon first)
- Natural language: "blue backpack in garage" should work
- Results update as you type (local search, instant)
- Recent searches shown when search bar is focused
- "Where is my...?" phrasing accepted naturally

**Filters (horizontal chip bar below search):**
- Category (Electronics, Furniture, Clothing, Kitchen, Tools, Books, etc.)
- Location (drill-down: Property → Room → Spot)
- Value range
- Date added
- Has receipt / Has warranty

**View toggle:** Grid (default) ↔ List (compact, shows more metadata per row)

**Sort options** (accessible via sort icon): Recently added, Name A–Z, Value high→low, Value low→high

### 3.4 Location Management

**Hierarchy:** Property → Room → Spot

- **Property**: A home, office, storage unit, holiday house. Icon + name + address (optional).
- **Room**: Kitchen, bedroom, garage, etc. Auto-suggested icons based on name.
- **Spot**: "Top shelf", "Drawer 3", "Under sink", "Toolbox". Freeform text.

**Location management screen:**
- Shows properties as expandable cards
- Tap property → shows rooms as a grid of cards with icons and item count
- Tap room → shows spots as a list + items in that room
- Tap spot → filtered item list

**Inline creation:** Anywhere a location picker appears, user can create new properties/rooms/spots without leaving the flow. Bottom sheet with quick text input.

**Moving items:** On item detail, "Move" action opens location picker. Bulk move available from inventory view (long-press to select multiple → "Move" action in toolbar).

### 3.5 Dashboard

**Layout (top to bottom):**

1. **Header**: "Hi, [Name]" + date. Settings gear icon top-right.
2. **Search bar**: Prominent, full-width. Placeholder: "Where is my...?"
3. **Value card**: Total inventory value, large number. Subtle sparkline showing value over time. Tap for breakdown.
4. **Quick stats row**: [Items: 247] [Rooms: 12] [Categories: 8] — horizontal, compact.
5. **Recently added**: Horizontal scrolling cards (last 5 items). Each card: photo + name + time ago.
6. **Categories**: Visual grid showing top categories with item count and small representative photo. E.g., "Electronics (34)" with icon.
7. **Locations**: Compact view of properties with room counts. Deep link to location management.

### 3.6 "Where is my...?" Quick Search

This is the **hero feature** and should be accessible from everywhere:

- **Dashboard search bar** (always visible, first thing on screen)
- **Spotlight-style shortcut**: Pull down on any screen to reveal search (iOS-native gesture)
- **Share sheet integration**: User can search from iOS share sheet / Spotlight

The search is **fuzzy and forgiving**:
- "charger" finds "iPhone USB-C Charger"
- "kitchen scissors" finds "Scissors" located in "Kitchen"
- Searches item names, categories, tags, notes, AND location names
- Results show location prominently: "iPhone Charger → **Bedroom > Desk > Top drawer**"

---

## 4. Mobile-First PWA Considerations (iOS Safari)

### 4.1 Navigation: Bottom Tab Bar

**Decision: Bottom tab bar, 4 tabs + centre FAB.**

```
[Dashboard]  [Inventory]  [+]  [Locations]  [Settings]
    🏠           📦        📷      📍          ⚙️
```

Rationale:
- Bottom nav is thumb-friendly and the iOS standard
- Hamburger menus hide functionality and reduce engagement
- 4 tabs + FAB keeps it simple (5 is the iOS max recommendation)
- The FAB (camera/add) is elevated and visually distinct — a round button that breaks the tab bar line, always inviting

### 4.2 Camera UX on iOS PWA

**Critical constraints:**
- iOS PWA uses `<input type="file" capture="environment">` — no live viewfinder via getUserMedia in standalone PWA mode (this is an iOS limitation)
- This means the camera opens as the native iOS camera UI, not a custom viewfinder

**Design around this:**
1. When user taps the FAB, we use `<input type="file" accept="image/*" capture="environment">` which opens the native iOS camera
2. After photo is taken and returned, our AI processing screen takes over
3. Also offer "Choose from library" as equal option — many users will photograph items at different times
4. Consider: if we ship as a native wrapper (Capacitor), we get full camera API access. **Recommend Capacitor for v2**, PWA for v1.

**For the PWA v1:**
- Embrace the native camera handoff — it's actually familiar to users
- Focus the custom UX on the **post-capture** AI identification flow
- Pre-fill the camera button affordance to set expectations: "Opens camera to snap your item"

### 4.3 Offline Indicators

- **Persistent subtle banner** at top when offline: "You're offline — changes will sync when connected" (warm amber, not alarming red)
- Items created offline get a small cloud-with-arrow icon (↑) indicating "pending sync"
- When back online, brief toast: "✓ Synced" with count of items synced
- Offline mode should support: viewing all items, adding items (minus AI identification), editing items, searching
- AI identification queues requests and processes them when online — show skeleton placeholder for AI fields

### 4.4 Install Prompt UX

**Strategy: Contextual, not aggressive.**

1. **Don't show on first visit.** Let user experience value first.
2. **After adding 3rd item**, show a gentle bottom sheet: "Add to Home Screen for quick access. Your items stay with you, even offline." with iOS-specific instructions (share icon → Add to Home Screen) since iOS doesn't have native install prompts.
3. **Persistent but dismissible** subtle banner on dashboard after 5+ items if not installed.
4. Show step-by-step visual guide for iOS (screenshot of share button → "Add to Home Screen" option) since this isn't intuitive.

---

## 5. Screen-by-Screen Wireframe Descriptions

### Screen 1: Dashboard

```
┌─────────────────────────────┐
│ Hi, George            ⚙️    │
│ Saturday, 7 Feb              │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔍 Where is my...?      │ │
│ └─────────────────────────┘ │
│                              │
│ ┌─────────────────────────┐ │
│ │   Total Value            │ │
│ │   £12,340               │ │
│ │   ▁▂▃▅▆▇ +£240 this mo  │ │
│ └─────────────────────────┘ │
│                              │
│  247 items · 12 rooms · 8 cat│
│                              │
│ Recently Added            →  │
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │ 📷  │ │ 📷  │ │ 📷  │    │
│ │ iPad│ │Lamp │ │Drill│    │
│ │ 2m  │ │ 1d  │ │ 3d  │    │
│ └─────┘ └─────┘ └─────┘    │
│                              │
│ Categories                   │
│ ┌──────────┐ ┌──────────┐   │
│ │💻 Tech   │ │🪑 Furn   │   │
│ │   34     │ │   28     │   │
│ ├──────────┤ ├──────────┤   │
│ │🔧 Tools  │ │📚 Books  │   │
│ │   19     │ │   45     │   │
│ └──────────┘ └──────────┘   │
│                              │
├─────────────────────────────┤
│ 🏠    📦    [📷]   📍   ⚙️  │
└─────────────────────────────┘
```

**Interactions:**
- Search bar: tap → full-screen search overlay with keyboard, recent searches
- Value card: tap → breakdown by category (animated pie/bar chart)
- Recent items: horizontal scroll, tap → item detail
- Categories: tap → filtered inventory view
- FAB (📷): opens camera / photo picker

### Screen 2: Add Item — AI Processing

```
┌─────────────────────────────┐
│ ← Add Item                   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │     [Photo preview]     │ │
│ │     (rounded corners)   │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                              │
│  ✨ Identifying...           │
│                              │
│  Name    ░░░░░░░░░░░░░      │
│  Category ░░░░░░░░░░        │
│  Brand   ░░░░░░░░           │
│  Value   ░░░░░░             │
│                              │
│  (shimmer animation on       │
│   skeleton fields)           │
│                              │
└─────────────────────────────┘
```

After AI completes (fields animate in one by one, 200ms stagger):

```
┌─────────────────────────────┐
│ ← Add Item                   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │     [Photo preview]     │ │
│ └─────────────────────────┘ │
│                              │
│  Name     [DeWalt Drill   ]✓│
│  Category [Tools ▼        ]✓│
│  Brand    [DeWalt         ]✓│
│  Est.Value[£89            ] │
│  Serial # [               ] │
│  Notes    [               ] │
│                              │
│  📍 Where is this?           │
│  ┌─────────────────────────┐│
│  │ Home > Garage > Shelf 2 ││
│  └─────────────────────────┘│
│                              │
│  📎 Add receipt or document  │
│                              │
│ ┌───────────┐ ┌────────────┐│
│ │   Save    │ │Save & Next ││
│ └───────────┘ └────────────┘│
└─────────────────────────────┘
```

**Interactions:**
- ✓ checkmarks on AI-confident fields (>80% confidence). Tap to edit any field.
- Category is a dropdown/bottom-sheet picker
- "Where is this?" opens location picker bottom sheet (3-level drill-down)
- "Add receipt" opens document camera or file picker
- "Save & Next" saves and immediately opens camera again (batch mode)
- Photo can be tapped to view full-size or add additional photos (multi-photo carousel)

### Screen 3: Location Picker (Bottom Sheet)

```
┌─────────────────────────────┐
│ ─── (drag handle)            │
│ Choose Location              │
├─────────────────────────────┤
│                              │
│ 🏠 Home                    > │
│ 🏢 Office                  > │
│ 📦 Storage Unit             > │
│                              │
│ + Add property               │
└─────────────────────────────┘
```

After tapping "Home":

```
┌─────────────────────────────┐
│ ─── (drag handle)            │
│ ← Home                      │
├─────────────────────────────┤
│                              │
│ 🛋️ Living Room         12  > │
│ 🍳 Kitchen              8  > │
│ 🛏️ Bedroom             15  > │
│ 🚗 Garage               6  > │
│ 🛁 Bathroom             3  > │
│                              │
│ + Add room                   │
└─────────────────────────────┘
```

After tapping "Garage":

```
┌─────────────────────────────┐
│ ─── (drag handle)            │
│ ← Home > Garage              │
├─────────────────────────────┤
│                              │
│ Use this room (no spot)  ✓   │
│ ─────────────────────────    │
│ 🔲 Workbench            3    │
│ 🔲 Shelf 1              2    │
│ 🔲 Shelf 2              1    │
│ 🔲 Toolbox              4    │
│                              │
│ + Add spot                   │
└─────────────────────────────┘
```

**Interactions:**
- Back navigation via ← breadcrumb
- Item counts shown per room/spot
- "Use this room" lets user skip spot selection (just assign to room-level)
- "+ Add spot" opens inline text field — type name, hit return, done
- Sheet is draggable (half-screen default, drag up for full-screen)

### Screen 4: Inventory Browse

```
┌─────────────────────────────┐
│ Inventory              ≡ ⊞  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔍 Search items...      │ │
│ └─────────────────────────┘ │
│ [All] [Tech] [Tools] [Furn] │
│                         ↕   │
├─────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ │
│ │   📷      │ │   📷      │ │
│ │           │ │           │ │
│ │ iPad Pro  │ │ Desk Lamp │ │
│ │ Office    │ │ Bedroom   │ │
│ │ £999      │ │ £45       │ │
│ ├───────────┤ ├───────────┤ │
│ │   📷      │ │   📷      │ │
│ │           │ │           │ │
│ │ DeWalt    │ │ Bookshelf │ │
│ │ Garage    │ │ Living Rm │ │
│ │ £89       │ │ £120      │ │
│ ├───────────┤ ├───────────┤ │
│ │   📷      │ │   📷      │ │
│ │           │ │           │ │
│ │ Vitamix   │ │ Dyson V15 │ │
│ │ Kitchen   │ │ Hallway   │ │
│ │ £350      │ │ £530      │ │
│ └───────────┘ └───────────┘ │
├─────────────────────────────┤
│ 🏠    📦    [📷]   📍   ⚙️  │
└─────────────────────────────┘
```

**Interactions:**
- ≡ / ⊞ toggles list/grid view
- ↕ opens sort options (bottom sheet)
- Category chips scroll horizontally; tap to filter
- Long-press item → selection mode (multi-select, bulk actions: move, delete, export)
- Pull-to-refresh
- Infinite scroll with subtle loading indicator

### Screen 5: Item Detail

```
┌─────────────────────────────┐
│ ←                    ✏️  ⋮  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │    [Full-width photo]   │ │
│ │                         │ │
│ │  ● ○ ○  (photo dots)   │ │
│ └─────────────────────────┘ │
│                              │
│ DeWalt DCD791 Drill          │
│ 🔧 Tools · 📍 Garage > Shelf│
│                              │
│ ┌─────────────────────────┐ │
│ │ Value    │ £89           │ │
│ │ Brand    │ DeWalt        │ │
│ │ Model    │ DCD791        │ │
│ │ Serial   │ DW29481...    │ │
│ │ Bought   │ 14 Mar 2024   │ │
│ │ Warranty │ Until Mar 2026│ │
│ └─────────────────────────┘ │
│                              │
│ 📎 Documents                 │
│ ┌──────────┐ ┌──────────┐   │
│ │📄Receipt │ │📄Manual  │   │
│ └──────────┘ └──────────┘   │
│                              │
│ 📝 Notes                     │
│ "Needs new battery soon"     │
│                              │
│ ┌───────┐ ┌───────┐ ┌─────┐│
│ │ Move  │ │ Lend  │ │ 🗑️  ││
│ └───────┘ └───────┘ └─────┘│
└─────────────────────────────┘
```

**Interactions:**
- Photo carousel swipeable, tap for full-screen zoom
- ✏️ enters edit mode (all fields become editable)
- ⋮ overflow: Duplicate, Archive, Share, Export
- Location breadcrumb is tappable → jumps to that location's view
- "Move" opens location picker
- "Lend" opens lending flow (who, when, optional return date)
- 🗑️ delete with confirmation: "Delete DeWalt Drill? This can't be undone."
- Warranty date highlighted in amber/red if expiring soon

### Screen 6: Locations

```
┌─────────────────────────────┐
│ Locations                    │
├─────────────────────────────┤
│                              │
│ ┌─────────────────────────┐ │
│ │ 🏠 Home                 │ │
│ │ 8 rooms · 187 items     │ │
│ │ ┌─────┐┌─────┐┌─────┐  │ │
│ │ │🛋️12 ││🍳 8 ││🛏️15 │  │ │
│ │ └─────┘└─────┘└─────┘  │ │
│ └─────────────────────────┘ │
│                              │
│ ┌─────────────────────────┐ │
│ │ 🏢 Office               │ │
│ │ 3 rooms · 42 items      │ │
│ │ ┌─────┐┌─────┐┌─────┐  │ │
│ │ │💻22 ││📋12 ││☕ 8  │  │ │
│ │ └─────┘└─────┘└─────┘  │ │
│ └─────────────────────────┘ │
│                              │
│ ┌─────────────────────────┐ │
│ │ + Add Property           │ │
│ └─────────────────────────┘ │
│                              │
├─────────────────────────────┤
│ 🏠    📦    [📷]   📍   ⚙️  │
└─────────────────────────────┘
```

**Interactions:**
- Tap property card → expand to room list (or navigate to property detail)
- Room mini-chips show icon + item count, tap → filtered view of items in room
- Long-press property/room → edit name, reorder, delete (with item reassignment prompt)
- Swipe room card to delete (with confirmation)

### Screen 7: Search Results

```
┌─────────────────────────────┐
│ ← 🔍 charger             ✕  │
├─────────────────────────────┤
│ 3 results                    │
│                              │
│ ┌─────────────────────────┐ │
│ │ 📷 iPhone USB-C Charger │ │
│ │ 📍 Bedroom > Desk >     │ │
│ │    Top drawer            │ │
│ │ ⚡ Electronics · £19     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📷 MacBook Charger      │ │
│ │ 📍 Office > Desk        │ │
│ │ ⚡ Electronics · £79     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📷 DeWalt Battery       │ │
│ │    Charger               │ │
│ │ 📍 Garage > Workbench   │ │
│ │ 🔧 Tools · £35          │ │
│ └─────────────────────────┘ │
│                              │
│ ─── Not what you're looking  │
│ for? Try browsing by         │
│ location or category.        │
│                              │
└─────────────────────────────┘
```

**Key design choice:** Location is the **most prominent** piece of information in search results because the primary use case is "where is my thing?" — not "what do I own?"

### Screen 8: Settings

```
┌─────────────────────────────┐
│ Settings                     │
├─────────────────────────────┤
│                              │
│ 👤 Account                   │
│ george@email.com         >   │
│                              │
│ 👥 Household                 │
│ 2 members                >   │
│                              │
│ 🏷️ Categories               │
│ Manage custom categories >   │
│                              │
│ 💰 Currency                  │
│ GBP (£)                 >   │
│                              │
│ 📤 Export Data               │
│ CSV, PDF, or JSON        >   │
│                              │
│ 🔔 Notifications             │
│ Warranty reminders       >   │
│                              │
│ ℹ️ About                     │
│ Version 1.0.0            >   │
│                              │
│ 🚪 Sign Out                  │
│                              │
├─────────────────────────────┤
│ 🏠    📦    [📷]   📍   ⚙️  │
└─────────────────────────────┘
```

---

## 6. Animations & Micro-interactions

| Interaction | Animation |
|---|---|
| **AI field population** | Fields shimmer (skeleton), then each populates with a quick fade-in + slight slide-up, 200ms stagger between fields |
| **Save item** | Card zooms out to its position in the grid with a satisfying scale-down + slight bounce |
| **Delete item** | Card collapses vertically, items below slide up to fill gap |
| **Tab switching** | Crossfade (no slide — feels faster) |
| **Pull to refresh** | Custom spinner: rotating inventory icon |
| **Location drill-down** | Slide-left transition within bottom sheet |
| **First item added** | Brief confetti burst (subtle, 1 second) |
| **Search** | Results fade in progressively as typed |
| **Offline indicator** | Slides down from top, amber. Slides away when reconnected. |
| **FAB tap** | FAB morphs/expands slightly before camera opens |

---

## 7. Visual Design Direction

### Philosophy
**"Calm utility."** This is a household tool people open when they need to find something or add something. It should feel trustworthy, clean, and efficient — like a well-organised toolbox, not a social media app. Think **Apple Notes meets Things 3**.

### Colour Palette

| Role | Colour | Hex | Usage |
|---|---|---|---|
| **Primary** | Slate blue | `#4A6FA5` | Headers, active tab, primary buttons, links |
| **Primary Dark** | Deep navy | `#2D4A7A` | Status bar, emphasis |
| **Surface** | Warm white | `#FAFAF8` | Background |
| **Card** | Pure white | `#FFFFFF` | Cards, sheets, modals |
| **Text Primary** | Near-black | `#1A1A2E` | Headlines, body text |
| **Text Secondary** | Warm grey | `#6B7280` | Captions, metadata |
| **Accent** | Soft amber | `#E8A838` | Value highlights, warnings, badges |
| **Success** | Sage green | `#5B9A6F` | Confirmations, AI confidence indicators |
| **Danger** | Muted red | `#C75450` | Delete actions, expired warranties |
| **Border** | Light grey | `#E5E7EB` | Card borders, dividers |

**Dark mode:** Invert surfaces to `#1A1A2E` background, `#252540` cards. Keep accent colours. Primary shifts to lighter `#7B9FD4`.

### Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| **App title** | SF Pro Display / Inter | 28px | Bold (700) |
| **Section headers** | SF Pro Display / Inter | 20px | Semibold (600) |
| **Item names** | SF Pro Text / Inter | 16px | Medium (500) |
| **Body / metadata** | SF Pro Text / Inter | 14px | Regular (400) |
| **Captions** | SF Pro Text / Inter | 12px | Regular (400) |
| **Value display** | SF Pro Display / Inter | 32px | Bold (700) |

**System font stack:** `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`

Use Inter as the web font (variable weight, excellent readability at small sizes, free). On iOS, the system will prefer SF Pro automatically.

### Icon Style

- **Line icons, 1.5px stroke weight** — consistent with iOS 17+ aesthetic
- Use **Lucide** icon set (open source, consistent, good coverage for inventory concepts)
- Category icons: filled circles with line icon inside (coloured background, white icon) for visual pop in grids
- Navigation: outline style when inactive, filled when active

### Spacing & Layout

- **8px base grid** — all spacing is multiples of 8
- Card corner radius: **12px** (friendly but not bubbly)
- Card shadow: `0 1px 3px rgba(0,0,0,0.08)` (very subtle)
- Content padding: **16px** horizontal
- Card internal padding: **16px**
- Minimum tap target: **44×44px** (Apple HIG)

### Photo Treatment

- Item photos: **1:1 aspect ratio** in grid, rounded 8px corners
- Item detail hero: **16:10 aspect ratio**, rounded 12px corners
- Photos have a 1px border (`#E5E7EB`) to define edges on white backgrounds
- Placeholder for items without photos: category icon on light grey background

---

## 8. Edge Cases & Error States

| Scenario | Handling |
|---|---|
| **Empty state (no items)** | Friendly illustration + "Your inventory is empty. Snap your first item!" + large CTA button |
| **Empty search results** | "Nothing found for '[query]'. Try a different search, or browse by category." |
| **Empty room** | "No items in [Room] yet. Tap + to add one." |
| **AI server down** | Fallback to manual entry. "AI identification unavailable right now. You can add details manually." |
| **Storage quota exceeded** | "You've reached the photo limit. Upgrade for more storage, or delete some items." |
| **Sync conflict** | Last-write-wins with notification: "This item was updated on another device. We kept the most recent version." |
| **Slow connection** | Progressive loading: text first, then photos (lazy load with blur-up placeholders) |
| **Camera permission denied** | Show instructions to re-enable in Settings, offer file upload as alternative |
| **App not installed (web)** | Full functionality available; periodic gentle install prompts |

---

## 9. Summary of Opinionated Decisions

1. **Search is the hero.** It's on every screen, it's the first thing on the dashboard, and the entire "Where is my...?" positioning drives the brand.

2. **Camera FAB, always.** The add-item action is the second most important thing after search. It's always one tap away.

3. **Bottom tab bar, not hamburger.** Four tabs + FAB. Everything important is visible and thumb-reachable.

4. **AI fills fields, human confirms.** The AI does the work. The user just corrects mistakes. This is the opposite of most apps where the user fills in everything.

5. **Location is king in search results.** When someone searches, they want to know WHERE something is. The location gets visual prominence over every other field.

6. **3-level location hierarchy, no more.** Property → Room → Spot. Three levels covers 99% of use cases without complexity. No infinite nesting.

7. **No sign-up wall.** First item can be added without an account. Sync and backup require sign-up. Reduce friction to zero.

8. **Offline is real, not fake.** Full CRUD offline, not just read-only caching. AI identification queues for later.

9. **Calm, utilitarian design.** Slate blue, warm whites, generous spacing. No gradients, no illustration overload, no gamification. This is a tool.

10. **Batch mode for power users.** "Save & Add Another" for the initial cataloguing session. Most users will add 20+ items in their first sitting.
