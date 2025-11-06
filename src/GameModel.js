class GameModel {
  constructor(boardSize = 3) {
    if (!Number.isInteger(boardSize) || boardSize < 1) {
      throw new Error("Board size must be a positive integer");
    }
    this.boardSize = boardSize;
    this.resetGame();
  }

  /**
   * Returns a deep copy of the current board state.
   * Prevents callers from mutating the internal board accidentally.
   */
  getBoardSnapshot() {
    return this.board.map((row) => row.slice());
  }

  makeMove(row, col) {
    const error = this.#validateMove(row, col);
    if (error) {
      throw new Error(error);
    }

    const player = this.currentPlayer;
    this.board[row][col] = player;
    this.moveCount += 1;

    const winner = this.checkWinner();
    if (winner) {
      return {
        status: this.gameStatus,
        winner: this.winner,
        placedBy: player,
      };
    }

    const isDraw = this.checkDraw();
    if (isDraw) {
      return {
        status: this.gameStatus,
        winner: null,
        placedBy: player,
      };
    }

    this.#switchPlayer();
    return {
      status: this.gameStatus,
      winner: null,
      placedBy: player,
    };
  }

  isValidMove(row, col) {
    return this.#validateMove(row, col) === null;
  }

  checkWinner() {
    if (this.gameStatus !== "playing" && this.gameStatus !== "won") {
      return this.winner;
    }

    const lines = [];

    for (let i = 0; i < this.boardSize; i += 1) {
      // Rows
      lines.push(this.board[i]);
      // Columns
      lines.push(this.board.map((row) => row[i]));
    }

    // Primary diagonal
    lines.push(this.board.map((row, index) => row[index]));
    // Secondary diagonal
    lines.push(
      this.board.map((row, index) => row[this.boardSize - 1 - index])
    );

    for (const line of lines) {
      const [firstCell, ...rest] = line;
      if (firstCell && rest.every((cell) => cell === firstCell)) {
        this.gameStatus = "won";
        this.winner = firstCell;
        this.currentPlayer = null;
        return firstCell;
      }
    }

    return null;
  }

  checkDraw() {
    if (this.gameStatus !== "playing") {
      return false;
    }

    if (this.moveCount >= this.boardSize * this.boardSize) {
      this.gameStatus = "draw";
      this.currentPlayer = null;
      return true;
    }

    return false;
  }

  resetGame() {
    this.board = Array.from({ length: this.boardSize }, () =>
      Array(this.boardSize).fill(null)
    );
    this.currentPlayer = "X";
    this.gameStatus = "playing";
    this.winner = null;
    this.moveCount = 0;
  }

  #switchPlayer() {
    this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
  }

  #validateMove(row, col) {
    if (this.gameStatus !== "playing") {
      return "Game has already finished";
    }

    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return "Invalid coordinates";
    }

    if (
      row < 0 ||
      row >= this.boardSize ||
      col < 0 ||
      col >= this.boardSize
    ) {
      return "Invalid coordinates";
    }

    if (this.board[row][col] !== null) {
      return "Cell is already occupied";
    }

    return null;
  }
}

module.exports = GameModel;
