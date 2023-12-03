export class Queue<T> {
  private queue: T[] = [];

  constructor() {}

  push(value: T) {
    this.queue.unshift(value);
  }

  front(): T | undefined {
    return this.queue.at(-1);
  }

  pop(): T | undefined {
    return this.queue.pop();
  }

  size(): number {
    return this.queue.length;
  }
}
