const GameModel = require("../src/GameModel");

describe("GameModel", () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  test("initializes a 3x3 board and default state", () => {
    expect(model.board).toHaveLength(3);
    model.board.forEach((row) => {
      expect(row).toHaveLength(3);
      row.forEach((cell) => expect(cell).toBeNull());
    });
    expect(model.currentPlayer).toBe("X");
    expect(model.gameStatus).toBe("playing");
    expect(model.winner).toBeNull();
    expect(model.moveCount).toBe(0);
  });

  test("makeMove places mark, advances move count, and switches players", () => {
    const result = model.makeMove(0, 0);
    expect(model.board[0][0]).toBe("X");
    expect(model.moveCount).toBe(1);
    expect(model.currentPlayer).toBe("O");
    expect(model.gameStatus).toBe("playing");
    expect(result).toEqual({
      placedBy: "X",
      status: "playing",
      winner: null,
    });
  });

  test("isValidMove validates coordinates and game state", () => {
    expect(model.isValidMove(0, 0)).toBe(true);
    model.makeMove(0, 0);
    expect(model.isValidMove(0, 0)).toBe(false);
    expect(model.isValidMove(3, 3)).toBe(false);
    expect(model.isValidMove(-1, 0)).toBe(false);
    expect(model.isValidMove(1.2, 2)).toBe(false);
  });

  test("rejects moves with non-integer coordinates", () => {
    expect(() => model.makeMove(0.5, 1)).toThrow("Invalid coordinates");
    expect(() => model.makeMove(1, "1")).toThrow("Invalid coordinates");
  });

  test("rejects moves outside the board", () => {
    expect(() => model.makeMove(-1, 0)).toThrow("Invalid coordinates");
    expect(() => model.makeMove(3, 0)).toThrow("Invalid coordinates");
    expect(() => model.makeMove(0, 4)).toThrow("Invalid coordinates");
  });

  test("rejects moves on occupied cells", () => {
    model.makeMove(0, 0);
    expect(() => model.makeMove(0, 0)).toThrow("Cell is already occupied");
  });

  test("detects horizontal win and stops further play", () => {
    model.makeMove(0, 0); // X
    model.makeMove(1, 0); // O
    model.makeMove(0, 1); // X
    model.makeMove(1, 1); // O
    const result = model.makeMove(0, 2); // X wins

    expect(result).toEqual({
      placedBy: "X",
      status: "won",
      winner: "X",
    });
    expect(model.gameStatus).toBe("won");
    expect(model.winner).toBe("X");
    expect(model.currentPlayer).toBeNull();
    expect(() => model.makeMove(2, 2)).toThrow("Game has already finished");
  });

  test("detects vertical win", () => {
    model.makeMove(0, 0); // X
    model.makeMove(0, 1); // O
    model.makeMove(1, 0); // X
    model.makeMove(0, 2); // O
    const result = model.makeMove(2, 0); // X wins

    expect(result.status).toBe("won");
    expect(model.winner).toBe("X");
  });

  test("detects diagonal win", () => {
    model.makeMove(0, 0); // X
    model.makeMove(0, 1); // O
    model.makeMove(1, 1); // X
    model.makeMove(0, 2); // O
    const result = model.makeMove(2, 2); // X wins

    expect(result.status).toBe("won");
    expect(model.winner).toBe("X");
    expect(model.currentPlayer).toBeNull();
  });

  test("detects draw and prevents additional moves", () => {
    model.makeMove(0, 0); // X
    model.makeMove(0, 1); // O
    model.makeMove(0, 2); // X
    model.makeMove(1, 1); // O
    model.makeMove(1, 0); // X
    model.makeMove(1, 2); // O
    model.makeMove(2, 1); // X
    model.makeMove(2, 0); // O
    const result = model.makeMove(2, 2); // X fills the last cell

    expect(result).toEqual({
      placedBy: "X",
      status: "draw",
      winner: null,
    });
    expect(model.gameStatus).toBe("draw");
    expect(model.winner).toBeNull();
    expect(model.currentPlayer).toBeNull();
    expect(model.isValidMove(0, 0)).toBe(false);
    expect(() => model.makeMove(0, 0)).toThrow("Game has already finished");
  });

  test("resetGame clears board and restores defaults", () => {
    model.makeMove(0, 0);
    model.makeMove(0, 1);
    model.resetGame();

    model.board.forEach((row) => row.forEach((cell) => expect(cell).toBeNull()));
    expect(model.currentPlayer).toBe("X");
    expect(model.gameStatus).toBe("playing");
    expect(model.winner).toBeNull();
    expect(model.moveCount).toBe(0);
  });

  test("getBoardSnapshot returns a defensive copy", () => {
    model.makeMove(0, 0);
    const snapshot = model.getBoardSnapshot();

    snapshot[0][0] = "O";
    expect(model.board[0][0]).toBe("X");
  });

  test("constructor rejects invalid board sizes", () => {
    expect(() => new GameModel(0)).toThrow("Board size must be a positive integer");
    expect(() => new GameModel(-3)).toThrow("Board size must be a positive integer");
    expect(() => new GameModel(2.5)).toThrow("Board size must be a positive integer");
  });
});
