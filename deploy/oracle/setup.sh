#!/usr/bin/env bash
# BiletFlow on an Oracle Cloud (or any Ubuntu) server - BF-100.
#
# Run it on the server, from anywhere inside the cloned repository:
#
#   bash deploy/oracle/setup.sh
#
# The first run installs Docker, opens ports 80 and 443, writes .env with
# fresh secrets, builds and starts everything, and loads the demo data. Every
# later run (after a `git pull`) rebuilds, applies schema changes and keeps the
# data. See deploy/oracle/README.md.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."
COMPOSE=(sudo docker compose -f docker-compose.yml -f deploy/oracle/compose.yml --profile app)

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# --- 1. Docker ------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo docker compose version >/dev/null

# --- 2. Firewall ----------------------------------------------------------------
# Oracle's Ubuntu images ship iptables rules that reject everything except SSH.
# The cloud's own "security list" must allow 80/443 too (README, step 3).
say "Opening ports 80 and 443 on the server firewall"
for rule in "tcp 80" "tcp 443" "udp 443"; do
  set -- $rule
  if ! sudo iptables -C INPUT -p "$1" --dport "$2" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 1 -p "$1" --dport "$2" -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save >/dev/null
else
  echo "  (netfilter-persistent not installed; the rules last until a reboot - rerun this script after one)"
fi

# --- 3. .env --------------------------------------------------------------------
if [ ! -f .env ]; then
  say "Writing .env with fresh secrets"
  cp .env.example .env
  ip="$(curl -fsS https://api.ipify.org || true)"
  domain="${ip//./-}.sslip.io"
  set_env() {
    if grep -qE "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
  }
  set_env DOMAIN "$domain"
  set_env BILETFLOW_ENV production
  set_env JWT_SECRET "$(openssl rand -hex 32)"
  set_env POSTGRES_PASSWORD "$(openssl rand -hex 16)"
  echo "  DOMAIN=$domain (an sslip.io name that points at this server's IP)"
  echo "  To send real email, add the Gmail SMTP_* lines to .env and run this script again."
fi
grep -qE '^DOMAIN=.+' .env || { echo "Set DOMAIN=... in .env first."; exit 1; }
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2-)"

# --- 4. Build and start -----------------------------------------------------------
say "Building and starting (the first build takes several minutes)"
"${COMPOSE[@]}" up -d --build

say "Waiting for the database"
for _ in $(seq 60); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U "$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2)" >/dev/null 2>&1; then break; fi
  sleep 2
done

DB_USER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2)"
DB_NAME="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2)"
psql() { "${COMPOSE[@]}" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"; }

# --- 5. Schema changes and demo data -----------------------------------------------
say "Applying schema changes (safe to repeat)"
psql -q -f /docker-entrypoint-initdb.d/01_extensions.sql
psql -q -f /docker-entrypoint-initdb.d/02_schema.sql >/dev/null

if [ "$(psql -tAc "SELECT count(*) FROM events" | tr -d '[:space:]')" = "0" ]; then
  say "Loading the demo data"
  psql -q -f /opt/biletflow/seed/01_demo_data.sql
  psql -q -f /opt/biletflow/seed/02_catalogue.sql
else
  echo "  data already present - left as it is"
fi

# --- 6. Done ---------------------------------------------------------------------
say "Checking https://$DOMAIN"
for _ in $(seq 30); do
  if curl -fsS "https://$DOMAIN/health" >/dev/null 2>&1; then
    echo "  BiletFlow is up:"
    echo "    website:  https://$DOMAIN"
    echo "    API:      https://$DOMAIN/api/v1"
    echo "    health:   https://$DOMAIN/health"
    exit 0
  fi
  sleep 5
done
echo "  Not answering on https://$DOMAIN yet. Check the cloud security list (README, step 3)"
echo "  and the logs: sudo docker compose -f docker-compose.yml -f deploy/oracle/compose.yml --profile app logs caddy"
exit 1
