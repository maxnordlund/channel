/* @flow */

import {Promise} from "bluebird"

type AsynchronousIteratorResult<T> = {
  done: boolean,
  value: Promise<?T>
}

export default Channel
class Channel<T> {
  done: boolean;
  inbound: Array<Sender<T>>;
  outbound: Array<Receiver<T>>;

  constructor() {
    this.done = false
    this.inbound = []
    this.outbound = []
  }

  /**
   * Returns a promise for when the provided value has been received.
   *
   * @param {T} value
   * @return {Promise<void>}
   */
  send(value: Promise<T> | T): Promise<void> {
    if (this.done) return Promise.reject(new TypeError(Channel.SEND_ON_CLOSED))
    if (this.trySend((value:any))) {
      return Promise.resolve()
    } else {
      var sender = new Sender(Promise.resolve(value))
      this.inbound.push(sender)
      return sender.promise
    }
  }

  trySend(value: Promise<T> | T): boolean {
    this.outbound = this.outbound.filter((it) => it.promise.isPending())
    if (this.outbound.length == 0) return false
    var receiver = sample(this.outbound)
    var other = Promise.resolve(value)
    receiver.resolve(Promise.resolve(value))
    return true
  }

  /**
   * Returns a promise for a value sent over this channel.
   *
   * @return {Promise<T>}
   */
  receive(): Promise<T> {
    if (this.done) return Promise.resolve()
    var value = this.tryReceive()
    if (value != null) {
      return value
    } else {
      var receiver = new Receiver()
      this.outbound.push(receiver)
      return receiver.promise
    }
  }

  tryReceive(): ?Promise<T> {
    this.inbound = this.inbound.filter((it) => it.promise.isPending())
    if (this.inbound.length == 0) return
    var sender = sample(this.inbound)
    sender.resolve((void 0:any))
    return sender.value
  }

  // next :: () =>
  //   | { done: true,  value: Promise<T>    }
  //   | { done: false, value: Promise<void> }
  // next :: (value: Promise<T> | T) =>
  //   | { done: boolean, value: Promise<void> }
  next(value?: Promise<T> | T): AsynchronousIteratorResult<T> {
    var result
    if (this.done) {
      result = Promise.resolve()
    } else if (arguments.length == 0) {
      result = this.receive()
    } else {
      result = this.send(Promise.resolve(value))
    }
    return { done: this.done, value: (result:any) }
  }

  // return    :: () => void
  // return<U> :: (value: U) => U
  return<U>(value?: U): ?U {
    var error = new TypeError(Channel.SEND_ON_CLOSED)
    this.inbound.forEach((sender) => sender.reject(error))
    this.outbound.forEach((receiver) => receiver.resolve((void 0:any)))

    this.done = true
    this.inbound = []
    this.outbound = []
    return value
  }

  throw(exception: Error) {}

  [Symbol.iterator](): Iterator {
    return this
  }

  static trySelect<U>(channels: Array<Channel<U>>): [?Promise<U>, number] {
    for (var index = 0; index < channels.length; ++index) {
      var value = channels[index].tryReceive()
      if (value != null) return [value, index]
    }
    return [void 0, -1]
  }

  static select<U>(channels: Array<Channel<U>>): Promise<[U, number]> {
    var [value, index] = Channel.trySelect(channels)
    if (index != -1 && value != null) return value.then((it) => [it, index])

    var receiver = new Receiver()
    channels.forEach((chan, index) => {
      chan.outbound.push(({
        resolve: (value) => {
          receiver.resolve(Promise.resolve(value).then((it) => [it, index]))
        },
        reject: receiver.reject,
        promise: (receiver.promise:any)
      }:any))
    })

    return receiver.promise
  }

  forEach() {}

  concat<S:T>(...channels: Array<Channel<S> | S>): Channel<T> {
    var chan = new Channel()

    channels.push((this:any))
    channels.reduce((promise, element) => {
      return promise.then(() => {
        if (element instanceof Channel) {
          return element.reduce((_, value) => chan.send(value), void 0)
        } else {
          return chan.send(element)
        }
      })
    }, Promise.resolve())
    return chan
  }

  map<U>(fn: (value: T) => U, thisArg?: any): Channel<U> {
    if (typeof fn != "function") throw new TypeError(Channel.MISSING_FUNCTION_ARG)
    if (arguments.length == 1) thisArg = this

    var chan = new Channel(),
        next = (value) => {
          if (this.done || chan.done) return
          chan.send((fn.call(thisArg, value):any))
            .then(() => this.receive())
            .then(next)
        }

    this.receive().then(next)
    return chan
  }

  filter(fn: (value: T) => boolean, thisArg?: any): Channel<T> {
    if (typeof fn != "function") throw new TypeError(Channel.MISSING_FUNCTION_ARG)
    if (arguments.length == 1) thisArg = this

    var chan = new Channel(),
        next = (value) => {
          if (this.done || chan.done) return
          if (fn.call(thisArg, value)) {
            chan.send(value)
              .then(() => this.receive())
              .then(next)
          } else {
            this.receive().then(next)
          }
        }

    this.receive().then(next)
    return chan
  }

  reduce<U>(fn: (memo: U, value: T) => Promise<U> | U, initial: U): Promise<U> {
    if (typeof fn != "function") throw new TypeError(Channel.MISSING_FUNCTION_ARG)

    var receiver = new Receiver(),
        next = (memo) => {
          if (this.done) {
            receiver.resolve(memo)
          } else {
            this.receive()
              .then((value) => fn(memo, value))
              .then(next)
          }
        }

    next(initial)
    return receiver.promise
  }
}
Channel.SEND_ON_CLOSED = "Can't send on closed channel"
Channel.MISSING_FUNCTION_ARG = "Missing required function argument"

class Receiver<T> {
  promise: Promise<T>;
  resolve: (value: Promise<T> | T) => void;
  reject: (reason: Error) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class Sender<T> extends Receiver<void> {
  value: Promise<T>;

  constructor(value: Promise<T>) {
    super()
    this.value = value
  }
}

/**
 * Picks a random element from the provided array and return it. The element is
 * removed from the array.
 *
 * @param {Array<T>} array
 * @return {T}
 * @template T
 */
function sample<T>(array: Array<T>): T {
  return array.splice(Math.random() * array.length, 1)[0]
}

