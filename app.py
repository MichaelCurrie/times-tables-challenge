from flask import Flask, request, jsonify, render_template_string
import sqlite3
import os

app = Flask(__name__)
DATABASE = "data.db"

# Initialize the SQLite database and create the table if needed.
def init_db():
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    cur.execute("""
      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        a INTEGER,
        b INTEGER,
        user_answer INTEGER,
        correct INTEGER,  -- 1 for True, 0 for False
        time_taken REAL,
        effective_time REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    """)
    conn.commit()
    conn.close()

init_db()

# The main page serves our HTML/JavaScript app.
@app.route("/")
def index():
    return render_template_string(HTML_PAGE)

# This endpoint accepts the session results (JSON) and returns aggregated stats.
@app.route("/submit", methods=["POST"])
def submit():
    data = request.get_json()
    responses = data.get("responses", [])
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    # Insert each response into the database.
    for resp in responses:
        cur.execute("""
          INSERT INTO responses (a, b, user_answer, correct, time_taken, effective_time)
          VALUES (?, ?, ?, ?, ?, ?)
        """, (resp["a"], resp["b"], resp["user_answer"], int(resp["correct"]), 
              resp["time_taken"], resp["effective_time"]))
    conn.commit()

    # Aggregate data: compute average effective time, count, and wrong-answer count per multiplication.
    cur.execute("""
      SELECT a, b, AVG(effective_time) as avg_effective, COUNT(*) as count, 
             SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END) as wrong_count
      FROM responses
      GROUP BY a, b
    """)
    rows = cur.fetchall()
    aggregated = {}
    for row in rows:
        a, b, avg_effective, count, wrong_count = row
        key = f"{a}_{b}"
        aggregated[key] = {
            "avg_effective": avg_effective,
            "count": count,
            "wrong_count": wrong_count
        }
    conn.close()
    return jsonify(aggregated)

# HTML page with embedded JavaScript.
HTML_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Times Tables Challenge</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: sans-serif;
      background-color: #f0f0f0;
    }
    .container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
    }
    #questionContainer, #resultsContainer {
      display: none;
    }
    button {
      padding: 10px 20px;
      font-size: 16px;
      margin-top: 10px;
      cursor: pointer;
    }
    input[type="number"] {
      font-size: 16px;
      padding: 5px;
      width: 100px;
      text-align: center;
    }
    table.heatmap {
      border-collapse: collapse;
      margin: 10px auto;
    }
    table.heatmap th, table.heatmap td {
      width: 30px;
      height: 30px;
      text-align: center;
      border: 1px solid #ccc;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Start Screen -->
    <div id="startScreen">
      <h1>Times Tables Challenge</h1>
      <p>Solve multiplication problems up to 20×20 as fast as you can!</p>
      <button id="startButton">Start Challenge</button>
    </div>

    <!-- Question Screen -->
    <div id="questionContainer">
      <h2 id="questionText"></h2>
      <input type="number" id="answerInput" placeholder="Your answer">
      <br>
      <button id="submitAnswerButton">Submit</button>
      <p id="feedback"></p>
      <p id="progress"></p>
    </div>

    <!-- Results Screen -->
    <div id="resultsContainer">
      <h2>Aggregated Heatmap<br><small>(Average Effective Time in sec)</small></h2>
      <div id="heatmapContainer"></div>
      <button id="restartButton">Restart Challenge</button>
    </div>
  </div>

  <script>
    // Configuration
    const totalQuestions = 5;  // Only 5 questions per session.
    const penalty = 5;         // Penalty seconds added for a wrong answer.
    let currentQuestion = 0;
    let currentStartTime;
    let currentQuestionData = null;
    // Each session result will include: a, b, user_answer, correct, time_taken, effective_time.
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
    const heatmapContainer = document.getElementById('heatmapContainer');

    // Event Listeners
    document.addEventListener('keyup', e => e.key==='Enter' && startScreen.style.display!=='none' && startChallenge());
    startButton.addEventListener('click', startChallenge);
    submitAnswerButton.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') submitAnswer();
    });
    restartButton.addEventListener('click', () => window.location.reload());

    // Start the challenge
    function startChallenge() {
      startScreen.style.display = 'none';
      questionContainer.style.display = 'block';
      currentQuestion = 0;
      sessionResults = [];
      nextQuestion();
    }

    // Show the next question or finish the session.
    function nextQuestion() {
      if (currentQuestion >= totalQuestions) {
        endChallenge();
        return;
      }
      currentQuestion++;
      // Randomly choose numbers 1-20 for multiplication.
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

    // Process the submitted answer.
    function submitAnswer() {
      const userAnswer = parseInt(answerInput.value);
      if (isNaN(userAnswer)) {
        feedback.textContent = 'Please enter a valid number.';
        return;
      }
      const currentTime = new Date();
      const timeTaken = (currentTime - currentStartTime) / 1000; // seconds
      const correctAnswer = currentQuestionData.a * currentQuestionData.b;
      const isCorrect = (userAnswer === correctAnswer);
      // For wrong answers, add a penalty.
      const effectiveTime = isCorrect ? timeTaken : timeTaken + penalty;
      feedback.textContent = isCorrect ? 'Correct!' : `Incorrect. The correct answer was ${correctAnswer}.`;
      sessionResults.push({
        a: currentQuestionData.a,
        b: currentQuestionData.b,
        user_answer: userAnswer,
        correct: isCorrect,
        time_taken: timeTaken,
        effective_time: effectiveTime
      });
      progress.textContent = `Time: ${timeTaken.toFixed(2)} sec${isCorrect ? '' : ' (+penalty)'}`;
      setTimeout(nextQuestion, 1000);
    }

    // End the challenge, send session data to the server, then render the aggregated heatmap.
    function endChallenge() {
      questionContainer.style.display = 'none';
      fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: sessionResults })
      })
      .then(response => response.json())
      .then(aggregatedData => {
        resultsContainer.style.display = 'block';
        renderHeatmap(aggregatedData);
      });
    }

    // Render a heatmap table using the aggregated data from the server.
    function renderHeatmap(aggregatedData) {
      heatmapContainer.innerHTML = '';
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
      for (const key in aggregatedData) {
        const avg = aggregatedData[key].avg_effective;
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
          if (aggregatedData[key]) {
            const avg = aggregatedData[key].avg_effective;
            td.style.backgroundColor = getColor(avg);
            td.title = `Avg Effective Time: ${avg.toFixed(2)} sec
Attempts: ${aggregatedData[key].count}
Wrong Answers: ${aggregatedData[key].wrong_count}`;
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
      heatmapContainer.appendChild(table);
    }
  </script>
</body>
</html>
"""

if __name__ == '__main__':
    app.run(debug=True)
