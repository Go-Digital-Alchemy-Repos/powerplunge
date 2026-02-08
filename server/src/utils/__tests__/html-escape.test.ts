import { describe, it, expect } from "vitest";
import { escapeHtml } from "../html-escape";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('a "b" c')).toBe("a &quot;b&quot; c");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("escapes backticks", () => {
    expect(escapeHtml("a `template` b")).toBe("a &#96;template&#96; b");
  });

  it("escapes forward slashes", () => {
    expect(escapeHtml("path/to/resource")).toBe("path&#x2F;to&#x2F;resource");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("does not alter safe strings", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles multiple special characters in sequence", () => {
    expect(escapeHtml('<img src="x" onerror="alert(1)">')).toBe(
      "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("handles unicode safely", () => {
    const input = "Ñoño & Ñaña <3";
    expect(escapeHtml(input)).toBe("Ñoño &amp; Ñaña &lt;3");
  });
});
