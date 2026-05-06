"""
╔══════════════════════════════════════════════════════════════╗
║           SmartFlow - Adaptive Traffic Light System          ║
║                   Proof of Concept (PoC)                     ║
╚══════════════════════════════════════════════════════════════╝

Struktur:
  Tahap 1 : Deteksi kendaraan real-time via YOLOv8n + OpenCV
  Tahap 2 : Distribusi antrean ke 4 persimpangan (bobot asimetris)
  Tahap 3 : Algoritma SmartFlow – adaptive green-light timing
  Tahap 4 : Console Dashboard live via Rich
  Tahap 5 : Bounding Box window – live OpenCV overlay per class kendaraan

Dependensi:
  pip install ultralytics opencv-python rich numpy

Jalankan:
  python smartflow.py
  python smartflow.py --video path/to/video.mp4
  python smartflow.py --demo              # mode demo tanpa video (simulasi murni)
  python smartflow.py --no-window         # nonaktifkan jendela bounding box

Kontrol jendela OpenCV:
  Q / Esc  : keluar
  Space    : pause / resume
  B        : toggle bounding box labels
  T        : toggle track trails
"""

import argparse
import os
import random
import sys
import threading
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Optional

import numpy as np

# ── Rich ───────────────────────────────────────────────────────────────────────
try:
    from rich.columns import Columns
    from rich.console import Console
    from rich.live import Live
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich import box
except ImportError:
    sys.exit("[ERROR] Library 'rich' tidak ditemukan. Jalankan: pip install rich")

# ── OpenCV ─────────────────────────────────────────────────────────────────────
try:
    import cv2
except ImportError:
    sys.exit("[ERROR] Library 'opencv-python' tidak ditemukan. Jalankan: pip install opencv-python")

# ══════════════════════════════════════════════════════════════════════════════
# KONSTANTA & KONFIGURASI
# ══════════════════════════════════════════════════════════════════════════════

VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
INTERSECTIONS   = ["Simpang A", "Simpang B", "Simpang C", "Simpang D"]

# Adaptive timing
MIN_GREEN = 15   # detik
MAX_GREEN = 60   # detik

# Interval distribusi (dalam frame; akan di-skip jika DEMO mode)
DISTRIBUTE_EVERY_N_FRAMES = 150   # ±5 detik pada 30 fps

# Riwayat deteksi untuk grafik mini (sparkline)
HISTORY_LEN = 20

console = Console()

# ══════════════════════════════════════════════════════════════════════════════
# BOUNDING BOX – KONFIGURASI VISUAL
# ══════════════════════════════════════════════════════════════════════════════

# BGR colors per class (OpenCV uses BGR)
BOX_COLORS: dict[int, tuple[int, int, int]] = {
    2: (  0, 230,   0),   # car        → hijau cerah
    3: (  0, 200, 255),   # motorcycle → kuning-oranye
    5: (255,  60,  60),   # bus        → biru-merah
    7: ( 80,  80, 255),   # truck      → merah-oranye
}
BOX_DEFAULT_COLOR = (200, 200, 200)

CLASS_EMOJI = {2: "🚗", 3: "🛵", 5: "🚌", 7: "🚛"}
CLASS_LABEL = {2: "Car", 3: "Moto", 5: "Bus", 7: "Truck"}

# Tebal kotak & font
BOX_THICKNESS  = 2
FONT           = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE     = 0.52
FONT_THICKNESS = 1

# Panjang maksimum trail jejak per objek (track_id)
TRAIL_MAX_LEN  = 25
WINDOW_NAME    = "SmartFlow – Live Detection"

# Ukuran display window (resize untuk konsistensi)
DISPLAY_W, DISPLAY_H = 960, 540


# ══════════════════════════════════════════════════════════════════════════════
# BOUNDING BOX – DRAWING ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class BBoxState:
    """Menyimpan state interaktif jendela bounding box."""
    def __init__(self):
        self.show_labels : bool = True    # toggle label teks
        self.show_trails : bool = True    # toggle trail jejak
        self.paused      : bool = False   # pause / resume
        self.trails      : dict[int, deque] = defaultdict(lambda: deque(maxlen=TRAIL_MAX_LEN))
        # per-class count untuk overlay statistik
        self.class_counts: dict[int, int] = {cls: 0 for cls in VEHICLE_CLASSES}

    def handle_key(self, key: int) -> bool:
        """Proses tombol keyboard. Return False jika harus keluar."""
        if key in (ord('q'), ord('Q'), 27):   # Q atau Esc
            return False
        if key == ord(' '):
            self.paused = not self.paused
        if key in (ord('b'), ord('B')):
            self.show_labels = not self.show_labels
        if key in (ord('t'), ord('T')):
            self.show_trails = not self.show_trails
        return True


