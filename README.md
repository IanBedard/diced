# Diced

A modern five-dice score game prototype for the web.

Live site: https://5diced.netlify.app/

## What works now

- 2-4 player local pass-and-play games
- online room creation and joining through Socket.IO
- server-owned dice rolls, held dice, turns, and scoring
- animated rolling with held dice
- live scorecards and game-over winner state
- offline-friendly local mode when no realtime server is configured

## Local development

Install the React app:

```bash
npm install
```

Run the realtime server:

```bash
npm run server
```

Run the Netlify/React client in another terminal:

```bash
copy .env.example .env
npm start
```

The local client connects to `http://localhost:4000` through `REACT_APP_SOCKET_URL`.

## Deploying the online version

Netlify hosts the React app. The realtime server must run somewhere that supports long-lived WebSocket connections, such as Render, Railway, Fly.io, or a VPS.

1. Deploy `server/` as a Node web service.
2. Set the server environment:
   - `PORT`: provided by your host
   - `CLIENT_ORIGIN`: `https://5diced.netlify.app`
3. In Netlify, set the React environment variable:
   - `REACT_APP_SOCKET_URL`: your server URL, for example `https://diced-server.onrender.com`
4. Redeploy the Netlify site.

## Next online-game steps

1. Add reconnect tokens so players can refresh and reclaim their seat.
2. Add room cleanup timers and host controls.
3. Persist rooms and match history in a small database.
4. Add chat, rematch invites, and spectator mode.
