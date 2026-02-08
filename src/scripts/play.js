import { Chess, SQUARES } from "chess.js";
import { Chessground } from "chessground";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveListEl = document.getElementById("move-list");
const newGameBtn = document.getElementById("new-game");
const flipBtn = document.getElementById("flip-board");

const apiBase = boardEl?.dataset?.apiBase?.trim();
const chess = new Chess();

let ground;
let isFlipped = false;
let busy = false;

const setStatus = (msg) => {
  statusEl.textContent = msg;
};

const setMoves = () => {
  const moves = chess.history({ verbose: true });
  moveListEl.innerHTML = "";
  for (let i = 0; i < moves.length; i += 2) {
    const li = document.createElement("li");
    const white = moves[i] ? moves[i].san : "";
    const black = moves[i + 1] ? moves[i + 1].san : "";
    li.textContent = `${i / 2 + 1}. ${white} ${black}`;
    moveListEl.appendChild(li);
  }
};

const toDests = () => {
  const dests = new Map();
  SQUARES.forEach((s) => {
    const moves = chess.moves({ square: s, verbose: true });
    if (moves.length) {
      dests.set(
        s,
        moves.map((m) => m.to)
      );
    }
  });
  console.log(`Computed dests for ${chess.turn()}:`, dests.size, "squares with moves");
  return dests;
};

const syncBoard = () => {
  const dests = toDests();
  const fen = chess.fen();
  const turn = chess.turn();
  console.log("Syncing board:", { fen, turn, destsSize: dests.size });

  ground.set({
    fen: fen,
    turnColor: turn === "w" ? "white" : "black",
    movable: {
      color: "white",
      dests: dests,
    },
  });
  setMoves();
};

const requestModelMove = async () => {
  if (!apiBase || apiBase.includes("your-space-name")) {
    setStatus("API not configured yet. Set playApiBase in profile.json.");
    return;
  }
  setStatus("Model is thinking…");
  busy = true;
  console.log("Busy set to true");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${apiBase}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen: chess.fen(), temperature: 1.0, greedy: false }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }
    const data = await res.json();
    console.log("Model response:", data);

    if (!data?.uci) {
      throw new Error("API returned no move");
    }

    // Try SAN first as it's often cleaner, fallback to UCI
    const moveStr = data.san || data.uci;
    const move = chess.move(moveStr, { sloppy: true });

    if (!move) {
      // Fallback: try UCI explicitly if SAN failed
      const moveUci = chess.move(data.uci, { sloppy: true });
      if (!moveUci) {
        throw new Error(`Illegal/Unparsable move from model: ${moveStr}`);
      }
    }

    setStatus("Your turn.");
  } catch (err) {
    console.error("Model move error:", err);
    chess.undo(); // Revert user move
    if (err.name === 'AbortError') {
      setStatus("Error: Request timed out");
    } else {
      setStatus(`Error: ${err.message}`);
    }
  } finally {
    busy = false;
    console.log("Busy set to false");
    syncBoard();
  }
};


const onUserMove = async (orig, dest) => {
  if (busy) {
    console.log("Ignored user move: busy");
    return;
  }
  const move = chess.move({ from: orig, to: dest, promotion: "q" });
  if (!move) return;
  console.log("User move applied:", move.san);
  syncBoard();
  await requestModelMove();
};

const init = () => {
  if (!boardEl) {
    return;
  }
  try {
    ground = Chessground(boardEl, {
      fen: chess.fen(),
      orientation: "white",
      movable: {
        free: false,
        color: "white",
        dests: toDests(),
        events: {
          after: onUserMove,
        },
      },
    });
    setMoves();
    console.log("Chessground initialized");
  } catch (err) {
    console.error("Chessground init failed", err);
    setStatus(`Chessground init failed: ${err?.message ?? err}`);
  }
};

newGameBtn?.addEventListener("click", () => {
  // Allow resetting even if busy (force reset)
  busy = false;
  console.log("New Game clicked. Busy forced to false.");
  chess.reset();
  syncBoard();
  setStatus("New game. Your move.");
});

flipBtn?.addEventListener("click", () => {
  if (!ground) return;
  isFlipped = !isFlipped;
  ground.set({ orientation: isFlipped ? "black" : "white" });
});

init();
