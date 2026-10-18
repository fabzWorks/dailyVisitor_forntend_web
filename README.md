# Daily Visitor – Web Frontend

The website of **Daily Visitor**. Two kinds of people use it:

- **Resident** – asks for a daily service (milk, newspaper, garbage), pays, skips days when out of station.
- **Visitor (service provider)** – accepts requests, sees today's route, taps *I am arrived* / *Service done*.

Built with **Next.js 16 + React 18 + TypeScript + Tailwind v4**.
Server data → **TanStack Query**. App/UI state → **Zustand**. Folder style → **Atomic Design**.

---

## 1. Run it

The backend must be running first (`dailyVisitor_backend`, default port **4000**).

```bash
npm install
cp .env.example .env.local     # only if .env.local does not exist; edit NEXT_PUBLIC_API_URL if needed
npm run dev                    # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm run start` | run the production build |
| `npm run typecheck` | check TypeScript without building |

---

## 2. The big picture (read this first)

```
 Screen (src/features/...)
    │  calls a hook
    ▼
 Hook (src/hooks/...)            ← TanStack Query: loading, errors, refresh, polling
    │  calls an api function
    ▼
 API module (src/api/*.api.ts)   ← one small function per backend endpoint
    │  calls http()
    ▼
 http() (src/api/client.ts)      ← the ONLY code that uses fetch(); turns every problem into an ApiError
    ▼
 Backend
```

**Where does each kind of data live?**

| Kind of data | Where | Example |
|---|---|---|
| Comes from the backend | **TanStack Query** (`src/hooks`) | notifications, schedule, deliveries, login result |
| App memory while it is open | **Zustand** (`src/store`) | logged-in user, active tab, out-of-station choices |
| Only one form / one screen | plain `useState` inside the screen | input text, show/hide password |

Rule of thumb: *"Did it come from the backend? → hook. Do several screens need it? → store. Otherwise → useState."*

---

## 3. Folder structure

```
src/
├── app/            Next.js entry only: layout.tsx, page.tsx, providers.tsx, App.tsx (which screen is open)
├── api/            EVERYTHING that talks to the backend (see section 5)
├── hooks/          TanStack Query hooks (useLiveData, useLogin, useRespondToRequest ...)
├── store/          Zustand stores (authStore, residentStore, visitorStore, notificationStore)
├── components/     Reusable pieces, built with Atomic Design (see section 4)
│   ├── atoms/        Button, Badge, Card
│   ├── molecules/    NavButton, Toaster
│   ├── organisms/    BottomNavBar, ErrorBoundary
│   ├── templates/    DesktopFrame, AppShell
│   └── _unused/      old files nothing imports (safe to delete, see its README)
├── features/       The real screens, grouped by who uses them
│   ├── auth/         Landing, Login, Signup, LocationPicker
│   ├── resident/     ResidentApp + all resident screens
│   ├── visitor/      VisitorApp + all visitor screens
│   └── shared/       screens used by both (UpcomingSchedule)
├── lib/            Plain helper functions (no React): format.ts, mappers.ts, schedule.ts, errors.ts, cn.ts, queryClient.ts
├── types/          Types used across the app (domain.ts, outOfStation.ts)
├── config/         env.ts (reads NEXT_PUBLIC_API_URL)
└── styles/         Tailwind + theme CSS
```

`@/` means `src/`. Write `import { Button } from '@/components/atoms'` instead of `../../../components/...`.

---

## 4. Atomic Design – where does a new component go?

Imports only go **downward**: a template may use organisms, an organism may use molecules, and so on. Never upward.

| Level | What it is | Knows about the backend? | Examples here |
|---|---|---|---|
| **Atom** | smallest piece, one job | No | `Button`, `Badge`, `Card` |
| **Molecule** | a few atoms working as one small unit | No | `NavButton` (icon + label) |
| **Organism** | a bigger part of a screen | No (gets data through props) | `BottomNavBar`, `ErrorBoundary` |
| **Template** | page layout, places content | No | `AppShell` (scroll area + animation + bottom bar) |
| **Page** | a real screen with real data | **Yes** (uses hooks/stores) | everything in `src/features/` |

When a screen file grows big, cut repeated JSX out of it into a molecule/organism and import it back.
The three biggest screens (`RequestService`, `ResidentSchedule`, `UnifiedSignup`) are the best candidates.

---

## 5. API calling – all in one place

- **`src/api/endpoints.ts`** – every URL. Nobody writes a URL by hand anywhere else.
- **`src/api/*.api.ts`** – one function per endpoint (`authApi.login`, `requestsApi.match` ...).
- **`src/api/types.ts`** – what we send and what we get back.
- **`src/hooks/*`** – wrap those functions with TanStack Query.

### Endpoint → function → hook → screen

