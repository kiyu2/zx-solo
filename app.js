const state = {
  cards: [],
  deck: [],
  revealed: [],
  hand: [],
  field: Array(9).fill(null),
  resource: [],
  discard: [],
  nextId: 1,
  draggedId: null
};

const els = {
  fileInput: document.querySelector("#cardFiles"),
  dropZone: document.querySelector("#dropZone"),
  shuffleDeck: document.querySelector("#shuffleDeck"),
  drawOne: document.querySelector("#drawOne"),
  startGame: document.querySelector("#startGame"),
  returnAll: document.querySelector("#returnAll"),
  resetTable: document.querySelector("#resetTable"),
  deckStack: document.querySelector("#deckStack"),
  revealCount: document.querySelector("#revealCount"),
  revealTop: document.querySelector("#revealTop"),
  returnRevealedBottom: document.querySelector("#returnRevealedBottom"),
  shuffleRevealedBottom: document.querySelector("#shuffleRevealedBottom"),
  largeDeckCount: document.querySelector(".deck-count-large"),
  topCardName: document.querySelector("#topCardName"),
  revealedCards: document.querySelector("#revealedCards"),
  handCards: document.querySelector("#handCards"),
  fieldCards: document.querySelector("#fieldCards"),
  resourceCards: document.querySelector("#resourceCards"),
  discardCards: document.querySelector("#discardCards"),
  cardLibrary: document.querySelector("#cardLibrary"),
  libraryCount: document.querySelector("#libraryCount"),
  cardTemplate: document.querySelector("#cardTemplate"),
  cardSize: document.querySelector("#cardSize"),
  showNames: document.querySelector("#showNames")
};

function makeCard(file) {
  return {
    id: `card-${state.nextId++}`,
    name: file.name.replace(/\.[^.]+$/, ""),
    url: URL.createObjectURL(file)
  };
}

function cloneCard(card) {
  return {
    id: `card-${state.nextId++}`,
    name: card.name,
    url: card.url
  };
}

function addFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith("image/"));
  const newCards = files.map(makeCard);
  state.cards.push(...newCards);
  state.deck.unshift(...newCards);
  els.fileInput.value = "";
  render();
}

function addCopiesToDeck(id, count) {
  const source = state.cards.find((card) => card.id === id);
  if (!source) return;
  const amount = Math.max(0, Math.min(99, count));
  if (amount === 0) return;
  const copies = Array.from({ length: amount }, () => cloneCard(source));
  state.cards.push(...copies);
  state.deck.unshift(...copies);
  render();
}

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

function draw(count) {
  const amount = Math.min(count, state.deck.length);
  for (let i = 0; i < amount; i++) {
    const card = state.deck.shift();
    state.hand.push(card);
  }
  render();
}

function startGame() {
  shuffle(state.deck);
  draw(4);
}

function revealTopCards() {
  const requested = Number.parseInt(els.revealCount.value, 10);
  const count = Number.isFinite(requested) ? Math.max(1, requested) : 1;
  const amount = Math.min(count, state.deck.length);
  for (let i = 0; i < amount; i++) {
    state.revealed.push(state.deck.shift());
  }
  render();
}

function returnRevealedToBottom({ shouldShuffle = false } = {}) {
  if (state.revealed.length === 0) return;
  const cards = [...state.revealed];
  if (shouldShuffle) shuffle(cards);
  state.deck.push(...cards);
  state.revealed = [];
  render();
}

function moveRevealedCard(id, direction) {
  const index = state.revealed.findIndex((card) => card.id === id);
  if (index < 0) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.revealed.length) return;
  [state.revealed[index], state.revealed[nextIndex]] = [state.revealed[nextIndex], state.revealed[index]];
  render();
}

function findCard(id) {
  for (const zone of ["deck", "revealed", "hand", "resource", "discard"]) {
    const index = state[zone].findIndex((card) => card.id === id);
    if (index >= 0) {
      return { zone, index, card: state[zone][index] };
    }
  }
  const fieldIndex = state.field.findIndex((card) => card?.id === id);
  if (fieldIndex >= 0) {
    return { zone: "field", index: fieldIndex, card: state.field[fieldIndex] };
  }
  return null;
}

function removeFoundCard(found) {
  if (found.zone === "field") {
    state.field[found.index] = null;
    return;
  }
  state[found.zone].splice(found.index, 1);
}

function firstEmptyFieldSlot() {
  return state.field.findIndex((card) => card === null);
}

