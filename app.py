from flask import Flask, request, jsonify, render_template
import sqlite3
import os

app = Flask(__name__)
DATABASE = "data.db"

def init_db():
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    # All responses from all users
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

    # Aggregated stats for each multiplication pair
    cur.execute("""
      CREATE TABLE IF NOT EXISTS agg_pair (
          a INTEGER,
          b INTEGER,
          total_effective_time REAL,
          count INTEGER,
          wrong_count INTEGER,
          PRIMARY KEY (a, b)
      );
    """)

    # Aggregated overall stats for each user
    cur.execute("""
      CREATE TABLE IF NOT EXISTS agg_user (
          user_id TEXT PRIMARY KEY,
          total_effective_time REAL,
          count INTEGER,
          wrong_count INTEGER
      );
    """)

    # Pizza party attendees
    cur.execute("""
      CREATE TABLE IF NOT EXISTS pizza_attendees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          party_number INTEGER NOT NULL,
          name TEXT NOT NULL,
          slice_count INTEGER NOT NULL,
          favorite_topping TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    """)

    # Trigger to update agg_pair when a new response is inserted
    cur.execute("""
      CREATE TRIGGER IF NOT EXISTS trg_response_insert_agg_pair
      AFTER INSERT ON responses
      BEGIN
          -- Try updating an existing record.
          UPDATE agg_pair 
            SET total_effective_time = total_effective_time + NEW.effective_time,
                count = count + 1,
                wrong_count = wrong_count + (CASE WHEN NEW.correct = 0 THEN 1 ELSE 0 END)
            WHERE a = NEW.a AND b = NEW.b;
          
          -- If no row was updated, insert a new record.
          INSERT OR IGNORE INTO agg_pair (a, b, total_effective_time, count, wrong_count)
            VALUES (NEW.a, NEW.b, NEW.effective_time, 1, (CASE WHEN NEW.correct = 0 THEN 1 ELSE 0 END));
      END;
    """)

    # Trigger to update agg_user when a new response is inserted
    cur.execute("""
      CREATE TRIGGER IF NOT EXISTS trg_response_insert_agg_user
      AFTER INSERT ON responses
      BEGIN
          -- Try updating an existing record.
          UPDATE agg_user 
            SET total_effective_time = total_effective_time + NEW.effective_time,
                count = count + 1,
                wrong_count = wrong_count + (CASE WHEN NEW.correct = 0 THEN 1 ELSE 0 END)
            WHERE user_id = NEW.user_id;
          
          -- If no row was updated, insert a new record.
          INSERT OR IGNORE INTO agg_user (user_id, total_effective_time, count, wrong_count)
            VALUES (NEW.user_id, NEW.effective_time, 1, (CASE WHEN NEW.correct = 0 THEN 1 ELSE 0 END));
      END;
    """)    
    conn.commit()
    conn.close()

init_db()

@app.route("/")
def index():
    # Check the host header to determine which template to serve
    host = request.headers.get('Host', '').lower()
    
    if 'slicetomeetyou.com' in host:
        return render_template('pizza.html')
    else:
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
    
    # Insert each raw response and update aggregation tables.
    for resp in responses:
        # Insert into the raw responses table.
        cur.execute("""
          INSERT INTO responses (user_id, a, b, user_answer, correct, time_taken, effective_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, resp["a"], resp["b"], resp["user_answer"], int(resp["correct"]), 
              resp["time_taken"], resp["effective_time"]))

    conn.commit()

    # Now retrieve aggregated stats for the heatmap.
    cur.execute("""
      SELECT a, b, total_effective_time, count, wrong_count
      FROM agg_pair
    """)
    aggregate_info = cur.fetchall()
    
    # Calculate heatmap data.
    heatmap = {}
    for row in aggregate_info:
        a, b, total_time, count, wrong_count = row
        avg_effective = total_time / count
        key = f"{a}_{b}"
        heatmap[key] = {
            "avg_effective": round(avg_effective, 1),
            "count": count,
            "wrong_count": wrong_count
        }
    
    # Retrieve overall world stats by summing over the agg_pair table.
    cur.execute("""
      SELECT SUM(total_effective_time), SUM(count)
      FROM agg_pair
    """)
    world_row = cur.fetchone()
    if world_row and world_row[1]:
        world_avg = world_row[0] / world_row[1]
        world_count = world_row[1]
    else:
        world_avg, world_count = 0, 0

    # Retrieve per-user stats from agg_user.
    cur.execute("""
      SELECT total_effective_time, count
      FROM agg_user
      WHERE user_id = ?
    """, (user_id,))
    user_row = cur.fetchone()
    if user_row and user_row[1]:
        user_avg = user_row[0] / user_row[1]
        user_count = user_row[1]
    else:
        user_avg, user_count = 0, 0

    conn.close()

    return jsonify({
        "heatmap": heatmap,
        "user_avg": user_avg,
        "user_count": user_count,
        "world_avg": world_avg,
        "world_count": world_count
    })

@app.route("/pizza/join", methods=["POST"])
def join_pizza_party():
    data = request.get_json()
    party_number = data.get("partyNumber")
    name = data.get("name")
    slice_count = data.get("sliceCount")
    favorite_topping = data.get("favoriteTopping")

    if not all([party_number, name, slice_count, favorite_topping]):
        return jsonify({"error": "All fields are required"}), 400

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO pizza_attendees (party_number, name, slice_count, favorite_topping)
            VALUES (?, ?, ?, ?)
        """, (party_number, name, slice_count, favorite_topping))
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True, "message": "Successfully joined the pizza party!"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/pizza/summary/<int:party_number>", methods=["GET"])
def get_pizza_party_summary(party_number):
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    
    try:
        # Get all attendees for this party
        cur.execute("""
            SELECT name, slice_count, favorite_topping
            FROM pizza_attendees
            WHERE party_number = ?
            ORDER BY timestamp
        """, (party_number,))
        
        attendees = cur.fetchall()
        
        if not attendees:
            return jsonify({"error": "No party found with that number"}), 404
        
        # Calculate totals
        total_slices = sum(attendee[1] for attendee in attendees)
        names = [attendee[0] for attendee in attendees]
        
        # Count toppings
        topping_counts = {}
        for attendee in attendees:
            topping = attendee[2]
            topping_counts[topping] = topping_counts.get(topping, 0) + 1
        
        # Get top 3 toppings
        top_toppings = sorted(topping_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        conn.close()
        
        return jsonify({
            "party_number": party_number,
            "attendees": names,
            "total_slices": total_slices,
            "top_toppings": top_toppings
        })
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
