(() => {
  const formatTime = (seconds) => {
    const total = Math.max(0, seconds | 0);
    const mins = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const secs = (total % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const initializeFooterYear = () => {
    const footerYear = document.getElementById("copyright-year");
    if (!footerYear) return;
    footerYear.textContent = String(new Date().getFullYear());
  };

  const initializeGame = () => {
    const GameModel = window.GameModel;
    const GameView = window.GameView;
    const GameController = window.GameController;

    if (!GameModel || !GameView || !GameController) {
      throw new Error("Game components are not available in the window scope");
    }

    const boardElement = document.querySelector("[data-role='board']");
    const currentPlayerElement = document.querySelector("[data-role='current-player']");
    const resultElement = document.querySelector("[data-role='game-result']");
    const errorElement = document.querySelector("[data-role='game-error']");
    const newGameButton = document.querySelector("[data-action='new-game']");
    const resetButton = document.querySelector("[data-action='reset-board']");
    const scoreElement = document.getElementById("score");
    const timerElement = document.getElementById("timer");

    if (!boardElement) {
      throw new Error("Unable to locate the game board in the DOM");
    }

    if (newGameButton) {
      newGameButton.setAttribute("aria-controls", boardElement.id || "game-board");
    }
    if (resetButton) {
      resetButton.setAttribute("aria-controls", boardElement.id || "game-board");
    }

    const model = new GameModel();
    const view = new GameView({
      boardElement,
      currentPlayerElement,
      resultElement,
      errorElement,
      newGameButton,
    });
    const controller = new GameController({ model, view });

    let secondsElapsed = 0;
    let timerId = null;
    let roundActive = false;

    const scoreState = {
      X: 0,
      O: 0,
      draws: 0,
    };

    const updateScoreDisplay = () => {
      if (!scoreElement) return;
      scoreElement.textContent = `X: ${scoreState.X} | O: ${scoreState.O} | Draws: ${scoreState.draws}`;
    };

    const updateTimerDisplay = () => {
      if (!timerElement) return;
      timerElement.textContent = formatTime(secondsElapsed);
    };

    const stopTimer = () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    const startTimer = () => {
      if (timerId !== null) return;
      timerId = window.setInterval(() => {
        secondsElapsed += 1;
        updateTimerDisplay();
      }, 1000);
    };

    const resetTimer = () => {
      stopTimer();
      secondsElapsed = 0;
      updateTimerDisplay();
    };

    const baseHandleCellClick = controller.handleCellClick;
    controller.handleCellClick = (details = {}) => {
      const response = baseHandleCellClick(details);

      if (response && response.success) {
        if (!roundActive) {
          roundActive = true;
          startTimer();
        }

        const result = response.result;
        if (result && result.status && result.status !== "playing") {
          roundActive = false;
          stopTimer();

          if (result.status === "won" && result.winner && scoreState[result.winner] !== undefined) {
            scoreState[result.winner] += 1;
            updateScoreDisplay();
          } else if (result.status === "draw") {
            scoreState.draws += 1;
            updateScoreDisplay();
          }
        }
      }

      return response;
    };

    const baseHandleNewGame = controller.handleNewGame;
    controller.handleNewGame = (...args) => {
      const response = baseHandleNewGame(...args);
      roundActive = false;
      resetTimer();
      return response;
    };

    if (resetButton) {
      resetButton.addEventListener("click", (event) => {
        event.preventDefault();
        scoreState.X = 0;
        scoreState.O = 0;
        scoreState.draws = 0;
        updateScoreDisplay();
        controller.handleNewGame();
      });
    }

    controller.initGame();
    updateScoreDisplay();
    resetTimer();
  };

  window.addEventListener("DOMContentLoaded", () => {
    initializeFooterYear();
    initializeGame();
  });
})();
