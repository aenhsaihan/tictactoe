const GameModel = require("./GameModel");
const GameView = require("./GameView");

class GameController {
  #newGameListener;

  constructor(options = {}) {
    const {
      model,
      view,
      boardSize,
      modelFactory,
      viewFactory,
      viewOptions,
    } = options;

    this.model = this.#createModel({ model, modelFactory, boardSize });
    this.view = this.#createView({ view, viewFactory, viewOptions });

    this.isInitialized = false;
    this.#newGameListener = null;

    this.handleCellClick = this.handleCellClick.bind(this);
    this.handleNewGame = this.handleNewGame.bind(this);
  }

  initGame() {
    if (!this.model || !this.view) {
      throw new Error("GameController requires both a model and a view");
    }

    this.model.resetGame();
    this.updateView();
    this.#callViewMethod("showError", null);
    this.#callViewMethod("showGameResult", null);
    this.#callViewMethod("enableNewGameButton", true);
    this.#bindViewEvents();

    this.isInitialized = true;
  }

  handleCellClick(details = {}) {
    const { row, col } = details;
    const validationError = this.#validateCoordinates(row, col);

    if (validationError) {
      this.#callViewMethod("showError", validationError);
      return { success: false, error: validationError };
    }

    try {
      const moveResult = this.model.makeMove(row, col);
      this.#callViewMethod("showError", null);
      this.updateView(moveResult);

      const isGameFinished = moveResult.status !== "playing";
      if (isGameFinished) {
        this.#callViewMethod("enableNewGameButton", true);
      }

      return { success: true, result: moveResult };
    } catch (error) {
      const message = error?.message || "Unable to process move";
      this.#callViewMethod("showError", message);

      // Ensure the view reflects the game-over state when applicable.
      if (this.model && this.model.gameStatus !== "playing") {
        this.updateView();
      }

      return { success: false, error: message };
    }
  }

  handleNewGame() {
    if (!this.model || !this.view) {
      throw new Error("GameController requires both a model and a view");
    }

    this.model.resetGame();
    this.#callViewMethod("showError", null);
    this.#callViewMethod("showGameResult", null);
    this.updateView();
    this.#callViewMethod("enableNewGameButton", true);

    return { success: true, status: this.model.gameStatus };
  }

  updateView(moveResult = null) {
    if (!this.model || !this.view) return;

    const boardSnapshot =
      typeof this.model.getBoardSnapshot === "function"
        ? this.model.getBoardSnapshot()
        : null;

    if (boardSnapshot) {
      this.#callViewMethod("renderBoard", boardSnapshot);
    }

    this.#callViewMethod("updateCurrentPlayer", this.model.currentPlayer);

    const status = this.model.gameStatus;
    if (status === "playing") {
      this.#callViewMethod("showGameResult", null);
      this.#callViewMethod("enableNewGameButton", true);
      return;
    }

    const resultPayload =
      moveResult && moveResult.status === status
        ? moveResult
        : {
            status,
            winner: this.model.winner,
            placedBy:
              moveResult && Object.prototype.hasOwnProperty.call(moveResult, "placedBy")
                ? moveResult.placedBy
                : null,
          };

    this.#callViewMethod("showGameResult", resultPayload);
    this.#callViewMethod("enableNewGameButton", true);
  }

  #bindViewEvents() {
    if (!this.view) return;

    if (typeof this.view.bindCellClickEvents === "function") {
      this.view.bindCellClickEvents(this.handleCellClick);
    }

    if (!this.view.newGameButton) return;

    const button = this.view.newGameButton;
    if (this.#newGameListener && typeof button.removeEventListener === "function") {
      button.removeEventListener("click", this.#newGameListener);
    }

    this.#newGameListener = (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      this.handleNewGame();
    };

    if (typeof button.addEventListener === "function") {
      button.addEventListener("click", this.#newGameListener);
    }
  }

  #createModel({ model, modelFactory, boardSize }) {
    if (model) return model;
    if (typeof modelFactory === "function") {
      const instance = modelFactory({ boardSize });
      if (!instance) {
        throw new Error("modelFactory must return a model instance");
      }
      return instance;
    }
    return new GameModel(boardSize);
  }

  #createView({ view, viewFactory, viewOptions }) {
    if (view) return view;
    if (typeof viewFactory === "function") {
      const instance = viewFactory({ viewOptions });
      if (!instance) {
        throw new Error("viewFactory must return a view instance");
      }
      return instance;
    }
    if (typeof document === "undefined") {
      throw new Error(
        "Cannot create GameView when no DOM is available. Provide a view instance instead."
      );
    }
    return new GameView(viewOptions);
  }

  #validateCoordinates(row, col) {
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return "Invalid coordinates";
    }

    const size = this.model?.boardSize;
    if (typeof size !== "number" || size < 1) {
      return "Game board is not initialized";
    }

    if (row < 0 || row >= size || col < 0 || col >= size) {
      return "Invalid coordinates";
    }

    return null;
  }

  #callViewMethod(methodName, ...args) {
    if (!this.view) return;
    const method = this.view[methodName];
    if (typeof method === "function") {
      method.apply(this.view, args);
    }
  }
}

module.exports = GameController;
