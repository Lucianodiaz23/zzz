import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import random
import time

PORT = 8000
# ¡RECUERDA PONER TU NUEVO CLIENT SECRET AQUÍ!
CLIENT_ID = '57866'
CLIENT_SECRET = 'GOYj7Arhno7qVYJ7SVU3zKl3KI3oNvvAoCBD0sGi' 

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/random-user'):
            self.handle_random_user()
        else:
            super().do_GET()

    def handle_random_user(self):
        access_token = self.get_access_token()
        if not access_token:
            self.send_error_response("No se pudo obtener token de acceso")
            return

        user_found = None
        attempts = 0
        max_attempts = 15 # Intentar más veces para encontrar alguien con stats

        while attempts < max_attempts and user_found is None:
            attempts += 1
            # Selección aleatoria de modo y ranking mundial top 1-2000
            selected_mode = random.choice(['osu', 'taiko', 'fruits', 'mania'])
            selected_page = random.randint(1, 40)
            
            try:
                req_ranking = urllib.request.Request(
                    f'https://osu.ppy.sh/api/v2/rankings/{selected_mode}/performance?cursor[page]={selected_page}',
                    headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
                )
                
                with urllib.request.urlopen(req_ranking, timeout=5) as ranking_resp:
                    ranking_data = json.loads(ranking_resp.read())
                
                ranking_entries = ranking_data.get('ranking', [])
                if not ranking_entries:
                    continue
                
                ranked_user = random.choice(ranking_entries).get('user', {})
                random_id = ranked_user.get('id')
                if not random_id:
                    continue
                
                req_user = urllib.request.Request(
                    f'https://osu.ppy.sh/api/v2/users/{random_id}/{selected_mode}',
                    headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
                )
                
                with urllib.request.urlopen(req_user, timeout=5) as resp:
                    data = json.loads(resp.read())
                    
                    # Validación estricta: ¿Tiene estadísticas?
                    stats = data.get('statistics')
                    if stats and isinstance(stats, dict):
                        if stats.get('pp', 0) > 0 or stats.get('play_count', 0) > 0:
                            user_found = data
                    
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    continue # Usuario no existe, siguiente intento
                elif e.code == 429:
                    time.sleep(1) # Rate limit, esperar un poco
                    continue
                else:
                    continue
            except Exception:
                continue

        if user_found:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(user_found).encode())
        else:
            self.send_error_response("No se encontró ningún usuario activo tras varios intentos.")

    def get_access_token(self):
        try:
            token_data = urllib.parse.urlencode({
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'grant_type': 'client_credentials',
                'scope': 'public'
            }).encode('ascii')
            
            req_token = urllib.request.Request('https://osu.ppy.sh/oauth/token', data=token_data)
            with urllib.request.urlopen(req_token, timeout=10) as response:
                token_json = json.loads(response.read())
                return token_json.get('access_token')
        except Exception as e:
            print(f"Error obteniendo token: {e}")
            return None

    def send_error_response(self, msg):
        self.send_response(500)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        print(f"Servidor corriendo en http://localhost:{PORT}")
        print("Presiona Ctrl+C para detener")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
