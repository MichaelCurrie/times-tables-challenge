// Generate a UUID v4 function
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Get or create user_id using UUID v4
let user_id = localStorage.getItem('user_id');
if (!user_id) {
    user_id = uuidv4();
    localStorage.setItem('user_id', user_id);
}

// Configuration
const totalQuestions = 5;
const penalty = 10;
let currentQuestion = 0;
let currentStartTime;
let currentQuestionData = null;
let sessionResults = [];

// DOM Elements
const startScreen = document.getElementById('startScreen');
const questionContainer = document.getElementById('questionContainer');
const resultsContainer = document.getElementById('resultsContainer');
const questionText = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const submitAnswerButton = document.getElementById('submitAnswerButton');
const feedback = document.getElementById('feedback');
const progress = document.getElementById('progress');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const heatmapDiv = document.getElementById('heatmap');
const yourAverageP = document.getElementById('yourAverage');
const yourCountP = document.getElementById('yourCount');
const worldAverageP = document.getElementById('worldAverage');
const worldCountP = document.getElementById('worldCount');

// Event Listeners
startButton.addEventListener('click', startChallenge);
document.addEventListener('keyup', e => {
    if (e.key === 'Enter' && startScreen.style.display !== 'none') startChallenge();
});

submitAnswerButton.addEventListener('click', submitAnswer);
answerInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') submitAnswer();
});
restartButton.addEventListener('click', () => window.location.reload());

// Functions
function startChallenge() {
    startScreen.style.display = 'none';
    questionContainer.style.display = 'block';
    currentQuestion = 0;
    sessionResults = [];
    nextQuestion();
}

function nextQuestion() {
    if (currentQuestion >= totalQuestions) {
        endChallenge();
        return;
    }
    currentQuestion++;
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    currentQuestionData = { a, b };
    questionText.textContent = `Question ${currentQuestion}/${totalQuestions}: What is ${a} × ${b}?`;
    answerInput.value = '';
    answerInput.focus();
    feedback.textContent = '';
    progress.textContent = '';
    currentStartTime = new Date();
}

function submitAnswer() {
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) {
        feedback.textContent = 'Please enter a valid number.';
        return;
    }
    const currentTime = new Date();
    const timeTaken = (currentTime - currentStartTime) / 1000;
    const correctAnswer = currentQuestionData.a * currentQuestionData.b;
    const isCorrect = (userAnswer === correctAnswer);
    const effectiveTime = isCorrect ? timeTaken : timeTaken + penalty;
    feedback.textContent = isCorrect ? 'Correct!' : `Incorrect. The correct answer was ${correctAnswer}.`;
    progress.textContent = `Time: ${timeTaken.toFixed(2)} sec${isCorrect ? '' : ' (+penalty)'}`;
    sessionResults.push({
        a: currentQuestionData.a,
        b: currentQuestionData.b,
        user_answer: userAnswer,
        correct: isCorrect,
        time_taken: timeTaken,
        effective_time: effectiveTime
    });
    setTimeout(nextQuestion, 1000);
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
        resultsContainer.style.display = 'block';
        renderHeatmap(data);
        yourAverageP.textContent = 'Response Time: ' + parseFloat(data.user_avg).toFixed(2) + ' s';
        yourCountP.textContent = 'Answers Submitted: ' + parseFloat(data.user_count).toFixed(0);
        worldAverageP.textContent = 'Response Time: ' + parseFloat(data.world_avg).toFixed(2) + ' s';
        worldCountP.textContent = 'Answers Submitted: ' + parseFloat(data.world_count).toFixed(0);
    });
}

// Render a heatmap table using the aggregated data from the server.
function renderHeatmap(aggregatedData) {
  
  heatmapDiv.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'heatmap';

  // Create header row (columns 1-20)
  const headerRow = document.createElement('tr');
  const emptyHeader = document.createElement('th');
  emptyHeader.textContent = '';
  headerRow.appendChild(emptyHeader);
  for (let col = 1; col <= 20; col++) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  // Determine min and max average effective times for coloring.
  let minTime = Infinity, maxTime = -Infinity;
  console.log("Hello Mama!!!");
  console.log(aggregatedData);
  const heatmapData = aggregatedData.heatmap;
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

  // Create table rows (for multiplicand 1 to 20).
  for (let row = 1; row <= 20; row++) {
    const tr = document.createElement('tr');
    const rowHeader = document.createElement('th');
    rowHeader.textContent = row;
    tr.appendChild(rowHeader);
    for (let col = 1; col <= 20; col++) {
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