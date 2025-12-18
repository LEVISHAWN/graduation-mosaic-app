import streamlit as st
from utils.settings import load_settings
import os
import base64

st.set_page_config(page_title="Graduation Time Capsule", layout="wide", initial_sidebar_state="expanded")

# Dynamic Background Function
def set_background(image_path):
    if image_path and os.path.exists(image_path):
        with open(image_path, "rb") as img_file:
            encoded = base64.b64encode(img_file.read()).decode()
        st.markdown(
            f"""
            <style>
            .stApp {{
                background-image: url("data:image/jpeg;base64,{encoded}");
                background-size: cover;
                background-position: center;
                background-attachment: fixed;
            }}
            .stApp > div:first-child {{
                background: rgba(255, 255, 255, 0.75);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                margin: 10px;
            }}
            </style>
            """,
            unsafe_allow_html=True
        )
    else:
        st.markdown(
            """
            <style>
            .stApp {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            </style>
            """,
            unsafe_allow_html=True
        )

# Apply background
settings = load_settings()
target = settings.get("target_image")
set_background(target)

# Main Content
st.markdown(
    """
    <div style="text-align: center; padding: 2rem; border-radius: 20px; background: rgba(255,255,255,0.9); margin-bottom: 2rem;">
        <h1 style="font-size: 3.5rem; background: linear-gradient(90deg, #ff6b6b, #feca57); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            🎓 Graduation Time Capsule
        </h1>
        <h2 style="font-size: 2rem; color: #2d3436;">& Memory Mosaic</h2>
        <p style="font-size: 1.2rem; color: #636e72;">
            A heartfelt digital gift from friends & family
        </p>
    </div>
    """,
    unsafe_allow_html=True
)

if target and os.path.exists(target):
    st.image(target, use_column_width=True, caption="The Graduate ✨")

st.markdown(
    """
    <div style="text-align: center; background: rgba(255,255,255,0.9); padding: 1.5rem; border-radius: 15px; margin: 2rem 0;">
        <p style="font-size: 1.3rem;">
            👈 Use the menu to submit secret messages, upload photos, generate the mosaic, or unlock the capsule!
        </p>
        <p style="color: #e74c3c; font-weight: bold;">
            Share this link with all guests — works perfectly on phones!
        </p>
    </div>
    """,
    unsafe_allow_html=True
)

st.markdown("---")
st.caption("Made with ❤️ using Streamlit • No login required • Mobile-friendly")