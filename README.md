# Flipped Classroom Control Tower

HCI-TP is a frontend-only prototype for an in-class flipped learning control tower.

The app focuses on a professor's real-time classroom workflow: team status, questions, link permission issues, submissions, and after-class feedback summaries.

## Stack

- React
- TypeScript
- Vite
- React Router
- lucide-react
- CSS

## Run

```bash
npm install
npm run dev
```

## Routes

- `/professor`: Live Team Status Control Tower
- `/student`: Student Activity Workspace
- `/`: redirects to `/professor`

## Demo Scope

- Mock data only
- No backend API
- No login
- No real LMS, Classum, Figma, Canva, or Google Drive integration
- Link permission checks are simulated in frontend state
