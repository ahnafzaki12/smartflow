# smartflow_api.py — SmartFlow Live API v3
# Fase 1.4: phases di /status | Fase 2: settings, SQLite, alerting, WebSocket, auth

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, validator
from collections import deque
import threading, time, random, datetime, asyncio, secrets, os
from typing import Optional

import cv2
import numpy as np

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False
    print("Warning: YOLO/Torch not found. Running in MOCK mode.")

from smartflow_demo import (
    update_green_light, calculate_green_splits,
    INTERSECTIONS, MIN_GREEN, MAX_GREEN_SIDE, SAT_FLOW_RATE,
    VEHICLE_CLASSES, BOX_COLORS, BOX_DEFAULT_COLOR, CLASS_LABEL,
    FONT, FONT_SCALE, FONT_THICKNESS, BOX_THICKNESS,
)
import smartflow_demo

from database import (
    init_db, insert_history, get_history as db_get_history,
    insert_decision, get_decisions as db_get_decisions,
    insert_alert, get_alerts as db_get_alerts, resolve_alert,
    get_setting, set_setting,
)
from alerting import evaluate_alerts

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="SmartFlow Live API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth ─────────────────────────────────────────────────────────────────────
_security  = HTTPBasic(auto_error=False)
_API_USER  = os.getenv("SF_API_USER", "admin")
_API_PASS  = os.getenv("SF_API_PASS", "smartflow2024")

def require_auth(creds: Optional[HTTPBasicCredentials] = Depends(_security)):
    if creds is None:
        raise HTTPException(401, "Authentication required",
                            headers={"WWW-Authenticate": "Basic"})
    ok = secrets.compare_digest(creds.username, _API_USER) and \
         secrets.compare_digest(creds.password, _API_PASS)
    if not ok:
        raise HTTPException(401, "Invalid credentials",
                            headers={"WWW-Authenticate": "Basic"})
    return creds.username

# ─── Config ───────────────────────────────────────────────────────────────────
VIDEO_SOURCE    = "C:/Users/adeka/Videos/2103099-uhd_3840_2160_30fps.mp4"
STREAM_W        = 640
STREAM_H        = 360
STREAM_QUALITY  = 72
HISTORY_MAXLEN  = 360
DECISION_MAXLEN = 50

# ─── Shared State ─────────────────────────────────────────────────────────────
_lock             = threading.Lock()
queue_dict        = {k: 0 for k in INTERSECTIONS}
green_lights      = {k: MIN_GREEN for k in INTERSECTIONS}
latest_frame_jpeg = None

# Per-class kendaraan dari YOLO (Simpang A saja, nyata dari model)
# Format: {"Simpang A": {"cars": N, "motorcycles": N, "trucks": N}, ...}
# Simpang B/C/D: 0 karena belum ada kamera nyata (simulasi)
_class_counts: dict = {k: {"cars": 0, "motorcycles": 0, "trucks": 0} for k in INTERSECTIONS}

history_buffer: deque = deque(maxlen=HISTORY_MAXLEN)
decision_log:   deque = deque(maxlen=DECISION_MAXLEN)
_decision_counter        = 0
_prev_active_intersection = None

# WebSocket clients
_ws_clients: set[WebSocket] = set()
_ws_lock = threading.Lock()

# ─── YOLO ─────────────────────────────────────────────────────────────────────
YOLO_MODEL = None
if HAS_YOLO:
    try:
        YOLO_MODEL = YOLO("yolov8n.pt")
        print("YOLO model loaded.")
    except Exception as e:
        HAS_YOLO = False
        print(f"YOLO load error: {e}. MOCK mode.")

# ─── DB Init ──────────────────────────────────────────────────────────────────
init_db()