def _draw_rounded_rect(img, pt1, pt2, color, thickness=2, r=6):
    """Gambar persegi panjang dengan sudut membulat."""
    x1, y1 = pt1
    x2, y2 = pt2
    # garis lurus
    cv2.line(img, (x1 + r, y1), (x2 - r, y1), color, thickness)
    cv2.line(img, (x1 + r, y2), (x2 - r, y2), color, thickness)
    cv2.line(img, (x1, y1 + r), (x1, y2 - r), color, thickness)
    cv2.line(img, (x2, y1 + r), (x2, y2 - r), color, thickness)
    # sudut
    cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180,  0,  90, color, thickness)
    cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270,  0,  90, color, thickness)
    cv2.ellipse(img, (x1 + r, y2 - r), (r, r),  90,  0,  90, color, thickness)
    cv2.ellipse(img, (x2 - r, y2 - r), (r, r),   0,  0,  90, color, thickness)


def _label_background(img, text: str, org, color, alpha=0.6):
    """Label dengan background semi-transparan."""
    (tw, th), baseline = cv2.getTextSize(text, FONT, FONT_SCALE, FONT_THICKNESS)
    x, y = org
    overlay = img.copy()
    pad = 3
    cv2.rectangle(overlay, (x - pad, y - th - pad), (x + tw + pad, y + baseline + pad), color, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
    # teks putih
    cv2.putText(img, text, org, FONT, FONT_SCALE, (255, 255, 255), FONT_THICKNESS, cv2.LINE_AA)


def draw_bounding_boxes(
    frame: np.ndarray,
    results,
    state: BBoxState,
    frame_no: int,
    live_fps: float,
) -> np.ndarray:
    """
    Render bounding boxes, label, trail, dan HUD statistik ke frame OpenCV.
    Mendukung YOLO tracking (track_id) jika tersedia.
    """
    display = cv2.resize(frame, (DISPLAY_W, DISPLAY_H))
    orig_h, orig_w = frame.shape[:2]
    sx = DISPLAY_W / orig_w
    sy = DISPLAY_H / orig_h

    # Reset hitungan per-class frame ini
    for k in state.class_counts:
        state.class_counts[k] = 0

    boxes_data = results.boxes
    has_tracks = boxes_data.id is not None

    for i, box_data in enumerate(boxes_data):
        cls_id = int(box_data.cls[0])
        if cls_id not in VEHICLE_CLASSES:
            continue

        conf     = float(box_data.conf[0])
        color    = BOX_COLORS.get(cls_id, BOX_DEFAULT_COLOR)
        label_nm = CLASS_LABEL[cls_id]
        state.class_counts[cls_id] += 1

        # Koordinat asli → skala ke display
        x1, y1, x2, y2 = box_data.xyxy[0].tolist()
        dx1 = int(x1 * sx); dy1 = int(y1 * sy)
        dx2 = int(x2 * sx); dy2 = int(y2 * sy)

        # ── Trail ─────────────────────────────────────────────────────────
        if has_tracks and state.show_trails:
            track_id = int(boxes_data.id[i])
            cx = (dx1 + dx2) // 2
            cy = (dy1 + dy2) // 2
            state.trails[track_id].append((cx, cy))

            pts = list(state.trails[track_id])
            for j in range(1, len(pts)):
                alpha_fade = j / len(pts)
                faded = tuple(int(c * alpha_fade) for c in color)
                thick = max(1, int(2 * alpha_fade))
                cv2.line(display, pts[j-1], pts[j], faded, thick, cv2.LINE_AA)

        # ── Kotak ─────────────────────────────────────────────────────────
        _draw_rounded_rect(display, (dx1, dy1), (dx2, dy2), color, BOX_THICKNESS)

        # ── Label ─────────────────────────────────────────────────────────
        if state.show_labels:
            id_str = f"#{int(boxes_data.id[i])}" if has_tracks else ""
            text   = f"{label_nm}{id_str} {conf:.0%}"
            _label_background(display, text, (dx1, dy1 - 4), color)

    # ── HUD overlay ───────────────────────────────────────────────────────────
    _draw_hud(display, state, frame_no, live_fps)

    return display


def _draw_hud(img: np.ndarray, state: BBoxState, frame_no: int, live_fps: float):
    """Header HUD: FPS, frame, jumlah per class, kontrol hint."""
    h, w = img.shape[:2]

    # Panel gelap semi-transparan di atas
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, 38), (10, 10, 10), -1)
    cv2.addWeighted(overlay, 0.65, img, 0.35, 0, img)

    # Teks FPS & frame
    fps_txt = f"FPS {live_fps:5.1f}  |  Frame #{frame_no:,}"
    cv2.putText(img, fps_txt, (10, 24), FONT, 0.55, (200, 230, 200), 1, cv2.LINE_AA)

    # Jumlah per class (kanan atas)
    parts = []
    total = 0
    for cls_id, name in CLASS_LABEL.items():
        n = state.class_counts.get(cls_id, 0)
        total += n
        parts.append((f"{name}:{n}", BOX_COLORS[cls_id]))

    x_right = w - 10
    cv2.putText(img, f"Total:{total}", (x_right - 90, 24),
                FONT, 0.55, (255, 255, 100), 1, cv2.LINE_AA)

    # Hints di bawah
    if state.paused:
        hint = "[ PAUSED ]  Space=resume  Q=quit"
        color_hint = (50, 50, 255)
    else:
        hint = "Space=pause  B=labels  T=trails  Q=quit"
        color_hint = (160, 160, 160)

    hint_y = h - 8
    (tw, _), _ = cv2.getTextSize(hint, FONT, 0.42, 1)
    ov2 = img.copy()
    cv2.rectangle(ov2, (0, h - 22), (w, h), (10, 10, 10), -1)
    cv2.addWeighted(ov2, 0.5, img, 0.5, 0, img)
    cv2.putText(img, hint, ((w - tw) // 2, hint_y),
                FONT, 0.42, color_hint, 1, cv2.LINE_AA)

    # Indikator PAUSE besar di tengah
    if state.paused:
        cv2.putText(img, "II  PAUSED", (w // 2 - 60, h // 2),
                    FONT, 1.4, (50, 50, 255), 3, cv2.LINE_AA)


# ══════════════════════════════════════════════════════════════════════════════
# TAHAP 2 : DISTRIBUSI ANTREAN
# ══════════════════════════════════════════════════════════════════════════════


def _random_asymmetric_weights(n: int = 4) -> list[float]:
    """
    Hasilkan n bobot acak yang dijamin *tidak rata*.
    Minimum spread antara bobot terbesar dan terkecil = 30 pp.
    """
    while True:
        raw = np.random.dirichlet(np.random.uniform(0.5, 3.0, n))
        raw = raw.tolist()
        if max(raw) - min(raw) >= 0.30:
            return raw


def distribute_traffic(total_vehicles: int) -> dict[str, int]:
    """
    Tahap 2 – Bagi total_vehicles ke 4 persimpangan dengan bobot asimetris acak.
    Sisa pembulatan diberikan ke persimpangan dengan antrean terpanjang.
    """
    weights = _random_asymmetric_weights(4)
    counts  = [int(total_vehicles * w) for w in weights]

    # koreksi sisa
    diff = total_vehicles - sum(counts)
    if diff > 0:
        idx = counts.index(max(counts))
        counts[idx] += diff

    return {name: max(0, c) for name, c in zip(INTERSECTIONS, counts)}


# ══════════════════════════════════════════════════════════════════════════════
# TAHAP 3 : ALGORITMA SMARTFLOW
# ══════════════════════════════════════════════════════════════════════════════

def calculate_green_light(queue_dict: dict[str, int]) -> dict[str, int]:
    """
    Tahap 3 – Proporsional terhadap panjang antrean.
    Total slot waktu satu siklus = jumlah semua durasi hijau (∑ green).
    Batas: [MIN_GREEN, MAX_GREEN] detik.
    """
    total_q = sum(queue_dict.values())

    if total_q == 0:
        # semua persimpangan kosong → bagikan rata minimum
        return {k: MIN_GREEN for k in queue_dict}

    TOTAL_CYCLE = 4 * MAX_GREEN   # budget siklus total (240 dtk default)
    green_times: dict[str, int] = {}

    for name, count in queue_dict.items():
        proportion   = count / total_q
        raw_duration = proportion * TOTAL_CYCLE
        clamped      = int(np.clip(raw_duration, MIN_GREEN, MAX_GREEN))
        green_times[name] = clamped

    return green_times


# ══════════════════════════════════════════════════════════════════════════════
# TAHAP 4 : RICH DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

TRAFFIC_COLORS = ["green", "yellow", "orange1", "red"]   # ringan→padat

def _traffic_color(count: int, max_count: int) -> str:
    if max_count == 0:
        return TRAFFIC_COLORS[0]
    ratio = count / max_count
    idx   = min(int(ratio * len(TRAFFIC_COLORS)), len(TRAFFIC_COLORS) - 1)
    return TRAFFIC_COLORS[idx]


def _sparkline(history: deque, width: int = 15) -> str:
    """ASCII sparkline sederhana dari riwayat deteksi."""
    bars   = " ▁▂▃▄▅▆▇█"
    data   = list(history)[-width:]
    if not data:
        return "─" * width
    hi     = max(data) or 1
    return "".join(bars[min(int(v / hi * (len(bars) - 1)), len(bars) - 1)] for v in data)


def build_dashboard(
    frame_no:        int,
    fps:             float,
    total_detected:  int,
    queue_dict:      dict[str, int],
    green_lights:    dict[str, int],
    detection_hist:  deque,
    elapsed_sec:     float,
    source_label:    str,
) -> Table:
    """Rakit layout Rich untuk satu update dashboard."""

    max_q = max(queue_dict.values()) if queue_dict else 1

    # ── Header info ───────────────────────────────────────────────────────────
    header = Table.grid(expand=True)
    header.add_column(justify="left")
    header.add_column(justify="right")
    header.add_row(
        Text("🚦  SmartFlow  –  Adaptive Traffic Light PoC", style="bold cyan"),
        Text(f"⏱  {elapsed_sec:.1f}s  |  Frame #{frame_no:,}", style="dim"),
    )

    # ── Blok 1: Status Video / Deteksi YOLO ───────────────────────────────────
    t_video = Table(box=box.SIMPLE_HEAD, expand=True, show_header=True)
    t_video.add_column("Parameter",   style="bold white", no_wrap=True)
    t_video.add_column("Nilai",       style="cyan")

    t_video.add_row("Sumber",         source_label)
    t_video.add_row("Frame Rate",     f"{fps:.1f} FPS")
    t_video.add_row("Total Deteksi",  f"[bold green]{total_detected:,}[/] kendaraan")
    t_video.add_row("Tren Deteksi",   _sparkline(detection_hist))

    panel_video = Panel(t_video, title="[bold]📹  Tahap 1 – Deteksi YOLO[/]",
                        border_style="blue", padding=(0, 1))

    # ── Blok 2: Distribusi Antrean ─────────────────────────────────────────────
    t_queue = Table(box=box.SIMPLE_HEAD, expand=True, show_header=True)
    t_queue.add_column("Simpang",    style="bold white",  width=12)
    t_queue.add_column("Kendaraan",  justify="right",     width=12)
    t_queue.add_column("Proporsi",   justify="right",     width=10)
    t_queue.add_column("Bar",        no_wrap=True)

    total_q = sum(queue_dict.values()) or 1
    for name, count in queue_dict.items():
        color   = _traffic_color(count, max_q)
        ratio   = count / total_q * 100
        bar_len = int(count / max_q * 20) if max_q else 0
        bar     = f"[{color}]{'█' * bar_len}{'░' * (20 - bar_len)}[/]"
        t_queue.add_row(name, f"[{color}]{count:,}[/]", f"{ratio:.1f}%", bar)

    panel_queue = Panel(t_queue, title="[bold]🔀  Tahap 2 – Distribusi Antrean[/]",
                        border_style="yellow", padding=(0, 1))

    # ── Blok 3: Keputusan AI ───────────────────────────────────────────────────
    t_ai = Table(box=box.SIMPLE_HEAD, expand=True, show_header=True)
    t_ai.add_column("Simpang",        style="bold white",  width=12)
    t_ai.add_column("Hijau (detik)",  justify="right",     width=14)
    t_ai.add_column("Prioritas",      width=12)
    t_ai.add_column("Sinyal",         no_wrap=True)

    max_green = max(green_lights.values()) if green_lights else MAX_GREEN
    sorted_ai = sorted(green_lights.items(), key=lambda x: x[1], reverse=True)

    rank_labels = ["🥇 UTAMA", "🥈 TINGGI", "🥉 SEDANG", "   RENDAH"]
    for rank, (name, dur) in enumerate(sorted_ai):
        ratio   = dur / max_green
        g_color = "green" if ratio > 0.75 else ("yellow" if ratio > 0.45 else "red")
        bar_len = int(ratio * 20)
        bar     = f"[{g_color}]{'█' * bar_len}{'░' * (20 - bar_len)}[/]"
        t_ai.add_row(name, f"[bold {g_color}]{dur}s[/]", rank_labels[rank], bar)

    panel_ai = Panel(t_ai, title="[bold]🤖  Tahap 3 – Keputusan SmartFlow AI[/]",
                     border_style="green", padding=(0, 1))

    # ── Rangkai semua ─────────────────────────────────────────────────────────
    root = Table.grid(expand=True)
    root.add_row(header)
    root.add_row(panel_video)
    root.add_row(panel_queue)
    root.add_row(panel_ai)
    root.add_row(Text(
        "  Tekan  Ctrl+C  untuk keluar",
        style="dim italic", justify="center"
    ))

    return root


# ══════════════════════════════════════════════════════════════════════════════
# TAHAP 1 : DETEKSI YOLO (+ loop utama)
# ══════════════════════════════════════════════════════════════════════════════

def load_yolo():
    """Muat YOLOv8n; otomatis unduh bobot jika belum ada."""
    try:
        from ultralytics import YOLO
    except ImportError:
        sys.exit("[ERROR] Ultralytics tidak ditemukan. Jalankan: pip install ultralytics")
    console.print("[cyan]⏳  Memuat model YOLOv8n…[/]")
    model = YOLO("yolov8n.pt")
    console.print("[green]✅  Model siap.[/]")
    return model


def run_demo_mode():
    """
    Mode demo tanpa video: simulasi murni deteksi kendaraan acak.
    Berguna untuk menguji dashboard & algoritma tanpa file video.
    """
    console.print(Panel(
        "[yellow]Mode DEMO aktif[/] – tidak ada file video.\n"
        "Total kendaraan disimulasikan secara acak.",
        title="SmartFlow Demo",
        border_style="yellow",
    ))
    time.sleep(1.5)

    detection_hist: deque = deque(maxlen=HISTORY_LEN)
    queue_dict: dict[str, int]  = {k: 0 for k in INTERSECTIONS}
    green_lights: dict[str, int] = {k: MIN_GREEN for k in INTERSECTIONS}

    frame_no     = 0
    start_time   = time.time()
    interval_sec = 5.0

    with Live(console=console, refresh_per_second=2, screen=True) as live:
        last_distribute = time.time()
        while True:
            frame_no += 1
            # Simulasi deteksi: sinusoidal + noise
            t_val = time.time() - start_time
            simulated = int(
                60 + 40 * np.sin(t_val / 30) +
                random.gauss(0, 8)
            )
            total_vehicle_detected = max(0, simulated)
            detection_hist.append(total_vehicle_detected)

            now = time.time()
            if now - last_distribute >= interval_sec:
                queue_dict   = distribute_traffic(total_vehicle_detected)
                green_lights = calculate_green_light(queue_dict)
                last_distribute = now

            dashboard = build_dashboard(
                frame_no        = frame_no,
                fps             = 0.0,
                total_detected  = total_vehicle_detected,
                queue_dict      = queue_dict,
                green_lights    = green_lights,
                detection_hist  = detection_hist,
                elapsed_sec     = time.time() - start_time,
                source_label    = "[yellow]DEMO MODE[/] (simulasi)",
            )
            live.update(dashboard)
            time.sleep(0.5)


def run_video_mode(video_path: str, show_window: bool = True):
    """
    Mode utama: baca video nyata, deteksi + tracking YOLOv8n,
    tampilkan bounding box di jendela OpenCV, dan Rich dashboard di terminal.
    """
    if not Path(video_path).exists():
        console.print(f"[red]❌  File video tidak ditemukan: {video_path}[/]")
        console.print("   Gunakan flag [bold]--demo[/] untuk mode simulasi.")
        sys.exit(1)

    model = load_yolo()
    cap   = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        sys.exit(f"[ERROR] Tidak dapat membuka video: {video_path}")

    video_fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    console.print(f"[cyan]📹  Video:[/] {video_path}")
    console.print(f"[cyan]📊  FPS  :[/] {video_fps:.1f}  |  Total frame: {total_frames:,}")
    if show_window:
        console.print("[cyan]🪟  Jendela OpenCV aktif[/] – Space=pause  B=labels  T=trails  Q=quit")
    time.sleep(1)

    # ── State ──────────────────────────────────────────────────────────────────
    total_vehicle_detected = 0
    detection_hist: deque  = deque(maxlen=HISTORY_LEN)
    queue_dict             = {k: 0 for k in INTERSECTIONS}
    green_lights           = {k: MIN_GREEN for k in INTERSECTIONS}
    bbox_state             = BBoxState()

    frame_no   = 0
    start_time = time.time()
    fps_buffer = deque(maxlen=30)
    stop_flag  = threading.Event()

    # ── Setup OpenCV window ────────────────────────────────────────────────────
    if show_window:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(WINDOW_NAME, DISPLAY_W, DISPLAY_H)

    with Live(console=console, refresh_per_second=4, screen=True) as live:
        while not stop_flag.is_set():
            # ── Keyboard handler (non-blocking, 1ms) ──────────────────────────
            if show_window:
                key = cv2.waitKey(1) & 0xFF
                if not bbox_state.handle_key(key):
                    break

            # ── Pause: tunggu, update HUD saja ────────────────────────────────
            if bbox_state.paused:
                time.sleep(0.05)
                continue

            t_frame_start = time.time()
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)   # loop video
                bbox_state.trails.clear()               # reset trail saat loop
                continue

            frame_no += 1

            # ── Tahap 1: Inferensi YOLO + Tracking ────────────────────────────
            # Gunakan .track() agar tiap objek punya ID unik (untuk trail)
            track_results = model.track(
                frame,
                persist=True,
                verbose=False,
                tracker="bytetrack.yaml",
            )
            results = track_results[0]

            count_this_frame = 0
            for box_data in results.boxes:
                cls_id = int(box_data.cls[0])
                if cls_id in VEHICLE_CLASSES:
                    count_this_frame += 1

            total_vehicle_detected = count_this_frame
            detection_hist.append(total_vehicle_detected)

            # ── FPS aktual ────────────────────────────────────────────────────
            frame_dur = time.time() - t_frame_start
            fps_buffer.append(1.0 / frame_dur if frame_dur > 0 else 0)
            live_fps  = float(np.mean(fps_buffer))

            # ── Tahap 2 & 3: Distribusi & Keputusan tiap N frame ─────────────
            if frame_no % DISTRIBUTE_EVERY_N_FRAMES == 0:
                queue_dict   = distribute_traffic(total_vehicle_detected)
                green_lights = calculate_green_light(queue_dict)

            # ── Tahap 5: Render Bounding Box ke jendela OpenCV ────────────────
            if show_window:
                annotated = draw_bounding_boxes(
                    frame     = frame,
                    results   = results,
                    state     = bbox_state,
                    frame_no  = frame_no,
                    live_fps  = live_fps,
                )
                cv2.imshow(WINDOW_NAME, annotated)

            # ── Tahap 4: Rich Dashboard ───────────────────────────────────────
            dashboard = build_dashboard(
                frame_no        = frame_no,
                fps             = live_fps,
                total_detected  = total_vehicle_detected,
                queue_dict      = queue_dict,
                green_lights    = green_lights,
                detection_hist  = detection_hist,
                elapsed_sec     = time.time() - start_time,
                source_label    = Path(video_path).name,
            )
            live.update(dashboard)

    cap.release()
    if show_window:
        cv2.destroyAllWindows()


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="SmartFlow – Adaptive Traffic Light PoC",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--video", "-v",
        default="vehicle_video.mp4",
        help="Path ke file video (default: vehicle_video.mp4)",
    )
    parser.add_argument(
        "--demo", "-d",
        action="store_true",
        help="Jalankan dalam mode demo (simulasi tanpa video)",
    )
    parser.add_argument(
        "--no-window",
        action="store_true",
        help="Nonaktifkan jendela OpenCV bounding box (terminal-only)",
    )
    args = parser.parse_args()

    try:
        if args.demo:
            run_demo_mode()
        else:
            run_video_mode(args.video, show_window=not args.no_window)
    except KeyboardInterrupt:
        console.print("\n[bold yellow]⚠  SmartFlow dihentikan oleh pengguna.[/]")
        cv2.destroyAllWindows()
        sys.exit(0)


if __name__ == "__main__":
    main()