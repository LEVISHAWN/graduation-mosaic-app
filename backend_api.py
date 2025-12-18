"""
A lightweight Flask API to integrate the React frontend with existing Python logic.

Endpoints provided:
- GET  /api/messages
- POST /api/messages
- GET  /api/settings
- POST /api/settings
- POST /api/upload         (photos)
- POST /api/upload-background
- POST /api/generate-mosaic
- POST /api/send-unlock

Notes:
- Saves uploaded photos to data/photos and settings to data/settings.pkl using existing utils.
- Attempts to call utils.mosaic.generate_mosaic; if that function depends on Streamlit it may raise — the endpoint returns errors clearly.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import base64
from utils import settings as settings_util
from utils import email as email_util

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
PHOTOS_DIR = os.path.join(DATA_DIR, 'photos')
os.makedirs(PHOTOS_DIR, exist_ok=True)


def messages_json_path():
    return os.path.join(DATA_DIR, 'messages.json')


@app.route('/api/messages', methods=['GET'])
def get_messages():
    path = messages_json_path()
    if os.path.exists(path):
        with open(path, 'r') as f:
            return jsonify(json.load(f))

    # fallback: read data/messages.csv if present
    csv_path = os.path.join(DATA_DIR, 'messages.csv')
    if os.path.exists(csv_path):
        out = []
        import csv
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for i, row in enumerate(reader):
                msg = row.get('message') or ''
                ts = row.get('timestamp') or ''
                encoded = base64.b64encode(msg.encode('utf-8')).decode('utf-8')
                out.append({ 'id': i+1, 'guest': 'Anonymous', 'message': encoded, 'preview': msg[:20], 'timestamp': ts })
        return jsonify(out)

    return jsonify([])


@app.route('/api/messages', methods=['POST'])
def post_message():
    data = request.get_json() or {}
    path = messages_json_path()
    messages = []
    if os.path.exists(path):
        with open(path, 'r') as f:
            messages = json.load(f)
    messages.append(data)
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(messages, f, indent=2)
    return jsonify({'ok': True}), 201


@app.route('/api/settings', methods=['GET'])
def get_settings():
    s = settings_util.load_settings() or {}
    return jsonify(s)


@app.route('/api/settings', methods=['POST'])
def post_settings():
    data = request.get_json() or {}
    s = settings_util.load_settings() or {}
    # accept unlock_date and graduate_email keys
    s['unlock_date'] = data.get('unlock_date') or s.get('unlock_date')
    s['graduate_email'] = data.get('graduate_email') or s.get('graduate_email')
    settings_util.save_settings(s)
    return jsonify({'ok': True})


@app.route('/api/upload', methods=['POST'])
def upload_photos():
    files = request.files.getlist('photos')
    saved = []
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    for f in files:
        filename = f.filename
        dest = os.path.join(PHOTOS_DIR, filename)
        f.save(dest)
        saved.append(filename)
    return jsonify({'saved': saved})


@app.route('/api/upload-background', methods=['POST'])
def upload_background():
    f = request.files.get('background')
    if not f:
        return jsonify({'error': 'no file provided'}), 400
    dest = os.path.join(DATA_DIR, 'target_image')
    os.makedirs(DATA_DIR, exist_ok=True)
    # preserve extension
    filename = f.filename or 'background.jpg'
    out_path = os.path.join(DATA_DIR, filename)
    f.save(out_path)
    s = settings_util.load_settings()
    s['target_image'] = out_path
    settings_util.save_settings(s)
    return jsonify({'saved': filename})


@app.route('/api/generate-mosaic', methods=['POST'])
def generate_mosaic_api():
    payload = request.get_json() or {}
    grid_size = payload.get('grid_size', 15)
    # Attempt to use utils.mosaic.generate_mosaic — it may depend on Streamlit progress so wrap in try/except
    try:
        from utils import mosaic as mosaic_util
        target = settings_util.load_settings().get('target_image')
        tile_dir = PHOTOS_DIR
        output_path = os.path.join(DATA_DIR, 'mosaic.jpg')
        # Many implementations of generate_mosaic expect different params; attempt the common signature
        try:
            tile_size = max(5, 1600 // max(1, int(grid_size)))
            success = mosaic_util.generate_mosaic(target, tile_dir, output_path, tile_size=tile_size)
        except Exception:
            # fallback to calling with defaults
            success = mosaic_util.generate_mosaic(target, tile_dir, output_path)

        if not os.path.exists(output_path):
            return jsonify({'error': 'mosaic not produced'}), 500

        with open(output_path, 'rb') as f:
            b = base64.b64encode(f.read()).decode('utf-8')
        data_url = f'data:image/jpeg;base64,{b}'
        return jsonify({'mosaic_data_url': data_url})
    except Exception as e:
        # If mosaic util uses streamlit it may error — return a clear message to the frontend
        return jsonify({'error': 'server-side mosaic generation not available', 'details': str(e)}), 501


@app.route('/api/send-unlock', methods=['POST'])
def send_unlock():
    payload = request.get_json() or {}
    graduate_email = payload.get('graduate_email')
    app_url = payload.get('app_url')
    if not graduate_email:
        return jsonify({'error': 'graduate_email required'}), 400
    try:
        email_util.send_unlock_email(graduate_email, app_url or '')
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
