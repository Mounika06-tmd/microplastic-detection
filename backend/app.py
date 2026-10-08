from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory,
    session,
    redirect
)

from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from ultralytics import YOLO

import os
import cv2
import time
import sqlite3


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "microplastic-detection-secret-key-change-this"
)

CORS(app, supports_credentials=True)


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PROJECT_DIR = os.path.dirname(
    BASE_DIR
)

FRONTEND_FOLDER = os.path.join(
    PROJECT_DIR,
    "frontend"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

OUTPUT_FOLDER = os.path.join(
    BASE_DIR,
    "outputs"
)

DATABASE_PATH = os.path.join(
    BASE_DIR,
    "database.db"
)


os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)


# ============================================================
# DATABASE
# ============================================================

def get_db():

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():

    connection = get_db()

    cursor = connection.cursor()


    # USERS TABLE

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            full_name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )
    """)


    # ANALYSIS HISTORY TABLE

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            original_filename TEXT,

            output_filename TEXT,

            total_particles INTEGER DEFAULT 0,

            plastic_particles INTEGER DEFAULT 0,

            non_plastic_particles INTEGER DEFAULT 0,

            water_status TEXT,

            purity_index REAL,

            detections TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
                REFERENCES users(id)

        )
    """)


    connection.commit()

    connection.close()


initialize_database()


# ============================================================
# YOLO MODEL
# ============================================================

MODEL_PATH = os.path.join(
    PROJECT_DIR,
    "model",
    "best.pt"
)

print("MODEL PATH:")
print(MODEL_PATH)

print()
print("========================================")
print("LOADING YOLO MODEL")
print("========================================")

model = YOLO(
    MODEL_PATH
)

print(
    "YOLO model loaded successfully!"
)

print(
    "Model classes:"
)

print(
    model.names
)


# ============================================================
# FRONTEND PAGES
# ============================================================
@app.route("/")
@app.route("/index.html")
def home():
    return send_from_directory(
        FRONTEND_FOLDER,
        "index.html"
    )


@app.route("/signin.html")
def signin_page():

    return send_from_directory(
        FRONTEND_FOLDER,
        "signin.html"
    )


@app.route("/signup.html")
def signup_page():

    return send_from_directory(
        FRONTEND_FOLDER,
        "signup.html"
    )


@app.route("/dashboard.html")
def dashboard_page():

    if "user_id" not in session:

        return redirect(
            "/signin.html"
        )

    return send_from_directory(
        FRONTEND_FOLDER,
        "dashboard.html"
    )


@app.route("/results.html")
def results_page():

    if "user_id" not in session:

        return redirect(
            "/signin.html"
        )

    return send_from_directory(
        FRONTEND_FOLDER,
        "results.html"
    )


@app.route("/history.html")
def history_page():

    if "user_id" not in session:

        return redirect(
            "/signin.html"
        )

    return send_from_directory(
        FRONTEND_FOLDER,
        "history.html"
    )


# ============================================================
# CSS
# ============================================================

@app.route("/styles.css")
def styles():

    return send_from_directory(
        FRONTEND_FOLDER,
        "styles.css"
    )


# ============================================================
# JAVASCRIPT
# ============================================================

@app.route("/script.js")
def javascript():

    return send_from_directory(
        FRONTEND_FOLDER,
        "script.js"
    )


# ============================================================
# OUTPUT IMAGES
# ============================================================

@app.route("/outputs/<filename>")
def output_image(filename):

    return send_from_directory(
        OUTPUT_FOLDER,
        filename
    )


# ============================================================
# UPLOADED IMAGES
# ============================================================

@app.route("/uploads/<filename>")
def uploaded_image(filename):

    if "user_id" not in session:

        return jsonify({
            "error": "Login required"
        }), 401

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )


# ============================================================
# SIGN UP
# ============================================================

