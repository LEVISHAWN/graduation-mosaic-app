import streamlit as st
import pandas as pd
import os
from datetime import datetime

st.title("📝 Leave a Secret Message")

st.write("Your message will stay hidden until the unlock date. Max 20 characters to keep it mysterious!")

message = st.text_area("Your short message to the graduate", max_chars=20, height=100, placeholder="e.g. 'So proud!'")

if st.button("Submit Message", type="primary"):
    if not message.strip():
        st.warning("Please write a message.")
    else:
        os.makedirs("data", exist_ok=True)
        file = "data/messages.csv"
        if not os.path.exists(file):
            pd.DataFrame(columns=["message", "timestamp"]).to_csv(file, index=False)
        
        df = pd.read_csv(file)
        new_row = pd.DataFrame([{"message": message.strip(), "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")}])
        pd.concat([df, new_row], ignore_index=True).to_csv(file, index=False)
        
        st.success("Message saved secretly! 🤫")
        st.balloons()