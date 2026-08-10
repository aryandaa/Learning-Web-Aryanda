from flask import Flask
from pymongo import MongoClient
import os

app = Flask(__name__)

NAMA = os.getenv("NAMA", "Guest")

DB_HOST = os.getenv("DB_HOST", "mongodb")
DB_PORT = int(os.getenv("DB_PORT", "27017"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "123456")

try:
    client = MongoClient(
        f"mongodb://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/",
        serverSelectionTimeoutMS=3000
    )

    client.admin.command("ping")
    STATUS = "🟢 MongoDB Connected"

except Exception as e:
    STATUS = f"🔴 MongoDB Disconnected <br><pre>{e}</pre>"


@app.route("/")
def home():
    return f"""
    <h1>Halo, {NAMA}</h1>
    <h2>{STATUS}</h2>
    """


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)