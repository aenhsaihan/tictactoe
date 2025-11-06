class GameView {
  #cellClickCallback;
  #boundClickHandler;
  #boundKeyDownHandler;
  #activeCellCoordinates;

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
    this.#boundKeyDownHandler = this.#handleKeyDown.bind(this);
    this.#activeCellCoordinates = { row: 0, col: 0 };

    this.#handleMouseEnter = this.#handleMouseEnter.bind(this);
    this.#handleMouseLeave = this.#handleMouseLeave.bind(this);

    this.boardElement.addEventListener("mouseover", this.#handleMouseEnter);
    this.boardElement.addEventListener("mouseout", this.#handleMouseLeave);
    this.boardElement.addEventListener("keydown", this.#boundKeyDownHandler);
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
      this.#activeCellCoordinates = { row: 0, col: 0 };
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
        cell.setAttribute("tabindex", "-1");

        for (const className of Object.values(this.playerClasses)) {
          cell.classList.remove(className);
        }

        if (value && this.playerClasses[value]) {
          cell.classList.add(this.playerClasses[value]);
        }
      }
    }
    this.#syncTabIndexes();
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

        this.#setActiveCell(row, col);
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
    cell.setAttribute("tabindex", "-1");
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

  #handleKeyDown(event) {
    const cell = this.#findCell(event.target);
    if (!cell) return;

    const size = this.#getBoardSize();
    if (!size) return;

    const row = Number.parseInt(cell.dataset.row, 10);
    const col = Number.parseInt(cell.dataset.col, 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    let nextRow = row;
    let nextCol = col;
    let handled = false;

    switch (event.key) {
      case "ArrowUp":
        if (row > 0) {
          nextRow = row - 1;
          handled = true;
        }
        break;
      case "ArrowDown":
        if (row < size - 1) {
          nextRow = row + 1;
          handled = true;
        }
        break;
      case "ArrowLeft":
        if (col > 0) {
          nextCol = col - 1;
          handled = true;
        }
        break;
      case "ArrowRight":
        if (col < size - 1) {
          nextCol = col + 1;
          handled = true;
        }
        break;
      case "Home":
        nextCol = 0;
        handled = true;
        break;
      case "End":
        nextCol = size - 1;
        handled = true;
        break;
      case "PageUp":
        nextRow = 0;
        handled = true;
        break;
      case "PageDown":
        nextRow = size - 1;
        handled = true;
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        event.preventDefault();
        cell.click();
        return;
      default:
        break;
    }

    if (!handled) return;

    event.preventDefault();
    this.#setActiveCell(nextRow, nextCol, { focus: true });
  }

  #setActiveCell(row, col, options = {}) {
    const size = this.#getBoardSize();
    if (!size) return;

    const clampedRow = Math.max(0, Math.min(size - 1, row));
    const clampedCol = Math.max(0, Math.min(size - 1, col));

    this.#activeCellCoordinates = { row: clampedRow, col: clampedCol };
    const targetCell = this.#findCellByCoordinates(clampedRow, clampedCol);

    this.#syncTabIndexes();

    if (options.focus && targetCell) {
      targetCell.focus();
    }
  }

  #syncTabIndexes() {
    const size = this.#getBoardSize();
    if (!size) return;

    const cells = Array.from(this.boardElement.children);
    if (!cells.length) return;

    for (const cell of cells) {
      cell.setAttribute("tabindex", "-1");
    }

    const { row, col } = this.#activeCellCoordinates || { row: 0, col: 0 };
    const target =
      this.#findCellByCoordinates(row, col) || this.#findCellByCoordinates(0, 0);

    if (target) {
      target.setAttribute("tabindex", "0");
      const targetRow = Number.parseInt(target.dataset.row, 10);
      const targetCol = Number.parseInt(target.dataset.col, 10);
      this.#activeCellCoordinates = {
        row: Number.isNaN(targetRow) ? 0 : targetRow,
        col: Number.isNaN(targetCol) ? 0 : targetCol,
      };
    }
  }

  #getBoardSize() {
    const fromAttribute = Number.parseInt(
      this.boardElement.getAttribute("data-size"),
      10
    );
    if (!Number.isNaN(fromAttribute) && fromAttribute > 0) {
      return fromAttribute;
    }

    const cellCount = this.boardElement.children.length;
    const size = Math.sqrt(cellCount);
    return Number.isInteger(size) ? size : null;
  }

  #findCellByCoordinates(row, col) {
    const size = this.#getBoardSize();
    if (!size) return null;

    const index = row * size + col;
    return this.boardElement.children[index] || null;
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = GameView;
}

if (typeof window !== "undefined") {
  window.GameView = GameView;
}
