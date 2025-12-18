import cv2
import numpy as np
import os
import streamlit as st
from scipy import spatial  # For KDTree

def generate_mosaic(target_image_path, tile_dir, output_path="data/mosaic.jpg", tile_size=20, top_k=20):
    if not os.path.exists(target_image_path):
        st.error("Target image not set.")
        return False

    target_img = cv2.imread(target_image_path)
    if target_img is None:
        st.error("Failed to load target image.")
        return False

    h, w = target_img.shape[:2]
    target_img = target_img[:(h // tile_size) * tile_size, :(w // tile_size) * tile_size]
    target_lab = cv2.cvtColor(target_img, cv2.COLOR_BGR2LAB)

    # Region averages in LAB
    strides = target_lab.strides
    grid_h, grid_w = target_lab.shape[0] // tile_size, target_lab.shape[1] // tile_size
    patches = np.lib.stride_tricks.as_strided(
        target_lab,
        shape=(grid_h, grid_w, tile_size, tile_size, 3),
        strides=(strides[0] * tile_size, strides[1] * tile_size, *strides)
    )
    region_avgs = np.mean(patches, axis=(2, 3))
    region_avgs_flat = region_avgs.reshape(-1, 3)
    num_regions = len(region_avgs_flat)

    # Load tiles with progress
    progress_bar = st.progress(0, text="Processing photo tiles...")
    tiles = []
    tile_avgs = []
    files = [f for f in os.listdir(tile_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    total_files = len(files)

    for idx, file in enumerate(files):
        path = os.path.join(tile_dir, file)
        tile = cv2.imread(path)
        if tile is not None:
            tile = cv2.resize(tile, (tile_size, tile_size))
            tile_lab = cv2.cvtColor(tile, cv2.COLOR_BGR2LAB)
            avg_lab = np.mean(tile_lab, axis=(0, 1))
            tiles.append(tile)
            tile_avgs.append(avg_lab)
        progress_bar.progress((idx + 1) / total_files, text=f"Loading tile {idx + 1}/{total_files}")

    if not tiles:
        st.error("No valid photos found in uploads.")
        return False

    tile_avgs = np.array(tile_avgs)
    num_tiles = len(tiles)

    # Advanced: Build KDTree for fast nearest neighbor in LAB color space
    tree = spatial.KDTree(tile_avgs)

    # Greedy no-duplicate assignment (hardest regions first) with top-k randomization for diversity
    progress_bar.text("Assigning unique tiles with advanced matching...")
    
    # Compute difficulty: min distance for each region using tree.query
    _, min_dists = tree.query(region_avgs_flat, k=1)
    region_order = np.argsort(-min_dists.flatten())  # Hardest first

    available = set(range(num_tiles))  # Use set for fast removal
    best_indices = np.zeros(num_regions, dtype=int)
    duplicates_used = False

    import random  # For randomization among top-k

    for count, region_idx in enumerate(region_order):
        if not available:
            duplicates_used = True
            remaining = region_order[count:]
            # Fallback to nearest for remaining
            dists, idxs = tree.query(region_avgs_flat[remaining], k=1)
            best_indices[remaining] = idxs.flatten()
            break
        
        # Query top-k nearest from all, then filter to available
        dists, idxs = tree.query(region_avgs_flat[region_idx], k=top_k)
        
        # Find available candidates among top-k
        avail_candidates = [i for i in idxs if i in available]
        
        if not avail_candidates:
            # If no available in top-k, take closest overall available (rare)
            avail_dists = np.linalg.norm(tile_avgs[list(available)] - region_avgs_flat[region_idx], axis=1)
            best_local_idx = np.argmin(avail_dists)
            best_tile_idx = list(available)[best_local_idx]
        else:
            # Random pick among available top-k for diversity
            best_tile_idx = random.choice(avail_candidates)
        
        best_indices[region_idx] = best_tile_idx
        available.discard(best_tile_idx)

        if (count + 1) % max(1, num_regions // 50) == 0:
            progress_bar.progress((count + 1) / num_regions)

    if duplicates_used:
        st.warning("Not enough unique photos — some tiles reused for best fit.")

    # Build mosaic
    progress_bar.text("Constructing final mosaic...")
    best_tiles = np.array(tiles)[best_indices]
    grid = best_tiles.reshape(grid_h, grid_w, tile_size, tile_size, 3)
    rows = [np.hstack(grid[i]) for i in range(grid_h)]
    mosaic = np.vstack(rows)

    os.makedirs("data", exist_ok=True)
    cv2.imwrite(output_path, mosaic)  # Save in BGR
    progress_bar.empty()
    st.success("✨ Memory Mosaic generated with advanced KDTree matching and randomized diversity!")
    return True