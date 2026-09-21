"""Launches backend (FastAPI) and frontend (Vite) together; stops both on Ctrl+C."""

import os
import sys
import shutil
import signal
import subprocess
import threading

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

COLOR_BACKEND = "\033[96m"
COLOR_FRONTEND = "\033[92m"
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_YELLOW = "\033[93m"

processes = []

def stream_output(process, prefix, color):
    try:
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            print(f"{color}{prefix}{COLOR_RESET} {line.rstrip()}", flush=True)
    except (ValueError, OSError):
        pass


def kill_process_tree(p):
    if p.poll() is not None:
        return
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(p.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        p.terminate()


def shutdown(signum=None, frame=None):
    print(f"\n{COLOR_YELLOW}[!] Shutting down Sahayak services...{COLOR_RESET}", flush=True)
    for p in processes:
        kill_process_tree(p)
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm_cmd:
        print(f"{COLOR_YELLOW}[Error] 'npm' was not found on PATH. Please install Node.js.{COLOR_RESET}")
        sys.exit(1)

    print(f"{COLOR_BOLD}===================================================={COLOR_RESET}")
    print(f"{COLOR_BOLD}   🚀 Starting Sahayak Unified Development Stack    {COLOR_RESET}")
    print(f"{COLOR_BOLD}===================================================={COLOR_RESET}")
    print(f" • Frontend : {COLOR_BOLD}http://localhost:5173{COLOR_RESET}")
    print(f" • Backend  : {COLOR_BOLD}http://127.0.0.1:8000{COLOR_RESET}")
    print(f" • API Docs : {COLOR_BOLD}http://127.0.0.1:8000/docs{COLOR_RESET}")
    print(f" • Press {COLOR_BOLD}Ctrl+C{COLOR_RESET} at any time to stop both servers.")
    print(f"{COLOR_BOLD}----------------------------------------------------{COLOR_RESET}\n")

    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = BACKEND_DIR
    backend_proc = subprocess.Popen(
        [sys.executable, "run_server.py"],
        cwd=BACKEND_DIR,
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(backend_proc)

    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(frontend_proc)

    t1 = threading.Thread(
        target=stream_output,
        args=(backend_proc, "[BACKEND] ", COLOR_BACKEND),
        daemon=True
    )
    t2 = threading.Thread(
        target=stream_output,
        args=(frontend_proc, "[FRONTEND]", COLOR_FRONTEND),
        daemon=True
    )

    t1.start()
    t2.start()

    try:
        while True:
            for p in processes:
                code = p.poll()
                if code is not None:
                    print(f"\n{COLOR_YELLOW}[!] Process {p.pid} exited with code {code}. Stopping...{COLOR_RESET}")
                    shutdown()
            threading.Event().wait(0.5)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
