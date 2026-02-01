const BOARD_SIZES = {
  4: { FILES: ["A", "B", "C", "D"], RANKS: [1, 2, 3, 4] },
  5: { FILES: ["A", "B", "C", "D", "E"], RANKS: [1, 2, 3, 4, 5] },
};

let currentSize = 4;
let FILES = BOARD_SIZES[4].FILES;
let RANKS = BOARD_SIZES[4].RANKS;

function setBoardSize(size) {
  currentSize = size;
  FILES = BOARD_SIZES[size].FILES;
  RANKS = BOARD_SIZES[size].RANKS;
}

function parseSquare(square) {
  const s = String(square ?? "").trim().toUpperCase();
  if (s.length < 2) return null;
  const file = s[0];
  const rank = Number(s.slice(1));
  if (!FILES.includes(file)) return null;
  if (!RANKS.includes(rank)) return null;
  return { file, rank, fileIndex: FILES.indexOf(file) };
}

function toSquare(fileIndex, rank) {
  if (fileIndex < 0 || fileIndex >= FILES.length) return null;
  if (!RANKS.includes(rank)) return null;
  return `${FILES[fileIndex]}${rank}`;
}

function squaresAreAdjacent(a, b) {
  const sa = parseSquare(a);
  const sb = parseSquare(b);
  if (!sa || !sb) return false;
  const df = Math.abs(sa.fileIndex - sb.fileIndex);
  const dr = Math.abs(sa.rank - sb.rank);
  return Math.max(df, dr) === 1;
}

function allSquares() {
  const out = [];
  for (let r = 1; r <= 4; r += 1) {
    for (let fi = 0; fi < 4; fi += 1) {
      out.push(`${FILES[fi]}${r}`);
    }
  }
  return out;
}

function createEmptyBoard() {
  return new Map();
}

function cloneBoard(board) {
  const next = new Map();
  for (const [sq, piece] of board.entries()) {
    next.set(sq, { ...piece });
  }
  return next;
}

function pieceName(type) {
  const t = String(type ?? "").toLowerCase();
  if (t === "k" || t === "king") return "king";
  if (t === "q" || t === "queen") return "queen";
  if (t === "r" || t === "rook") return "rook";
  if (t === "b" || t === "bishop") return "bishop";
  if (t === "n" || t === "knight") return "knight";
  return t;
}

function normalizePieceType(type) {
  const t = pieceName(type);
  if (t === "king") return "k";
  if (t === "queen") return "q";
  if (t === "rook") return "r";
  if (t === "bishop") return "b";
  if (t === "knight") return "n";
  return t;
}

