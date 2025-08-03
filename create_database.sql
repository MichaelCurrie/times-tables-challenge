-- All responses from all users
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

-- Aggregated stats for each multiplication pair
CREATE TABLE IF NOT EXISTS agg_pair (
    a INTEGER,
    b INTEGER,
    total_effective_time REAL,
    count INTEGER,
    wrong_count INTEGER,
    PRIMARY KEY (a, b)
);

-- Aggregated overall stats for each user
CREATE TABLE IF NOT EXISTS agg_user (
    user_id TEXT PRIMARY KEY,
    total_effective_time REAL,
    count INTEGER,
    wrong_count INTEGER
);

-- Pizza party attendees
CREATE TABLE IF NOT EXISTS pizza_attendees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_number TEXT NOT NULL,
    name TEXT NOT NULL,
    slice_count INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pizza ingredient preferences
CREATE TABLE IF NOT EXISTS pizza_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attendee_id INTEGER NOT NULL,
    ingredient TEXT NOT NULL,
    preference INTEGER NOT NULL, -- 0: will not eat, 1: indifferent, 2: want to eat
    FOREIGN KEY (attendee_id) REFERENCES pizza_attendees (id) ON DELETE CASCADE
);

-- Named pizzas created for all parties
CREATE TABLE IF NOT EXISTS named_pizzas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients for named pizzas
CREATE TABLE IF NOT EXISTS named_pizzas_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pizza_id INTEGER NOT NULL,
    ingredient TEXT NOT NULL,
    FOREIGN KEY (pizza_id) REFERENCES named_pizzas (id) ON DELETE CASCADE
);

-- Existing pizza selections by attendees
CREATE TABLE IF NOT EXISTS pizza_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attendee_id INTEGER NOT NULL,
    pizza_type TEXT NOT NULL,
    slice_count INTEGER NOT NULL,
    FOREIGN KEY (attendee_id) REFERENCES pizza_attendees (id) ON DELETE CASCADE
);

-- Trigger to update agg_pair when a new response is inserted
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

-- Trigger to update agg_user when a new response is inserted
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