(() => {
  const pad = (value) => String(value).padStart(2, "0");

  const updateClock = (secondsElapsed) => {
    const minutes = Math.floor(secondsElapsed / 60);
    const seconds = secondsElapsed % 60;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const initialize = () => {
    const board = document.querySelector(".board");
    const scoreEl = document.getElementById("score");
    const timerEl = document.getElementById("timer");
    const newGameBtn = document.getElementById("new-game");
    const resetBtn = document.getElementById("reset-board");
    const footerYear = document.getElementById("copyright-year");

    if (footerYear) {
      const now = new Date();
      footerYear.textContent = String(now.getFullYear());
    }

    let secondsElapsed = 0;
    let timerId = null;

    const setScore = (value) => {
      if (scoreEl) {
        scoreEl.textContent = String(value);
      }
    };

    const startTimer = () => {
      if (timerId !== null) return;
      timerId = window.setInterval(() => {
        secondsElapsed += 1;
        if (timerEl) {
          timerEl.textContent = updateClock(secondsElapsed);
        }
      }, 1000);
    };

    const resetGame = () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      secondsElapsed = 0;
      if (timerEl) {
        timerEl.textContent = updateClock(0);
      }
      setScore(0);
      board?.querySelectorAll(".cell").forEach((cell) => {
        cell.textContent = "";
        cell.classList.remove("active");
      });
    };

    board?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("cell")) return;

      startTimer();
      target.classList.toggle("active");
      target.textContent = target.classList.contains("active") ? "★" : "";

      const activeCells = board.querySelectorAll(".cell.active").length;
      setScore(activeCells);
    });

    newGameBtn?.addEventListener("click", () => {
      resetGame();
      // Placeholder for any future shuffle/initialization logic.
    });

    resetBtn?.addEventListener("click", resetGame);
    resetGame();
  };

  window.addEventListener("DOMContentLoaded", initialize);
})();
