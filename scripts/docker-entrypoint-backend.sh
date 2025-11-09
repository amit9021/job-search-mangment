#!/bin/sh
set -e

echo "=== Docker Entrypoint Debug ==="
echo "DATABASE_URL: $DATABASE_URL"
echo "DATABASE_URL_DEV: $DATABASE_URL_DEV"
echo "NODE_ENV: $NODE_ENV"
echo "ADMIN_USERNAME: $ADMIN_USERNAME"
echo "ADMIN_PASSWORD: [hidden]"
echo "=============================="

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "press y to continue"
sleep 3
echo "Running database seed..."
if npx ts-node --transpile-only src/prisma/seed.ts; then
  echo "✓ Seed completed successfully"
else
  echo "✗ Seed failed - continuing anyway"
fi

echo "press y to continue"
sleep 3
echo "Starting backend application..."
exec npm run start:dev
