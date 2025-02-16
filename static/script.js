// Generate a UUID v4 function
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get or create user_id using UUID v4
let user_id = localStorage.getItem('user_id');
if (!user_id) {
    user_id = uuidv4();
    localStorage.setItem('user_id', user_id);
}

// Configuration
const totalQuestions = 10;
const penalty = 10;
let currentQuestion = 0;
let currentStartTime;
let currentQuestionData = null;
let sessionResults = [];
let challengeData = {};
// For sharing, downsample the originalRows×originalCols heatmap to an x × y grid
const originalRows = 12;
const originalCols = 12;
const sampleRows = 12;
const sampleCols = 12;

// DOM Elements
const startScreen = document.getElementById('startScreen');
const questionContainer = document.getElementById('questionContainer');
const resultsContainer = document.getElementById('resultsContainer');
const questionText = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const submitAnswerButton = document.getElementById('submitAnswerButton');
const shareStatsButton = document.getElementById('shareStatsButton')
const feedback = document.getElementById('feedback');
const progress = document.getElementById('progress');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const heatmapDiv = document.getElementById('heatmap');
const yourAverageP = document.getElementById('yourAverage');
const yourCountP = document.getElementById('yourCount');

// Global flag to track if submission is in progress.
let submissionInProgress = false;
let mobileMode = false;

// Event Listeners
window.addEventListener("DOMContentLoaded", () => {
  const answerInput = document.getElementById("answerInput");
  const keypad = document.getElementById("keypad");

  if (isMobile()) {
    // On mobile, disable the native keyboard and show our keypad.
    answerInput.setAttribute("readonly", true);
    // Hide the submit button because here is another one on the keypad.
    console.log("welfiwje");
    submitAnswerButton.classList.add('hidden');
    keypad.style.display = "block";
    mobileMode = true;
  } else {
    // On desktop, enable input and hide our keypad.
    answerInput.removeAttribute("readonly");
    keypad.style.display = "none";
    mobileMode = false;
  }
});

startButton.addEventListener('click', startChallenge);
document.addEventListener('keyup', e => {
    if (e.key === 'Enter' && startScreen.style.display !== 'none') startChallenge();
});

submitAnswerButton.addEventListener('click', submitAnswer);

answerInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') submitAnswer();
});

restartButton.addEventListener('click', () => window.location.reload());

// Add event listener to the share stats button.
shareStatsButton.addEventListener('click', shareStats);

// Functions
function startChallenge() {
    startScreen.style.display = 'none';
    questionContainer.style.display = 'flex';
    document.body.classList.add('no-footer');
    currentQuestion = 0;
    sessionResults = [];
    // Reset the "pills" showing our progress
    const pills = document.querySelectorAll('#progressContainer .pill');
    pills.forEach(pill => {
        pill.classList.remove('correct');
        pill.classList.remove('incorrect');
    });
    nextQuestion();
}

function nextQuestion() {
    if (currentQuestion >= totalQuestions) {
        endChallenge();
        return;
    }
    currentQuestion++;
    const a = Math.floor(Math.random() * originalRows) + 1;
    const b = Math.floor(Math.random() * originalCols) + 1;
    currentQuestionData = { a, b };
    questionText.textContent = `${a} × ${b}`;
    answerInput.value = '';
    answerInput.focus();
    feedback.textContent = '';
    progress.textContent = '';
    currentStartTime = new Date();
}

// Add event listeners to each keypad button
document.querySelectorAll("#keypad .key").forEach(key => {
  key.addEventListener("click", function() {
    const keyValue = this.dataset.key;
    if (keyValue === "back") {
      // Remove the last character
      answerInput.value = answerInput.value.slice(0, -1);
    } else if (keyValue === "submit") {
      submitAnswer()
    } else {
      // Append the number
      answerInput.value += keyValue;
    }
  });
});

function submitAnswer() {
    // Prevent double submissions with our own flag.
    if (submissionInProgress) return;
    submissionInProgress = true;

    // Get the answer value.
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) {
       feedback.textContent = 'Please enter a valid number.';
       submissionInProgress = false;
       return;
    }

    // For desktop users the input might not be readOnly, but if needed, disable the button.
    submitAnswerButton.disabled = true;

    const currentTime = new Date();
    const timeTaken = (currentTime - currentStartTime) / 1000;
    const correctAnswer = currentQuestionData.a * currentQuestionData.b;
    const isCorrect = (userAnswer === correctAnswer);
    const effectiveTime = isCorrect ? timeTaken : timeTaken + penalty;
    const pill = document.querySelector(`#progressContainer .pill[data-index="${currentQuestion}"]`);

    if (isCorrect) {
        feedback.textContent = 'Correct!';
        feedback.classList.add('correct');
        feedback.classList.remove('incorrect');
        if (pill) {
           pill.classList.add('correct');
        }
    } else {
        feedback.textContent = `Incorrect. The correct answer was ${correctAnswer}.`;
        questionText.textContent = `${currentQuestionData.a} * ${currentQuestionData.b} = ${correctAnswer}`
        feedback.classList.add('incorrect');
        feedback.classList.remove('correct');
        if (pill) {
           pill.classList.add('incorrect');
        }
    }
    
    progress.textContent = `Time: ${timeTaken.toFixed(2)} sec${isCorrect ? '' : ' (+penalty)'}`;
    sessionResults.push({
        a: currentQuestionData.a,
        b: currentQuestionData.b,
        user_answer: userAnswer,
        correct: isCorrect,
        time_taken: timeTaken,
        effective_time: effectiveTime
    });
    
    setTimeout(() => {
        nextQuestion();
        // Reset our submission flag and re-enable the submit button.
        submissionInProgress = false;
        // Only remove the readOnly state on desktop; on mobile, keep it so the native keyboard stays hidden.
        if (!mobileMode) {
          submitAnswerButton.disabled = false;
          answerInput.readOnly = false;
        }
        answerInput.focus(); // Focus the answer input for new input
    }, 800);
}

