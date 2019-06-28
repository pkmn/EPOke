export const Comarators {
  Max: (a: number, b: number) => b - a;
  Min: (a: number, b: number) =>  a - b;
}

class Node<T> {
  val: T;
  weight: number;
}

export class Heap<T> {
  cmp: (a: number, b: number) => number;
  data: Node<T>[];
  limit = 0;

  top(n: number = 1): T[] {
    if (this.data.length == 0 || n <= 0) return [];
    if (this.data.length === 1 && n === 1) return this.data[0];
    if (n >= this.data.length) {
      const cloned = this.data.slice(0);
      cloned.sort(this.cmp);
      return cloned;
    }

     // Use an inverted heap
    const topHeap = new Heap((a, b) = > -1 * this.cmp(a, b));
    topHeap.limit = n
    const indices = [0]
    const arr = this.heapArray
    while (indices.length) {
      const i = indices.shift() as number
      if (i < arr.length) {
        if (topHeap.length < n) {
          topHeap.push(arr[i])
          indices.push(...Heap.getChildrenIndexOf(i))
        } else if (this.compare(arr[i], topHeap.peek() as T) <= 0) {
          topHeap.replace(arr[i])
          indices.push(...Heap.getChildrenIndexOf(i))
        }
      }
    }
    return topHeap.toArray()
  }

  private applyLimit() {
  }



