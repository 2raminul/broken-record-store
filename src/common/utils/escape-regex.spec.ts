import { escapeRegex } from "./escape-regex";

describe("escapeRegex", () => {
  it("returns plain strings unchanged", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
  });

  it("escapes all special regex characters", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
      "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\",
    );
  });

  it("escapes a dot in an artist name", () => {
    expect(escapeRegex("A.C. Newman")).toBe("A\\.C\\. Newman");
  });

  it("returns empty string for empty input", () => {
    expect(escapeRegex("")).toBe("");
  });
});