function endChallenge() {
    questionContainer.style.display = 'none';
    fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: sessionResults, user_id: user_id })
    })
    .then(response => response.json())
    .then(data => {
        // Save the data so it can be used in the share button
        challengeData = data;

        // Update our user stats
        document.body.classList.remove('no-footer');
        resultsContainer.style.display = 'block';
        renderHeatmap(data);
        yourAverageP.textContent = 'Response Time: ' + parseFloat(data.user_avg).toFixed(2) + ' s vs. ' + parseFloat(data.world_avg).toFixed(2) + ' s';
        yourCountP.textContent = 'Answers Submitted: ' + parseFloat(data.user_count).toFixed(0) + ' / ' + parseFloat(data.world_count).toFixed(0);
    });
}

// Render a heatmap table using the challengeData from the server.
function renderHeatmap() {
  
  heatmapDiv.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'heatmap';

  // Create header row (columns 1-originalCols)
  const headerRow = document.createElement('tr');
  const emptyHeader = document.createElement('th');
  emptyHeader.textContent = '';
  headerRow.appendChild(emptyHeader);
  for (let col = 1; col <= originalCols; col++) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  // Determine min and max average effective times for coloring.
  let minTime = Infinity, maxTime = -Infinity;
  const heatmapData = challengeData.heatmap;
  for (const key in heatmapData) {
    const avg = heatmapData[key].avg_effective;
    if (avg < minTime) minTime = avg;
    if (avg > maxTime) maxTime = avg;
  }
  if (minTime === Infinity) minTime = 0;
  if (maxTime === -Infinity) maxTime = 1;

  // Helper to calculate cell background color.
  function getColor(avgTime) {
    const ratio = (avgTime - minTime) / (maxTime - minTime + 0.0001);
    const red = Math.round(255 * ratio);
    const green = Math.round(200 * (1 - ratio));
    return `rgb(${red}, ${green}, 0)`;
  }

  // Create table rows (for multiplicand 1 to originalRows).
  for (let row = 1; row <= originalRows; row++) {
    const tr = document.createElement('tr');
    const rowHeader = document.createElement('th');
    rowHeader.textContent = row;
    tr.appendChild(rowHeader);
    for (let col = 1; col <= originalCols; col++) {
      const td = document.createElement('td');
      const key = row + '_' + col;
      if (heatmapData[key]) {
        const avg = heatmapData[key].avg_effective;
        td.style.backgroundColor = getColor(avg);
        td.title = `Avg Effective Time: ${avg.toFixed(2)} sec
Attempts: ${heatmapData[key].count}
Wrong Answers: ${heatmapData[key].wrong_count}`;
        td.textContent = avg.toFixed(1);
      } else {
        td.style.backgroundColor = '#eee';
        td.title = 'No data';
        td.textContent = '-';
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  heatmapDiv.appendChild(table);
}

function renderHeatmapUnicode() {
  const heatmapData = challengeData.heatmap;
  let minTime = Infinity, maxTime = -Infinity;
  
  // Determine min and max average effective times
  for (const key in heatmapData) {
    const avg = heatmapData[key].avg_effective;
    if (avg < minTime) minTime = avg;
    if (avg > maxTime) maxTime = avg;
  }
  if (minTime === Infinity) minTime = 0;
  if (maxTime === -Infinity) maxTime = 1;
  
  // Map an average time to a unicode square.
  function getSymbol(avgTime) {
    const ratio = (avgTime - minTime) / (maxTime - minTime + 0.0001);
    if (ratio < 0.33) {
      return "🟩"; // Best (lowest time)
    } else if (ratio < 0.66) {
      return "🟨"; // Middle range
    } else {
      return "🟥"; // Worst (highest time)
    }
  }
  
  const gridRows = [];
  
  for (let i = 0; i < sampleRows; i++) {
    let rowStr = "";
    // Map the sampled row index to the original row (1-based)
    const origRow = Math.floor(i * originalRows / sampleRows) + 1;
    for (let j = 0; j < sampleCols; j++) {
      const origCol = Math.floor(j * originalCols / sampleCols) + 1;
      const key = `${origRow}_${origCol}`;
      if (heatmapData[key]) {
        const avg = heatmapData[key].avg_effective;
        rowStr += getSymbol(avg);
      } else {
        rowStr += "⬜"; // Placeholder if no data exists
      }
    }
    gridRows.push(rowStr);
  }
  return gridRows;
}

function shareStats() {
    const gridRows = renderHeatmapUnicode()

    // Construct the share text.
    const shareText =
      `${challengeData.user_avg.toFixed(2)} s avg on ${challengeData.user_count} problems\n\n` +
      gridRows.join('\n') +
      `\nhttps://times-tables.me`;

    // Use the Clipboard API.
    navigator.clipboard.writeText(shareText)
      .then(() => {
        alert("Stats copied to clipboard!");
      })
      .catch(err => {
        console.error("Error copying stats: ", err);
        alert("Failed to copy stats.");
      });
}
