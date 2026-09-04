# Fitly — Track Smarter, Live Better

Fitly is an all-in-one fitness tracking web app. Log workouts, monitor nutrition, set goals, and watch your progress unfold in real time — all from a clean, modern dashboard.

> Built as a group project for **WIF2003**.

## Features

- **Workout Tracker** — Log exercise name, type, sets, reps, duration, intensity, and calories burned.
- **Nutrition Log** — Track meals, total calories, macronutrient breakdowns, and daily water intake.
- **Goal Setting** — Define personal fitness targets (weight, steps, calorie baselines) and update them in real time.
- **Analytics Dashboard** — Visual charts, summaries, and trends to keep you informed of your performance.
- **Profile & Metrics** — Store personal stats and get instant calculations like BMI.
- **AI Workout Recommendations** — Personalized weekly workout prescriptions powered by Google Gemini.
- **Authentication** — Register and log in with secure password hashing (bcrypt), JWT sessions, and protected API routes.
- **API classroom examples** — One parallel dashboard request, bearer-token auth, a small response cache, retries, and polling.

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | HTML5, CSS3, Bootstrap 5, vanilla JavaScript    |
| Backend  | Node.js, Express 5                              |
| Auth     | bcryptjs, jsonwebtoken (JWT)                    |
| AI       | Google Gemini (`@google/genai`, gemini-2.5-flash) |
| Database | Supabase (Postgres) with MongoDB compatibility    |

## Project Structure

```
fitly-app-1/
├── index.html          # Landing page
├── server.js           # Express server entry point
├── pages/              # App pages (dashboard, workout, nutrition, goals, profile, login, register)
├── css/                # Stylesheets
├── js/                 # Frontend JavaScript
├── routes/             # Express route definitions (auth, ai, workout, nutrition, goals)
├── controllers/        # Route handlers / business logic
└── assets/             # Static assets
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [MongoDB](https://www.mongodb.com/) (local instance or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- A Google Gemini API key (for AI recommendations) — get one at [Google AI Studio](https://aistudio.google.com/)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd fitly-app-1
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root using `.env.example`:

```env
PORT=3000
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. In the Supabase dashboard, open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql), and run it. The server uses the service-role key, so keep it in `.env` and never place it in browser JavaScript.

### Running the App

Start the server:

```bash
npm start
```

Or run in development mode with auto-reload:

```bash
npm run dev
```

The server runs on [http://localhost:3000](http://localhost:3000) and opens the app in your browser automatically. Both the frontend and the API are served from the same port.

### Demo Account

A test account is preloaded for quick exploration:

| Email            | Password      |
| ---------------- | ------------- |
| `test@fitly.com` | `password123` |

You can also click **Live Demo** on the landing page to log in instantly.

## API Endpoints

All API routes are prefixed with `/api`:

| Prefix           | Description                          |
| ---------------- | ------------------------------------ |
| `/api/auth`      | Registration, login, password reset  |
| `/api/workouts`  | Workout logging and retrieval        |
| `/api/nutrition` | Meal and water intake tracking       |
| `/api/goals`     | Goal creation and progress updates   |
| `/api/dashboard` | Parallel dashboard data aggregation  |
| `/api/ai`        | AI-powered workout recommendations   |

## Notes

- With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, user data is persisted in Supabase. If those variables are absent, the existing MongoDB models remain available as a fallback.
- The AI recommendation feature requires a valid `GEMINI_API_KEY` in your `.env` file.

## Classroom API Examples

- `GET /api/dashboard?userId=...` uses `Promise.all()` to load workouts, meals, and goals in parallel.
- Browser requests go through `apiFetch` in `js/main.js`, which adds the JWT bearer token, caches short-lived GET responses, and retries temporary server failures.
- The dashboard polls the aggregate endpoint every 30 seconds and shows the last successful sync time.
- Protected API routes return `401` without a valid `Authorization: Bearer <token>` header. Jest keeps its existing unauthenticated route tests in test mode.

