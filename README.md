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
- **Authentication** — Register and log in with secure password hashing (bcrypt) and JWT-based sessions.

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | HTML5, CSS3, Bootstrap 5, vanilla JavaScript    |
| Backend  | Node.js, Express 5                              |
| Auth     | bcryptjs, jsonwebtoken (JWT)                    |
| AI       | Google Gemini (`@google/genai`, gemini-2.5-flash) |
| Database | MongoDB                                         |

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

3. Create a `.env` file in the project root:

```env
MONGO_URI=your-mongodb-connection-string
PORT=3000
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

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
| `/api/ai`        | AI-powered workout recommendations   |

## Notes

- User data is persisted in **MongoDB** — make sure your `MONGO_URI` is set in the `.env` file before starting the server.
- The AI recommendation feature requires a valid `GEMINI_API_KEY` in your `.env` file.

## License

ISC
