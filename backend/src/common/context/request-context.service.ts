import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

type RequestStore = {
  requestId: string;
  userId?: string;
  username?: string;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestStore>();

  run(callback: () => void, seed?: Partial<RequestStore>) {
    const context: RequestStore = {
      requestId: this.resolveRequestId(seed?.requestId)
    };
    if (seed?.userId) {
      context.userId = seed.userId;
    }
    if (seed?.username) {
      context.username = seed.username;
    }
    return this.storage.run(context, callback);
  }

  private resolveRequestId(candidate?: string) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
    return randomUUID();
  }

  setUser(user: { id: string; username?: string }) {
    const store = this.storage.getStore();
    if (store) {
      store.userId = user.id;
      store.username = user.username;
    }
  }

  getUserId() {
    return this.storage.getStore()?.userId ?? null;
  }

  getRequestId() {
    return this.storage.getStore()?.requestId ?? null;
  }
}
