let boardSize = 9;
let board = [];
let currentPlayer = "black";
let playerColor = "black";
let opponent = "friend";
let komi = 6.5;
let handicap = 0;

let captured = { black: 0, white: 0 };
let history = [];
let passCount = 0;
let gameOver = false;
let lastMove = null;
let finalTerritoryMap = null;

document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showView(link.dataset.view);
        });
    });

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    document.getElementById("howToPlayButton").addEventListener("click", () => showView("rules"));
    document.getElementById("guideStartButton").addEventListener("click", () => showView("play"));
    window.addEventListener("resize", () => {
        if (board.length && !document.getElementById("gameScreen").classList.contains("hidden")) {
            renderBoard(gameOver ? finalTerritoryMap : null);
        }
    });
    document.querySelectorAll("[data-size]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-size]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            boardSize = Number(btn.dataset.size);
            updateHandicapAvailability();
        });
    });

    document.querySelectorAll("[data-opponent]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-opponent]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            opponent = btn.dataset.opponent;
            document.querySelector(".computer-settings").classList.toggle("hidden", opponent !== "computer");
        });
    });

    document.querySelectorAll("[data-color]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-color]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            playerColor = btn.dataset.color;
        });
    });

    document.querySelectorAll("[data-handicap]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            document.querySelectorAll("[data-handicap]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            handicap = Number(btn.dataset.handicap);
        });
    });
    document.getElementById("komiMode").addEventListener("change", event => {
        komi = Number(event.target.value);
        document.getElementById("gameKomi").textContent = komi.toFixed(1);
        document.getElementById("liveKomiLabel").textContent = komi === 0 ? "(без коми)" : "(с коми)";
        updateLiveScore();
    });

    document.getElementById("startButton").addEventListener("click", startGame);
    document.getElementById("passButton").addEventListener("click", passTurn);
    document.getElementById("undoButton").addEventListener("click", undoMove);
    document.getElementById("finishButton").addEventListener("click", () => {
        finishGame("Партия завершена по запросу игрока.");
    });
    document.getElementById("resignButton").addEventListener("click", resign);

    document.getElementById("newGameButton").addEventListener("click", backToMenu);
    document.getElementById("playAgainButton").addEventListener("click", () => {
        closeModal();
        startGame();
    });
    document.getElementById("backButton").addEventListener("click", () => {
        closeModal();
        backToMenu();
    });
    updateHandicapAvailability();
});

function updateHandicapAvailability() {
    const unavailable = boardSize === 7;
    document.querySelectorAll("[data-handicap]").forEach(button => {
        button.disabled = unavailable && button.dataset.handicap !== "0";
    });
    if (unavailable) {
        handicap = 0;
        document.querySelectorAll("[data-handicap]").forEach(button => {
            button.classList.toggle("active", button.dataset.handicap === "0");
        });
    }
    document.getElementById("handicapNote").textContent = unavailable
        ? "На доске 7×7 фора недоступна."
        : "Камни форы автоматически ставятся в угловые точки.";
}

function showView(view) {
    const setup = document.getElementById("setupScreen");
    const game = document.getElementById("gameScreen");
    const rules = document.getElementById("rulesScreen");

    if (view === "rules") {
        setup.classList.add("hidden");
        game.classList.add("hidden");
        rules.classList.remove("hidden");
        animateView(rules);
    } else {
        rules.classList.add("hidden");
        if (gameOver || game.classList.contains("hidden")) {
            setup.classList.remove("hidden");
            game.classList.add("hidden");
            animateView(setup);
        } else {
            setup.classList.add("hidden");
            game.classList.remove("hidden");
            animateView(game);
        }
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.view === view);
    });
}

function animateView(element) {
    element.classList.remove("view-entering");
    void element.offsetWidth;
    element.classList.add("view-entering");
}

function initTheme() {
    const saved = localStorage.getItem("playgo-theme");
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    updateThemeButton();
}

function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("playgo-theme", next);
    updateThemeButton();
}

function updateThemeButton() {
    const button = document.getElementById("themeToggle");
    if (!button) return;
    const dark = document.documentElement.dataset.theme === "dark";
    button.textContent = dark ? "☀" : "☾";
    button.title = dark ? "Включить светлую тему" : "Включить тёмную тему";
    button.setAttribute("aria-label", button.title);
}