# ─── Draw helpers ─────────────────────────────────────────────────────────────
def _draw_boxes_on_frame(frame: np.ndarray, results) -> np.ndarray:
    display = cv2.resize(frame, (STREAM_W, STREAM_H))
    orig_h, orig_w = frame.shape[:2]
    sx, sy = STREAM_W / orig_w, STREAM_H / orig_h
    boxes_data = results.boxes
    has_tracks = boxes_data.id is not None
    total_count = 0
    for i, box_data in enumerate(boxes_data):
        cls_id = int(box_data.cls[0])
        if cls_id not in VEHICLE_CLASSES:
            continue
        total_count += 1
        color    = BOX_COLORS.get(cls_id, BOX_DEFAULT_COLOR)
        label_nm = CLASS_LABEL.get(cls_id, "Veh")
        conf     = float(box_data.conf[0])
        x1, y1, x2, y2 = box_data.xyxy[0].tolist()
        dx1, dy1 = int(x1*sx), int(y1*sy)
        dx2, dy2 = int(x2*sx), int(y2*sy)
        cv2.rectangle(display, (dx1, dy1), (dx2, dy2), color, BOX_THICKNESS)
        id_str = f"#{int(boxes_data.id[i])}" if has_tracks else ""
        text   = f"{label_nm}{id_str} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(text, FONT, FONT_SCALE, FONT_THICKNESS)
        cv2.rectangle(display, (dx1, dy1-th-6), (dx1+tw+4, dy1), color, -1)
        cv2.putText(display, text, (dx1+2, dy1-4), FONT, FONT_SCALE,
                    (255,255,255), FONT_THICKNESS, cv2.LINE_AA)
    overlay = display.copy()
    cv2.rectangle(overlay, (0,0), (STREAM_W,32), (8,12,20), -1)
    cv2.addWeighted(overlay, 0.7, display, 0.3, 0, display)
    with _lock:
        q_a = queue_dict.get("Simpang A", 0)
    hud = f"SmartFlow | YOLO | Kendaraan: {total_count} | Antrean A: {q_a}"
    cv2.putText(display, hud, (8,21), FONT, 0.48, (160,230,160), 1, cv2.LINE_AA)
    with _lock:
        is_green_a = green_lights.get("Simpang A", 0) > 0
    cv2.circle(display, (STREAM_W-14, 16), 6,
               (0,220,80) if is_green_a else (60,60,230), -1)
    return display


