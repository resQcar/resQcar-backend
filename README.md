# resQcar Backend

## Overview
The **resQcar Backend** is the mobile application for the resQcar platform. It provides APIs and real-time communication services that support the mobile application used to connect drivers with nearby mechanics during vehicle emergencies.

The backend handles user authentication, service requests, location-based mechanic discovery, notifications, and real-time communication between users and mechanics.

This backend is built using **Node.js and Express.js**, with **Firebase services** for authentication and data management.

---

## Features

- RESTful API for client applications
- Firebase Authentication integration
- Mechanic discovery and service request management
- Real-time communication using WebSockets
- Modular architecture using controllers, routes, services, and middleware
- Environment-based configuration support

---

## Tech Stack

- Node.js  
- Express.js  
- Firebase (Authentication / Firestore)  
- WebSockets  
- JavaScript  
- REST API Architecture
- AWS EC2 

---

## Project Structure

```
resQcar-backend
│
├── src
│   ├── config          # Configuration files
│   ├── controllers     # Handles request/response logic
│   ├── middleware      # Custom middleware functions
│   ├── routes          # API route definitions
│   ├── services        # Business logic and service layer
│   └── websocket       # WebSocket implementation for real-time features
│
├── app.js              # Express application setup
├── server.js           # Server entry point
├── .env                # Environment variables
├── serviceAccountKey.json  # Firebase admin credentials
├── package.json
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/ImanjithWaniganayaka/resQcar-backend.git
```

Navigate into the project directory:

```bash
cd resQcar-backend
```

Install dependencies:

```bash
npm install
```

---

## Running the Server

Start the backend server:

```bash
npm start
```

For development mode (if using nodemon):

```bash
npm run dev
```

The server will start on the configured port.

# resQcar 
*A location-based emergency mechanic and roadside assistance mobile application.*

🔗 Live Demo: www.resqcar.com/ 

Backend development for the **resQcar project**.