@app.route(
    "/api/signup",
    methods=["POST"]
)
def signup():

    try:

        data = request.get_json()

        full_name = (
            data.get("full_name", "")
            .strip()
        )

        email = (
            data.get("email", "")
            .strip()
            .lower()
        )

        password = data.get(
            "password",
            ""
        )


        # VALIDATION

        if not full_name:

            return jsonify({
                "success": False,
                "error": "Full name is required"
            }), 400


        if not email:

            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400


        if not password:

            return jsonify({
                "success": False,
                "error": "Password is required"
            }), 400


        if len(password) < 6:

            return jsonify({
                "success": False,
                "error":
                    "Password must contain at least 6 characters"
            }), 400


        connection = get_db()

        cursor = connection.cursor()


        # CHECK EXISTING EMAIL

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = ?
            """,
            (email,)
        )

        existing_user = cursor.fetchone()


        if existing_user:

            connection.close()

            return jsonify({
                "success": False,
                "error":
                    "An account with this email already exists"
            }), 409


        # HASH PASSWORD

        hashed_password = generate_password_hash(
            password
        )


        # CREATE USER

        cursor.execute(
            """
            INSERT INTO users
            (
                full_name,
                email,
                password
            )
            VALUES (?, ?, ?)
            """,
            (
                full_name,
                email,
                hashed_password
            )
        )


        connection.commit()

        user_id = cursor.lastrowid

        connection.close()


        # LOGIN USER AFTER SIGNUP

        session["user_id"] = user_id

        session["full_name"] = full_name

        session["email"] = email


        return jsonify({

            "success": True,

            "message":
                "Account created successfully",

            "user": {
                "id": user_id,
                "full_name": full_name,
                "email": email
            }

        })


    except Exception as error:

        print(
            "SIGNUP ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to create account"

        }), 500


# ============================================================
# SIGN IN
# ============================================================

@app.route(
    "/api/signin",
    methods=["POST"]
)
def signin():

    try:

        data = request.get_json()

        email = (
            data.get("email", "")
            .strip()
            .lower()
        )

        password = data.get(
            "password",
            ""
        )


        if not email or not password:

            return jsonify({

                "success": False,

                "error":
                    "Email and password are required"

            }), 400


        connection = get_db()

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            """,
            (email,)
        )


        user = cursor.fetchone()

        connection.close()


        if user is None:

            return jsonify({

                "success": False,

                "error":
                    "Invalid email or password"

            }), 401


        # CHECK PASSWORD

        if not check_password_hash(
            user["password"],
            password
        ):

            return jsonify({

                "success": False,

                "error":
                    "Invalid email or password"

            }), 401


        # CREATE SESSION

        session["user_id"] = user["id"]

        session["full_name"] = user["full_name"]

        session["email"] = user["email"]


        return jsonify({

            "success": True,

            "message":
                "Login successful",

            "user": {

                "id":
                    user["id"],

                "full_name":
                    user["full_name"],

                "email":
                    user["email"]

            }

        })


    except Exception as error:

        print(
            "SIGNIN ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to sign in"

        }), 500


# ============================================================
# CURRENT USER
# ============================================================

@app.route(
    "/api/me"
)
def current_user():

    if "user_id" not in session:

        return jsonify({

            "success": False,

            "logged_in": False

        }), 401


    return jsonify({

        "success": True,

        "logged_in": True,

        "user": {

            "id":
                session["user_id"],

            "full_name":
                session["full_name"],

            "email":
                session["email"]

        }

    })


# ============================================================
# LOGOUT
# ============================================================

@app.route(
    "/api/logout",
    methods=["POST"]
)
def logout():

    session.clear()

    return jsonify({

        "success": True,

        "message":
            "Logged out successfully"

    })


# ============================================================
# ANALYSIS HISTORY
# ============================================================