def _draw_mock_frame() -> np.ndarray:
    frame = np.zeros((STREAM_H, STREAM_W, 3), dtype=np.uint8)
    for y in range(STREAM_H):
        val = int(12 + y * 0.04)
        frame[y, :] = (val, val+4, val+8)
    for x in range(0, STREAM_W, 60):
        cv2.line(frame, (x,0), (x,STREAM_H), (30,35,45), 1)
    for y in range(0, STREAM_H, 40):
        cv2.line(frame, (0,y), (STREAM_W,y), (30,35,45), 1)
    with _lock:
        q_a = queue_dict.get("Simpang A", 0)
    cv2.putText(frame, "SmartFlow | MODE SIMULASI",
                (STREAM_W//2-130, STREAM_H//2-20), FONT, 0.65, (100,160,240), 1, cv2.LINE_AA)
    cv2.putText(frame, f"Simpang A | Kendaraan (sim): {q_a}",
                (STREAM_W//2-150, STREAM_H//2+12), FONT, 0.52, (140,200,140), 1, cv2.LINE_AA)
    overlay = frame.copy()
    cv2.rectangle(overlay, (0,0), (STREAM_W,30), (8,12,20), -1)
    cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)
    cv2.putText(frame, "SmartFlow SIMULASI | YOLO Tidak Tersedia",
                (8,20), FONT, 0.45, (120,140,180), 1, cv2.LINE_AA)
    return frame

# ─── Log Decision (dual-write) ────────────────────────────────────────────────
def _log_decision(intersection: str, prev_green: int, new_green: int, reason: str):
    global _decision_counter
    _decision_counter += 1
    now = datetime.datetime.now()
    entry = {
        "id":           _decision_counter,
        "timestamp":    now.isoformat(),
        "time":         now.strftime("%H:%M:%S"),
        "intersection": intersection,
        "prev_green":   prev_green,
        "new_green":    new_green,
        "reason":       reason,
        "cycle_number": smartflow_demo.CYCLE_NUMBER,
    }
    decision_log.append(entry)
    # Async DB write — non-blocking
    threading.Thread(target=insert_decision, args=(entry,), daemon=True).start()

# ─── Alert handler ────────────────────────────────────────────────────────────
def _handle_alert(alert: dict):
    """Simpan alert ke DB, broadcast ke WS clients."""
    alert_id = insert_alert(alert)
    alert["id"] = alert_id
    # Broadcast ke semua WS clients
    _broadcast_nowait({"type": "alert", **alert})

def _broadcast_nowait(payload: dict):
    """Fire-and-forget broadcast ke WS clients dari sync thread."""
    with _ws_lock:
        dead = set()
        for ws in _ws_clients:
            try:
                # asyncio.run_coroutine_threadsafe untuk thread → async bridge
                loop = getattr(ws, "_loop", None)
                if loop and loop.is_running():
                    asyncio.run_coroutine_threadsafe(ws.send_json(payload), loop)
            except Exception:
                dead.add(ws)
        for ws in dead:
            _ws_clients.discard(ws)

# ─── Detection Loop ───────────────────────────────────────────────────────────
def live_detection_loop():
    global latest_frame_jpeg, _prev_active_intersection
    cap      = cv2.VideoCapture(VIDEO_SOURCE)
    frame_no = 0

    while True:
        frame_no += 1

        if HAS_YOLO and cap and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.1)
                continue
            try:
                results  = YOLO_MODEL.track(frame, persist=True, verbose=False)[0]
                # Hitung per-kelas berdasarkan YOLO class ID — ID tetap, tidak bergantung string label
                # YOLOv8 COCO: 2=car, 3=motorcycle, 5=bus, 7=truck
                counts_per_class = {"cars": 0, "motorcycles": 0, "trucks": 0}
                for b in results.boxes:
                    cid = int(b.cls[0])
                    if cid not in VEHICLE_CLASSES:
                        continue
                    if cid == 3:                  # motorcycle
                        counts_per_class["motorcycles"] += 1
                    elif cid in (5, 7):           # bus, truck
                        counts_per_class["trucks"] += 1
                    else:                         # car (2) atau kelas lain
                        counts_per_class["cars"] += 1
                count_A   = sum(counts_per_class.values())
                annotated = _draw_boxes_on_frame(frame, results)
                with _lock:
                    _class_counts["Simpang A"] = counts_per_class
            except Exception:
                count_A   = random.randint(8, 22)
                annotated = _draw_mock_frame()
                # Pada mock/error: kita tahu tidak ada kamera, jadi set 0 semua
                with _lock:
                    _class_counts["Simpang A"] = {"cars": count_A, "motorcycles": 0, "trucks": 0}
        else:
            count_A   = random.randint(8, 22)
            annotated = _draw_mock_frame()
            # Simulasi murni: tidak ada deteksi kelas, semua dianggap cars
            with _lock:
                _class_counts["Simpang A"] = {"cars": count_A, "motorcycles": 0, "trucks": 0}

        ok, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, STREAM_QUALITY])
        if ok:
            with _lock:
                latest_frame_jpeg = buf.tobytes()

        with _lock:
            queue_dict["Simpang A"] = count_A
            
            # Simpang B: Tidak padat (Low)
            old_b = queue_dict["Simpang B"]
            queue_dict["Simpang B"] = max(2, min(12, old_b + random.randint(-1, 1)))
            
            # Simpang C: Sedikit lebih padat dari B (Medium)
            old_c = queue_dict["Simpang C"]
            queue_dict["Simpang C"] = max(15, min(28, old_c + random.randint(-2, 2)))
            
            # Simpang D: Lebih padat dari C (High)
            old_d = queue_dict["Simpang D"]
            queue_dict["Simpang D"] = max(32, min(45, old_d + random.randint(-3, 4)))

            # Queue drain per SAT_FLOW_RATE
            for k in INTERSECTIONS:
                if green_lights.get(k, 0) > 0:
                    queue_dict[k] = max(0, int(queue_dict[k] - SAT_FLOW_RATE * 0.5))

            snapshot_q   = dict(queue_dict)
            prev_gl_snap = dict(green_lights)

        try:
            new_gl = update_green_light(snapshot_q, dt=0.5)
        except Exception:
            new_gl = prev_gl_snap

        with _lock:
            green_lights.update(new_gl)
            snapshot_gl      = dict(green_lights)
            snapshot_phases  = dict(smartflow_demo.CURRENT_PHASE)
            snapshot_classes = {k: dict(v) for k, v in _class_counts.items()}

        # Decision log
        active_now = max(snapshot_gl, key=lambda k: snapshot_gl[k])
        if active_now != _prev_active_intersection and snapshot_gl[active_now] > 0:
            prev_dur = prev_gl_snap.get(active_now, 0)
            new_dur  = snapshot_gl[active_now]
            q_active = snapshot_q.get(active_now, 0)
            is_deadlock = smartflow_demo._deadlock_active
            if is_deadlock:
                reason = f"DEADLOCK TERDETEKSI — siklus dipercepat, prioritas {active_now}"
            elif q_active == 0:
                reason = "Persimpangan kosong — lompat ke berikutnya"
            elif new_dur > prev_dur:
                reason = f"Lonjakan antrean ({q_active} kdr) — hijau diperpanjang"
            else:
                reason = f"Penyeimbangan proporsional ({q_active} kdr antre)"
            _log_decision(active_now, prev_dur, new_dur, reason)
            _prev_active_intersection = active_now

        # Alert evaluation
        evaluate_alerts(snapshot_q, _handle_alert)

        # History (dual-write)
        ts  = datetime.datetime.now().isoformat()
        t   = datetime.datetime.now().strftime("%H:%M:%S")
        tick = {
            "t": t, "ts": ts,
            "qA": snapshot_q.get("Simpang A", 0),
            "qB": snapshot_q.get("Simpang B", 0),
            "qC": snapshot_q.get("Simpang C", 0),
            "qD": snapshot_q.get("Simpang D", 0),
            "gA": snapshot_gl.get("Simpang A", 0),
            "gB": snapshot_gl.get("Simpang B", 0),
            "gC": snapshot_gl.get("Simpang C", 0),
            "gD": snapshot_gl.get("Simpang D", 0),
            "phases": snapshot_phases,
        }
        history_buffer.append(tick)
        threading.Thread(target=insert_history, args=(tick,), daemon=True).start()

        # Broadcast status ke WS
        _broadcast_nowait({
            "type":           "status",
            "queue":          snapshot_q,
            "green_lights":   snapshot_gl,
            "phases":         snapshot_phases,
            "class_counts":   snapshot_classes,
            "emergency_mode": smartflow_demo.EMERGENCY_MODE,
            "emergency_lane": smartflow_demo.EMERGENCY_LANE,
            "deadlock":       smartflow_demo._deadlock_active,
            "cycle_number":   smartflow_demo.CYCLE_NUMBER,
            "timestamp":      ts,
        })

        time.sleep(0.5)


