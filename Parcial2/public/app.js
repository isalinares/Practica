const API = "";
let state = { page: "home", roomCode: null, playerId: "player1", isCreator: false };
let cache = { pokemon: null, moves: null, typeRelations: null, shiny: [] };
let clerkClient = null;
let currentUser = null;
let useShiny = false;

async function initClerk() {
  try {
    const publishableKey = window.CLERK_PUBLISHABLE_KEY;
    if (!publishableKey || publishableKey === "YOUR_CLERK_PUBLISHABLE_KEY") {
      console.log("Clerk not configured");
      return;
    }
    
    await Clerk.load({
      publishableKey,
    });
    clerkClient = Clerk;
    
    if (Clerk.user) {
      currentUser = {
        id: Clerk.user.id,
        email: Clerk.user.primaryEmailAddress?.emailAddress,
        name: Clerk.user.firstName || Clerk.user.username || "Player",
      };
      loadShiny();
    }
  } catch (e) {
    console.log("Clerk init error:", e);
  }
}

async function loadShiny() {
  if (!currentUser) return;
  try {
    const res = await fetch("/api/user/shiny", {
      headers: { Authorization: `Bearer ${await clerkClient.session.getToken()}` },
    });
    const data = await res.json();
    if (data.shiny) cache.shiny = data.shiny;
  } catch (e) {}
}

async function getAuthToken() {
  if (clerkClient && clerkClient.session) {
    return clerkClient.session.getToken();
  }
  return null;
}

function navigate(page, code = null) {
  state.page = page;
  state.roomCode = code;
  if (page === "create") state.isCreator = true;
  if (page === "join") state.isCreator = false;
  state.playerId = state.isCreator ? "player1" : "player2";
  if (code) {
    window.history.pushState({}, "", `/${page}/${code}`);
  } else {
    window.history.pushState({}, "", page === "home" ? "/" : `/${page}`);
  }
  render();
}

window.addEventListener("popstate", () => {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) { state.page = "home"; state.roomCode = null; }
  else if (parts[0] === "create") { state.page = "create"; state.roomCode = null; state.isCreator = true; }
  else if (parts[0] === "join") { state.page = "join"; state.roomCode = parts[1]; state.isCreator = false; }
  else if (parts[0] === "lobby") { state.page = "lobby"; state.roomCode = parts[1]; }
  else if (parts[0] === "battle") { state.page = "battle"; state.roomCode = parts[1]; }
  state.playerId = state.isCreator ? "player1" : "player2";
  render();
});

async function apiCall(endpoint, options = {}) {
  const token = await getAuthToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(API + endpoint, { ...options, headers });
  return res.json();
}

function render() {
  const app = document.getElementById("app");
  switch (state.page) {
    case "home": app.innerHTML = renderHome(); break;
    case "create": app.innerHTML = renderCreate(); break;
    case "join": app.innerHTML = renderJoin(); break;
    case "lobby": renderLobby(); break;
    case "battle": app.innerHTML = renderBattle(); break;
  }
}

function renderAuthButton() {
  if (!clerkClient) return `<button class="btn-secondary" onclick="alert('Clerk not configured')">Sign In</button>`;
  
  if (currentUser) {
    return `
      <div class="auth-info">
        <span>${currentUser.name}</span>
        <button class="btn-secondary small" onclick="signOut()">Sign Out</button>
      </div>
    `;
  }
  
  return `<button class="btn-secondary" onclick="signIn()">Sign In</button>`;
}

window.signIn = async () => {
  if (clerkClient) {
    await clerkClient.openSignIn();
    currentUser = {
      id: clerkClient.user.id,
      email: clerkClient.user.primaryEmailAddress?.emailAddress,
      name: clerkClient.user.firstName || clerkClient.user.username || "Player",
    };
    loadShiny();
    render();
  }
};

window.signOut = async () => {
  if (clerkClient) {
    await clerkClient.signOut();
    currentUser = null;
    cache.shiny = [];
    render();
  }
};