function moveCard(id, targetZone, targetSlot = null) {
  const found = findCard(id);
  if (!found) return;
  if (targetZone === "field") {
    const slot = targetSlot ?? firstEmptyFieldSlot();
    if (slot < 0) return;
    if (found.zone === "field") {
      if (found.index === slot) return;
      [state.field[found.index], state.field[slot]] = [state.field[slot], state.field[found.index]];
      render();
      return;
    }
    if (state.field[slot]) return;
    removeFoundCard(found);
    state.field[slot] = found.card;
  } else if (found.zone !== targetZone) {
    removeFoundCard(found);
    state[targetZone].push(found.card);
  } else {
    return;
  }
  render();
}

function moveCardToNextZone(id) {
  const found = findCard(id);
  if (!found) return;
  const nextZone = found.zone === "hand" ? "field" : found.zone === "field" ? "hand" : "hand";
  moveCard(id, nextZone);
}

function returnAllToDeck() {
  state.deck.push(...state.revealed, ...state.hand, ...state.field.filter(Boolean), ...state.resource, ...state.discard);
  state.revealed = [];
  state.hand = [];
  state.field = Array(9).fill(null);
  state.resource = [];
  state.discard = [];
  render();
}

function resetTable() {
  const urls = new Set(state.cards.map((card) => card.url));
  urls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  state.cards = [];
  state.deck = [];
  state.revealed = [];
  state.hand = [];
  state.field = Array(9).fill(null);
  state.resource = [];
  state.discard = [];
  state.nextId = 1;
  els.fileInput.value = "";
  render();
}

function removeCardEverywhere(id) {
  const card = state.cards.find((item) => item.id === id);
  if (!card) return;

  state.cards = state.cards.filter((item) => item.id !== id);
  for (const zone of ["deck", "revealed", "hand", "resource", "discard"]) {
    state[zone] = state[zone].filter((item) => item.id !== id);
  }
  state.field = state.field.map((item) => item?.id === id ? null : item);
  render();
}

function createCardNode(card, zone) {
  const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
  const image = node.querySelector("img");
  const label = node.querySelector("p");
  const primary = node.querySelector(".primary");
  const discard = node.querySelector(".discard");

  node.dataset.cardId = card.id;
  node.dataset.zone = zone;
  image.src = card.url;
  image.alt = card.name;
  label.textContent = card.name;

  if (zone === "revealed") {
    const orderControls = document.createElement("div");
    orderControls.className = "reveal-order";

    const up = document.createElement("button");
    up.type = "button";
    up.title = "公開カードの順番を上げる";
    up.textContent = "↑";
    up.addEventListener("click", (event) => {
      event.stopPropagation();
      moveRevealedCard(card.id, -1);
    });

    const down = document.createElement("button");
    down.type = "button";
    down.title = "公開カードの順番を下げる";
    down.textContent = "↓";
    down.addEventListener("click", (event) => {
      event.stopPropagation();
      moveRevealedCard(card.id, 1);
    });

    orderControls.append(up, down);
    node.append(orderControls);
  }

  primary.addEventListener("click", (event) => {
    event.stopPropagation();
    moveCardToNextZone(card.id);
  });
  discard.addEventListener("click", (event) => {
    event.stopPropagation();
    moveCard(card.id, "discard");
  });
  node.addEventListener("click", () => moveCardToNextZone(card.id));
  node.addEventListener("dragstart", (event) => {
    state.draggedId = card.id;
    node.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.id);
  });
  node.addEventListener("dragend", () => {
    state.draggedId = null;
    node.classList.remove("dragging");
  });

  return node;
}

function renderZone(zone, container) {
  container.replaceChildren();
  if (state[zone].length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note";
    note.textContent = zone === "hand" ? "手札は空です" : zone === "resource" ? "リソースは空です" : "捨て札は空です";
    container.append(note);
    return;
  }
  state[zone].forEach((card) => container.append(createCardNode(card, zone)));
}

function renderRevealed() {
  els.revealedCards.replaceChildren();
  if (state.revealed.length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note revealed-empty";
    note.textContent = "公開カードなし";
    els.revealedCards.append(note);
    return;
  }
  state.revealed.forEach((card) => els.revealedCards.append(createCardNode(card, "revealed")));
}

