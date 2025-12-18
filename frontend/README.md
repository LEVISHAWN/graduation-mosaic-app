# Graduation Memory Frontend

This is a lightweight React + Vite frontend containing the `GraduationApp` UI extracted from the project.

Quickstart

1. Install dependencies

   ```bash
   cd frontend
   npm install
   ```

2. Run dev server

   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser.

Notes

- TailwindCSS is loaded via CDN for quick local development (see `index.html`).
- `localStorage` is used in the browser as a substitute for the `window.storage` shim from the original app.
- Sending real emails is out of scope for local dev; a notification popup is shown instead.
