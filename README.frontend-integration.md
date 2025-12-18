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
