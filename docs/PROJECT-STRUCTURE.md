# StockSense Project Structure

## Repository

This repository is the single shared StockSense project.

## Top-level folders

- `backend/` — Node.js/TypeScript/Express backend, Prisma schema, authentication, stock engine, ledger, and APIs.
- `frontend/` — application UI, pages, components, API client, and frontend state.
- `contracts/` — shared API contracts used by backend and frontend.
- `docs/` — architecture, workflow, and hackathon documentation.

## Collaboration rule

Use the same repository and preserve these boundaries. Do not create separate databases or separate StockSense projects for individual features. Coordinate changes to shared contracts and database schema before changing them.
