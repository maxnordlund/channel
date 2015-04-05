/* @flow */

var Promise = require("bluebird").Promise

class Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  value: T;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

export default Channel
class Channel<T> {
  size: number;
  done: boolean;
  inbound: Array<Deferred<T>>;
  outbound: Array<Deferred<T>>;

  constructor(size?: number = 0) {
    this.size = size
    this.done = false
    this.inbound = []
    this.outbound = []
  }

  /*
  next: (
    (value: T) => IteratorResult<Promise<void>> &
    () => IteratorResult<Promise<T>>
  )
  */
  next(value?: T): IteratorResult<Promise<T>> {
    if (this.done) return { done: true, value: Promise.resolve() }
    this.inbound = this.inbound.filter((it) => it.promise.isPending())
    this.outbound = this.outbound.filter((it) => it.promise.isPending())

    var defer = new Deferred()
    if (arguments.length == 0) {
      if (this.inbound.length > 0) {
        var source = this.inbound.splice(Math.random() * this.inbound.length, 1)[0]
        defer.resolve(source.value)
        source.resolve((void 8:any))
      } else {
        this.outbound.push(defer)
      }
    } else {
      if (this.outbound.length > 0) {
        var sink = this.outbound.splice(Math.random() * this.outbound.length, 1)[0]
        sink.resolve((value:any))
        defer.resolve((void 8:any))
      } else {
        defer.value = (value:any)
        this.inbound.push(defer)
      }
    }

    return { done: false, value: defer.promise }
  }

  return<U>(value?: U): Promise<U> {
    this.done = true

    var promise = Promise.settle(this.outbound.map((defer) => {
      defer.resolve((void 8:any))
      return defer.promise
    }).concat(this.inbound.map((defer) => {
      defer.reject(new TypeError("Trying to send on a closed channel"))
      return defer.promise
    }))).return(value)

    delete this.inbound
    delete this.outbound
    return promise
  }

  throw(exception: Error) {}

  [Symbol.iterator](): Iterator {
    return this
  }

  static select<U>(channels: Array<Channel<U>>): Promise<[U, number]> {
    var fulfilled = channels
      .map((chan, index) => [chan.inbound, index])
      .filter(([inbound, index]) => inbound.length > 0)

    if (fulfilled.length > 0) {
      var [inbound, index] = fulfilled[Math.random() * fulfilled.length],
          source = inbound.splice(Math.random() * inbound.length, 1)[0]
      source.resolve((void 8:any))
      return Promise.resolve([source.value, index])
    }

    var defer: Deferred<[U, number]> = new Deferred()
    channels.forEach((chan, index) => {
      chan.outbound.push({
        resolve: (value) => defer.resolve([value, index]),
        reject: defer.reject,
        promise: defer.promise,
        value: (null:any)
      })
    })

    return defer.promise
  }
}

