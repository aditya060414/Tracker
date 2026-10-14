# Lifeboard — Personal Life Management Platform

> A calm, unified personal management workspace for tracking daily goals, habits, fitness, health, work, finances, ideas, planning, and milestone challenges.

---

## ⚡ Quick Start & Commands

### Prerequisites
- **Node.js** (v18.18+ or v20+) and **npm**, or **Bun** (recommended, as `bun.lock` is included).

### 1. Install Dependencies
```bash
# Using npm
npm install

# Or using Bun
bun install
```

### 2. Start Local Development Server
```bash
# Using npm
npm run dev

# Or using Bun
bun run dev
```
The application will start on `http://localhost:3000` (or the next available port indicated in the terminal).

### 3. Build for Production
```bash
npm run build
```
Builds the client application and the Nitro SSR server bundle into `.output/` or `dist/`.

### 4. Run Unit & Routing Tests
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### 5. Linting and Formatting
```bash
# Check code style and rules
npm run lint

# Auto-format codebase with Prettier
npm run format
```

---

## 🛠️ Technology Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (`@tanstack/react-start`) with Vite 8 and Nitro server engine.
- **Routing**: [TanStack Router](https://tanstack.com/router) with strict type safety and file-based route generation (`src/routes/`).
- **Core**: React 19 (`react` & `react-dom` v19.2) and TypeScript 5.8.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`), custom design tokens in the OKLCH color space, and CSS custom properties.
- **Data Persistence**: Offline-first via `localStorage` through a custom hydration-safe hook (`useLocal`), ready for TanStack React Query server sync.
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) component primitives powered by Radix UI and Lucide icons.
- **Visualizations**: [Recharts](https://recharts.org/) (Area, Bar, Line, and Pie charts).

---

## 🏗️ Architecture & Component Hierarchy

### Shell & Navigation Layout
- **Root Shell (`src/routes/__root.tsx`)**:
  - Injects `themeInitScript` into `<head>` to prevent flash of wrong theme (FOUT) before DOM paint.
  - Wraps the app in `QueryClientProvider`, `ThemeProvider`, `AppLayout`, and Sonner's `Toaster`.
  - Configures route-level 404 (`NotFoundComponent`) and 500 error boundaries (`ErrorComponent`).
- **App Layout (`src/components/layout/AppLayout.tsx`)**:
  - **Desktop Sidebar**: Collapsible navigation bar (expands to `240px`, collapses to `76px`) featuring grouped links (Overview, Personal, Preferences), active page indicators, pending notification badges, and a theme switcher.
  - **Mobile Drawer**: Slide-over drawer with backdrop blur accessible via mobile hamburger menu.
  - **Header Bar**: Displays current date, active streak counter badge, unread notification pill, theme toggle, and user profile avatar.

### Shared Common Components (`src/components/common/`)
- **`Panel` (`ui.tsx`)**: Card container with standard padding, borders, background colors, and rounded corners (`rounded-2xl`).
- **`StatCard` (`ui.tsx`)**: Standardized metric widget showing an icon with colored tone, value, label, and comparative hint (e.g. `+1 vs yesterday`).
- **`SectionHeader` (`ui.tsx`)**: Section title bar with optional Lucide icon and secondary action link/button.
- **`ProgressBar` (`ui.tsx`)**: Accessible progress indicator (`role="progressbar"`) clamped between `0%` and `100%` supporting tones: `primary`, `success`, `warning`, `danger`.
- **`Tag` (`ui.tsx`)**: Status badges with tone variants.
- **`TaskRow` (`TaskRow.tsx`)**: Interactive task item displaying checkbox, priority dot (`high`, `medium`, `low`), due date, tracked focus time, and completed line-through styling.
- **`EmptyState` (`ui.tsx`)**: Dashed placeholder for empty collections.

---

## 📊 Modules & Calculation Logic

### 1. Dashboard (`src/routes/index.tsx`)
- **Greeting Calculation**:
  $$\text{Greeting} = \begin{cases} \text{"Good morning"} & \text{if } \text{hour} < 12 \\ \text{"Good afternoon"} & \text{if } 12 \le \text{hour} < 18 \\ \text{"Good evening"} & \text{otherwise} \end{cases}$$
- **Daily Completion Percentage**:
  $$\text{Percentage} = \text{round}\left(\frac{\text{Goals Completed}}{\text{Total Goals}} \times 100\right)$$
  - Tone is assigned:
    - `tone="warning"` if below the 80% daily target.
    - `tone="success"` when target is met.
- **Monthly Budget Summary**:
  $$\text{Remaining} = \text{Budget} - \text{Spent}$$
  $$\text{Budget Used \%} = \frac{\text{Spent}}{\text{Budget}} \times 100$$
  - Progress bar turns `danger` if $\frac{\text{Spent}}{\text{Budget}} > 0.9$ (over 90%), otherwise `success`.
- **Active Challenge Widget**:
  $$\text{Challenge Progress} = \left(\frac{\text{Current Day}}{\text{Total Days}}\right) \times 100 \quad \left(\text{e.g. } \frac{32}{75} \times 100 = 42.67\%\right)$$
- **Overall Progress Graph Points (`AreaChart`)**:
  - **Weekly View (`week`)**:
    Fixed 7-point series mapped across days of the week:
    $$\text{Mon: } 62\%, \text{ Tue: } 75\%, \text{ Wed: } 58\%, \text{ Thu: } 81\%, \text{ Fri: } 70\%, \text{ Sat: } 88\%, \text{ Sun: } 67\%$$
  - **Monthly View (`month`)**:
    30 data points dynamically computed for day index $i \in [0, 29]$ (where Day $d = i + 1$) using a synthetic human-rhythm function:
    $$v(i) = \text{round}\Big(55 + 30 \cdot \big|\sin(0.7 \cdot i)\big| + (i \bmod 4) \times 3\Big)$$
    - **$55$ (Baseline Floor)**: Guaranteed baseline completion floor so scores never drop below $55\%$.
    - **$30 \cdot |\sin(0.7 \cdot i)|$ (Trigonometric Oscillation)**: Produces natural undulating waves with a cycle period of $T = \frac{2\pi}{0.7} \approx 8.98\text{ days}$, introducing continuous smooth fluctuations of $0\%$ to $+30\%$.
    - **$(i \bmod 4) \times 3$ (Sprint Micro-cycle)**: Adds a 4-day saw-tooth cycle ($+0\%, +3\%, +6\%, +9\%$) to emulate natural weekly momentum build-ups and prevent sterile sine symmetry.
    - **$\text{round}(\dots)$**: Yields integer percentages realistically spanning $55\%$ to $94\%$.

---

### 2. Money Management (`src/routes/money-management.tsx`)
- **Budget & Expense Calculations**:
  - **Total Expenses**:
    $$\text{Spent} = -\sum_{t \in \text{Transactions}, \text{amount} < 0} \text{amount}$$
  - **Total Income**:
    $$\text{Income} = \sum_{t \in \text{Transactions}, \text{amount} > 0} \text{amount}$$
  - **Over Budget Check**:
    $$\text{Is Over Budget} = \text{Spent} > \text{Budget}$$
    $$\text{Remaining / Over Amount} = |\text{Budget} - \text{Spent}|$$
  - **Category Aggregation**:
    $$\text{Category Total}(c) = \sum_{t \in \text{Expenses}, t.\text{cat} = c} -t.\text{amount}$$
  - **Largest Expense**:
    Identified via `reduce` over negative transactions finding the minimum `amount` (maximum absolute expense value).

---

### 3. Gym & Fitness (`src/routes/gym.tsx`)
- **Exercise Logging**:
  - Exercises are tracked with planned sets, reps, weight (kg), and rest duration.
  - Toggling an exercise marks it completed in `localStorage` (`gym-done`), displaying a completed badge and striking through the name.
- **Volume & Consistency Metrics**:
  - Workouts this week: Count of sessions completed vs weekly target (e.g. `3 / 5`).
  - 30-day consistency score: Percentage of scheduled sessions fulfilled (e.g. `82%`).
  - Volume history: Weekly total tonnage/sets visualized with Recharts bar charts.

---

### 4. Health & Wellness (`src/routes/health.tsx`)
- **Water Intake Counter**:
  - Daily goal: 8 glasses.
  - Progress:
    $$\text{Water Progress} = \text{clamp}\left(0, 100, \frac{\text{Water Glasses}}{8} \times 100\right)$$
  - Increment (`+`) and decrement (`-`) controls with a lower bound of 0.
- **Habit Checklist**:
  - Multi-select toggle pills stored in `localStorage` (`habits`).
- **Sleep & Notes**:
  - Daily sleep hours plotted via Recharts line chart against weekly average ($7.4\text{ hours}$).
  - Freeform wellness journal saved automatically to `localStorage` (`wellness-note`).

---

### 5. Challenges & Streaks (`src/routes/challenges.tsx`)
- **Completion Check**:
  - Daily requirement checklist (e.g. workouts, nutrition, hydration, reading, progress photo).
  - Day Completion: Enabled when all daily requirements are checked:
    $$\text{Can Complete Day} \iff \text{checked.length} = \text{requirements.length}$$
- **Milestone Unlocking**:
  - When completing a day:
    - Increments day: $\text{Day} \leftarrow \text{Day} + 1$.
    - Resets checklist: $\text{checked} \leftarrow []$.
    - Awards milestone badges at defined intervals: `[7, 21, 40, 60, 75]`.
    - Fires celebration toast with sound/visual feedback via Sonner.

---

### 6. Work & Projects (`src/routes/work.tsx`)
- **Task Open Counter**:
  $$\text{Tasks Open} = \sum_{t \in \text{Tasks}} \mathbb{I}(t.\text{done} = \text{false})$$
- **Project Progress**:
  - Visualized as percentage bars with upcoming delivery milestones and deadlines.
- **Focus Sessions**:
  - Logs focus intervals (e.g., `09:00 - 10:30`), categorizing them by work type (`Deep work`, `Writing`, etc.).

---

### 7. Task Scheduler & Calendar (`src/routes/scheduler.tsx`)
- **Calendar Grid Generation**:
  - Calculates first day offset relative to Monday:
    $$\text{Offset} = (\text{firstDayOfMonth.getDay}() + 6) \pmod 7$$
  - Computes total days in month:
    $$\text{Days In Month} = \text{new Date}(\text{year}, \text{month} + 1, 0).\text{getDate}()$$
  - Renders blank spacer cells for the offset followed by day cells `1` through `DaysInMonth`.
  - Highlights current day: $d = \text{refDate.getDate}()$.
- **Categorization**:
  - Splits tasks into **Overdue** (due date prior to current date) and **Upcoming**.

---

### 8. Ideas & Brainstorming (`src/routes/ideas.tsx`)
- **Tag Extraction**:
  - Parses `#tags` from draft text using regex `/#(\w+)/`:
    $$\text{Tag} = \text{draft.match}(/\#(\w+)/)[1] \lor \text{"Inbox"}$$
- **Search & Filter**:
  - Filters ideas by comparing search query against both note content and tag:
    $$(i.\text{text} + i.\text{tag}).\text{toLowerCase}().\text{includes}(q.\text{toLowerCase}())$$
- **Sorting Logic**:
  - Prioritizes pinned items to the top:
    $$\text{Sort Value} = \text{Number}(b.\text{pinned}) - \text{Number}(a.\text{pinned})$$

---

### 9. Planning & Priority Matrix (`src/routes/planning.tsx`)
- **Eisenhower Priority Matrix**:
  - **Urgent & Important** (`tone="danger"`): Critical crises and deadlines.
  - **Important, Not Urgent** (`tone="primary"`): Long-term growth, health, and strategy.
  - **Urgent, Not Important** (`tone="warning"`): Interruptions and administrative tasks.
  - **Neither** (`tone="muted"`): Low-value busywork.

---

### 10. Settings & Data Portability (`src/routes/settings.tsx`)
- **Theme Preference**:
  - Toggles between `light` and `dark` mode, updating `document.documentElement` class list and synchronizing across browser tabs.
- **Full JSON Data Export**:
  - Serializes all `localStorage` state into a single formatted JSON object:
    $$\text{Export Data} = \left\{ k: \text{localStorage.getItem}(k) \;\middle|\; k \in \text{localStorage} \right\}$$
  - Triggers client-side file download as `lifeboard-export.json`.
- **Data Reset**:
  - Clears `localStorage` and reloads the application.

---

## 💾 State Persistence (`useLocal`)

State is persisted locally in the browser via `src/lib/use-local.ts`:
- **SSR Hydration Guard**:
  To prevent React hydration mismatch errors, initial server rendering uses default seed values. The client triggers an asynchronous `useEffect` that reads from `localStorage` and updates state once mounted (`ready = true`).
- Any state mutations after hydration automatically trigger `localStorage.setItem(key, JSON.stringify(value))`.

