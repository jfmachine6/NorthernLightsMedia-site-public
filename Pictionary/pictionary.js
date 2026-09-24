const promptText = document.querySelector("#prompt-text");
const promptCount = document.querySelector("#prompt-count");
const timerDisplay = document.querySelector("#timer-display");
const timerLength = document.querySelector("#timer-length");
const timerLengthValue = document.querySelector("#timer-length-value");
const playButton = document.querySelector("#play-button");
const resetButton = document.querySelector("#reset-button");
const gameStatus = document.querySelector("#game-status");

let prompts = [];
let unusedPrompts = [];
let selectedPrompt = "";
let timerId = null;
let elapsedSeconds = 0;
let roundSeconds = Number(timerLength.value) * 60;
let isRunning = false;
let hasStarted = false;

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      fields.push(field.trim());
      field = "";
    } else {
      field += character;
    }
  }

  fields.push(field.trim());
  return fields;
}

function parsePrompts(csvText) {
  const rows = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(parseCsvLine);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((value) => value.toLowerCase());
  const promptColumn = header.findIndex((value) => ["prompt", "prompts", "word", "words"].includes(value));
  const startRow = promptColumn >= 0 ? 1 : 0;
  const column = promptColumn >= 0 ? promptColumn : 0;

  return rows.slice(startRow).map((row) => row[column]).filter(Boolean);
}

function updatePromptCount() {
  promptCount.textContent = `${unusedPrompts.length} prompt${unusedPrompts.length === 1 ? "" : "s"} left`;
}

function formatTime(totalSeconds, overtime = false) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${overtime ? "+" : ""}${minutes}:${seconds}`;
}

function updateTimer() {
  const overtimeSeconds = Math.max(0, elapsedSeconds - roundSeconds);
  const isOvertime = overtimeSeconds > 0;
  const remainingSeconds = Math.max(0, roundSeconds - elapsedSeconds);
  timerDisplay.textContent = formatTime(isOvertime ? overtimeSeconds : remainingSeconds, isOvertime);
  timerDisplay.classList.toggle("is-overtime", isOvertime);
  timerDisplay.dateTime = `PT${isOvertime ? overtimeSeconds : remainingSeconds}S`;
  gameStatus.textContent = isOvertime ? "Time is up. Keep going or reset for a new round." : "";
}

function tick() {
  elapsedSeconds += 1;
  updateTimer();
}

function choosePrompt() {
  if (unusedPrompts.length === 0) {
    gameStatus.textContent = "All prompts have been used. Reset prompts to play again.";
    playButton.disabled = true;
    return false;
  }

  const promptIndex = Math.floor(Math.random() * unusedPrompts.length);
  selectedPrompt = unusedPrompts.splice(promptIndex, 1)[0];
  promptText.textContent = selectedPrompt;
  updatePromptCount();
  return true;
}

function startTimer() {
  if (!hasStarted && !choosePrompt()) {
    return;
  }

  hasStarted = true;
  isRunning = true;
  timerId = window.setInterval(tick, 1000);
  playButton.textContent = "Pause";
  timerLength.disabled = true;
  gameStatus.textContent = "";
}

function pauseTimer() {
  window.clearInterval(timerId);
  timerId = null;
  isRunning = false;
  playButton.textContent = "Resume";
  gameStatus.textContent = "Timer paused.";
}

function resetGame() {
  window.clearInterval(timerId);
  timerId = null;
  unusedPrompts = [...prompts];
  selectedPrompt = "";
  elapsedSeconds = 0;
  roundSeconds = Number(timerLength.value) * 60;
  isRunning = false;
  hasStarted = false;
  promptText.textContent = "Press play to begin.";
  playButton.disabled = prompts.length === 0;
  playButton.textContent = prompts.length === 0 ? "No prompts loaded" : "Play";
  timerLength.disabled = false;
  gameStatus.textContent = "Prompts reset.";
  timerDisplay.classList.remove("is-overtime");
  updatePromptCount();
  updateTimer();
}

timerLength.addEventListener("input", () => {
  timerLengthValue.textContent = timerLength.value;
  if (!hasStarted) {
    roundSeconds = Number(timerLength.value) * 60;
    updateTimer();
  }
});

playButton.addEventListener("click", () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetButton.addEventListener("click", resetGame);

async function loadPrompts() {
  try {
    const response = await fetch("prompts.csv");
    if (!response.ok) {
      throw new Error(`Prompt file returned ${response.status}`);
    }

    prompts = parsePrompts(await response.text());
    if (prompts.length === 0) {
      throw new Error("No prompts found");
    }
    resetGame();
    gameStatus.textContent = "";
  } catch (error) {
    promptCount.textContent = "No prompts loaded";
    playButton.textContent = "No prompts loaded";
    gameStatus.textContent = "Add prompts to Pictionary/prompts.csv, then reload this page.";
    console.error(error);
  }
}

updateTimer();
loadPrompts();