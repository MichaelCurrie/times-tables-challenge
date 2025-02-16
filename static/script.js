// Generate and store a local user_id if not already set.
let user_id = localStorage.getItem('user_id');
if (!user_id) {
    user_id = 'user_' + Math.random().toString(36).substr(2,9);
    localStorage.setItem('user_id', user_id);
}

// Configuration
const totalQuestions = 5;
const penalty = 5;
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
const worldAverageP = document.getElementById('worldAverage');
const scoreP = document.getElementById('score');

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
        yourAverageP.textContent = 'Your Average: ' + parseFloat(data.user_avg).toFixed(2) + ' sec';
        worldAverageP.textContent = 'World Average: ' + parseFloat(data.world_avg).toFixed(2) + ' sec';
        scoreP.textContent = 'Score: ' + parseFloat(data.user_avg).toFixed(2);
    });
}

function renderHeatmap(aggregatedData) {
    // [existing renderHeatmap function code...]
    // (kept same as original)
}
