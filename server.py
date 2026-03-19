#!/usr/bin/env python3
"""Local dev server for testing the KCSTRA site + contact form."""
import http.server
import json
import os

PORT = 3001
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        if self.path == "/api/contact":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            print(f"\n--- FORM SUBMISSION ---")
            for k, v in body.items():
                print(f"  {k}: {v}")
            print(f"--- END ---\n")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    print(f"Serving KCSTRA at http://localhost:{PORT}")
    http.server.HTTPServer(("", PORT), Handler).serve_forever()
