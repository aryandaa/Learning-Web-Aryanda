from flask import Flask
import os

app = Flask(__name__)

@app.route("/")
def home():
    nama = os.getenv("NAMA", "Guest")
    return f"<h1>Halo, {nama} 👋</h1>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)