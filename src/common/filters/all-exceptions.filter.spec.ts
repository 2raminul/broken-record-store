import { HttpException, HttpStatus } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";

const makeHost = (url = "/test") => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
    json,
    status,
  };
};

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it("uses the HttpException status and message for HttpExceptions", () => {
    const exception = new HttpException("Not found", HttpStatus.NOT_FOUND);
    const host = makeHost();

    filter.catch(exception, host as any);

    expect(host.status).toHaveBeenCalledWith(404);
    expect(host.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Not found" }),
    );
  });

  it("uses 500 and generic message for non-HttpExceptions", () => {
    const host = makeHost();

    filter.catch(new Error("boom"), host as any);

    expect(host.status).toHaveBeenCalledWith(500);
    expect(host.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: "Internal server error",
      }),
    );
  });

  it("spreads object response from HttpException", () => {
    const body = { message: ["field is required"], error: "Bad Request" };
    const exception = new HttpException(body, HttpStatus.BAD_REQUEST);
    const host = makeHost();

    filter.catch(exception, host as any);

    expect(host.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ["field is required"] }),
    );
  });

  it("includes the request path in the response", () => {
    const host = makeHost("/api/v1/records");

    filter.catch(new Error("oops"), host as any);

    expect(host.json).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/v1/records" }),
    );
  });
});
