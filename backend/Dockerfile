FROM node:20-alpine
RUN apk add --no-cache openssl bash

ENV APP_HOME=/app
WORKDIR $APP_HOME

# שכבת קאש להתקנות
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# מבנה תקיות ברור
COPY backend ./backend
COPY prisma  ./prisma
COPY scripts ./scripts

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

# generate כשה-schema במיקום קבוע
RUN npx --prefix $APP_HOME/backend prisma generate --schema=$APP_HOME/prisma/schema.prisma
COPY backend/src/prisma/mock-data.json ./backend/dist/prisma/
WORKDIR /app/backend
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
