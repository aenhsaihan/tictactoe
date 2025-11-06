class GameView {
  constructor(options = {}) {
    if (typeof document === "undefined" || !document) {
      throw new Error("GameView requires a DOM environment");
    }

    const {
      boardElement,
      boardSelector = "[data-role='board'], .board",
      currentPlayerElement,
      currentPlayerSelector = "[data-role='current-player']",
      resultElement,
      resultSelector = "[data-role='game-result']",
      errorElement,
      errorSelector = "[data-role='game-error']",
      newGameButton,
      newGameSelector = "[data-action='new-game'], #new-game",
      hoverClass = "cell--hover",
      filledClass = "cell--filled",
      playerClasses = {
        X: "cell--player-x",
        O: "cell--player-o",
      },
      messageVisibleClass = "is-visible",
    } = options;

    this.boardElement = boardElement || GameView.#queryFirst(boardSelector);
    if (!this.boardElement) {
      throw new Error("GameView requires a board element in the DOM");
    }

    this.currentPlayerElement =
      currentPlayerElement || GameView.#queryFirst(currentPlayerSelector);
    this.resultElement = resultElement || GameView.#queryFirst(resultSelector);
    this.errorElement = errorElement || GameView.#queryFirst(errorSelector);
    this.newGameButton =
      newGameButton || GameView.#queryFirst(newGameSelector);

    this.hoverClass = hoverClass;
    this.filledClass = filledClass;
    this.playerClasses = playerClasses;
    this.messageVisibleClass = messageVisibleClass;

    this.#cellClickCallback = null;
    this.#boundClickHandler = null;

    this.#handleMouseEnter = this.#handleMouseEnter.bind(this);
    this.#handleMouseLeave = this.#handleMouseLeave.bind(this);

    this.boardElement.addEventListener("mouseover", this.#handleMouseEnter);
    this.boardElement.addEventListener("mouseout", this.#handleMouseLeave);
  }

  renderBoard(boardState) {
    if (!Array.isArray(boardState)) {
      throw new TypeError("renderBoard expects a two-dimensional array");
    }

    const size = boardState.length;
    const expectedCells = size * size;

    if (!this.boardElement.hasAttribute("role")) {
      this.boardElement.setAttribute("role", "grid");
    }
    this.boardElement.style.setProperty(
      "grid-template-columns",
      `repeat(${size}, minmax(0, 1fr))`
    );
    this.boardElement.setAttribute("data-size", String(size));

    if (this.boardElement.children.length !== expectedCells) {
      this.boardElement.innerHTML = "";
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          this.boardElement.appendChild(this.#createCell(row, col));
        }
      }
    }

    const cells = Array.from(this.boardElement.children);
    for (let row = 0; row < size; row += 1) {
      const rowData = boardState[row];
      if (!Array.isArray(rowData) || rowData.length !== size) {
        throw new TypeError("renderBoard expects a square board");
      }

      for (let col = 0; col < size; col += 1) {
        const value = rowData[col];
        const cellIndex = row * size + col;
        const cell = cells[cellIndex];
        if (!cell) continue;

        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.dataset.value = value ?? "";
        cell.textContent = value ?? "";
        cell.setAttribute(
          "aria-label",
          value
            ? `Cell ${row + 1}, ${col + 1}, ${value}`
            : `Cell ${row + 1}, ${col + 1}, empty`
        );

        cell.classList.remove(this.hoverClass);
        cell.classList.toggle(this.filledClass, Boolean(value));

        for (const className of Object.values(this.playerClasses)) {
          cell.classList.remove(className);
        }

        if (value && this.playerClasses[value]) {
          cell.classList.add(this.playerClasses[value]);
        }
      }
    }
  }

  updateCurrentPlayer(player) {
    if (!this.currentPlayerElement) return;

    this.currentPlayerElement.textContent =
      player === null || player === undefined
        ? "—"
        : `Player ${String(player).toUpperCase()}`;
  }

  showGameResult(result) {
    if (!this.resultElement) return;

    if (!result) {
      this.resultElement.textContent = "";
      this.resultElement.classList.remove(this.messageVisibleClass);
      this.resultElement.setAttribute("aria-hidden", "true");
      return;
    }

    let message = "";
    const { winner, status } = result;

    if (winner) {
      message = `Player ${winner} wins!`;
    } else if (status === "draw" || winner === null) {
      message = "It's a draw!";
    } else if (status === "won") {
      message = "We have a winner!";
    } else if (status) {
      message = status;
    }

    if (!message) {
      this.resultElement.textContent = "";
      this.resultElement.classList.remove(this.messageVisibleClass);
      this.resultElement.setAttribute("aria-hidden", "true");
      return;
    }

    this.resultElement.textContent = message;
    this.resultElement.classList.add(this.messageVisibleClass);
    this.resultElement.setAttribute("aria-live", "polite");
    this.resultElement.setAttribute("aria-hidden", "false");

    // Clear any lingering errors since the game has concluded.
    this.showError(null);
  }

  showError(message) {
    if (!this.errorElement) return;

    if (!message) {
      this.errorElement.textContent = "";
      this.errorElement.classList.remove(this.messageVisibleClass);
      this.errorElement.setAttribute("aria-hidden", "true");
      return;
    }

    this.errorElement.textContent = message;
    this.errorElement.classList.add(this.messageVisibleClass);
    this.errorElement.setAttribute("aria-live", "assertive");
    this.errorElement.setAttribute("aria-hidden", "false");
  }

  enableNewGameButton(isEnabled = true) {
    if (!this.newGameButton) return;
    this.newGameButton.disabled = !isEnabled;
    this.newGameButton.setAttribute(
      "aria-disabled",
      (!isEnabled).toString()
    );
  }

  bindCellClickEvents(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("bindCellClickEvents expects a callback function");
    }

    this.#cellClickCallback = callback;
    if (!this.#boundClickHandler) {
      this.#boundClickHandler = (event) => {
        const cell = this.#findCell(event.target);
        if (!cell) return;

        const row = Number.parseInt(cell.dataset.row, 10);
        const col = Number.parseInt(cell.dataset.col, 10);
        if (Number.isNaN(row) || Number.isNaN(col)) return;

        if (typeof this.#cellClickCallback === "function") {
          this.#cellClickCallback({
            row,
            col,
            cellElement: cell,
            event,
          });
        }
      };

      this.boardElement.addEventListener("click", this.#boundClickHandler);
    }
  }

  #createCell(row, col) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.classList.add("cell");
    cell.dataset.row = String(row);
    cell.dataset.col = String(col);
    cell.dataset.value = "";
    cell.textContent = "";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Cell ${row + 1}, ${col + 1}, empty`);
    cell.setAttribute("tabindex", "0");
    return cell;
  }

  #findCell(node) {
    if (!node || typeof node !== "object") {
      return null;
    }

    if (
      node.classList &&
      typeof node.classList.contains === "function" &&
      node.classList.contains("cell")
    ) {
      return node;
    }

    if (typeof node.closest === "function") {
      const closest = node.closest(".cell");
      if (closest) {
        return closest;
      }
    }

    return null;
  }

  #handleMouseEnter(event) {
    const cell = this.#findCell(event.target);
    if (!cell) return;
    if (cell.dataset.value) return;
    cell.classList.add(this.hoverClass);
  }

  #handleMouseLeave(event) {
    const cell = this.#findCell(event.target);
    if (!cell) return;
    cell.classList.remove(this.hoverClass);
  }

  static #queryFirst(selector) {
    if (!selector || typeof selector !== "string") {
      return null;
    }

    const selectors = selector.split(",").map((item) => item.trim());
    for (const singleSelector of selectors) {
      if (!singleSelector) continue;
      const match = document.querySelector(singleSelector);
      if (match) return match;
    }
    return null;
  }
}

module.exports = GameView;