function renderHome() {
  return `
    <div class="app">
      <header class="app-header">
        <h1 onclick="navigate('home')">Pokemon Battle Rooms</h1>
        <div class="header-right">${renderAuthButton()}</div>
      </header>
      <main class="app-main">
        <div class="home-page">
          <h2>Welcome to Pokemon Battle Rooms</h2>
          ${currentUser ? `<p class="welcome-text">Signed in as ${currentUser.name}</p>` : ""}
          <div class="home-actions">
            <button class="btn-primary" onclick="navigate('create')">Create Room</button>
            <div class="join-form">
              <input type="text" id="joinCode" placeholder="Enter room code" maxlength="6">
              <button class="btn-secondary" onclick="joinFromHome()">Join Room</button>
            </div>
          </div>
        </div>
      </main>
    </div>`;
}

window.joinFromHome = () => {
  const code = document.getElementById("joinCode").value.toUpperCase();
  if (code) navigate("join", code);
};

let createRoomCode = null;

function renderCreate() {
  if (createRoomCode) {
    return `
      <div class="app">
        <header class="app-header">
          <h1 onclick="navigate('home')">Pokemon Battle Rooms</h1>
          <div class="header-right">${renderAuthButton()}</div>
        </header>
        <main class="app-main">
          <div class="room-created">
            <h2>Room Created!</h2>
            <p>Share this code with your opponent:</p>
            <div class="room-code">${createRoomCode}</div>
            <button class="btn-primary" onclick="navigate('lobby', '${createRoomCode}')">Go to Lobby</button>
          </div>
        </main>
      </div>`;
  }
  return `
    <div class="app">
      <header class="app-header">
        <h1 onclick="navigate('home')">Pokemon Battle Rooms</h1>
        <div class="header-right">${renderAuthButton()}</div>
      </header>
      <main class="app-main">
        <div class="create-room">
          <h2>Create a Room</h2>
          <input type="text" id="playerName" placeholder="Your name" maxlength="20" value="${currentUser?.name || ""}">
          <button class="btn-primary" id="createBtn" onclick="doCreateRoom()">Create Room</button>
          <button class="btn-secondary" onclick="navigate('home')">Back</button>
        </div>
      </main>
    </div>`;
}

window.doCreateRoom = async () => {
  const name = document.getElementById("playerName").value.trim();
  if (!name) return;
  const btn = document.getElementById("createBtn");
  btn.disabled = true;
  btn.textContent = "Creating...";
  const data = await apiCall("/api/rooms", { method: "POST", body: JSON.stringify({ playerName: name }) });
  createRoomCode = data.code;
  render();
};

let joinError = "";

function renderJoin() {
  return `
    <div class="app">
      <header class="app-header">
        <h1 onclick="navigate('home')">Pokemon Battle Rooms</h1>
        <div class="header-right">${renderAuthButton()}</div>
      </header>
      <main class="app-main">
        <div class="join-room">
          <h2>Join Room: ${state.roomCode}</h2>
          <input type="text" id="joinPlayerName" placeholder="Your name" maxlength="20" value="${currentUser?.name || ""}">
          ${joinError ? `<p class="error">${joinError}</p>` : ""}
          <button class="btn-primary" id="joinBtn" onclick="doJoin()">Join</button>
          <button class="btn-secondary" onclick="navigate('home')">Back</button>
        </div>
      </main>
    </div>`;
}