function startGame() {
    showView("play");
    document.getElementById("setupScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");

    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    currentPlayer = "black";
    captured = { black: 0, white: 0 };
    history = [];
    passCount = 0;
    gameOver = false;
    lastMove = null;
    finalTerritoryMap = null;

    document.getElementById("gameSize").textContent = `${boardSize}×${boardSize}`;
    document.getElementById("gameKomi").textContent = komi.toFixed(1);
    document.getElementById("liveKomiLabel").textContent = komi === 0 ? "(без коми)" : "(с коми)";
    document.getElementById("blackName").textContent =
        opponent === "computer" ? (playerColor === "black" ? "Вы" : "Компьютер") : "Игрок 1";
    document.getElementById("whiteName").textContent =
        opponent === "computer" ? (playerColor === "white" ? "Вы" : "Компьютер") : "Игрок 2";

    animateView(document.getElementById("gameScreen"));
    applyHandicap();
    updateCaptured();
    renderBoard();
    updateLiveScore();
    updateTurn();

    if (opponent === "computer" && currentPlayer !== playerColor) {
        setTimeout(computerMove, 500);
    }
}

function applyHandicap() {
    if (handicap === 0 || boardSize < 9) return;

    const low = boardSize === 9 ? 2 : 3;
    const high = boardSize - 1 - low;
    const corners = [[low, low], [high, high], [high, low], [low, high]];
    const amount = Math.min(handicap, corners.length);

    for (let i = 0; i < amount; i++) {
        const [x, y] = corners[i];
        board[y][x] = "black";
    }

    if (amount > 0) currentPlayer = "white";
}

function renderBoard(territoryMap = null) {
    const el = document.getElementById("board");
    el.innerHTML = "";

    const cell = 100 / (boardSize - 1);
    const stoneSize = (el.clientWidth / (boardSize - 1)) * 0.82;
    el.style.setProperty("--stone-size", `${stoneSize}px`);
    el.style.setProperty("--marker-size", `${Math.max(13, Math.min(18, stoneSize * 0.62))}px`);

    for (let i = 0; i < boardSize; i++) {
        const h = document.createElement("div");
        h.className = "board-line board-horizontal";
        h.style.top = `${i * cell}%`;
        el.appendChild(h);

        const v = document.createElement("div");
        v.className = "board-line board-vertical";
        v.style.left = `${i * cell}%`;
        el.appendChild(v);
    }

    getStarPoints(boardSize).forEach(([x, y]) => {
        const p = document.createElement("div");
        p.className = "star-point";
        p.style.left = `${x * cell}%`;
        p.style.top = `${y * cell}%`;
        el.appendChild(p);
    });

    if (territoryMap) {
        for (let y = 0; y < boardSize; y++) for (let x = 0; x < boardSize; x++) {
            if (board[y][x] || !territoryMap[y][x]) continue;
            const marker = document.createElement("span");
            marker.className = `territory-marker territory-${territoryMap[y][x]}`;
            marker.style.left = `${x * cell}%`;
            marker.style.top = `${y * cell}%`;
            marker.textContent = "×";
            marker.title = territoryMap[y][x] === "black" ? "Территория чёрных" : "Территория белых";
            el.appendChild(marker);
        }
    }

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!board[y][x]) continue;

            const stone = document.createElement("div");
            stone.className = `stone ${board[y][x]}`;
            stone.style.left = `${x * cell}%`;
            stone.style.top = `${y * cell}%`;

            if (lastMove && lastMove.x === x && lastMove.y === y) {
                stone.classList.add("last-move");
            }

            el.appendChild(stone);
        }
    }

    el.onclick = handleBoardClick;
}

function getStarPoints(size) {
    if (size === 7) return [[3, 3]];
    if (size === 9) return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
    if (size === 13) return [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]];
    if (size === 19) {
        return [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]];
    }
    return [];
}

function handleBoardClick(event) {
    if (gameOver) return;
    if (opponent === "computer" && currentPlayer !== playerColor) return;

    const rect = document.getElementById("board").getBoundingClientRect();
    const cell = rect.width / (boardSize - 1);
    const x = Math.max(0, Math.min(boardSize - 1, Math.round((event.clientX - rect.left) / cell)));
    const y = Math.max(0, Math.min(boardSize - 1, Math.round((event.clientY - rect.top) / cell)));

    playMove(x, y);
}

function playMove(x, y, isAI = false) {
    if (gameOver || board[y][x] !== null) return false;

    const color = currentPlayer;
    const result = getLegalMoveResult(board, x, y, color);

    if (!result.legal) {
        showStatus(result.reason || "Этот ход запрещён.");
        return false;
    }

    saveHistory();

    board = result.board;
    captured[color] += result.captured;
    lastMove = { x, y };
    passCount = 0;

    updateCaptured();
    renderBoard();
    updateLiveScore();

    currentPlayer = opposite(currentPlayer);
    updateTurn();

    if (opponent === "computer" && currentPlayer !== playerColor && !gameOver) {
        setTimeout(computerMove, isAI ? 150 : 350);
    }

    return true;
}

