FROM node:20-alpine

ENV APP_HOME=/app
WORKDIR $APP_HOME
# Copy frontend to /frontend (mirroring local structure)
COPY frontend/package*.json ./frontend/

RUN cd frontend && npm install

COPY frontend ./frontend
# Copy scripts to /scripts (sibling to frontend)
COPY scripts ./scripts

WORKDIR /app/frontend

EXPOSE 5174
CMD ["npm", "run", "dev"]
