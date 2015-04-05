# Channel
Go like channels implemented in JavaScript. A channel as defined in Go is a
concurrent type checked FIFO queue. In JavaScript this means receive and send
both return a Promise for when the operation actually happens.

Channels implements the iterator interface, which means that in ES6 you can
iterate over a channel using `for...of`. This will produce promises for the
values it recieves. To receive the actual value you need to wait for the
promise to complete. In a way you can view channels as if they have the type
`Iterator<Promise<T>>` where `T` is the element type of the channel.

```javascript
/* @flow */
/* :: type Channel<T> = Iterator<Promise<T>> */

import Promise from "bluebird"
import Channel from "channel"

// Create a zero buffer channel
let chan = new Channel(Number)

Promise.coroutine(function* sender() {
  for (var i = 0; i < 10; ++i) {
    console.log("Sending", i)

    // done indicates if the channel is closed
    // value is a promise for when the value is received
    var { done, value } = chan.next(index)
    if (done) {
      console.log("Channel closed when trying to send")
      // Here `yield value` would throw a TypeError since you can't send on a
      // closed channel
    } else {
      yield value
      // If the value sent fails to match the type of the channel, the yield
      // above would throw a TypeError
    }
  }

  console.log("Closing channel")
  chan.close()
})()

Promise.coroutine(function* receiver() {
  // for..of automatically stops when the channel is closed
  for (var promise of chan) {
    var value = yield promise // Wait for a value to be sent
    console.log("Received", value)
  }

  console.log("Channel closed")
})()
```

