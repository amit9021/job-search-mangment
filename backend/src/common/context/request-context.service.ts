import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

type RequestStore = {
  requestId: string;
  userId?: string;
  username?: string;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestStore>();

  run(callback: () => void) {
    const context: RequestStore = {
      requestId: randomUUID()
    };
    return this.storage.run(context, callback);
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
