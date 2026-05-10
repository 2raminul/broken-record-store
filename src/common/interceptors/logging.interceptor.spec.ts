import { of } from "rxjs";
import { LoggingInterceptor } from "./logging.interceptor";

const makeContext = (method = "GET", url = "/test") => ({
  switchToHttp: () => ({
    getRequest: () => ({ method, url }),
  }),
});

const makeHandler = (value: unknown = {}) => ({
  handle: () => of(value),
});

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it("passes the response value through unchanged", (done) => {
    const context = makeContext();
    const handler = makeHandler({ data: "ok" });

    interceptor.intercept(context as any, handler as any).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: "ok" });
        done();
      },
    });
  });

  it("completes the observable without error", (done) => {
    const context = makeContext("POST", "/api/v1/records");
    const handler = makeHandler();

    interceptor.intercept(context as any, handler as any).subscribe({
      error: done.fail,
      complete: done,
    });
  });
});
