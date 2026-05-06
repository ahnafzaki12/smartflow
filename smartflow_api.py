# smartflow_api_live_one_endpoint.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from collections import deque
import threading, time, random
import cv2
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False
    print("Warning: YOLO/Torch not found or incompatible. Running in MOCK mode.")

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
YOLO_MODEL = None
if HAS_YOLO:
    try:
        YOLO_MODEL = YOLO("yolov8n.pt")
    except Exception as e:
        HAS_YOLO = False
        print(f"Error loading YOLO model: {e}. Switching to MOCK mode.")

VIDEO_SOURCE = "C:/Users/adeka/Videos/2103099-uhd_3840_2160_30fps.mp4"

# --- Background thread: live detection + smartflow ---
def live_detection_loop():
    global queue_dict, green_lights
    cap = cv2.VideoCapture(VIDEO_SOURCE)

    while True:
        if HAS_YOLO and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # loop video
                time.sleep(0.1)
                continue

            # Track + detect
            try:
                results = YOLO_MODEL.track(frame, persist=True, verbose=False)[0]
                count_A = sum(1 for box in results.boxes if int(box.cls[0]) in VEHICLE_CLASSES)
                queue_dict["Simpang A"] = count_A
            except Exception:
                queue_dict["Simpang A"] = random.randint(10, 25)
        else:
            # Mock detection for A
            queue_dict["Simpang A"] = random.randint(10, 25)

        # Dummy B, C, D
        for k in ["Simpang B", "Simpang C", "Simpang D"]:
            queue_dict[k] = random.randint(5, 30)

        # Update green lights
        try:
            green_lights.update(update_green_light(queue_dict, dt=0.5))
        except Exception as e:
            # Simple fallback cycle logic if smartflow_demo is missing
            pass

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