# Mi Hogar Financiero

This project is a TypeScript/React application with an Express API used to manage family finances. The client is built with Vite and served statically by the API in production.

## Prerequisites
- Node.js 20+
- npm

## Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the required values.

## Development
Start the API and Vite dev server:
```bash
npm run dev
```

## Production
Build the client and run the API server:
```bash
npm run build
npm start
```

When deploying to platforms like Render, use `npm run build` as the build command and `npm start` as the start command so the project is built only once.
