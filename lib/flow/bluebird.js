declare module "bluebird" {
  declare class PromiseInspection<T> {
    isFulfilled(): boolean;
    isRejected(): boolean;
    isPending(): boolean;
    value(): T;
    reason(): any;
  }

  declare class Promise<R> extends PromiseInspection  {
    constructor(callback: (
      resolve: (result: Promise<R> | R) => void,
      reject:  (error: any) => void
    ) => void): void;

    then<U>(
      onFulfill?: (value: R) => Promise<U> | U,
      onReject?: (error: any) => Promise<U> | U
    ): Promise<U>;

    done<U>(
      onFulfill?: (value: R) => void,
      onReject?: (error: any) => void
    ): void;

    catch<U>(
      onReject?: (error: any) => ?Promise<U> | U
    ): Promise<U>;

    static resolve<T>(object?: Promise<T> | T): Promise<T>;
    static reject<T>(error?: any): Promise<T>;

    // Non-standard APIs
    static cast<T>(object?: T): Promise<T>;
    static all<T>(promises: Array<Promise<T>>): Promise<Array<T>>;
    static race<T>(promises: Array<Promise<T>>): Promise<T>;

    cancellable(): Promise<R>;
    cancel(error?: Error): Promise<R>;
    return<T>(value?: T): Promise<T>;

    static settle<T>(promises: Array<Promise<T>>): Promise<Array<PromiseInspection<T>>>;
  }
}

