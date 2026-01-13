# Development Plan: Hyper-Personalized Experience & Adaptive UI/UX

## Core Philosophy
Move away from a "One Size Fits All" interface. The application should behave like a chameleon, adapting its complexity, terminology, and visual hierarchy based on the specific business model of the user (Solo Freelancer vs. Physical Studio vs. Agency).

---

## Phase 1: The "Identity" Onboarding Flow
We will restructure `OnboardingView.tsx` into a branching wizard.

### Step 1: The Basics (Identity)
*   **Fields:** Name, Email (pre-filled), Studio/Business Name.
*   **Hook:** "Let's give your business a home."

### Step 2: The Business Model (The Fork)
*   **Question:** "How do you operate?"
*   **Option A: "I am a Freelancer / On-Location Photographer"**
    *   *Implication:* No physical studio rooms to manage. "Inventory" is portable gear.
*   **Option B: "I own/manage a Physical Studio Space"**
    *   *Implication:* Needs Room Management, Calendar overlap logic, specific location settings.
*   **Option C: "I run a Production House / Agency"**
    *   *Implication:* Heavy focus on Team, Payroll, and Project Management status flows.

### Step 3: The Scale (Team)
*   **Question:** "Who is on your team?"
*   **Option A: "Just me (Solo)"**
    *   *Action:* Hide "Team" photo views, simplify "Payroll" to "Personal Earnings". Hide "Internal Transfers".
*   **Option B: "Me + Assistants/Freelancers"**
    *   *Action:* Enable "Team" view but focus on contractor payouts.
*   **Option C: "Full Team (Admins, Editors, Photographers)"**
    *   *Action:* Enable full RBAC (Role Based Access Control) and Shift Scheduling.

### Step 4: The Aesthetics (Vibe)
*   **Question:** "Pick your dashboard style."
*   **Choices:**
    *   *Professional (Dark/Monochrome)* - Default.
    *   *Playful (Pastels)* - Good for baby/family photographers.
    *   *High-End (Serif fonts, Minimalist)* - Good for fashion/wedding.
*   *Action:* Sets a `theme` config that adjusts font-family and primary accent colors globally.

---

## Phase 2: Adaptive UI/UX Strategies

### 1. The Adaptive Sidebar
The Sidebar should not show 10 items for a user who needs 3.
*   **Freelancer Mode:**
    *   *Hide:* "Production" (Rename to "Projects"), "Inventory" (Move to Settings or lower priority), "Team".
    *   *Highlight:* "Calendar", "Invoices", "Public Site".
*   **Studio Mode:**
    *   *Highlight:* "Calendar" (Room View), "Inventory" (Asset Tracking), "Team".

### 2. Dashboard Personalization
*   **For Freelancers:**
    *   **Focus:** "Next Shoot", "Pending Edits", "Recent Inquiries".
    *   **Visual:** Large hero card for the very next event.
*   **For Studio Owners:**
    *   **Focus:** "Room Utilization Today", "Staff Checked In", "Equipment Out".
    *   **Visual:** A timeline/gantt chart of the day's room bookings.

### 3. Terminology "Swapping"
We will implement a `TranslationContext` or simple string helper that checks `config.type`.
*   *If Freelancer:* "Booking" -> "Shoot", "Studio Rooms" -> "Locations".
*   *If Studio:* "Booking" -> "Session/Rental", "Studio Rooms" -> "Studios".

---

## Phase 3: Technical Implementation Plan

### 1. Data Structure Updates (`types.ts`)
Update `StudioConfig` to include:
```typescript
interface StudioConfig {
  // ... existing
  businessType: 'FREELANCE' | 'STUDIO' | 'AGENCY';
  teamSize: 'SOLO' | 'SMALL' | 'LARGE';
  visualTheme: 'MODERN' | 'CLASSIC' | 'PLAYFUL';
  featureFlags: {
      enableInventory: boolean;
      enableTeam: boolean;
      enableProduction: boolean;
      enableRooms: boolean;
  }
}
```

### 2. Onboarding Logic (`OnboardingView.tsx`)
*   Refactor the step state machine to handle the branching logic.
*   The "Loading" phase (Step 6) will now compute the `featureFlags` based on the answers provided in Steps 2 & 3.

### 3. Component Adaptation
*   **`Sidebar.tsx`**: Wrap menu items in a check: `{config.featureFlags.enableInventory && <InventoryLink />}`.
*   **`DashboardView.tsx`**: Create two internal components: `<FreelancerDashboard />` and `<StudioDashboard />` and render based on `config.businessType`.

---

## Phase 4: Long-term "Smart" Improvements

### 1. "Grow with you" Features
*   If a Solo user adds a second user in Settings, the system prompts: "Looks like you're growing! Should we enable Team Management features?"

### 2. Context-Aware Mobile App (Responsive)
*   **On Mobile:**
    *   *Freelancer:* Opens directly to "Schedule" or "QR Code for Payment".
    *   *Studio Manager:* Opens to "Today's Overview" (Who is in what room).

### 3. Industry Templates
*   **Wedding:** Pre-filled packages (Engagement, Day-of), Contract templates with wedding specific clauses.
*   **Commercial:** Invoices set to Net-30 by default, "Usage Rights" fields enabled in Contracts.
