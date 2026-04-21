#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  APP_ENV: "${APP_ENV:-development}",
  APP_VERSION: "${APP_VERSION:-0.1.0}",
  APP_HOSTNAME: "${APP_HOSTNAME:-resume-dev.example.com}",
  APP_BASE_URL: "${APP_BASE_URL:-https://resume-dev.example.com}",
  APP_COMMIT_SHA: "${APP_COMMIT_SHA:-bootstrap}"
};
EOF
