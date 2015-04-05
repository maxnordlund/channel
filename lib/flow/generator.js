declare class Generator<T> {
  next(value?: any): IteratorResult<T>;
  return<U>(value?: U): U;
  throw(exception: any): void;
}

