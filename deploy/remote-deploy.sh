#!/usr/bin/env bash
set -euo pipefail

: "${REMOTE_DIR:?REMOTE_DIR is required}"
: "${ADMIN_ROOT:?ADMIN_ROOT is required}"
: "${ADMIN_API_BASE_URL:?ADMIN_API_BASE_URL is required}"
: "${PM2_APP_NAME:?PM2_APP_NAME is required}"

cd "${REMOTE_DIR}"

if [[ ! -f apps/api/.env ]]; then
  echo "Missing ${REMOTE_DIR}/apps/api/.env; refusing to deploy without server environment." >&2
  exit 1
fi

export PATH="$PATH:/usr/local/bin:/usr/local/sbin:/root/.npm-global/bin"
command -v npm >/dev/null 2>&1 || { echo "npm is not installed or not in PATH" >&2; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "pm2 is not installed or not in PATH" >&2; exit 1; }

if [[ -f apps/admin/.env ]] && grep -q '^VITE_ADMIN_API_BASE_URL=' apps/admin/.env; then
  sed -i "s|^VITE_ADMIN_API_BASE_URL=.*|VITE_ADMIN_API_BASE_URL=${ADMIN_API_BASE_URL}|" apps/admin/.env
else
  printf 'VITE_ADMIN_API_BASE_URL=%s\n' "${ADMIN_API_BASE_URL}" > apps/admin/.env
fi

npm ci
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
npm run build

mkdir -p "${ADMIN_ROOT}"
rsync -az --delete apps/admin/dist/ "${ADMIN_ROOT}/"

if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${PM2_APP_NAME}" --update-env
else
  pm2 start apps/api/dist/main.js --name "${PM2_APP_NAME}" --cwd "${REMOTE_DIR}"
fi
pm2 save

port="$(awk -F= '$1 == "PORT" {gsub(/"/, "", $2); print $2; exit}' apps/api/.env)"
port="${port:-3000}"
for attempt in $(seq 1 20); do
  status="$(curl --max-time 5 -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/v1/health" || true)"
  if [[ "$status" =~ ^2[0-9][0-9]$ ]]; then
    echo "AlphaMe deployment is healthy: ${status}"
    exit 0
  fi
  sleep 3
done

echo "AlphaMe health check failed" >&2
pm2 status "${PM2_APP_NAME}" || true
pm2 logs "${PM2_APP_NAME}" --lines 80 --nostream || true
exit 1