@app.route(
    "/api/history"
)
def history():

    if "user_id" not in session:

        return jsonify({

            "success": False,

            "error":
                "Login required"

        }), 401


    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            original_filename,
            output_filename,
            total_particles,
            plastic_particles,
            non_plastic_particles,
            water_status,
            purity_index,
            detections,
            created_at

        FROM analyses

        WHERE user_id = ?

        ORDER BY created_at DESC
        """,
        (
            session["user_id"],
        )
    )


    rows = cursor.fetchall()

    connection.close()


    history_data = []


    for row in rows:

        history_data.append({

            "id":
                row["id"],

            "original_filename":
                row["original_filename"],

            "output_filename":
                row["output_filename"],

            "total_particles":
                row["total_particles"],

            "plastic_particles":
                row["plastic_particles"],

            "non_plastic_particles":
                row["non_plastic_particles"],

            "water_status":
                row["water_status"],

            "purity_index":
                row["purity_index"],

            "detections":
                row["detections"],

            "created_at":
                row["created_at"]

        })


    return jsonify({

        "success": True,

        "history":
            history_data

    })


# ============================================================
# PREDICT
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    # ========================================================
    # LOGIN REQUIRED
    # ========================================================

    if "user_id" not in session:

        return jsonify({

            "success": False,

            "error":
                "Please sign in before performing an analysis"

        }), 401


    print()
    print("========================================")
    print("NEW PREDICTION REQUEST")
    print("USER:", session["email"])
    print("========================================")


    # ========================================================
    # CHECK IMAGE
    # ========================================================

    if "image" not in request.files:

        return jsonify({

            "success": False,

            "error":
                "No image uploaded"

        }), 400


    image = request.files["image"]


    if image.filename == "":

        return jsonify({

            "success": False,

            "error":
                "No image selected"

        }), 400


    # ========================================================
    # SAVE INPUT IMAGE
    # ========================================================

    timestamp = int(
        time.time() * 1000
    )

    original_filename = os.path.basename(
        image.filename
    )

    safe_filename = (
        str(session["user_id"])
        + "_"
        + str(timestamp)
        + "_"
        + original_filename
    )


    input_path = os.path.join(
        UPLOAD_FOLDER,
        safe_filename
    )


    image.save(
        input_path
    )


    print(
        "Input image saved:",
        input_path
    )


    # ========================================================
    # YOLO
    # ========================================================

    print(
        "Running YOLO detection..."
    )


    try:

        results = model.predict(
            source=input_path,
            save=False,
            conf=0.25,
            verbose=False
        )


    except Exception as error:

        print(
            "YOLO ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "error":
                "YOLO prediction failed",

            "details":
                str(error)

        }), 500


    # ========================================================
    # DETECTIONS
    # ========================================================

    detections = []

    total_particles = 0


    for result in results:

        if result.boxes is None:

            continue


        for i in range(
            len(result.boxes)
        ):

            class_id = int(
                result.boxes.cls[i].item()
            )


            confidence = float(
                result.boxes.conf[i].item()
            )


            class_name = model.names[
                class_id
            ]


            detections.append({

                "class":
                    class_name,

                "confidence":
                    round(
                        confidence,
                        3
                    )

            })


            total_particles += 1


    # ========================================================
    # PLASTIC CLASSES
    # ========================================================

    plastic_classes = {

       "microplastic"

    }


    plastic_particles = 0


    for detection in detections:

        if (
            detection["class"]
            .lower()
            .strip()
            in plastic_classes
        ):

            plastic_particles += 1


    non_plastic_particles = (
        total_particles
        - plastic_particles
    )


    # ========================================================
    # WATER STATUS
    # ========================================================

    if plastic_particles > 10:

        water_status = "Unsafe"

    else:

        water_status = "Safe"


    # ========================================================
    # PURITY INDEX
    # ========================================================

    if total_particles == 0:

        purity_index = 100.0

    else:

        purity_index = (
            (
                total_particles
                - plastic_particles
            )
            / total_particles
        ) * 100


    purity_index = round(
        purity_index,
        2
    )


    # ========================================================
    # ANNOTATED IMAGE
    # ========================================================

    try:

        annotated_image = (
            results[0].plot()
        )


        output_filename = (
            f"result_{timestamp}.png"
        )


        output_path = os.path.join(
            OUTPUT_FOLDER,
            output_filename
        )


        success = cv2.imwrite(
            output_path,
            annotated_image
        )


        if not success:

            raise Exception(
                "Could not save output image"
            )


    except Exception as error:

        print(
            "OUTPUT IMAGE ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "error":
                "Could not create output image",

            "details":
                str(error)

        }), 500


    output_url = (
        "/outputs/"
        + output_filename
    )


    # ========================================================
    # SAVE HISTORY
    # ========================================================

    import json


    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        INSERT INTO analyses
        (
            user_id,
            original_filename,
            output_filename,
            total_particles,
            plastic_particles,
            non_plastic_particles,
            water_status,
            purity_index,
            detections
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,

        (
            session["user_id"],

            safe_filename,

            output_filename,

            total_particles,

            plastic_particles,

            non_plastic_particles,

            water_status,

            purity_index,

            json.dumps(detections)
        )
    )


    connection.commit()

    analysis_id = cursor.lastrowid

    connection.close()


    # ========================================================
    # RESPONSE
    # ========================================================

    print()
    print("========== RESULTS ==========")

    print(
        "Total particles:",
        total_particles
    )

    print(
        "Plastic particles:",
        plastic_particles
    )

    print(
        "Non-plastic particles:",
        non_plastic_particles
    )

    print(
        "Water status:",
        water_status
    )

    print(
        "Purity index:",
        purity_index
    )

    print(
        "Analysis ID:",
        analysis_id
    )

    print(
        "============================="
    )


    return jsonify({

        "success": True,

        "analysis_id":
            analysis_id,

        "total_particles":
            total_particles,

        "plastic_particles":
            plastic_particles,

        "non_plastic_particles":
            non_plastic_particles,

        "water_status":
            water_status,

        "purity_index":
            purity_index,

        "detections":
            detections,

        "output_url":
            output_url

    })


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print()
    print("========================================")
    print("MICROPLASTIC DETECTION SYSTEM")
    print("========================================")

    print(
        "Open:"
    )

    print(
        "http://127.0.0.1:5000/"
    )

    print("========================================")
    print()


    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )