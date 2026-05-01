# Diced

A modern five-dice score game prototype for the web.

Live site: https://5diced.netlify.app/

## What works now

- 2-4 player local pass-and-play games
- online room creation and joining through Netlify Functions
- Netlify-owned dice rolls, held dice, turns, and scoring
- animated rolling with held dice
- live scorecards and game-over winner state
- offline-friendly local mode when no realtime server is configured

## Local development

Install the React app:

```bash
npm install
```

Run the Netlify/React client:

```bash
copy .env.example .env
npm start
```

For local Netlify Functions testing, use `netlify dev` after installing the Netlify CLI.

## Deploying the online version

Netlify hosts the React app and the online room API.

1. Push or deploy this repo to Netlify.
2. Netlify builds the React app from `npm run build`.
3. Netlify serves the game API at `/api/game`.
4. The client polls `/api/game` so all players in a room see the same state.

## Next online-game steps

1. Add reconnect tokens so players can refresh and reclaim their seat.
2. Add room cleanup timers and host controls.
3. Add chat, rematch invites, and spectator mode.
4. Move to a WebSocket server later if you want instant animation-grade sync.
