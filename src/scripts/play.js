import { Chess, SQUARES } from "chess.js";
import { Chessground } from "chessground";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status-message");
const moveListEl = document.getElementById("move-list");
const newGameBtn = document.getElementById("new-game");
const restartBtn = document.getElementById("restart-game");
const flipBtn = document.getElementById("flip-board");

const apiBase = boardEl?.dataset?.apiBase?.trim();
const chess = new Chess();

let ground;
let isFlipped = false;
let busy = false;

const setStatus = (msg) => {
  if (statusEl) {
    statusEl.textContent = msg;
  }
};

const setRestartOffer = (isVisible) => {
  if (restartBtn instanceof HTMLButtonElement) {
    restartBtn.hidden = !isVisible;
  }
};

const setMoves = () => {
  const moves = chess.history({ verbose: true });
  if (!moveListEl) {
    return;
  }
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
  if (!ground) {
    return;
  }
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

const getCheckmateMessage = () => {
  if (!chess.isCheckmate()) {
    return null;
  }
  // chess.turn() is the side that is checkmated.
  return chess.turn() === "w"
    ? "Checkmate. Model wins. Want another game?"
    : "Checkmate. You win. Want another game?";
};

const syncCheckmateState = () => {
  const checkmateMessage = getCheckmateMessage();
  if (!checkmateMessage) {
    setRestartOffer(false);
    return false;
  }
  setStatus(checkmateMessage);
  setRestartOffer(true);
  return true;
};

const restartGame = () => {
  busy = false;
  console.log("Game reset. Busy forced to false.");
  chess.reset();
  syncBoard();
  setStatus("New game. Your move.");
  setRestartOffer(false);
};

const requestModelMove = async () => {
  if (!apiBase || apiBase.includes("your-space-name")) {
    setStatus("API not configured yet. Set playApiBase in profile.json.");
    setRestartOffer(false);
    return;
  }
  setStatus("Model is thinking…");
  setRestartOffer(false);
  busy = true;
  console.log("Busy set to true");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  let modelMoveApplied = false;

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
    modelMoveApplied = true;
  } catch (err) {
    console.error("Model move error:", err);
    chess.undo(); // Revert user move
    if (err.name === 'AbortError') {
      setStatus("Error: Request timed out");
    } else {
      setStatus(`Error: ${err.message}`);
    }
  } finally {
    clearTimeout(timeoutId);
    busy = false;
    console.log("Busy set to false");
    syncBoard();
    if (syncCheckmateState()) {
      return;
    }
    if (modelMoveApplied) {
      setStatus("Your turn.");
    }
  }
};


const onUserMove = async (orig, dest) => {
  if (busy || chess.isCheckmate()) {
    console.log("Ignored user move: busy or game over");
    if (chess.isCheckmate()) {
      syncCheckmateState();
    }
    return;
  }
  const move = chess.move({ from: orig, to: dest, promotion: "q" });
  if (!move) return;
  console.log("User move applied:", move.san);
  syncBoard();
  if (syncCheckmateState()) {
    return;
  }
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
    setRestartOffer(false);
    console.log("Chessground initialized");
  } catch (err) {
    console.error("Chessground init failed", err);
    setStatus(`Chessground init failed: ${err?.message ?? err}`);
  }
};

newGameBtn?.addEventListener("click", restartGame);
restartBtn?.addEventListener("click", restartGame);

flipBtn?.addEventListener("click", () => {
  if (!ground) return;
  isFlipped = !isFlipped;
  ground.set({ orientation: isFlipped ? "black" : "white" });
});

init();