function oppositeColor(color) {
  const c = normalizeColor(color);
  if (c === "w") return "b";
  if (c === "b") return "w";
  return c;
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function pickRandom(arr) {
  return arr[randomInt(arr.length)];
}

function removeFromArray(arr, value) {
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
}

class ChessGame {
  constructor({ board, turn }) {
    this.board = board;
    this.turn = normalizeColor(turn) || "w";
  }

  getPieceAt(square) {
    return this.board.get(square) ?? null;
  }

  setPieceAt(square, piece) {
    if (!piece) {
      this.board.delete(square);
      return;
    }
    this.board.set(square, { ...piece, type: normalizePieceType(piece.type), color: normalizeColor(piece.color) });
  }

  findKingSquare(color) {
    const c = normalizeColor(color);
    for (const [sq, p] of this.board.entries()) {
      if (p.type === "k" && p.color === c) return sq;
    }
    return null;
  }

  kingsAreSeparated(board = this.board) {
    let wk = null;
    let bk = null;
    for (const [sq, p] of board.entries()) {
      if (p.type === "k" && p.color === "w") wk = sq;
      if (p.type === "k" && p.color === "b") bk = sq;
    }
    if (!wk || !bk) return false;
    return !squaresAreAdjacent(wk, bk);
  }

  applyMove(board, from, to) {
    const next = cloneBoard(board);
    const piece = next.get(from);
    next.delete(from);
    next.set(to, piece);
    return next;
  }

  rayAttacks(from, df, dr, board, attackerColor) {
    const s = parseSquare(from);
    if (!s) return [];
    const out = [];
    let fi = s.fileIndex + df;
    let r = s.rank + dr;
    while (true) {
      const sq = toSquare(fi, r);
      if (!sq) break;
      const occupying = board.get(sq);
      out.push(sq);
      if (occupying) break;
      fi += df;
      r += dr;
    }
    return out;
  }

  knightTargets(from) {
    const s = parseSquare(from);
    if (!s) return [];
    const deltas = [
      [1, 2],
      [2, 1],
      [-1, 2],
      [-2, 1],
      [1, -2],
      [2, -1],
      [-1, -2],
      [-2, -1],
    ];
    const out = [];
    for (const [df, dr] of deltas) {
      const sq = toSquare(s.fileIndex + df, s.rank + dr);
      if (sq) out.push(sq);
    }
    return out;
  }

  kingTargets(from) {
    const s = parseSquare(from);
    if (!s) return [];
    const out = [];
    for (let df = -1; df <= 1; df += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        if (df === 0 && dr === 0) continue;
        const sq = toSquare(s.fileIndex + df, s.rank + dr);
        if (sq) out.push(sq);
      }
    }
    return out;
  }

  pseudoMovesForPiece(piece, from, board = this.board) {
    const t = normalizePieceType(piece.type);
    const c = normalizeColor(piece.color);
    const moves = [];
    const addIfOk = (sq) => {
      const occ = board.get(sq);
      if (!occ) {
        moves.push(sq);
        return true;
      }
      if (occ.color !== c) {
        moves.push(sq);
      }
      return false;
    };

    if (t === "k") {
      for (const sq of this.kingTargets(from)) addIfOk(sq);
      return moves;
    }

    if (t === "n") {
      for (const sq of this.knightTargets(from)) addIfOk(sq);
      return moves;
    }

    const ray = (df, dr) => {
      const s = parseSquare(from);
      if (!s) return;
      let fi = s.fileIndex + df;
      let r = s.rank + dr;
      while (true) {
        const sq = toSquare(fi, r);
        if (!sq) return;
        const keepGoing = addIfOk(sq);
        if (!keepGoing) return;
        fi += df;
        r += dr;
      }
    };

    if (t === "r" || t === "q") {
      ray(1, 0);
      ray(-1, 0);
      ray(0, 1);
      ray(0, -1);
    }
    if (t === "b" || t === "q") {
      ray(1, 1);
      ray(-1, 1);
      ray(1, -1);
      ray(-1, -1);
    }

    return moves;
  }

  attacksFromSquare(square, piece, board = this.board) {
    const t = normalizePieceType(piece.type);
    if (t === "k") return this.kingTargets(square);
    if (t === "n") return this.knightTargets(square);
    if (t === "r") {
      return [
        ...this.rayAttacks(square, 1, 0, board, piece.color),
        ...this.rayAttacks(square, -1, 0, board, piece.color),
        ...this.rayAttacks(square, 0, 1, board, piece.color),
        ...this.rayAttacks(square, 0, -1, board, piece.color),
      ];
    }
    if (t === "b") {
      return [
        ...this.rayAttacks(square, 1, 1, board, piece.color),
        ...this.rayAttacks(square, -1, 1, board, piece.color),
        ...this.rayAttacks(square, 1, -1, board, piece.color),
        ...this.rayAttacks(square, -1, -1, board, piece.color),
      ];
    }
    if (t === "q") {
      return [
        ...this.attacksFromSquare(square, { ...piece, type: "r" }, board),
        ...this.attacksFromSquare(square, { ...piece, type: "b" }, board),
      ];
    }
    return [];
  }

  isSquareAttacked(square, byColor, board = this.board) {
    const attacker = normalizeColor(byColor);
    for (const [sq, p] of board.entries()) {
      if (p.color !== attacker) continue;
      const targets = this.attacksFromSquare(sq, p, board);
      if (targets.includes(square)) return true;
    }
    return false;
  }

  isCheck(color, board = this.board) {
    const c = normalizeColor(color);
    const kingSq = (() => {
      for (const [sq, p] of board.entries()) {
        if (p.type === "k" && p.color === c) return sq;
      }
      return null;
    })();
    if (!kingSq) return false;
    return this.isSquareAttacked(kingSq, oppositeColor(c), board);
  }

  getLegalMoves(piece, from, board = this.board) {
    const p = { ...piece, type: normalizePieceType(piece.type), color: normalizeColor(piece.color) };
    const candidate = this.pseudoMovesForPiece(p, from, board);
    const legal = [];
    for (const to of candidate) {
      const nextBoard = this.applyMove(board, from, to);
      if (!this.kingsAreSeparated(nextBoard)) continue;
      if (this.isCheck(p.color, nextBoard)) continue;
      if (p.type === "k") {
        if (this.isSquareAttacked(to, oppositeColor(p.color), nextBoard)) continue;
      }
      legal.push(to);
    }
    return legal;
  }

  allLegalMoves(color, board = this.board) {
    const c = normalizeColor(color);
    const out = [];
    for (const [sq, p] of board.entries()) {
      if (p.color !== c) continue;
      const moves = this.getLegalMoves(p, sq, board);
      for (const to of moves) out.push({ from: sq, to, piece: p });
    }
    return out;
  }

  isCheckmate(color, board = this.board) {
    const c = normalizeColor(color);
    if (!this.isCheck(c, board)) return false;
    const moves = this.allLegalMoves(c, board);
    return moves.length === 0;
  }

  isStalemate(color, board = this.board) {
    const c = normalizeColor(color);
    if (this.isCheck(c, board)) return false;
    const moves = this.allLegalMoves(c, board);
    return moves.length === 0;
  }
}

