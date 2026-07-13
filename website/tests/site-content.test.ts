import assert from "node:assert/strict";
import test from "node:test";

import {
  CHROME_URL,
  GITHUB_URL,
  examples,
  estimatedApr,
} from "../app/site-content.ts";

test("uses the approved destinations", () => {
  assert.equal(
    CHROME_URL,
    "https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib",
  );
  assert.equal(
    GITHUB_URL,
    "https://github.com/DennisLypovetsky/polymarket-apr",
  );
});

test("matches the approved APR examples", () => {
  for (const example of examples) {
    assert.equal(
      Math.round(estimatedApr(example.price, example.days)),
      example.apr,
    );
  }
});
