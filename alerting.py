# alerting.py — SmartFlow Alerting Engine
# Task 2.3: Rule-based alerts dengan cooldown anti-spam

import datetime
import time
from typing import Callable

# ─── Alert Rules ──────────────────────────────────────────────────────────────

ALERT_RULES: list[dict] = [
    {
        "name": "congestion_high",
        "severity": "warning",
        "type": "congestion",
        "cooldown": 60,  # detik antar alert yang sama
        "check": "per_intersection",
        "threshold": 35,
        "message": "Antrean tinggi di {intersection}: {count} kendaraan",
    },
    {
        "name": "congestion_critical",
        "severity": "critical",
        "type": "congestion",
        "cooldown": 30,
        "check": "per_intersection",
        "threshold": 45,
        "message": "Kemacetan kritis di {intersection}: {count} kendaraan",
    },
    {
        "name": "deadlock",
        "severity": "critical",
        "type": "deadlock",
        "cooldown": 120,
        "check": "all_above",
        "threshold": 40,
        "message": "DEADLOCK TERDETEKSI: Semua persimpangan padat ({counts})",
    },
]

# ─── Cooldown State ────────────────────────────────────────────────────────────
# key: "rule_name" atau "rule_name:intersection" → last_fired timestamp
_last_fired: dict[str, float] = {}


def _cooldown_ok(key: str, cooldown_secs: int) -> bool:
    """True jika alert boleh dikirim (cooldown sudah berlalu)."""
    last = _last_fired.get(key, 0.0)
    if time.monotonic() - last >= cooldown_secs:
        _last_fired[key] = time.monotonic()
        return True
    return False


# ─── Evaluator ────────────────────────────────────────────────────────────────

def evaluate_alerts(
    queue_dict: dict[str, int],
    on_alert: Callable[[dict], None],
):
    """
    Evaluasi semua rules terhadap queue_dict saat ini.
    Panggil on_alert(alert_dict) untuk setiap alert yang terpicu.
    """
    now = datetime.datetime.now().isoformat()

    for rule in ALERT_RULES:
        name     = rule["name"]
        severity = rule["severity"]
        atype    = rule["type"]
        cooldown = rule["cooldown"]
        thr      = rule["threshold"]

        if rule["check"] == "per_intersection":
            # Cek tiap simpang secara individual
            for intersection, count in queue_dict.items():
                if count >= thr:
                    cd_key = f"{name}:{intersection}"
                    if _cooldown_ok(cd_key, cooldown):
                        on_alert({
                            "timestamp":    now,
                            "type":         atype,
                            "severity":     severity,
                            "intersection": intersection,
                            "message":      rule["message"].format(
                                intersection=intersection, count=count
                            ),
                        })

        elif rule["check"] == "all_above":
            # Deadlock: semua simpang >= threshold
            if all(v >= thr for v in queue_dict.values()):
                cd_key = name
                if _cooldown_ok(cd_key, cooldown):
                    counts_str = ", ".join(
                        f"{k}: {v}" for k, v in queue_dict.items()
                    )
                    on_alert({
                        "timestamp":    now,
                        "type":         atype,
                        "severity":     severity,
                        "intersection": None,
                        "message":      rule["message"].format(counts=counts_str),
                    })
