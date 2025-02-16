from flask import Flask, request, jsonify, render_template
import sqlite3
import os

app = Flask(__name__)
DATABASE = "data.db"

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

@app.route("/")
def index():
    return render_template('index.html')

@app.route("/submit", methods=["POST"])
def submit():
    data = request.get_json()
    responses = data.get("responses", [])
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    
    for resp in responses:
        cur.execute("""
          INSERT INTO responses (a, b, user_answer, correct, time_taken, effective_time)
          VALUES (?, ?, ?, ?, ?, ?)
        """, (resp["a"], resp["b"], resp["user_answer"], int(resp["correct"]), 
              resp["time_taken"], resp["effective_time"]))
    conn.commit()

    # Calculate aggregate stats
    cur.execute("""
      SELECT
        a, b,
        AVG(effective_time) as avg_effective,
        COUNT(*) as count, 
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

if __name__ == '__main__':
    app.run(debug=True)
