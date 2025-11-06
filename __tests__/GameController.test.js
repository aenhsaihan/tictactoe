const GameModel = require("../src/GameModel");
const GameController = require("../src/GameController");

const createMockView = () => {
  const button = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  return {
    renderBoard: jest.fn(),
    updateCurrentPlayer: jest.fn(),
    showGameResult: jest.fn(),
    showError: jest.fn(),
    enableNewGameButton: jest.fn(),
    bindCellClickEvents: jest.fn(),
    newGameButton: button,
  };
};

describe("GameController", () => {
  let model;
  let view;
  let controller;

  beforeEach(() => {
    model = new GameModel();
    view = createMockView();
    controller = new GameController({ model, view });
  });

  test("initGame prepares board and binds events", () => {
    controller.initGame();

    expect(view.renderBoard).toHaveBeenCalled();
    const boardRendered = view.renderBoard.mock.calls[0][0];
    expect(boardRendered).toEqual(model.getBoardSnapshot());

    expect(view.updateCurrentPlayer).toHaveBeenCalledWith("X");
    expect(view.showError).toHaveBeenCalledWith(null);
    expect(view.showGameResult).toHaveBeenCalledWith(null);
    expect(view.bindCellClickEvents).toHaveBeenCalledWith(
      controller.handleCellClick
    );
    expect(view.newGameButton.addEventListener).toHaveBeenCalledTimes(1);
  });

  test("handleCellClick processes a valid move and updates the view", () => {
    controller.initGame();
    const response = controller.handleCellClick({ row: 0, col: 0 });

    expect(response.success).toBe(true);
    expect(model.board[0][0]).toBe("X");
    expect(view.showError).toHaveBeenLastCalledWith(null);
    expect(view.renderBoard).toHaveBeenCalledTimes(2); // init + move
    expect(view.updateCurrentPlayer).toHaveBeenLastCalledWith("O");
  });

  test("handleCellClick validates coordinates before making a move", () => {
    controller.initGame();
    const response = controller.handleCellClick({ row: -1, col: 2 });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Invalid coordinates");
    expect(view.showError).toHaveBeenCalledWith("Invalid coordinates");
    expect(model.board.flat().every((cell) => cell === null)).toBe(true);
  });

  test("handleCellClick reports errors from the model", () => {
    controller.initGame();
    controller.handleCellClick({ row: 0, col: 0 });
    const response = controller.handleCellClick({ row: 0, col: 0 });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Cell is already occupied");
    expect(view.showError).toHaveBeenCalledWith("Cell is already occupied");
  });

  test("handleNewGame resets the game and clears messages", () => {
    controller.initGame();

    controller.handleCellClick({ row: 0, col: 0 });
    controller.handleCellClick({ row: 1, col: 1 });
    view.showError.mockClear();
    view.showGameResult.mockClear();
    view.renderBoard.mockClear();
    view.updateCurrentPlayer.mockClear();

    const response = controller.handleNewGame();

    expect(response.success).toBe(true);
    expect(model.board.flat().every((cell) => cell === null)).toBe(true);
    expect(model.currentPlayer).toBe("X");
    expect(view.showError).toHaveBeenCalledWith(null);
    expect(view.showGameResult).toHaveBeenCalledWith(null);
    expect(view.renderBoard).toHaveBeenCalledTimes(1);
    expect(view.updateCurrentPlayer).toHaveBeenCalledWith("X");
  });
});
