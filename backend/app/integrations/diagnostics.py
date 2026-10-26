import os


def diagnostics():
    # No API contracts or model IDs are invented. Activation requires official documentation.
    definitions = [
        ("zetaris", "Zetaris", "ZETARIS_ENDPOINT", "ZETARIS_API_KEY"),
        (
            "nightshift",
            "Meterless Nightshift",
            "NIGHTSHIFT_ENDPOINT",
            "NIGHTSHIFT_API_KEY",
        ),
        ("nemotron", "NVIDIA Nemotron", "NIGHTSHIFT_MODEL", "NIGHTSHIFT_API_KEY"),
        (
            "engine",
            "Meterless Engine / H-MEM",
            "METERLESS_ENGINE_ENDPOINT",
            "METERLESS_API_KEY",
        ),
    ]
    return [
        {
            "id": id,
            "name": name,
            "status": "UNAVAILABLE",
            "configured_names": [n for n in (endpoint, key) if os.getenv(n)],
            "detail": "Official API contract and a successful authenticated integration test are required. No sponsor calls are being simulated.",
            "last_success": None,
            "latency_ms": None,
        }
        for id, name, endpoint, key in definitions
    ]
