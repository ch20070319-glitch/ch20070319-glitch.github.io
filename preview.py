"""Read-only local static preview; playlist synchronization is an owner-side tool."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        if any(part.startswith('.') for part in Path(path.lstrip('/')).parts):
            self.send_error(404)
            return None
        candidate = (ROOT / path.lstrip('/')).resolve()
        if candidate == ROOT:
            candidate = ROOT / 'index.html'
        allowed = {'.html', '.css', '.js', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.mp3', '.ico', '.woff', '.woff2', '.json'}
        if ROOT not in candidate.parents or not candidate.is_file() or candidate.suffix.lower() not in allowed:
            self.send_error(404)
            return None
        return super().send_head()

    def do_POST(self):
        self.send_error(405, 'Read-only static website')

    do_PUT = do_POST
    do_DELETE = do_POST
    do_PATCH = do_POST

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Local: http://127.0.0.1:{args.port}/#music', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