function getLegalMoveResult(state, x, y, color) {
    if (state[y][x] !== null) return { legal: false, reason: "Здесь уже стоит камень." };

    const next = cloneBoard(state);
    next[y][x] = color;

    const enemy = opposite(color);
    let capturedCount = 0;

    const checked = new Set();

    for (const [nx, ny] of neighbors(x, y)) {
        if (next[ny][nx] !== enemy) continue;

        const key = `${nx},${ny}`;
        if (checked.has(key)) continue;

        const group = getGroup(next, nx, ny);
        group.forEach(([gx, gy]) => checked.add(`${gx},${gy}`));

        if (countLiberties(next, nx, ny) === 0) {
            capturedCount += removeGroup(next, nx, ny);
        }
    }

    if (countLiberties(next, x, y) === 0) {
        return { legal: false, reason: "Самоубийственный ход запрещён." };
    }

    /*
      Japanese-style simple ko:
      нельзя вернуть доску в состояние непосредственно
      перед предыдущим ходом, если это был захват.
    */
    const position = boardToString(next);
    const previous = history.length ? boardToString(history[history.length - 1].board) : null;

    if (previous && position === previous && capturedCount > 0) {
        return { legal: false, reason: "Правило ko: этот ход пока запрещён." };
    }

    return { legal: true, board: next, captured: capturedCount };
}

function neighbors(x, y) {
    const result = [];
    if (x > 0) result.push([x - 1, y]);
    if (x < boardSize - 1) result.push([x + 1, y]);
    if (y > 0) result.push([x, y - 1]);
    if (y < boardSize - 1) result.push([x, y + 1]);
    return result;
}