threading.Thread(target=live_detection_loop, daemon=True).start()

# ─── MJPEG Stream ─────────────────────────────────────────────────────────────
def _frame_generator():
    while True:
        with _lock:
            frame = latest_frame_jpeg
        if frame is None:
            _, buf = cv2.imencode(".jpg", _draw_mock_frame(), [cv2.IMWRITE_JPEG_QUALITY, 60])
            frame = buf.tobytes()
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        time.sleep(0.12)

# ─── WebSocket Endpoint ───────────────────────────────────────────────────────
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    # Store event loop reference untuk broadcast dari sync thread
    ws._loop = asyncio.get_event_loop()
    with _ws_lock:
        _ws_clients.add(ws)
    try:
        while True:
            # Keep-alive: tunggu pesan dari client (atau disconnect)
            await asyncio.wait_for(ws.receive_text(), timeout=30.0)
    except (WebSocketDisconnect, asyncio.TimeoutError, Exception):
        pass
    finally:
        with _ws_lock:
            _ws_clients.discard(ws)

# ─── Pydantic Models ──────────────────────────────────────────────────────────
class EmergencyRequest(BaseModel):
    active: bool
    lane: Optional[str] = None

class OverrideRequest(BaseModel):
    intersection: str
    green_secs: int

class SettingsRequest(BaseModel):
    min_green:          Optional[int]   = None
    max_green:          Optional[int]   = None
    cycle_time:         Optional[int]   = None
    sat_flow_rate:      Optional[float] = None
    yellow_duration:    Optional[int]   = None
    deadlock_threshold: Optional[int]   = None

# ─── Endpoints — GET (no auth) ────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "SmartFlow API v3.0",
        "endpoints": ["/status", "/video_feed", "/history", "/decisions",
                      "/alerts", "/settings", "/ws"],
    }

@app.get("/status")
def get_status():
    """Live status + phases + class counts + emergency info."""
    with _lock:
        return {
            "queue":          dict(queue_dict),
            "green_lights":   dict(green_lights),
            "phases":         dict(smartflow_demo.CURRENT_PHASE),
            "class_counts":   {k: dict(v) for k, v in _class_counts.items()},
            "emergency_mode": smartflow_demo.EMERGENCY_MODE,
            "emergency_lane": smartflow_demo.EMERGENCY_LANE,
            "deadlock":       smartflow_demo._deadlock_active,
            "cycle_number":   smartflow_demo.CYCLE_NUMBER,
        }

