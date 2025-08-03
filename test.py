from flask import Flask, request, jsonify, render_template
import sqlite3
import os
import code

app = Flask(__name__)
DATABASE = "data.db"

conn = sqlite3.connect(DATABASE)
cur = conn.cursor()

cur.execute(
    """
        SELECT
            AVG(effective_time),
            COUNT(effective_time)
        FROM responses
"""
)
world_avg, world_count = cur.fetchall()[0] or (0, 0)
code.interact(banner="tag1", local=locals())
