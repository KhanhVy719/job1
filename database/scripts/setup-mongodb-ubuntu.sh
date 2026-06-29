#!/usr/bin/env bash
set -euo pipefail

# Setup MongoDB for Rophim database VPS on Ubuntu.
# Required env vars:
#   MONGO_APP_PASSWORD=<strong password>
# Optional env vars:
#   MONGO_DATABASE=rophim
#   MONGO_APP_USER=rophim_app
#   MONGO_BIND_IP=127.0.0.1
#   MONGO_VERSION=8.0
#   APP_PRIVATE_IP=<private app VPS IP, used for ufw allow>

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo -E bash database/scripts/setup-mongodb-ubuntu.sh" >&2
  exit 1
fi

MONGO_DATABASE="${MONGO_DATABASE:-rophim}"
MONGO_APP_USER="${MONGO_APP_USER:-rophim_app}"
MONGO_BIND_IP="${MONGO_BIND_IP:-127.0.0.1}"
MONGO_VERSION="${MONGO_VERSION:-8.0}"

if [[ -z "${MONGO_APP_PASSWORD:-}" ]]; then
  echo "Missing MONGO_APP_PASSWORD env var." >&2
  exit 1
fi

. /etc/os-release
UBUNTU_CODENAME="${VERSION_CODENAME:-jammy}"

echo "==> Installing prerequisites"
apt-get update
apt-get install -y gnupg curl ca-certificates lsb-release ufw

echo "==> Adding MongoDB ${MONGO_VERSION} apt repository for ${UBUNTU_CODENAME}"
curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" | gpg --dearmor -o "/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg"
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/${MONGO_VERSION} multiverse" > "/etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"

apt-get update
apt-get install -y mongodb-org

echo "==> Configuring mongod bindIp=${MONGO_BIND_IP}"
cp /etc/mongod.conf "/etc/mongod.conf.bak.$(date +%Y%m%d%H%M%S)"
python3 - <<PY
from pathlib import Path
path = Path('/etc/mongod.conf')
text = path.read_text()
if 'security:' not in text:
    text += '\nsecurity:\n  authorization: enabled\n'
elif 'authorization:' not in text:
    text = text.replace('security:\n', 'security:\n  authorization: enabled\n', 1)
lines = text.splitlines()
out = []
in_net = False
replaced = False
for line in lines:
    stripped = line.strip()
    if line.startswith('net:'):
        in_net = True
        out.append(line)
        continue
    if in_net and line and not line.startswith(' ') and not line.startswith('\t'):
        if not replaced:
            out.append('  bindIp: ${MONGO_BIND_IP}')
            replaced = True
        in_net = False
    if in_net and stripped.startswith('bindIp:'):
        out.append('  bindIp: ${MONGO_BIND_IP}')
        replaced = True
        continue
    out.append(line)
if in_net and not replaced:
    out.append('  bindIp: ${MONGO_BIND_IP}')
path.write_text('\n'.join(out) + '\n')
PY

systemctl enable mongod
systemctl restart mongod

echo "==> Waiting for MongoDB"
for i in {1..30}; do
  if mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$i" -eq 30 ]]; then
    echo "MongoDB did not become ready." >&2
    systemctl status mongod --no-pager >&2 || true
    exit 1
  fi
done

echo "==> Creating application database/user if missing"
mongosh --quiet <<MONGO
use admin
const appUser = '${MONGO_APP_USER}';
const appDb = '${MONGO_DATABASE}';
const existing = db.getUser(appUser);
if (!existing) {
  db.createUser({
    user: appUser,
    pwd: '${MONGO_APP_PASSWORD}',
    roles: [{ role: 'readWrite', db: appDb }]
  });
  print('Created MongoDB user ' + appUser + ' for database ' + appDb);
} else {
  print('MongoDB user already exists: ' + appUser);
}
MONGO

echo "==> Configuring UFW baseline"
ufw allow OpenSSH >/dev/null || true
if [[ -n "${APP_PRIVATE_IP:-}" ]]; then
  ufw allow from "${APP_PRIVATE_IP}" to any port 27017 proto tcp >/dev/null || true
  echo "Allowed MongoDB from APP_PRIVATE_IP=${APP_PRIVATE_IP}"
else
  echo "APP_PRIVATE_IP not set; MongoDB remains localhost/private-bind only."
fi
ufw --force enable >/dev/null || true

echo "==> MongoDB setup complete"
echo "Use this URI on the app side, replacing password through secret storage:"
echo "mongodb://${MONGO_APP_USER}:<password>@127.0.0.1:27017/${MONGO_DATABASE}?authSource=admin"
