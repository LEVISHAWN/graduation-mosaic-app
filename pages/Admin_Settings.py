import streamlit as st
from utils.settings import load_settings, save_settings
from datetime import datetime
import os
from PIL import Image

st.title("⚙️ Admin Settings")
st.write("Only for the organizer/graduate — set unlock date, email, and target image.")

settings = load_settings()

col1, col2 = st.columns(2)

with col1:
    unlock_date = st.date_input(
        "Unlock Date",
        value=settings.get("unlock_date").date() if settings.get("unlock_date") else datetime.now().date()
    )
    graduate_email = st.text_input(
        "Graduate's Email (for notification)",
        value=settings.get("graduate_email") or ""
    )

with col2:
    st.write("### Target Image (Mosaic + Background)")
    current_target = settings.get("target_image")
    if current_target and os.path.exists(current_target):
        st.image(current_target, caption="Current Target & Background", width=200)

    target_upload = st.file_uploader(
        "Upload Graduate Portrait or Logo",
        type=["jpg", "jpeg", "png"],
        help="This will be the mosaic shape AND full-screen background"
    )

if target_upload:
    os.makedirs("data/photos", exist_ok=True)
    target_path = "data/photos/graduate_target.jpg"
    Image.open(target_upload).save(target_path)
    settings["target_image"] = target_path
    st.success("Target image updated! It will now be used as background.")
    st.rerun()

# Save settings
settings["unlock_date"] = datetime.combine(unlock_date, datetime.min.time())
settings["graduate_email"] = graduate_email.strip()

if st.button("💾 Save All Settings", type="primary"):
    save_settings(settings)
    st.success("Settings saved successfully!")
    st.rerun()

st.markdown("---")
st.caption("Guests cannot see this page • Data stored securely locally")