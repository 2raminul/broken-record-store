import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common";
import { handleApiCallErrors } from "./handle-api-call-errors";

describe("handleApiCallErrors", () => {
  it("returns the value when the fn resolves", async () => {
    const result = await handleApiCallErrors(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("re-throws HttpExceptions as-is", async () => {
    const exception = new HttpException("Not found", HttpStatus.NOT_FOUND);
    await expect(
      handleApiCallErrors(() => Promise.reject(exception)),
    ).rejects.toThrow(exception);
  });

  it("proxies the axios status when it is in httpStatusesToProxy", async () => {
    const axiosError = {
      message: "Not Found",
      response: { status: 404 },
    };
    await expect(
      handleApiCallErrors(() => Promise.reject(axiosError), {
        httpStatusesToProxy: [404],
      }),
    ).rejects.toThrow(new HttpException("Not Found", 404));
  });

  it("throws InternalServerErrorException for unknown errors", async () => {
    await expect(
      handleApiCallErrors(() => Promise.reject(new Error("network failure"))),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it("throws InternalServerErrorException when status is not in the proxy list", async () => {
    const axiosError = { message: "Server Error", response: { status: 503 } };
    await expect(
      handleApiCallErrors(() => Promise.reject(axiosError), {
        httpStatusesToProxy: [404],
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
