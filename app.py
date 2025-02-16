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
        user_id TEXT NOT NULL,
        a INTEGER,
        b INTEGER,
        user_answer INTEGER,
        correct INTEGER,  -- 1 for True, 0 for False
        time_taken REAL,
        effective_time REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
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
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "No user_id provided"}), 400

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    
    for resp in responses:
        cur.execute("""
          INSERT INTO responses (user_id, a, b, user_answer, correct, time_taken, effective_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, resp["a"], resp["b"], resp["user_answer"], int(resp["correct"]), 
              resp["time_taken"], resp["effective_time"]))
    conn.commit()

    # Calculate heatmap stats
    cur.execute("""
      SELECT
        a, b,
        AVG(effective_time) as avg_effective,
        COUNT(*) as count, 
        SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END) as wrong_count
      FROM responses
      GROUP BY a, b
    """)
    aggregate_info = cur.fetchall()

    # World stats
    cur.execute("""
        SELECT
            AVG(effective_time),
            COUNT(effective_time)
        FROM responses
    """)
    world_avg, world_count = cur.fetchall()[0] or (0, 0)

    # User stats
    cur.execute("""
      SELECT AVG(effective_time), COUNT(effective_time)
      FROM responses 
      WHERE user_id = ?
    """, (user_id,))
    user_avg, user_count = cur.fetchall()[0] or (0, 0)

    heatmap = {}
    for row in aggregate_info:
        a, b, avg_effective, count, wrong_count = row
        key = f"{a}_{b}"
        heatmap[key] = {
            "avg_effective": round(avg_effective,1),
            "count": count,
            "wrong_count": wrong_count
        }
    conn.close()

    return jsonify({
        "heatmap": heatmap,
        "user_avg": user_avg,
        "user_count": user_count,
        "world_avg": world_avg,
        "world_count": world_count
    })

if __name__ == '__main__':
    app.run(debug=True)
