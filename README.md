# resQcar Backend

*A location-based emergency mechanic and roadside assistance platform.*

The **resQcar Backend** provides the REST API and real-time communication services that power the resQcar mobile application — connecting drivers with nearby mechanics during vehicle emergencies.

---

## Features

- Firebase Authentication (token verification via middleware)
- Firestore & Firebase Realtime Database integration
- Mechanic discovery and service request management
- Real-time tracking and communication via Socket.IO
- Stripe payment processing
- File upload support via Multer
- Modular architecture (controllers, routes, services, middleware)
- Docker support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 5.x |
| Auth & DB | Firebase Admin SDK (Firestore + Realtime DB) |
| Real-time | Socket.IO |
| Payments | Stripe |
| Containerisation | Docker / Docker Compose |

---

## Project Structure

```
resQcar-backend/
├── src/
│   ├── config/          # Firebase & DB initialisation
│   ├── controllers/     # Request/response handlers
│   ├── helpers/         # Utility functions (e.g. ETA)
│   ├── middleware/      # Auth, roles, file upload
│   ├── routes/          # API route definitions
│   ├── scripts/         # One-off scripts (e.g. seed data)
│   ├── services/        # Business logic layer
│   ├── websocket/       # Socket.IO setup
│   ├── app.js           # Express app setup
│   └── server.js        # HTTP server entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```
---

## Installation & Running

```bash
# Clone the repo
git clone https://github.com/resQcar/resQcar-backend.git
cd resQcar-backend

# Install dependencies
npm install

# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000` by default.

---

## Docker

```bash
# Build and start
docker compose up --build

# Stop
docker compose down
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/...` | Authentication |
| GET/POST | `/api/users/...` | User management |
| GET/POST | `/api/bookings/...` | Booking management |
| GET/POST | `/api/mechanics/...` | Mechanic dashboard |
| GET/POST | `/api/jobs/...` | Job management |
| GET/POST | `/api/payments/...` | Stripe payments |
| GET/POST | `/api/tracking/...` | Real-time tracking |
| GET/POST | `/api/tow-trucks/...` | Tow truck management |
| GET/POST | `/api/service-history/...` | Service history |
| GET/POST | `/api/ratings/...` | Ratings |
| GET/POST | `/api/car-tips/...` | Car tips |

---

## CI/CD

This project uses GitHub Actions for continuous integration and deployment.

- **CI** — runs on every push and pull request to `main`: installs dependencies and checks for errors.
- **CD** — on push to `main`: builds and pushes a Docker image to Docker Hub, then deploys to the server.

See `.github/workflows/` for workflow definitions.
