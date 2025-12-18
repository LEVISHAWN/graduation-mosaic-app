import streamlit as st
import pandas as pd
import os
from datetime import datetime
from utils.settings import load_settings
from utils.email import send_unlock_email

st.title("🔓 Time Capsule")

settings = load_settings()
unlock_date = settings.get("unlock_date")
email = settings.get("graduate_email")
app_url = st.text_input("Your app URL (for email link)", value="https://your-app.streamlit.app", help="Update this in deployment")

now = datetime.now()

if unlock_date and now >= unlock_date:
    if email:
        send_unlock_email(email, app_url)

    st.success(f"🎉 Capsule Unlocked! ({unlock_date.strftime('%B %d, %Y')})")

    # === CONFETTI EXPLOSION ===
    st.markdown(
        """
        <script src="https://cdn.jsdelivr.net/npm/tsparticles-confetti@2.12.0/tsparticles.confetti.min.js"></script>
        <script>
        const duration = 5 * 1000,
              defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

        function fire(particleRatio, opts) {
          confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(200 * particleRatio)
          }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2,  { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1,  { spread: 120, startVelocity: 45 });
        
        // Repeat every 8 seconds for ongoing celebration
        setInterval(() => {
            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2,  { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        }, 8000);
        </script>
        """,
        unsafe_allow_html=True
    )
    # === END CONFETTI ===

    if os.path.exists("data/mosaic.jpg"):
        st.image("data/mosaic.jpg", caption="Memory Mosaic from Your Loved Ones ✨")

    if os.path.exists("data/messages.csv"):
        df = pd.read_csv("data/messages.csv")
        st.subheader("💌 Messages Just for You")
        for _, row in df.iterrows():
            st.markdown(f"<div style='background: #fff8dc; padding: 15px; border-radius: 10px; margin: 10px 0; border-left: 5px solid #f39c12;'>"
                        f"<strong>{row['timestamp']}</strong><br>{row['message']}</div>", 
                        unsafe_allow_html=True)

    st.markdown(
        """
        <div style='text-align: center; padding: 2rem; background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 20px; margin: 2rem 0;'>
            <h2>🎊 Congratulations, Graduate! 🎊</h2>
            <p>This moment was made with love by everyone who believes in you.</p>
        </div>
        """,
        unsafe_allow_html=True
    )

else:
    if unlock_date:
        days_left = (unlock_date - now).days
        st.info(f"⏳ This capsule unlocks in **{days_left} days** on **{unlock_date.strftime('%B %d, %Y')}**")
    else:
        st.info("Unlock date not set yet.")
    
    st.markdown(
        """
        <div style="text-align: center; padding: 2rem; background: rgba(255,255,255,0.8); border-radius: 15px;">
            <h3>Something amazing is waiting inside... 🎁</h3>
            <p>Be patient — the best surprises take time.</p>
        </div>
        """,
        unsafe_allow_html=True
    )