# KES — Kai Entertainment System 🎮

A retro-inspired gaming console UI with adaptive AI commentary.

Inspired by classic NES systems, reimagined as **KES (Kai Entertainment System)** — a hostile, observant console that remembers how you play and judges you accordingly.

## Features

- 🕹️ Retro console UI with carousel game selection
- 🤖 Global AI memory with behavioral tracking
- 💾 Persistent memory via AWS (API Gateway + Lambda + DynamoDB)
- 🔁 LocalStorage fallback when offline
- ⚡ Boot screen & power-off sequence
- 😈 Sassy AI commentary based on player behavior

## Tech Stack

- React + TypeScript + Vite
- AWS Lambda
- API Gateway (HTTP API)
- DynamoDB
- Modular AI architecture per game

## AI Memory Architecture

- Frontend uses a storage abstraction
- Automatically switches between:
  - HTTP memory store (AWS)
  - Local storage fallback
- No AWS credentials required on frontend

## Setup (Local)


```bash
npm install
npm run dev
```

## Optional AWS integration:

Create .env:

VITE_AI_MEMORY_ENDPOINT=https://<your-api-gateway-url>/memory

## Disclaimer

This system is intentionally opinionated.
The AI will judge you.
That’s the point.