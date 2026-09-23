# Sheikh

Sheikh is a Node.js video, voice, and meeting application built with Express, Socket.IO, SQLite, and browser WebRTC. It uses real `getUserMedia`, `RTCPeerConnection`, ICE candidate exchange, and `getDisplayMedia`—not simulated streams.

## What is included

- Account registration, bcrypt password hashing, JWT HTTP-only sessions, protected APIs, Helmet, CORS, request limits, and input safeguards
- People search with Socket.IO online presence
- Direct voice and video calling with accept/reject, real media permissions, mute, camera toggle, screen sharing, fullscreen, remote stream display, and WebRTC connection state
- Small-group mesh meetings with room signaling, participant join/leave handling, real-time chat, meeting creation, generated codes, optional password and waiting-room data model
- SQLite tables for users, meetings, calls, and messages; routes are separated from signaling and media code so the database or group-call topology can be upgraded later

## Install and run

1. Install Node.js 20 LTS or newer.
2. Copy `.env.example` to `.env` and set a long unique `JWT_SECRET`.
3. In the project folder, run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### VS Code Live Server

This is a Node.js application, so Live Server alone cannot provide accounts, Socket.IO, chat, or WebRTC signaling. Start the backend first with `npm start`. If you then click **Go Live** in VS Code, the included root `index.html` automatically sends the browser to `http://localhost:3000`, where the complete application runs.

SQLite creates `database/sheikh.db` automatically on first start. The application is designed to run locally in VS Code; open the folder and use its integrated terminal for the commands above.

## Test calls locally

1. Open the app in two separate browser profiles/windows so each can use a different account.
2. Register User A and User B.
3. From User A’s Contacts page, select Video or Voice for User B.
4. Accept from User B. Both browsers must grant microphone access; video calls additionally need camera access.
5. For group meetings, create a meeting, copy its shown code, and have two or more signed-in users enter it under Meetings.

Use a different browser profile, Incognito window, or a second device: a single browser account cannot reliably test both sides of one call.

## WebRTC and production notes

`localhost` is allowed to access media during development. Real deployments need HTTPS, a reverse proxy such as Nginx, and a production Node.js process manager. Configure STUN/TURN through `TURN_SERVER_URL`, `TURN_USERNAME`, and `TURN_PASSWORD`; TURN is essential when NAT or corporate networks prevent a direct peer-to-peer path.

Suggested production path:

```text
Browser → HTTPS/Nginx → Node.js + Express + Socket.IO → database
                         ↘ WebRTC audio/video ↙
                               TURN server
```

The initial group-call model is peer-to-peer mesh and appropriate for small rooms. It is deliberately separated from Socket.IO signaling so it can later move to an SFU (mediasoup, LiveKit, or Janus) for large meetings. Connection quality is reported only from actual WebRTC connection state; sophisticated bitrate/loss labels can be added from `getStats()` in an SFU-ready iteration.

To let people use Sheikh over the internet, deploy the whole Node.js folder to a host that supports persistent Node processes and WebSockets, set `NODE_ENV=production`, a random `JWT_SECRET` of at least 32 characters, and the public `CORS_ORIGIN`, then attach HTTPS and a TURN server. Static-only hosts and VS Code Live Server cannot host this backend.

## Security notes

Keep `.env` private, use a strong JWT secret, configure a precise `CORS_ORIGIN`, serve HTTPS, and configure secure cookies in production. Uploaded files are limited in type and size and stored under `uploads/`; serve them through authenticated routes and consider malware scanning/object storage for a public deployment. Do not put TURN credentials or secrets in browser JavaScript.

## API summary

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`  
`GET /api/users`, `GET /api/users/me`, `PUT /api/users/me`  
`POST /api/calls`, `POST /api/calls/:id/end`, `GET /api/calls/history/list`  
`POST /api/meetings`, `GET /api/meetings/:code`, `POST /api/meetings/:code/join`  
`GET /api/messages/:meetingId`, `POST /api/uploads`
