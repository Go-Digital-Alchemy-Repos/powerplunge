# Getting Started

Welcome to the Power Plunge documentation. This guide will help you get the development environment set up and running.

## Prerequisites

- Node.js 20+
- PostgreSQL database (provided by Replit)
- npm package manager

## Quick Start

1. Install dependencies: `npm install`
2. Set up environment variables (see [docs/ENV.md](../ENV.md) and [docs/RUNTIME.md](../RUNTIME.md))
3. Run the dev server: `npm run dev`
4. Access the app:
   - Replit: `http://localhost:5000`
   - Local/Codex backend: `http://localhost:5001`
   - Local/Codex frontend (with `npm run dev:all`): `http://localhost:5002`

## Project Structure

The project follows a full-stack architecture with:
- `client/` — React + Vite frontend
- `server/` — Express backend
- `shared/` — Shared types and schema
- `docs/` — Project documentation