function getGroup(state, x, y) {
    const color = state[y][x];
    if (!color) return [];

    const group = [];
    const queue = [[x, y]];
    const visited = new Set();

    while (queue.length) {
        const [cx, cy] = queue.shift();
        const key = `${cx},${cy}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (cx < 0 || cy < 0 || cx >= boardSize || cy >= boardSize) continue;
        if (state[cy][cx] !== color) continue;

        group.push([cx, cy]);
        for (const [nx, ny] of neighbors(cx, cy)) queue.push([nx, ny]);
    }

    return group;
}

function countLiberties(state, x, y) {
    const group = getGroup(state, x, y);
    const liberties = new Set();

    for (const [gx, gy] of group) {
        for (const [nx, ny] of neighbors(gx, gy)) {
            if (state[ny][nx] === null) liberties.add(`${nx},${ny}`);
        }
    }

    return liberties.size;
}

function removeGroup(state, x, y) {
    const group = getGroup(state, x, y);
    for (const [gx, gy] of group) state[gy][gx] = null;
    return group.length;
}

function saveHistory() {
    history.push({
        board: cloneBoard(board),
        captured: { ...captured },
        currentPlayer,
        lastMove: lastMove ? { ...lastMove } : null,
        passCount
    });
}

function undoMove() {
    if (gameOver || history.length === 0) return;

    const steps = opponent === "computer" ? Math.min(2, history.length) : 1;

    for (let i = 0; i < steps; i++) {
        if (!history.length) break;
        const previous = history.pop();
        board = cloneBoard(previous.board);
        captured = { ...previous.captured };
        currentPlayer = previous.currentPlayer;
        lastMove = previous.lastMove ? { ...previous.lastMove } : null;
        passCount = previous.passCount;
    }

    gameOver = false;
    updateCaptured();
    renderBoard();
    updateLiveScore();
    updateTurn();
    clearStatus();
}

function passTurn(isAI = false) {
    if (gameOver) return;
    if (!isAI && opponent === "computer" && currentPlayer !== playerColor) return;

    saveHistory();
    lastMove = null;
    passCount++;

    if (passCount >= 2) {
        finishGame();
        return;
    }

    currentPlayer = opposite(currentPlayer);
    updateTurn();

    if (opponent === "computer" && currentPlayer !== playerColor) {
        setTimeout(computerMove, 350);
    }
}

function resign() {
    if (gameOver) return;

    gameOver = true;
    const winner = opposite(currentPlayer);
    const title = winner === "black" ? "Чёрные победили" : "Белые победили";

    const score = calculateScore();
    showResult(title, "Партия завершена после сдачи.", score);
}

function finishGame(description = "Оба игрока сделали пас.") {
    gameOver = true;
    const score = calculateScore();

    let title;
    if (score.black > score.white) title = "Чёрные победили";
    else if (score.white > score.black) title = "Белые победили";
    else title = "Ничья";

    showResult(title, description, score);
}

function calculateScore() {
    const { territoryMap, blackTerritory, whiteTerritory } = findTerritories(board);

    return {
        black: blackTerritory + captured.black,
        white: whiteTerritory + captured.white + komi,
        blackTerritory, whiteTerritory, blackCaptured: captured.black,
        whiteCaptured: captured.white, komi, territoryMap
    };
}

function findTerritories(state) {
    let blackTerritory = 0;
    let whiteTerritory = 0;
    const territoryMap = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    const visited = new Set();

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (state[y][x] !== null || visited.has(`${x},${y}`)) continue;

            const region = [];
            const borders = new Set();
            const borderStones = new Set();
            const queue = [[x, y]];

            while (queue.length) {
                const [cx, cy] = queue.shift();
                const key = `${cx},${cy}`;

                if (state[cy][cx] !== null) {
                    borders.add(state[cy][cx]);
                    borderStones.add(`${cx},${cy}`);
                    continue;
                }

                if (visited.has(key)) continue;
                visited.add(key);
                region.push([cx, cy]);
                for (const [nx, ny] of neighbors(cx, cy)) queue.push([nx, ny]);
            }

            if (borders.size === 1 && region.length <= borderStones.size * 4) {
                const owner = borders.has("black") ? "black" : "white";
                if (owner === "black") blackTerritory += region.length;
                else whiteTerritory += region.length;
                for (const [rx, ry] of region) territoryMap[ry][rx] = owner;
            }
        }
    }

    return { territoryMap, blackTerritory, whiteTerritory };
}

function computerMove() {
    if (gameOver || currentPlayer === playerColor) return;

    const moves = [];
    const level = document.getElementById("aiLevel").value;
    const { territoryMap } = findTerritories(board);

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (board[y][x] !== null) continue;

            const result = getLegalMoveResult(board, x, y, currentPlayer);
            if (!result.legal) continue;
            if (result.captured === 0 && territoryMap[y][x] === currentPlayer) continue;

            moves.push({
                x, y,
                score: evaluateMove(x, y, result, territoryMap) +
                    (level === "hard" ? strategicBonus(x, y, result) : 0)
            });
        }
    }

    if (!moves.length) {
        passTurn(true);
        return;
    }

    moves.sort((a, b) => b.score - a.score);
    // If all legal moves are strategically poor, the AI may pass instead of filling its own territory.
    if (level !== "easy" && moves[0].score < (passCount === 1 ? 8 : 4)) {
        passTurn(true);
        return;
    }

    let selected;

    if (level === "easy") {
        const pool = moves.slice(0, Math.min(12, moves.length));
        selected = pool[Math.floor(Math.random() * pool.length)];
    } else if (level === "medium") {
        const pool = moves.slice(0, Math.min(5, moves.length));
        selected = pool[Math.floor(Math.random() * pool.length)];
    } else {
        selected = moves[0];
    }

    playMove(selected.x, selected.y, true);
}

function evaluateMove(x, y, result, territoryMap) {
    let score = 0;

    score += result.captured * 80;
    if (result.captured === 0 && territoryMap[y][x] === currentPlayer) return -1000;

    let ownStoneCount = 0;
    let nearestFriendly = Infinity;
    let nearbyFriendly = 0;
    let adjacentFriendly = 0;
    let adjacentEnemy = 0;
    const checkedEnemyGroups = new Set();

    for (let sy = 0; sy < boardSize; sy++) {
        for (let sx = 0; sx < boardSize; sx++) {
            if (board[sy][sx] !== currentPlayer) continue;
            ownStoneCount++;

            const distance = Math.max(Math.abs(sx - x), Math.abs(sy - y));
            nearestFriendly = Math.min(nearestFriendly, distance);
            if (distance <= 2) nearbyFriendly++;
        }
    }

    for (const [nx, ny] of neighbors(x, y)) {
        if (board[ny][nx] === currentPlayer) {
            adjacentFriendly++;
            continue;
        }
        if (board[ny][nx] !== opposite(currentPlayer)) continue;

        adjacentEnemy++;
        const key = `${nx},${ny}`;
        if (checkedEnemyGroups.has(key)) continue;
        const group = getGroup(board, nx, ny);
        group.forEach(([gx, gy]) => checkedEnemyGroups.add(`${gx},${gy}`));
        const libertiesBefore = countLiberties(board, nx, ny);
        const libertiesAfter = countLiberties(result.board, nx, ny);
        if (libertiesAfter < libertiesBefore) {
            score += libertiesAfter === 1 ? 28 : 8;
        }
    }

    const ownLiberties = countLiberties(result.board, x, y);
    if (ownLiberties === 1) score -= 45;
    else if (ownLiberties === 2) score -= 12;
    else if (ownLiberties >= 4) score += 3;

    if (adjacentFriendly > 1 && adjacentEnemy === 0 && result.captured === 0) {
        score -= (adjacentFriendly - 1) * 12;
    } else if (adjacentFriendly === 1) {
        score += 2;
    }

    if (ownStoneCount > 0) {
        if (nearestFriendly <= 1) score -= 18;
        else if (nearestFriendly === 2) score -= 10;
        else if (nearestFriendly === 3) score += 2;
        else if (nearestFriendly === 4) score += 7;
        else if (nearestFriendly === 5) score += 4;

        if (nearbyFriendly >= 3 && adjacentEnemy === 0) {
            score -= (nearbyFriendly - 2) * 3;
        }
    } else {
        score += 5;
    }

    const distanceToEdge = Math.min(x, y, boardSize - 1 - x, boardSize - 1 - y);
    const preferredLine = boardSize <= 7 ? 1 : Math.round(boardSize / 6);
    if (distanceToEdge === preferredLine) score += 8;
    else if (distanceToEdge === preferredLine + 1) score += 4;
    else if (distanceToEdge === 0) score -= 10;
    else if (distanceToEdge >= boardSize / 3) score -= 8;

    if (ownStoneCount < 6 && getStarPoints(boardSize).some(([sx, sy]) =>
        sx === x && sy === y && !(sx === (boardSize - 1) / 2 && sy === (boardSize - 1) / 2))) {
        score += 18;
    }

    const emptyAdjacent = neighbors(x, y).filter(([nx, ny]) => board[ny][nx] === null).length;
    score += emptyAdjacent;
    return score;
}

function strategicBonus(x, y, result) {
    let score = 0;
    const distanceToEdge = Math.min(x, y, boardSize - 1 - x, boardSize - 1 - y);
    const preferredLine = boardSize <= 7 ? 1 : Math.round(boardSize / 6);
    if (distanceToEdge === preferredLine) score += 3;
    if (distanceToEdge === 0) score -= 12;
    // Avoid moves that create a cramped group with only one liberty.
    const libs = countLiberties(result.board, x, y);
    if (libs <= 1) score -= 45;
    if (libs >= 4) score += 3;
    return score;
}

function updateTurn() {
    const name = currentPlayer === "black" ? "Чёрные" : "Белые";
    document.getElementById("turn").textContent = name;

    const stone = document.getElementById("turnStone");
    stone.className = `turn-stone ${currentPlayer === "black" ? "black-preview" : "white-preview"}`;
}

function updateCaptured() {
    document.getElementById("blackCaptured").textContent = captured.black;
    document.getElementById("whiteCaptured").textContent = captured.white;
}

function updateLiveScore() {
    if (!board.length) return;
    const score = calculateScore();
    document.getElementById("liveBlackScore").textContent = score.black.toFixed(1);
    document.getElementById("liveWhiteScore").textContent = score.white.toFixed(1);
}

function showResult(title, description, score) {
    document.getElementById("resultTitle").textContent = title;
    document.getElementById("resultDescription").textContent = description;
    document.getElementById("finalBlack").textContent = score.black.toFixed(1);
    document.getElementById("finalWhite").textContent = score.white.toFixed(1);
    const whiteKomi = score.komi ? ` + коми ${score.komi}` : "";
    document.getElementById("scoreBreakdown").innerHTML = `<div><strong>Чёрные:</strong> территория ${score.blackTerritory} + захвачено ${score.blackCaptured} = ${score.black.toFixed(1)}</div><div><strong>Белые:</strong> территория ${score.whiteTerritory} + захвачено ${score.whiteCaptured}${whiteKomi} = ${score.white.toFixed(1)}</div><small>Крестиками на доске отмечены точки территории, вошедшие в подсчёт.</small>`;
    finalTerritoryMap = score.territoryMap;
    renderBoard(finalTerritoryMap);
    document.getElementById("resultModal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("resultModal").classList.add("hidden");
}

function backToMenu() {
    closeModal();
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("setupScreen").classList.remove("hidden");
}

function showStatus(message) {
    const el = document.getElementById("statusMessage");
    el.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(clearStatus, 2200);
}

function clearStatus() {
    document.getElementById("statusMessage").textContent = "";
}

function opposite(color) {
    return color === "black" ? "white" : "black";
}

function cloneBoard(state) {
    return state.map(row => [...row]);
}

function boardToString(state) {
    return state.map(row => row.map(cell => cell || ".").join("")).join("");
}
