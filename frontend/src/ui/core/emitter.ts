/** 轻量类型化事件总线 [#A.012] */

export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export class Emitter<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): Unsubscribe {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(type, bucket);
    }
    bucket.add(listener as (payload: never) => void);
    return () => {
      bucket?.delete(listener as (payload: never) => void);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    for (const listener of bucket) {
      (listener as Listener<Events[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
