import { createServer, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import { probeLocalSupabase } from "@/lib/runtime/readiness";

async function listen(server: Server): Promise<URL> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a local TCP address.");
  return new URL("http://127.0.0.1:" + address.port);
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("readiness dependency probe", () => {
  it("does not follow redirects or report a redirected dependency as ready", async () => {
    let redirectedRequests = 0;
    const targetServer = createServer((_request, response) => {
      redirectedRequests += 1;
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
    });
    const targetUrl = await listen(targetServer);
    const sourceServer = createServer((_request, response) => {
      response.writeHead(302, { location: new URL("/auth/v1/health", targetUrl).toString() });
      response.end();
    });
    const sourceUrl = await listen(sourceServer);

    try {
      await expect(probeLocalSupabase(sourceUrl)).resolves.toEqual({
        status: "unavailable",
        reason: "unreachable",
      });
      expect(redirectedRequests).toBe(0);
    } finally {
      await Promise.all([close(sourceServer), close(targetServer)]);
    }
  });
});
