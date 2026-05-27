import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import os

# TUS CREDENCIALES (No compartas este archivo)
CLIENT_ID = "57866"
CLIENT_SECRET = "GOYj7Arhno7qVYJ7SVU3zKl3KI3oNvvAoCBD0sGi"

PORT = 8000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Servir archivos estáticos (html, css, js)
        if self.path.endswith(".html") or self.path.endswith(".css") or self.path.endswith(".js"):
            return super().do_GET()
        
        # Proxy para la API de osu!
        if self.path.startswith("/api/osu/"):
            try:
                # 1. Obtener Token de Acceso (OAuth2)
                token_data = urllib.parse.urlencode({
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "grant_type": "client_credentials",
                    "scope": "public"
                }).encode()
                
                req_token = urllib.request.Request("https://osu.ppy.sh/oauth/token", data=token_data)
                with urllib.request.urlopen(req_token) as response:
                    token_json = json.loads(response.read())
                    access_token = token_json["access_token"]

                # 2. Llamar a la API real con el token
                # Extraer la ruta que queremos consultar (ej: /api/osu/users/12345)
                api_path = self.path.replace("/api/osu/", "https://osu.ppy.sh/api/v2/")
                
                req_api = urllib.request.Request(api_path)
                req_api.add_header("Authorization", f"Bearer {access_token}")
                req_api.add_header("Accept", "application/json")
                req_api.add_header("User-Agent", "osu-random-viewer/1.0") # Requerido por osu!

                with urllib.request.urlopen(req_api) as response:
                    data = response.read()
                    
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*") # Permitir CORS local
                self.end_headers()
                self.wfile.write(data)

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            return super().do_GET()

print(f"Servidor iniciado en http://localhost:{PORT}")
print("Abre esa dirección en tu navegador.")
with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    httpd.serve_forever()