function normalizeColor(color) {
  const c = String(color ?? "").trim().toLowerCase();
  if (c === "w" || c === "white") return "w";
  if (c === "b" || c === "black") return "b";
  return c;
}

function getPieceAssetPath(piece, color) {
  const p = String(piece ?? "").trim().toLowerCase();
  const c = normalizeColor(color);
  return `asset/${p}-${c}.svg`;
}

function isDarkSquare(fileIndex, rank) {
  return (fileIndex + (rank - 1)) % 2 === 0;
}

function createBoardFrame(container) {
  container.innerHTML = "";

  const n = FILES.length;
  container.style.gridTemplateColumns = `40px repeat(${n}, 1fr)`;
  container.style.gridTemplateRows = `40px repeat(${n}, 1fr)`;

  const corner = document.createElement("div");
  corner.className = "corner";
  corner.textContent = " ";
  container.appendChild(corner);

  for (let fi = 0; fi < FILES.length; fi += 1) {
    const label = document.createElement("div");
    label.className = "file-label";
    label.textContent = FILES[fi];
    container.appendChild(label);
  }

  for (let r = RANKS.length - 1; r >= 0; r -= 1) {
    const rank = RANKS[r];

    const rankLabel = document.createElement("div");
    rankLabel.className = "rank-label";
    rankLabel.textContent = String(rank);
    container.appendChild(rankLabel);

    for (let fi = 0; fi < FILES.length; fi += 1) {
      const file = FILES[fi];
      const square = document.createElement("div");
      const dark = isDarkSquare(fi, rank);
      square.className = `square ${dark ? "square--dark" : "square--light"}`;
      square.dataset.square = `${file}${rank}`;
      square.setAttribute("role", "button");
      square.setAttribute("aria-label", `Square ${file}${rank}`);

      const coord = document.createElement("div");
      coord.className = "square__coord";
      coord.textContent = `${file}${rank}`;
      square.appendChild(coord);

      container.appendChild(square);
    }
  }
}

function renderPieces(boardFrame, board) {
  const squares = boardFrame.querySelectorAll(".square");
  for (const sqEl of squares) {
    const square = sqEl.dataset.square;
    const piece = board.get(square);

    const existing = sqEl.querySelector("img.piece");
    if (existing) existing.remove();

    if (!piece) continue;
    const img = document.createElement("img");
    img.className = "piece";
    img.draggable = false;
    img.alt = `${piece.color === "w" ? "White" : "Black"} ${pieceName(piece.type)}`;
    img.src = getPieceAssetPath(pieceName(piece.type), piece.color);
    sqEl.appendChild(img);
  }
}

