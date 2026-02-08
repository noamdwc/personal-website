import assert from "node:assert/strict";

const baseUrl =
  process.env.MODEL_API_BASE || "https://noamdwc-grpo-chess-api.hf.space";
const apiPath = process.env.MODEL_API_PATH || "/move";

if (baseUrl.includes("your-space.hf.space")) {
  throw new Error(
    "MODEL_API_BASE is still a placeholder. Set it to your real Space URL, for example https://noamdwc-grpo-chess-api.hf.space"
  );
}

const payload = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  temperature: 1.0,
  greedy: false,
};

const res = await fetch(`${baseUrl}${apiPath}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const text = await res.text();

assert.equal(
  res.ok,
  true,
  `API request failed: ${res.status} ${res.statusText} at ${baseUrl}${apiPath}\nResponse: ${text.slice(
    0,
    400
  )}`
);

const data = JSON.parse(text);
assert.ok(data?.uci, "Missing uci in response");
assert.ok(data?.fen, "Missing fen in response");

console.log("OK", data.uci);