@app.get("/video_feed")
def get_video_feed():
    return StreamingResponse(_frame_generator(),
                             media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/history")
def get_history(hours: float = 0, limit: int = 360):
    """
    hours=0 → ring buffer in-memory (cepat, ~30 menit).
    hours>0 → query SQLite (data historis).
    """
    if hours > 0:
        return {"data": db_get_history(hours=hours, limit=limit), "source": "db"}
    return {"data": list(history_buffer), "source": "memory"}

@app.get("/decisions")
def get_decisions(limit: int = 50, offset: int = 0):
    return {"data": list(reversed(list(decision_log)))[:limit]}

@app.get("/alerts")
def get_alerts(active: bool = False, limit: int = 100):
    return {"data": db_get_alerts(active_only=active, limit=limit)}

@app.get("/settings")
def get_settings():
    return {
        "min_green":          smartflow_demo.MIN_GREEN,
        "max_green":          smartflow_demo.MAX_GREEN_SIDE,
        "cycle_time":         smartflow_demo.CYCLE_TIME,
        "sat_flow_rate":      smartflow_demo.SAT_FLOW_RATE,
        "yellow_duration":    smartflow_demo.YELLOW_PHASE,
        "deadlock_threshold": smartflow_demo.DEADLOCK_THRESHOLD,
        "all_red_gap":        smartflow_demo.ALL_RED_GAP,
    }

# ─── Endpoints — POST (auth required) ────────────────────────────────────────
@app.post("/emergency")
def toggle_emergency(req: EmergencyRequest, _=Depends(require_auth)):
    smartflow_demo.EMERGENCY_MODE = req.active
    smartflow_demo.EMERGENCY_LANE = req.lane if req.active else None

    if req.active:
        msg = f"MODE DARURAT DIAKTIFKAN — jalur: {req.lane or 'semua merah'}"
        _log_decision(req.lane or "Semua", 0, MAX_GREEN_SIDE, msg)
    else:
        _log_decision("Semua", 0, 0, "Mode darurat DINONAKTIFKAN — kembali ke otomatis")

    return {
        "success":       True,
        "emergency_mode": smartflow_demo.EMERGENCY_MODE,
        "emergency_lane": smartflow_demo.EMERGENCY_LANE,
    }

@app.post("/apply-ai")
def apply_ai_recommendation(_=Depends(require_auth)):
    with _lock:
        snapshot = dict(queue_dict)
    new_splits = calculate_green_splits(snapshot)
    with _lock:
        green_lights.update(new_splits)
        smartflow_demo._cycle_splits = new_splits
    top = max(new_splits, key=new_splits.get)
    splits_str = ", ".join(f"{k}: {v}d" for k, v in new_splits.items())
    _log_decision(top, 0, max(new_splits.values()),
                  f"Rekomendasi AI diterapkan — {splits_str}")
    return {"success": True, "splits": new_splits}

@app.post("/override")
def manual_override(req: OverrideRequest, _=Depends(require_auth)):
    if req.intersection not in INTERSECTIONS:
        raise HTTPException(422, f"Simpang '{req.intersection}' tidak valid")
    clamped = min(MAX_GREEN_SIDE, max(MIN_GREEN, req.green_secs))
    with _lock:
        prev = green_lights.get(req.intersection, 0)
        green_lights[req.intersection] = clamped
    _log_decision(req.intersection, prev, clamped,
                  f"Override manual — {req.intersection}: {prev}d → {clamped}d")
    return {"success": True, "intersection": req.intersection, "green_secs": clamped}

@app.post("/settings")
def update_settings(req: SettingsRequest, _=Depends(require_auth)):
    # Validasi silang
    new_min = req.min_green or smartflow_demo.MIN_GREEN
    new_max = req.max_green or smartflow_demo.MAX_GREEN_SIDE
    if new_min >= new_max:
        raise HTTPException(422, "min_green harus lebih kecil dari max_green")

    if req.min_green is not None:
        smartflow_demo.MIN_GREEN = req.min_green
        set_setting("min_green", str(req.min_green))
    if req.max_green is not None:
        smartflow_demo.MAX_GREEN_SIDE = req.max_green
        set_setting("max_green", str(req.max_green))
    if req.cycle_time is not None:
        if req.cycle_time < 40:
            raise HTTPException(422, "cycle_time minimal 40 detik")
        smartflow_demo.CYCLE_TIME = req.cycle_time
        set_setting("cycle_time", str(req.cycle_time))
    if req.sat_flow_rate is not None:
        smartflow_demo.SAT_FLOW_RATE = req.sat_flow_rate
        set_setting("sat_flow_rate", str(req.sat_flow_rate))
    if req.yellow_duration is not None:
        smartflow_demo.YELLOW_PHASE = req.yellow_duration
        set_setting("yellow_duration", str(req.yellow_duration))
    if req.deadlock_threshold is not None:
        smartflow_demo.DEADLOCK_THRESHOLD = req.deadlock_threshold
        set_setting("deadlock_threshold", str(req.deadlock_threshold))

    _log_decision("Sistem", 0, 0, "Konfigurasi diperbarui oleh operator")
    return {"success": True, "settings": get_settings()}

@app.post("/alerts/{alert_id}/resolve")
def resolve_alert_endpoint(alert_id: int, _=Depends(require_auth)):
    ok = resolve_alert(alert_id)
    if not ok:
        raise HTTPException(404, f"Alert #{alert_id} tidak ditemukan")
    return {"success": True, "alert_id": alert_id}