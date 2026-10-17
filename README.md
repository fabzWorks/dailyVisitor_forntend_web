# Daily Visitor — Next.js Desktop Web App

Daily Visitor is a desktop-first Next.js web implementation of the supplied Visitor and Resident mobile experience. The original screen structure, visual language, navigation flow, subscription detail flow, scheduling, notifications, service requests, maps, profiles, and authentication screens are retained.

## Roles

- Visitor: Moiz Ahmed — Milk Delivery
- Resident: Iqra Ahmed — House # 18, Street 7, G-9/4, Islamabad
- Supporting service residents/providers: Sana Farooq, Hamza Malik, Bilal Sheikh

The connected data model is consistent across both roles. For example, Moiz Ahmed appears as Iqra Ahmed's milk-delivery provider, and Iqra Ahmed appears in Moiz Ahmed's schedule, job, resident record, payment, attendance, and service-detail flows.

## Desktop navigation

The navigation bar remains horizontally arranged at the bottom of the application, matching the supplied mobile design. It is not converted into a right-side or left-side sidebar.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm start
```

## Project structure

- `src/app/page.tsx` — Next.js route entry
- `src/app/layout.tsx` — application metadata and global styles
- `src/app/App.tsx` — client-side application state and role switching
- `src/app/components/visitor` — visitor experience
- `src/app/components/resident` — resident experience, including subscription detail
- `src/app/components/auth` — authentication and account setup
- `src/app/components/layout/DesktopFrame.tsx` — full-width desktop application frame
- `src/app/data/resident/` — resident-side presentation data
- `src/app/data/visitor/` — visitor/service-provider presentation data
- `src/app/data/shared/` — shared types and image assets
- `src/styles` — Tailwind v4 and application styles
