import { describe, expect, it } from "vitest";
import { assertPublicUrl } from "@/lib/collector/safe-fetch";

describe("assertPublicUrl (SSRF)", () => {
  it.each(["http://127.0.0.1/admin", "http://10.0.0.5/", "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://localhost:5434/"])(
    "bloqueia %s",
    async (url) => {
      await expect(assertPublicUrl(url)).rejects.toThrow();
    },
  );
  it("bloqueia protocolos não http", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(/http/);
  });
});