function renderField() {
  els.fieldCards.replaceChildren();
  state.field.forEach((card, index) => {
    const slot = document.createElement("div");
    slot.className = "field-slot droppable";
    slot.dataset.zone = "field";
    slot.dataset.slot = String(index);
    slot.setAttribute("aria-label", `場 ${index + 1}`);

    if (card) {
      slot.append(createCardNode(card, "field"));
    } else {
      const empty = document.createElement("span");
      empty.className = "slot-number";
      empty.textContent = String(index + 1);
      slot.append(empty);
    }

    wireDropTarget(slot);
    els.fieldCards.append(slot);
  });
}

function getCardLocation(cardId) {
  const found = findCard(cardId);
  if (!found) return "不明";
  if (found.zone === "deck") return "山札";
  if (found.zone === "hand") return "手札";
  if (found.zone === "resource") return "リソース";
  if (found.zone === "discard") return "捨て札";
  if (found.zone === "revealed") return `公開 ${found.index + 1}`;
  return `場 ${found.index + 1}`;
}

function renderLibrary() {
  els.libraryCount.textContent = state.cards.length;
  els.cardLibrary.replaceChildren();
  if (state.cards.length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note thumbnail-empty";
    note.textContent = "まだカードがありません";
    els.cardLibrary.append(note);
    return;
  }

  state.cards.forEach((card) => {
    const item = document.createElement("article");
    item.className = "thumbnail-card";
    item.title = card.name;

    const image = document.createElement("img");
    image.src = card.url;
    image.alt = card.name;

    const label = document.createElement("p");
    label.textContent = card.name;

    const badge = document.createElement("span");
    badge.textContent = getCardLocation(card.id);

    const copyControls = document.createElement("div");
    copyControls.className = "thumbnail-copy";

    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "99";
    quantity.value = "1";
    quantity.title = "山札へ追加する枚数";
    quantity.addEventListener("click", (event) => event.stopPropagation());

    const add = document.createElement("button");
    add.type = "button";
    add.title = "指定枚数を山札へ追加";
    add.textContent = "+";
    add.addEventListener("click", (event) => {
      event.stopPropagation();
      const count = Number.parseInt(quantity.value, 10);
      addCopiesToDeck(card.id, Number.isFinite(count) ? count : 1);
    });

    copyControls.append(quantity, add);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "thumbnail-remove";
    remove.title = "このカードを削除";
    remove.textContent = "×";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removeCardEverywhere(card.id);
    });

    item.append(image, label, badge, copyControls, remove);
    els.cardLibrary.append(item);
  });
}

function render() {
  els.largeDeckCount.textContent = state.deck.length;
  els.topCardName.textContent = state.deck[0]?.name || "未読み込み";

  renderRevealed();
  renderZone("hand", els.handCards);
  renderField();
  renderZone("resource", els.resourceCards);
  renderZone("discard", els.discardCards);
  renderLibrary();
}

function wireDropTarget(zoneElement) {
  zoneElement.addEventListener("dragover", (event) => {
    event.preventDefault();
    zoneElement.classList.add("drop-target");
  });
  zoneElement.addEventListener("dragleave", () => zoneElement.classList.remove("drop-target"));
  zoneElement.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    zoneElement.classList.remove("drop-target");
    const id = event.dataTransfer.getData("text/plain") || state.draggedId;
    const targetZone = zoneElement.dataset.zone;
    const targetSlot = zoneElement.dataset.slot ? Number(zoneElement.dataset.slot) : null;
    if (id && targetZone) moveCard(id, targetZone, targetSlot);
  });
}

els.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
els.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  els.dropZone.classList.add("dragging");
});
els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("dragging"));
els.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  els.dropZone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});

els.shuffleDeck.addEventListener("click", () => {
  shuffle(state.deck);
  render();
});
els.drawOne.addEventListener("click", () => draw(1));
els.startGame.addEventListener("click", startGame);
els.returnAll.addEventListener("click", returnAllToDeck);
els.resetTable.addEventListener("click", resetTable);
els.deckStack.addEventListener("click", () => draw(1));
els.revealTop.addEventListener("click", revealTopCards);
els.returnRevealedBottom.addEventListener("click", () => returnRevealedToBottom());
els.shuffleRevealedBottom.addEventListener("click", () => returnRevealedToBottom({ shouldShuffle: true }));
els.cardSize.addEventListener("input", (event) => {
  document.documentElement.style.setProperty("--card-size", `${event.target.value}px`);
});
els.showNames.addEventListener("change", (event) => {
  document.body.classList.toggle("hide-names", !event.target.checked);
});

document.querySelectorAll(".droppable").forEach(wireDropTarget);
render();
