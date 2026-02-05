# LuckBuddy / BhagyaLaxmi

This repo contains:
- **backend/**: FastAPI app
- **frontend/**: Vite + React app

## Production deploy on EC2 (recommended)

This setup uses:
- Docker Compose
- SQLite (persistent Docker volume)
- Nginx on EC2 host (serves `bhagylaxmi.in`, reverse proxy)
- Frontend container bound to `127.0.0.1:8080`
- Backend container bound to `127.0.0.1:8000` and mounted under `/api`

### 0) AWS Security Group
Open:
- TCP `22` (SSH) — restrict to your IP
- TCP `80` (HTTP)
- TCP `443` (HTTPS)

### 1) EC2 prerequisites (run once on server)
SSH into EC2:

```bash
ssh -i <your-key.pem> ubuntu@13.201.10.9
```

Install Docker + Compose plugin:

```bash
sudo apt-get update -y
sudo apt-get install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose-plugin
newgrp docker

Install Nginx + TLS:

```bash
sudo apt-get install -y nginx
sudo apt-get install -y certbot python3-certbot-nginx
```
```

### 2) GitHub Actions (recommended)
No manual clone needed. Configure GitHub repo secrets and push to `main`.

Required GitHub secrets:
- `SSH_HOST` = `13.201.10.9`
- `SSH_USER` = `ubuntu`
- `SSH_PRIVATE_KEY` = your EC2 private key
- `SSH_PORT` = `22` (optional)
- `APP_DIR` = `/home/ubuntu/apps/luckbuddy`
- `PROD_ENV` = contents of your production `.env`

Minimum values to set:
- `JWT_SECRET=...`
- `CORS_ORIGINS=https://bhagylaxmi.in,https://www.bhagylaxmi.in`

Database note:
- By default deployment uses **SQLite** stored in a Docker named volume (persistent across deploys).
- You can optionally set `DATABASE_URL` if you later move to Postgres/RDS.

### SQLite seed via GitHub deploy (private repo)
This repo includes a base64 seed DB at:
- `deploy/seed/luckbuddy.db.b64`

Deploy workflow behavior:
- If the Docker volume DB is missing, it will import the seed into volume `luckbuddy_sqlite_data`.
- If the DB already exists, it will **NOT** overwrite by default.
- To force overwrite (danger): set `FORCE_SEED_DB=true` in `PROD_ENV`.

### 3) Nginx config on EC2
Copy the file from this repo:
- `deploy/nginx/bhagylaxmi.in.conf`

On EC2:

```bash
sudo cp /home/ubuntu/apps/luckbuddy/deploy/nginx/bhagylaxmi.in.conf /etc/nginx/sites-available/bhagylaxmi.in
sudo ln -sf /etc/nginx/sites-available/bhagylaxmi.in /etc/nginx/sites-enabled/bhagylaxmi.in
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS certificate:

```bash
sudo certbot --nginx -d bhagylaxmi.in -d www.bhagylaxmi.in
```

### 4) Start services (manual, if needed)

```bash
docker compose build
docker compose up -d
```

Check status:

```bash
docker compose ps
```

Logs:

```bash
docker compose logs -f --tail=200 backend
```

### 5) First admin create (one time)
After the backend is up, create first admin:

```bash
curl -X POST "https://bhagylaxmi.in/api/setup/create?username=admin&password=admin123"
```

## Local development

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo 'VITE_API_BASE_URL=http://localhost:8000' > .env
npm run dev -- --host 0.0.0.0 --port 5173
```
