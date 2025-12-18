if st.button("Generate Mosaic Now", type="primary"):
    with st.spinner("Creating your masterpiece... This may take a minute."):
        success = generate_mosaic(target_path, "data/photos", "data/mosaic.jpg", tile_size=20)
        if success and os.path.exists("data/mosaic.jpg"):
            st.image("data/mosaic.jpg", caption="Your Memory Mosaic ✨")
            st.download_button("💾 Download Mosaic", open("data/mosaic.jpg", "rb").read(), "graduation_mosaic.jpg")

            # === MOSAIC COMPLETION CONFETTI ===
            st.markdown(
                """
                <script src="https://cdn.jsdelivr.net/npm/tsparticles-confetti@2.12.0/tsparticles.confetti.min.js"></script>
                <script>
                const end = Date.now() + (3 * 1000);
                const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3'];

                (function frame() {
                  confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                  });
                  confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                  });

                  if (Date.now() < end) {
                    requestAnimationFrame(frame);
                  }
                }());
                </script>
                """,
                unsafe_allow_html=True
            )
            # === END CONFETTI ===
            st.success("🎉 Mosaic complete! Confetti time!")