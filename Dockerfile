## Dockerfile for running the Flask backend (and building frontend if desired)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies needed for some Python packages (opencv, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install wheel first so pip can fetch binary wheels
RUN python -m pip install --upgrade pip setuptools wheel

# Copy project files
COPY . /app

# Install python requirements
RUN python -m pip install --no-cache-dir -r requirements.txt

# If you want to build the frontend inside the image, uncomment:
# RUN cd frontend && npm ci && npm run build

EXPOSE 5000

CMD ["python", "backend/backend_api.py"]
