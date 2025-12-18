import pickle
import os
from datetime import datetime

SETTINGS_FILE = "data/settings.pkl"

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "rb") as f:
            return pickle.load(f)
    return {
        "unlock_date": None,
        "graduate_email": None,
        "target_image": None
    }

def save_settings(settings):
    os.makedirs("data", exist_ok=True)
    with open(SETTINGS_FILE, "wb") as f:
        pickle.dump(settings, f)