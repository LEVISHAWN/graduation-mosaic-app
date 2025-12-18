import streamlit as st
import os
from PIL import Image

st.title("📸 Upload a Memory Photo")

st.write("Upload any photo with the graduate — it will become part of the mosaic!")

uploaded = st.file_uploader("Choose a photo", type=["jpg", "jpeg", "png", "webp"])

if uploaded:
    os.makedirs("data/photos", exist_ok=True)
    path = f"data/photos/{uploaded.name}"
    Image.open(uploaded).save(path)
    st.image(uploaded, caption="Uploaded!", use_column_width=True)
    st.success("Photo added to the Memory Mosaic collection! 🎉")