window.doJoin = async () => {
  const name = document.getElementById("joinPlayerName").value.trim();
  if (!name) return;
  const btn = document.getElementById("joinBtn");
  btn.disabled = true;
  btn.textContent = "Joining...";
  const res = await fetch(API + `/api/rooms/${state.roomCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName: name }),
  });
  if (!res.ok) {
    joinError = "Room not found or already full";
    render();
    return;
  }
  navigate("lobby", state.roomCode);
};

let lobbyData = null;
let selectedTeam = [];
let lobbyStep = "select";
let lobbyLoading = false;
let lobbyScrollPos = 0;

function renderLobby() {
  const p1Ready = lobbyData?.players?.player1?.team?.length > 0;
  const p2Ready = lobbyData?.players?.player2?.team?.length > 0;
  const bothReady = p1Ready && p2Ready;

  const existingGrid = document.getElementById("pokemonGrid");
  if (existingGrid) {
    lobbyScrollPos = existingGrid.scrollTop;
  }

  let content = `
    <div class="app">
      <header class="app-header">
        <h1 onclick="navigate('home')">Pokemon Battle Rooms</h1>
        <div class="header-right">${renderAuthButton()}</div>
      </header>
      <main class="app-main">
        <div class="lobby">
          <h2>Lobby - Room: ${state.roomCode}</h2>
          <div class="lobby-status">
            <p>Player 1: ${lobbyData?.players?.player1?.name || "Waiting..."}</p>
            <p>Player 2: ${lobbyData?.players?.player2?.name || "Waiting..."}</p>
          </div>
          <div class="shiny-toggle">
            <label class="toggle-label">
              <input type="checkbox" id="shinyToggle" ${useShiny ? "checked" : ""} onchange="toggleShiny()">
              <span class="toggle-slider"></span>
              <span class="toggle-text">Show Shiny Pokemon</span>
            </label>
          </div>`;

  if (lobbyStep === "select") {
    content += `
          <div class="team-selection">
            <h3>Select your team (${selectedTeam.length}/6)</h3>
            <div class="pokemon-grid" id="pokemonGrid">
              ${(cache.pokemon || []).map(p => {
                const isShiny = cache.shiny.includes(p.pokedexId.toString());
                const spriteUrl = useShiny && isShiny ? p.shinySpriteUrl : p.spriteUrl;
                const shinyBadge = isShiny ? `<span class="shiny-badge">✨</span>` : "";
                const lockedBadge = !isShiny && currentUser ? `<span class="locked-badge" onclick="buyShiny('${p._id}', '${p.name}')">🔒 $5</span>` : "";
                return `
                  <div class="pokemon-card ${selectedTeam.includes(p._id) ? "selected" : ""}" onclick="togglePokemon('${p._id}')">
                    ${shinyBadge}${lockedBadge}
                    <img src="${spriteUrl}" alt="${p.name}">
                    <p>${p.name}</p>
                    <div class="types">${p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join("")}</div>
                  </div>
                `;
              }).join("")}
            </div>
            <button class="btn-primary" id="readyBtn" onclick="doReady()" ${selectedTeam.length === 0 ? "disabled" : ""}>
              ${lobbyLoading ? "Ready..." : "Ready"}
            </button>
          </div>`;
  } else {
    content += `
          <div class="waiting">
            <p>Waiting for opponent...</p>
            <p>Player 1 ready: ${p1Ready ? "Yes" : "No"}</p>
            <p>Player 2 ready: ${p2Ready ? "Yes" : "No"}</p>
            ${bothReady ? `<button class="btn-primary" onclick="doStartBattle()">Start Battle</button>` : ""}
          </div>`;
  }

  content += `</div></main></div>`;

  const app = document.getElementById("app");
  app.innerHTML = content;

  const grid = document.getElementById("pokemonGrid");
  if (grid) {
    grid.scrollTop = lobbyScrollPos;
  }
}

window.toggleShiny = () => {
  useShiny = document.getElementById("shinyToggle").checked;
  renderLobby();
};

window.buyShiny = async (pokemonId, pokemonName) => {
  if (!currentUser) {
    alert("Please sign in to purchase shiny Pokemon");
    return;
  }
  
  try {
    const token = await getAuthToken();
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pokemonId, pokemonName }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Failed to create checkout session");
    }
  } catch (e) {
    alert("Error: " + e.message);
  }
};

window.togglePokemon = (id) => {
  if (selectedTeam.includes(id)) {
    selectedTeam = selectedTeam.filter(t => t !== id);
  } else if (selectedTeam.length < 6) {
    selectedTeam.push(id);
  }
  renderLobby();
};

window.doReady = async () => {
  if (selectedTeam.length === 0) return;
  lobbyLoading = true;
  renderLobby();

  await apiCall(`/api/rooms/${state.roomCode}/ready`, {
    method: "POST",
    body: JSON.stringify({ playerId: state.playerId, team: selectedTeam }),
  });
  lobbyStep = "waiting";
  lobbyLoading = false;
  renderLobby();
};

window.doStartBattle = async () => {
  try {
    const res = await fetch(`/api/rooms/${state.roomCode}/start`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    battleData = data;
    localHasActed = false;
    lastTurnNumber = data.turn;
    state.page = "battle";
    window.history.pushState({}, "", `/battle/${state.roomCode}`);
    render();
  } catch (e) {
    alert("Error starting battle: " + e.message);
  }
};

let battleData = null;
let battleLoading = false;
let animating = false;
let switchOpen = false;
let localHasActed = false;
let lastTurnNumber = 0;

function renderBattle() {
  if (!battleData) {
    return `<div class="app"><header class="app-header"><h1>Pokemon Battle Rooms</h1></header><main class="app-main"><div class="battle-loading">Loading battle...</div></main></div>`;
  }
  
  if (!battleData.players || !Array.isArray(battleData.players) || battleData.players.length < 2) {
    return `<div class="app"><header class="app-header"><h1>Pokemon Battle Rooms</h1></header><main class="app-main"><div class="battle-loading">Loading battle data...</div></main></div>`;
  }

  const pIdx = state.playerId === "player1" ? 0 : 1;
  const oIdx = pIdx === 0 ? 1 : 0;
  const player = battleData.players[pIdx];
  const opponent = battleData.players[oIdx];
  
  if (!player || !opponent || !player.team || !opponent.team) {
    return `<div class="app"><header class="app-header"><h1>Pokemon Battle Rooms</h1></header><main class="app-main"><div class="battle-loading">Loading battle data...</div></main></div>`;
  }
  
  const activeP = player.team[player.activePokemonIndex];
  const activeO = opponent.team[opponent.activePokemonIndex];

  if (!activeP || !activeO) {
    return `<div class="app"><header class="app-header"><h1>Pokemon Battle Rooms</h1></header><main class="app-main"><div class="battle-loading">Loading battle data...</div></main></div>`;
  }

  if (!activeP.moves || !Array.isArray(activeP.moves)) {
    return `<div class="app"><header class="app-header"><h1>Pokemon Battle Rooms</h1></header><main class="app-main"><div class="battle-loading">Loading moves...</div></main></div>`;
  }

  if (!cache.moves || cache.moves.length === 0) {
    return `<div class="app"><header class="app-header"><h1>Pokemon Battle Rooms</h1></header><main class="app-main"><div class="battle-loading">Loading moves data...</div></main></div>`;
  }

  const pMoves = activeP.moves.map(mid => cache.moves.find(m => m._id === mid)).filter(Boolean);

  if (battleData.turn !== lastTurnNumber) {
    localHasActed = false;
    lastTurnNumber = battleData.turn;
  }

  const hasActed = localHasActed || (battleData.pendingActions && battleData.pendingActions[state.playerId]);
  const allActed = battleData.pendingActions && Object.keys(battleData.pendingActions).length >= 2;
  const canAct = !hasActed && !allActed && battleData.status === "active";

  function hpBar(pkmn) {
    const pct = Math.max(0, (pkmn.currentHp / pkmn.maxHp) * 100);
    const color = pct > 50 ? "#4caf50" : pct > 20 ? "#ff9800" : "#f44336";
    return `<div class="hp-bar-container">
      <div class="hp-bar" style="width:${pct}%;background-color:${color}"></div>
      <span class="hp-text">${pkmn.currentHp}/${pkmn.maxHp}</span>
    </div>`;
  }

  function statusBadges(pkmn) {
    if (!pkmn.statuses || pkmn.statuses.length === 0) return "";
    return `<div class="statuses">${pkmn.statuses.map(s => `<span class="status-badge">${s.name} (${s.remainingTurns})</span>`).join("")}</div>`;
  }

  const animClass = animating ? "shake" : "";
  const hitClass = animating ? "hit" : "";
  const atkClass = animating ? "attack-anim" : "";

  if (battleData.status === "finished") {
    const won = battleData.winnerPlayerId === state.playerId;
    return `
      <div class="app">
        <header class="app-header"><h1>Pokemon Battle Rooms</h1></header>
        <main class="app-main">
          <div class="battle-result ${won ? 'victory' : 'defeat'}">
            <div class="result-icon">${won ? '🏆' : '💀'}</div>
            <h2>${won ? 'Victory!' : 'Defeat!'}</h2>
            <p class="result-message">${won ? `${player.name} wins the battle!` : `${opponent.name} wins the battle!`}</p>
            <div class="battle-log">${battleData.battleLog.map(l => `<p>${l}</p>`).join("")}</div>
            <button class="btn-primary play-again-btn" onclick="playAgain()">Play Again</button>
          </div>
        </main>
      </div>`;
  }

  let turnStatus = "";
  if (battleData.status === "active") {
    if (hasActed) {
      turnStatus = `<div class="turn-status waiting">Waiting for opponent...</div>`;
    } else if (allActed) {
      turnStatus = `<div class="turn-status processing">Processing turn...</div>`;
    } else {
      turnStatus = `<div class="turn-status">Turn ${battleData.turn} - Your turn!</div>`;
    }
  }

  return `
    <div class="app">
      <header class="app-header"><h1>Pokemon Battle Rooms</h1></header>
      <main class="app-main">
        <div class="battle-screen">
          ${turnStatus}
          <div class="battle-field">
            <div class="opponent-side ${animClass}">
              <div class="pokemon-info">
                <h3>${activeO.name}</h3>
                <div class="types">${activeO.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join("")}</div>
                ${statusBadges(activeO)}
                ${hpBar(activeO)}
              </div>
              <img src="${activeO.spriteUrl}" alt="${activeO.name}" class="pokemon-sprite opponent-sprite ${hitClass}">
            </div>
            <div class="player-side ${animClass}">
              <img src="${activeP.spriteUrl}" alt="${activeP.name}" class="pokemon-sprite player-sprite ${atkClass}">
              <div class="pokemon-info">
                <h3>${activeP.name}</h3>
                <div class="types">${activeP.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join("")}</div>
                ${statusBadges(activeP)}
                ${hpBar(activeP)}
              </div>
            </div>
          </div>
          <div class="battle-controls">
            <div class="moves-grid">
              ${pMoves.map((m, i) => `
                <button class="btn-move type-${m.type}" onclick="doMove(${i})" ${!canAct || battleLoading ? "disabled" : ""}>
                  <span class="move-name">${m.name}</span>
                  <span class="move-details">PWR: ${m.power} | ACC: ${m.accuracy}%</span>
                </button>
              `).join("")}
            </div>
            <div class="switch-section">
              <details ${switchOpen ? "open" : ""} ontoggle="switchOpen = this.open">
                <summary>Switch Pokemon</summary>
                <div class="switch-options">
                  ${player.team.map((p, i) => `
                    <button class="switch-btn ${i === player.activePokemonIndex ? "active" : ""} ${p.currentHp <= 0 ? "fainted" : ""}"
                      onclick="doSwitch(${i})" ${i === player.activePokemonIndex || p.currentHp <= 0 || battleLoading || !canAct ? "disabled" : ""}>
                      <img src="${p.spriteUrl}" alt="${p.name}">
                      <span>${p.name}</span>
                      <span>${p.currentHp}/${p.maxHp}</span>
                    </button>
                  `).join("")}
                </div>
              </details>
            </div>
          </div>
          <div class="battle-log-container">
            <h3>Battle Log</h3>
            <div class="battle-log" id="battleLog">${battleData.battleLog.slice(-20).map(l => `<p>${l}</p>`).join("")}</div>
          </div>
        </div>
      </main>
    </div>`;
}

setTimeout(() => {
  const log = document.getElementById("battleLog");
  if (log) {
    log.scrollTop = log.scrollHeight;
  }
}, 100);

window.doMove = async (moveIndex) => {
  if (battleLoading || battleData.status === "finished") return;
  if (localHasActed) return;
  const serverHasActed = battleData.pendingActions && battleData.pendingActions[state.playerId];
  if (serverHasActed) return;
  
  battleLoading = true;
  animating = true;
  localHasActed = true;
  render();
  
  try {
    const res = await fetch(`/api/battles/${state.roomCode}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: state.playerId, action: { type: "move", moveIndex } }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      localHasActed = false;
    } else {
      battleData = data;
    }
  } catch (e) {
    console.error("doMove error:", e);
    localHasActed = false;
  }
  
  setTimeout(() => { animating = false; battleLoading = false; render(); }, 800);
};

