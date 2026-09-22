import importlib
import os
import sys
import dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_default_demo_mode_is_disabled(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "ci-only-test-secret-32-chars-minimum")
    monkeypatch.delenv("DEMO_MODE", raising=False)
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *args, **kwargs: None)

    import app.core.config as config_module
    imported = importlib.reload(config_module)

    assert imported.settings.demo_mode is False
