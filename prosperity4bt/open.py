import webbrowser
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen

# Built local visualizer lives at visualizer/dist/ relative to this package root
_VISUALIZER_DIST = Path(__file__).resolve().parents[1] / "visualizer" / "dist"
_LOCAL_VIS_DEV_PORT = 5173  # default Vite dev server port


def _local_dev_server_running() -> bool:
    """Return True if the Vite dev server is reachable."""
    try:
        urlopen(f"http://localhost:{_LOCAL_VIS_DEV_PORT}/", timeout=0.5)
        return True
    except (URLError, Exception):
        return False


class HTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.server.shutdown_flag = True
        return super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        return super().end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        return


class LogFileHTTPServer(HTTPServer):
    """Minimal one-shot server that serves the log file directory, then shuts down."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.shutdown_flag = False


def open_visualizer(output_file: Path) -> None:
    log_handler = partial(HTTPRequestHandler, directory=str(output_file.parent))
    log_server = LogFileHTTPServer(("localhost", 0), log_handler)
    log_url = f"http://localhost:{log_server.server_port}/{output_file.name}"

    if _local_dev_server_running():
        # Local Vite dev server is up — use it with a ?open= param so it can fetch the log
        webbrowser.open(f"http://localhost:{_LOCAL_VIS_DEV_PORT}/?open={log_url}")
    elif _VISUALIZER_DIST.is_dir():
        # Serve the pre-built local visualizer alongside the log file
        # Both directories are served from the log file's parent; the built index.html
        # must be copied there or we serve via a redirect-capable handler.
        # Simplest approach: open built index.html directly as a file URL and fetch log via HTTP
        index = _VISUALIZER_DIST / "index.html"
        webbrowser.open(f"file://{index}?open={log_url}")
    else:
        # Fallback 1: GitHub Pages hosted visualizer (Xeeshan85's version)
        webbrowser.open(
            f"https://xeeshan85.github.io/imc-prosperity-4-backtester/?open={log_url}"
        )
        # Fallback 2: upstream jmerle visualizer (if above doesn't work)
        # webbrowser.open(
        #     f"https://jmerle.github.io/imc-prosperity-3-visualizer/?open={log_url}"
        # )

    while not log_server.shutdown_flag:
        log_server.handle_request()
