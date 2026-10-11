#!/usr/bin/env bash
# Deploys RateIt on this host behind a native Cloudflare Tunnel.
#
# Run this FROM the repo root, on the server that will actually run the app
# (e.g. a VM/LXC on Proxmox). Requires: docker + the compose plugin already
# installed. Installs cloudflared itself if missing.
#
# One step is interactive: `cloudflared tunnel login` opens a URL you must
# open in a browser once to authorize this machine against your Cloudflare
# account — everything else is unattended.
#
# Usage: ./scripts/deploy-proxmox.sh
set -euo pipefail

TUNNEL_NAME="${TUNNEL_NAME:-rateit}"
HOSTNAME_FQDN="${HOSTNAME_FQDN:-rateit.guyleibo.tech}"
APP_PORT="${APP_PORT:-3000}"
ADMIN_USERNAMES_DEFAULT="arik_admin"
GA_MEASUREMENT_ID_DEFAULT="G-4CHYG42M2R"

CLOUDFLARED_CONFIG_DIR="/etc/cloudflared"
CRED_DIR="${HOME}/.cloudflared"

log() { echo -e "\n==> $*"; }

log "Checking prerequisites"
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed. Install Docker + the compose plugin first, then re-run this script." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: 'docker compose' (v2 plugin) is not available." >&2
  exit 1
fi

log "Checking cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found — installing from Cloudflare's apt repo..."
  sudo mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
  sudo apt-get update && sudo apt-get install -y cloudflared
else
  echo "cloudflared already installed: $(cloudflared --version)"
fi

log "Cloudflare authentication"
if [ ! -f "${CRED_DIR}/cert.pem" ]; then
  echo "No origin certificate found at ${CRED_DIR}/cert.pem."
  echo "This opens a Cloudflare login URL — open it in a browser and authorize"
  echo "the guyleibo.tech zone. Waiting for you to complete it..."
  cloudflared tunnel login
else
  echo "Already authenticated (${CRED_DIR}/cert.pem exists)."
fi

log "Ensuring tunnel '${TUNNEL_NAME}' exists"
if cloudflared tunnel list 2>/dev/null | awk 'NR>1{print $2}' | grep -qx "$TUNNEL_NAME"; then
  echo "Tunnel '${TUNNEL_NAME}' already exists."
else
  cloudflared tunnel create "$TUNNEL_NAME"
fi

TUNNEL_ID="$(cloudflared tunnel list -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
matches = [t['id'] for t in data if t['name'] == '${TUNNEL_NAME}']
if not matches:
    sys.exit('tunnel ${TUNNEL_NAME} not found after create')
print(matches[0])
")"
CRED_FILE="${CRED_DIR}/${TUNNEL_ID}.json"

if [ ! -f "$CRED_FILE" ]; then
  echo "ERROR: expected credentials file not found at ${CRED_FILE}" >&2
  exit 1
fi

log "Writing /etc/cloudflared/config.yml"
sudo mkdir -p "$CLOUDFLARED_CONFIG_DIR"
sudo tee "${CLOUDFLARED_CONFIG_DIR}/config.yml" >/dev/null <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}

ingress:
  - hostname: ${HOSTNAME_FQDN}
    service: http://localhost:${APP_PORT}
  - service: http_status:404
EOF

log "Routing DNS ${HOSTNAME_FQDN} -> tunnel ${TUNNEL_NAME}"
cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME_FQDN" || echo "(already routed, continuing)"

log "Installing cloudflared as a system service"
sudo cloudflared service install
sudo systemctl enable --now cloudflared

log "Setting up .env"
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s/^ADMIN_USERNAMES=.*/ADMIN_USERNAMES=${ADMIN_USERNAMES_DEFAULT}/" .env
  sed -i "s/^NEXT_PUBLIC_GA_MEASUREMENT_ID=.*/NEXT_PUBLIC_GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID_DEFAULT}/" .env
  echo "Created .env from .env.example (ADMIN_USERNAMES=${ADMIN_USERNAMES_DEFAULT}). Edit it if you want different admins."
else
  echo ".env already exists, leaving it as-is."
fi

log "Building and starting the app (docker compose)"
docker compose up -d --build rateit

log "Done"
echo "App container is up on 127.0.0.1:${APP_PORT}."
echo "Public URL (once DNS propagates, usually under a minute): https://${HOSTNAME_FQDN}"
echo ""
echo "Check status with:"
echo "  systemctl status cloudflared"
echo "  docker compose logs -f rateit"
