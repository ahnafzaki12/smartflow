# smartflow_api_live_one_endpoint.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from collections import deque
import threading, time, random
import cv2
from ultralytics import YOLO

# --- Import SmartFlow logic ---
from smartflow_demo import update_green_light, distribute_traffic, INTERSECTIONS, MIN_GREEN, GREEN_ORDER, MAX_GREEN_SIDE, VEHICLE_CLASSES

# --- FastAPI setup ---
app = FastAPI(title="SmartFlow Live API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # production: ganti dengan frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Shared state global ---
queue_dict = {k: 0 for k in INTERSECTIONS}
green_lights = {k: MIN_GREEN for k in INTERSECTIONS}

# --- YOLO config ---
YOLO_MODEL = YOLO("yolov8n.pt")   # path ke bobot
VIDEO_SOURCE = "C:\\Users\\ahnaf\\Downloads\\MachineLearning\\plate-register\\vehicle_video.mp4"  # 0 = webcam, bisa diganti path video

# --- Background thread: live detection + smartflow ---
def live_detection_loop():
    global queue_dict, green_lights
    cap = cv2.VideoCapture(VIDEO_SOURCE)

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue

        # Track + detect
        results = YOLO_MODEL.track(frame, persist=True, verbose=False)[0]

        # Hitung jumlah kendaraan Simpang A
        count_A = sum(1 for box in results.boxes if int(box.cls[0]) in VEHICLE_CLASSES)
        queue_dict["Simpang A"] = count_A

        # Dummy B, C, D
        for k in ["Simpang B", "Simpang C", "Simpang D"]:
            queue_dict[k] = random.randint(5, 30)

        # Update green lights
        green_lights.update(update_green_light(queue_dict, dt=0.5))

        time.sleep(0.5)

# Start background thread
threading.Thread(target=live_detection_loop, daemon=True).start()

# --- Single endpoint ---
@app.get("/status")
def get_status():
    """Return live SmartFlow status for all intersections."""
    return {
        "queue": queue_dict,
        "green_lights": green_lights
    }

# Optional root
@app.get("/")
def root():
    return {"message": "SmartFlow API running. Gunakan /status untuk live data."}