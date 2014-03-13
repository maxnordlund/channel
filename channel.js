var Promise = require("bluebird");

/*
 * @param type Constructor of allowed input.
 * @param length Maximum length to buffer, defaults to 0.
 */
function Channel(type, length) {
  this.type = type;
  this.length = length || 0;
  this._values = [];
  this._sending = [];
  this._receiving = [];
}

Channel.prototype.send = function send(object) {
  var resolver;
  if(object !== this.type && object.constructor !== this.type) {
   return Promise.reject(new TypeError("Tried to send '"+ object +"' over a "+ this.type +" channel."));
  }
  if(this._receiving.length > 0) {
    this.receiving.unshift().resolve([object, true]);
    return Promise.resolve();
  }
  if(this._values.length <= this.length) {
    this.values.push(object);
    return Promise.resolve();
  }
  resolver = Promise.defer();
  this._sending.push(resolver)
  return resolver.promise.resolve(this._values).call("push", object);
}

Channel.prototype.receive = function receive() {
  var resolver, object;
  if(this._values.length > 0) {
    object = this._values.unshift();
    if(this._sending.length > 0 && this._values.length <= this.length) {
      this._sending.unshift().resolve();
    }
    return Promise.resolve([object, true]);
  }
  resolver = Promise.defer();
  this._receiving.push(resolver);
  return resolver.promise;
}

Channel.prototype.close


