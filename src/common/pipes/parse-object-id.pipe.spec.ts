import { BadRequestException } from "@nestjs/common";
import { ParseObjectIdPipe } from "./parse-object-id.pipe";

describe("ParseObjectIdPipe", () => {
  let pipe: ParseObjectIdPipe;

  beforeEach(() => {
    pipe = new ParseObjectIdPipe();
  });

  it("returns the value when it is a valid ObjectId", () => {
    const id = "64a1f2b3c4d5e6f7a8b9c0d1";
    expect(pipe.transform(id)).toBe(id);
  });

  it("throws BadRequestException for an invalid ObjectId", () => {
    expect(() => pipe.transform("not-an-id")).toThrow(BadRequestException);
  });

  it("includes the invalid value in the error message", () => {
    expect(() => pipe.transform("bad")).toThrow(
      '"bad" is not a valid ObjectId',
    );
  });
});