window.doSwitch = async (switchToIndex) => {
  if (battleLoading || battleData.status === "finished") return;
  if (localHasActed) return;
  const serverHasActed = battleData.pendingActions && battleData.pendingActions[state.playerId];
  if (serverHasActed) return;
  
  battleLoading = true;
  animating = true;
  switchOpen = false;
  localHasActed = true;
  render();
  
  try {
    const res = await fetch(`/api/battles/${state.roomCode}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: state.playerId, action: { type: "switch", switchToIndex } }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      localHasActed = false;
    } else {
      battleData = data;
    }
  } catch (e) {
    console.error("doSwitch error:", e);
    localHasActed = false;
  }
  
  setTimeout(() => { animating = false; battleLoading = false; render(); }, 800);
};

window.playAgain = () => {
  battleData = null;
  selectedTeam = [];
  lobbyStep = "select";
  lobbyData = null;
  localHasActed = false;
  lastTurnNumber = 0;
  navigate("home");
};

async function loadPokemon() {
  if (!cache.pokemon) {
    cache.pokemon = await apiCall("/api/pokemon");
  }
}

async function loadMoves() {
  if (!cache.moves) {
    cache.moves = await apiCall("/api/moves");
  }
}

async function loadTypeRelations() {
  if (!cache.typeRelations) {
    cache.typeRelations = await apiCall("/api/type-relations");
  }
}

async function pollRoom() {
  if (state.page !== "lobby" || !state.roomCode) return;
  
  try {
    const res = await fetch(`/api/rooms/${state.roomCode}`);
    const newData = await res.json();
    if (!newData || newData.error) return;

    lobbyData = newData;

    if (lobbyData.status === "battle") {
      const battleRes = await fetch(`/api/battles/${state.roomCode}`);
      const battleData2 = await battleRes.json();
      if (battleData2 && !battleData2.error) {
        battleData = battleData2;
      }
      state.page = "battle";
      window.history.pushState({}, "", `/battle/${state.roomCode}`);
      render();
      return;
    }

    renderLobby();
  } catch (e) {
    console.error("pollRoom error:", e);
  }
}

async function pollBattle() {
  if (state.page !== "battle" || !state.roomCode) return;
  
  try {
    const res = await fetch(`/api/battles/${state.roomCode}`);
    const data = await res.json();
    if (data && !data.error && data.players) {
      if (data.turn !== battleData?.turn) {
        localHasActed = false;
        lastTurnNumber = data.turn;
      }
      battleData = data;
      render();
    }
  } catch (e) {
    console.error("pollBattle error:", e);
  }
}

async function init() {
  await initClerk();
  
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) { state.page = "home"; }
  else if (parts[0] === "create") { state.page = "create"; state.isCreator = true; }
  else if (parts[0] === "join") { state.page = "join"; state.roomCode = parts[1]; state.isCreator = false; }
  else if (parts[0] === "lobby") { state.page = "lobby"; state.roomCode = parts[1]; }
  else if (parts[0] === "battle") { state.page = "battle"; state.roomCode = parts[1]; }
  state.playerId = state.isCreator ? "player1" : "player2";

  await loadPokemon();
  await loadMoves();
  await loadTypeRelations();

  if (state.page === "lobby") {
    lobbyData = await apiCall(`/api/rooms/${state.roomCode}`);
  }
  if (state.page === "battle") {
    try {
      const res = await fetch(`/api/battles/${state.roomCode}`);
      const data = await res.json();
      if (data && !data.error) battleData = data;
    } catch (e) {
      console.error("init battle error:", e);
    }
  }

  render();

  setInterval(pollRoom, 2000);
  setInterval(pollBattle, 1500);
}

init();