function clearHighlights(boardFrame) {
  const squares = boardFrame.querySelectorAll(".square");
  for (const sqEl of squares) {
    sqEl.classList.remove("square--selected", "square--legal", "square--legal-capture", "square--wrong");
  }
}

function highlightLegalMoves(boardFrame, from, legalMoves) {
  clearHighlights(boardFrame);
  const fromEl = boardFrame.querySelector(`[data-square="${from}"]`);
  if (fromEl) fromEl.classList.add("square--selected");
  for (const to of legalMoves) {
    const toEl = boardFrame.querySelector(`[data-square="${to}"]`);
    if (!toEl) continue;
    const piece = current.board.get(to);
    toEl.classList.add(piece ? "square--legal-capture" : "square--legal");
  }
}

function showCelebration(boardFrame, square) {
  const sqEl = boardFrame.querySelector(`[data-square="${square}"]`);
  if (!sqEl) return;
  const emoji = document.createElement("div");
  emoji.className = "celebration";
  emoji.textContent = "👍";
  sqEl.appendChild(emoji);
  setTimeout(() => emoji.remove(), 600);
}

function showModal(title, body, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__title">${title}</div>
      <div class="modal__body">${body}</div>
      <button class="modal__btn">Play Again</button>
    </div>
  `;
  overlay.querySelector(".modal__btn").addEventListener("click", () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  document.body.appendChild(overlay);
}

function generateStartingPosition(userPieces, options = {}) {
  const pieces = Array.isArray(userPieces) ? userPieces : [];
  const turn = normalizeColor(options.turn) || "w";
  const maxAttempts = Number(options.maxAttempts ?? 3000);
  const allowStartingCheck = Boolean(options.allowStartingCheck);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const board = createEmptyBoard();
    const available = allSquares();

    const wkSq = pickRandom(available);
    removeFromArray(available, wkSq);

    const nonAdjacentToWk = available.filter((sq) => !squaresAreAdjacent(wkSq, sq));
    if (nonAdjacentToWk.length === 0) continue;
    const bkSq = pickRandom(nonAdjacentToWk);
    removeFromArray(available, bkSq);

    board.set(wkSq, { type: "k", color: "w" });
    board.set(bkSq, { type: "k", color: "b" });

    let ok = true;
    for (const up of pieces) {
      if (available.length === 0) {
        ok = false;
        break;
      }
      const sq = pickRandom(available);
      removeFromArray(available, sq);
      board.set(sq, { type: normalizePieceType(up.type), color: normalizeColor(up.color) });
    }
    if (!ok) continue;

    const game = new ChessGame({ board, turn });
    if (!game.kingsAreSeparated(board)) continue;
    if (!allowStartingCheck && game.isCheck(turn, board)) continue;
    if (!allowStartingCheck && game.isCheck(oppositeColor(turn), board)) continue;
    if (game.isCheckmate("w", board)) continue;
    if (game.isCheckmate("b", board)) continue;

    return { board, turn };
  }

  return { board: createEmptyBoard(), turn };
}

function setMessage(text, tone = "neutral") {
  const el = document.getElementById("messageArea");
  el.textContent = text;
  if (tone === "danger") {
    el.style.color = "var(--danger)";
  } else {
    el.style.color = "var(--muted)";
  }
}

function setScore(value) {
  document.getElementById("scoreValue").textContent = String(value);
}

function setTurn(value) {
  document.getElementById("turnValue").textContent = value;
}

function resetUIState() {
  setScore(0);
  setTurn("White");
  setMessage("Make your move.");
}

function init() {
  const boardFrame = document.getElementById("boardFrame");
  const boardSizeSelect = document.getElementById("boardSizeSelect");
  const pieceCountRow = document.getElementById("pieceCountRow");
  const pieceCountSelect = document.getElementById("pieceCountSelect");
  const themeSelect = document.getElementById("themeSelect");

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("chess-theme", theme);
  };

  const savedTheme = localStorage.getItem("chess-theme") || "dark";
  themeSelect.value = savedTheme;
  applyTheme(savedTheme);

  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });

  const getLoadout = () => {
    const size = Number(boardSizeSelect.value);
    const count = Number(pieceCountSelect.value);
    if (size === 4) {
      return [
        { type: "rook", color: "w" },
        { type: "bishop", color: "b" },
      ];
    }
    if (count === 2) {
      return [
        { type: "rook", color: "w" },
        { type: "bishop", color: "b" },
        { type: "knight", color: "w" },
        { type: "queen", color: "b" },
      ];
    }
    return [
      { type: "rook", color: "w" },
      { type: "bishop", color: "b" },
      { type: "knight", color: "w" },
      { type: "queen", color: "b" },
      { type: "rook", color: "w" },
      { type: "bishop", color: "b" },
    ];
  };

  const startNewGame = () => {
    const size = Number(boardSizeSelect.value);
    setBoardSize(size);
    createBoardFrame(boardFrame);
    const loadout = getLoadout();
    score = 0;
    current = new ChessGame({
      ...generateStartingPosition(loadout, { turn: "w" }),
    });
    selectedSquare = null;
    clearHighlights(boardFrame);
    resetUIState();
    render();
  };

  boardSizeSelect.addEventListener("change", () => {
    const size = Number(boardSizeSelect.value);
    pieceCountRow.style.display = size === 5 ? "grid" : "none";
    startNewGame();
  });

  pieceCountSelect.addEventListener("change", startNewGame);

  let score = 0;
  let current = new ChessGame({
    ...generateStartingPosition(getLoadout(), { turn: "w" }),
  });

  let selectedSquare = null;

  const render = () => {
    renderPieces(boardFrame, current.board);
    setScore(score);
    setTurn(current.turn === "w" ? "White" : "Black");

    if (current.isCheckmate(current.turn)) {
      const winner = current.turn === "w" ? "Black" : "White";
      showModal("Checkmate!", `${winner} wins!`, () => {
        resetBtn.click();
      });
      return;
    }
    if (current.isStalemate(current.turn)) {
      showModal("Stalemate!", "The game is a draw.", () => {
        resetBtn.click();
      });
      return;
    }
    if (current.isCheck(current.turn)) {
      setMessage(`${current.turn === "w" ? "White" : "Black"} is in check!`);
      return;
    }
    setMessage("Make your move.");
  };

  const handleSquareClick = (square) => {
    const piece = current.getPieceAt(square);

    if (selectedSquare === null) {
      if (!piece || piece.color !== current.turn) {
        clearHighlights(boardFrame);
        return;
      }
      selectedSquare = square;
      const legal = current.getLegalMoves(piece, square);
      highlightLegalMoves(boardFrame, square, legal);
      return;
    }

    if (selectedSquare === square) {
      selectedSquare = null;
      clearHighlights(boardFrame);
      return;
    }

    const movingPiece = current.getPieceAt(selectedSquare);
    if (!movingPiece || movingPiece.color !== current.turn) {
      selectedSquare = null;
      clearHighlights(boardFrame);
      return;
    }

    const legal = current.getLegalMoves(movingPiece, selectedSquare);
    if (!legal.includes(square)) {
      const sqEl = boardFrame.querySelector(`[data-square="${square}"]`);
      if (sqEl) {
        sqEl.classList.add("square--wrong");
        setTimeout(() => sqEl.classList.remove("square--wrong"), 400);
      }
      setMessage("Wrong Move! Try again.", "danger");
      return;
    }

    const nextBoard = current.applyMove(current.board, selectedSquare, square);
    current.board = nextBoard;
    current.turn = oppositeColor(current.turn);
    score += 1;
    showCelebration(boardFrame, square);
    selectedSquare = null;
    clearHighlights(boardFrame);
    render();
  };

  boardFrame.addEventListener("click", (e) => {
    const sqEl = e.target.closest(".square");
    if (!sqEl) return;
    const square = sqEl.dataset.square;
    if (!square) return;
    handleSquareClick(square);
  });

  const resetBtn = document.getElementById("resetBtn");
  resetBtn.addEventListener("click", startNewGame);

  startNewGame();

  window.ChessAssets = {
    getPieceAssetPath,
  };

  window.ChessGame = {
    ChessGame,
    generateStartingPosition,
    getCurrent: () => current,
  };
}

init();
