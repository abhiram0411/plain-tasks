# Plain Tasks

A simple Android to-do app built with **React Native CLI and TypeScript**, backed by **Node.js, Express and MongoDB**. No Expo, website wrapper or AI features.

## Included

- Email/password registration and login.
- Password hashing with bcrypt, signed sessions, and Android Keystore-backed session storage.
- Tasks with title, description, scheduled date/time, deadline, priority and optional category.
- Mark complete or reopen, delete with confirmation, and view open/completed tasks.
- Search by title, description or category.
- Smart sorting plus deadline, priority and scheduled-time sorting.
- Native Android date/time pickers, pull-to-refresh, loading placeholders and retry messages.
- Muted off-white and dark green styling, system typography, simple borders, no gradients, glass effects, stock illustrations, icon libraries or promotional filler.

## Requirements

- Node.js 22.11 or newer (developed with Node 24).
- Android Studio, JDK 17 and the SDK versions declared in `mobile/android/build.gradle`: compile SDK 37, Build Tools 37.0.0, NDK 27.1.12297006. The app targets SDK 36 and supports Android API 24+.
- An Android emulator or USB-connected phone with USB debugging.
- MongoDB locally, via Docker Compose, or a MongoDB Atlas connection string.

The official React Native CLI template is included, with its Android project and Gradle wrapper. React Native is pinned to 0.87.1; both projects include lockfiles.

## Start the backend

From this folder, start local MongoDB (Docker Desktop must be running):

```powershell
docker compose up -d
cd server
npm ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the generated random value into `JWT_SECRET` in `server/.env`. Do not use the example placeholder. To use Atlas, replace `MONGODB_URI` as well. Never commit `.env`.

```powershell
npm run dev
```

The API listens on port 3000. `http://localhost:3000/health` reports availability. MongoDB data persists in the Compose volume across server restarts.

## Start the Android app

In another terminal, from this folder:

```powershell
cd mobile
npm ci
npm start
```

Start an emulator in Android Studio. In another terminal in `mobile`:

```powershell
npm run android
```

The current API address in `mobile/src/api.ts` is `http://127.0.0.1:3000` for USB-connected phone testing. For an Android emulator, change it to `http://10.0.2.2:3000`.

For a USB-connected phone, set that address to `http://127.0.0.1:3000`, then run:

```powershell
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
npm run android
```

Use the app's **Create an account** button, then sign in and add tasks. There are no seeded accounts or fake tasks.

## Verification

```powershell
cd server
npm run build
npm test
cd ../mobile
npx tsc --noEmit
npm test -- --runInBand
```

Backend tests start a real temporary MongoDB instance and download its binary on the first run. They never connect to your configured application database. See `VERIFICATION.md` for the checks completed on the development computer and the remaining Android device checks.

## Structure

```text
mobile/
  android/             Native Android project and Gradle wrapper
  App.tsx              Session restoration, task list and mutations
  src/AuthScreen.tsx   Sign-in and registration
  src/TaskForm.tsx     Task input and native date/time controls
  src/api.ts           API address, timeout and error handling
  src/tasks.ts         Mixed sorting algorithm
  src/types.ts         Shared mobile types
  src/ui.tsx           Reusable controls and styles
  __tests__/           Authentication form and sorting tests
server/
  src/app.ts           Authentication, protected routes and validation
  src/models.ts        MongoDB user/task schemas
  src/index.ts         Configuration, connection and startup
  test/api.test.ts     Database-backed integration coverage
compose.yaml           Local persistent MongoDB
```

React state and hooks manage screens and tasks. The backend is the source of truth; mutations update the list after the server confirms success. Session credentials are kept in native secure storage, not ordinary device preferences. Each task query is scoped to the authenticated user, and clients cannot supply an owner field.

## Smart sort

Completed tasks appear last. Open tasks receive a score from deadline urgency, priority (15/30/45 points) and whether the scheduled time has arrived (10 points). Overdue tasks receive a larger urgency score; future urgency rises as the deadline approaches. Higher scores come first, then deadline and ID break ties. The list recomputes every minute. Dates are stored in UTC and displayed in the device's locale/timezone.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | `{email,password}`; returns token and user |
| POST | `/auth/login` | Same request/response shape |
| GET | `/tasks` | Current user's task list |
| POST | `/tasks` | Create a task with all task fields |
| PATCH | `/tasks/:id` | `{completed:true}` or `{completed:false}` |
| DELETE | `/tasks/:id` | Delete own task |

Task routes require `Authorization: Bearer <token>`. Date values must be ISO 8601 strings with a timezone; deadline cannot precede scheduled time. Passwords require at least 8 characters and at most 72 UTF-8 bytes. Tokens expire after seven days, then the user signs in again. Sign-out removes the local token; server-side token revocation and password-reset/email-verification flows are outside this assignment.

## Before distribution

This is an assignment project, not a deployed service. Local debug builds use HTTP for the development API. Set an HTTPS API URL for distribution, configure a hosted MongoDB instance, set your own secret, and provision a release signing key. The generated template's release signing currently uses the debug key and must be replaced before store distribution. Do not expose unauthenticated local MongoDB to the internet.

## Device acceptance checklist

1. Create an account; verify invalid email/password errors and duplicate-email handling.
2. Add tasks with different priorities, dates and categories; verify native date/time picker behavior.
3. Complete/reopen a task; check Open, Done and All filters and each sort mode.
4. Cancel a deletion, then confirm a deletion.
5. Restart the app; verify session restoration and saved tasks.
6. Sign out and create a second account; verify the first account's tasks are absent.
7. Stop the API; verify retry feedback without losing form input; restart and retry.
8. Check keyboard scrolling, larger font sizes, TalkBack labels and Android back navigation on a device.

Reference: [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).

