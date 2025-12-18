This project now includes a React frontend (Vite) and a small Flask backend API to integrate with the existing Python logic.

Quick setup (development):

1) Backend (Python)
 - Create a virtualenv and install requirements you need (Flask, flask-cors, opencv-python, scipy, numpy, etc.). Example:

   python -m venv .venv
   source .venv/bin/activate
   pip install flask flask-cors
   # For mosaic generation you may also need opencv, scipy, numpy
   pip install opencv-python scipy numpy

 - Start the backend API (serves on port 5000):

   python backend_api.py

2) Frontend (React / Vite)
 - From the `frontend` folder install dependencies and run dev server:

   cd frontend
   npm install
   npm run dev

The React app will attempt to talk to the backend at `/api/...` on the same origin during development; when running the Flask server on port 5000 and Vite on a separate port, configure a proxy in Vite or run the frontend with a reverse-proxy (or set explicit fetch URLs to `http://localhost:5000/api/...`).

Notes and caveats:
 - The backend tries to call existing `utils.mosaic.generate_mosaic`. That function may use Streamlit utilities (progress bars) — if it relies on Streamlit it might error when called from Flask. In that case the endpoint will return a clear error and you can call the mosaic generation from the Streamlit UI (pages) instead.
 - Uploaded photos are stored at `data/photos` and generated mosaic is written to `data/mosaic.jpg` when server-side generation succeeds.

PWA and Deployment notes:

- A basic web manifest and icons have been added at `frontend/public/manifest.webmanifest` and `frontend/public/icons/` to enable mobile installability.
- To complete PWA support and generate a service worker we recommend installing `vite-plugin-pwa` in the frontend and configuring it in `vite.config.js`. This requires `npm install` to succeed in your environment (network access to registry.npmjs.org). If your network blocks npm, you can still deploy the built `frontend/dist` as a static site and the static manifest/icons will allow basic add-to-home-screen flows on many platforms.
- For Vercel: a `vercel.json` file is included to build the frontend and serve the SPA. Ensure the project is configured with the frontend as the build target and that the build command `npm run build` runs successfully in `frontend`. If you still see 404s on Vercel, set the Output Directory to `frontend/dist` and add a rewrite to `index.html` (already set in vercel.json).