| Method | URL | API function | Hook | Used in |
|---|---|---|---|---|
| POST | `/api/auth/login` | `authApi.login` | `useLogin` | `auth/UnifiedLogin` |
| POST | `/api/auth/signup/resident` | `authApi.signupResident` | `useSignupResident` | `auth/UnifiedSignup` |
| POST | `/api/auth/signup/provider` | `authApi.signupProvider` | `useSignupProvider` | `auth/UnifiedSignup` |
| POST | `/api/requests/match` | `requestsApi.match` | `useMatchProviders` | `resident/RequestService` |
| POST | `/api/requests` | `requestsApi.create` | `useCreateRequest` | `resident/RequestService` |
| POST | `/api/requests/:id/respond` | `requestsApi.respond` | `useRespondToRequest` | `visitor/VisitorApp` (Accept / Reject) |
| GET | `/api/notifications/:userId` | `notificationsApi.list` | `useLiveData` | `ResidentApp`, `VisitorApp` |
| GET | `/api/subscriptions/:role/:userId` | `subscriptionsApi.list` | `useLiveData` | `ResidentApp`, `VisitorApp` |
| GET | `/api/deliveries/:role/:userId` | `deliveriesApi.list` | `useLiveData` | `ResidentApp`, `VisitorApp` |
| POST | `/api/subscriptions/:id/arrive` | `subscriptionsApi.arrive` | `useMarkArrived` | `visitor/VisitorApp` (I am arrived) |
| POST | `/api/subscriptions/:id/complete` | `subscriptionsApi.complete` | `useMarkCompleted` | `visitor/VisitorApp` (Service done) |
| POST | `/api/deliveries/:id/note` | `deliveriesApi.saveNote` | `useSaveDeliveryNote` | `resident/ResidentNotifications` |
| POST | `/api/skips` | `deliveriesApi.skip` | `useSkipServices` | `resident/ResidentSchedule` |

Public map services (not our backend, in `api/geo.api.ts`): OpenStreetMap Nominatim (address search and reverse lookup) in `auth/LocationPicker`, OSRM (driving route) in `visitor/MapTab`.

### Live data (polling)
`useLiveData(user)` asks the backend for notifications, schedule and deliveries **every 5 seconds**, so a new request or an "arrived" shows up on the other person's phone without refreshing.
Every button that changes something (accept, arrived, skip ...) refreshes this data automatically when it finishes – screens never call "refresh" themselves.

### Notifications "seen" dots
The backend builds notifications live (they vanish after 24 h). Which ones were opened is remembered on the device in `notificationStore` (localStorage key `seen_notifications`).

---

## 6. Error handling

| Problem | What happens |
|---|---|
| Backend answers with an error (wrong password, slot full ...) | `http()` throws `ApiError` with the backend's message and `status`. The screen shows it with `toast.error(getErrorMessage(err))`. |
| Backend not running / no internet | `ApiError` with kind `network`: "Cannot reach the server. Is the backend running?" |
| Wrong password specifically | the login screen checks `isStatus(err, 401)` and shows "Email or password is incorrect". |
| Background refresh (every 5 s) fails | nothing is shown, the last data stays on screen and it tries again. |
| A screen crashes while drawing (a bug) | `ErrorBoundary` shows "Something went wrong" with a *Try again* button instead of a white page. |

Pattern used everywhere a button talks to the backend:

```tsx
const saveNote = useSaveDeliveryNote();           // from src/hooks
...
try {
  await saveNote.mutateAsync({ deliveryId, residentId, note });
  toast.success('Note sent');
} catch (err) {
  toast.error(getErrorMessage(err));              // from src/lib/errors.ts
}
// saveNote.isPending is true while waiting -> use it to disable the button
```

---

## 7. How to…

**Add a new backend endpoint**
1. `src/api/endpoints.ts` – add the URL.
2. `src/api/types.ts` – add the body/response types.
3. `src/api/<name>.api.ts` – add a function that calls `http()`.
4. `src/hooks/use<Name>.ts` – wrap it with `useMutation` (button) or `useQuery` (data). For mutations add `onSettled: refreshLiveData` if other screens must update.
5. Export the hook in `src/hooks/index.ts`, use it in the screen, and add a row to the table above.

**Add a new screen** – create it in `src/features/resident` or `src/features/visitor`, then add its tab/case in `ResidentApp.tsx` or `VisitorApp.tsx` (and the tab name in the matching store).

**Add shared app state** – add a field + action to the matching file in `src/store`. Call `reset` on logout (already wired in `useLogout`).

---

## 8. Good to know

- There is **no login token yet**. The backend trusts the `userId` in the URL, and a page refresh logs you out (the user lives in memory only). Both are things to improve before going live.
- Email must end with `@gmail.com`, mobile number must be 11 digits (checked in `UnifiedSignup`).
- Map pins/colors/spacing were not changed in this refactor – the screens look exactly as before.
