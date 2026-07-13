import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>Polymarket APR — Compare Markets by Estimated APR<\/title>/,
  );
  assert.match(html, /compare/);
  assert.match(html, /same price/);
  assert.match(html, /USDC vault/);
  assert.match(html, /just APR/);
  assert.match(
    html,
    /https:\/\/chromewebstore\.google\.com\/detail\/polymarket-apr\/dainflhaaolcjggcopmjhpaodnleicib/,
  );
  assert.match(
    html,
    /https:\/\/github\.com\/DennisLypovetsky\/polymarket-apr/,
  );
  assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og\.png"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the approved image assets and no starter preview", async () => {
  await Promise.all([
    access(new URL("public/icon.png", root)),
    access(new URL("public/screenshot.png", root)),
    access(new URL("public/og.png", root)),
  ]);
  await assert.rejects(access(new URL("app/_sites-preview", root)));
});
