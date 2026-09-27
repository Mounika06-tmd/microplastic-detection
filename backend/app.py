from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import os
import cv2
import time


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

CORS(app)


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


os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)


# ============================================================
# YOLO MODEL
# ============================================================

MODEL_PATH = r"C:\Users\mouni\OneDrive\Documents\micro_plastic_detection\model\yolov8s-seg.pt"


print()
print("========================================")
print("LOADING YOLO MODEL")
print("========================================")

model = YOLO(MODEL_PATH)

print("YOLO model loaded successfully!")

print("Model classes:")
print(model.names)


# ============================================================
# SERVE FRONTEND
# ============================================================

@app.route("/")
def frontend():

    return send_from_directory(
        FRONTEND_FOLDER,
        "index.html"
    )


# ============================================================
# SERVE CSS
# ============================================================

@app.route("/styles.css")
def styles():

    return send_from_directory(
        FRONTEND_FOLDER,
        "styles.css"
    )


# ============================================================
# SERVE JAVASCRIPT
# ============================================================

@app.route("/script.js")
def javascript():

    return send_from_directory(
        FRONTEND_FOLDER,
        "script.js"
    )


# ============================================================
# SERVE OUTPUT IMAGES
# ============================================================

@app.route("/outputs/<filename>")
def output_image(filename):

    print(
        "Frontend requested output:",
        filename
    )

    return send_from_directory(
        OUTPUT_FOLDER,
        filename
    )


# ============================================================
# TEST BACKEND
# ============================================================

@app.route("/api/status")
def status():

    return jsonify({
        "success": True,
        "message": "Backend is running"
    })


# ============================================================
# PREDICT
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    print()
    print("========================================")
    print("NEW PREDICTION REQUEST")
    print("========================================")


    # --------------------------------------------------------
    # CHECK IMAGE
    # --------------------------------------------------------

    if "image" not in request.files:

        print(
            "ERROR: image not received"
        )

        return jsonify({
            "success": False,
            "error": "No image uploaded"
        }), 400


    image = request.files["image"]


    if image.filename == "":

        return jsonify({
            "success": False,
            "error": "No image selected"
        }), 400


    # --------------------------------------------------------
    # SAVE INPUT IMAGE
    # --------------------------------------------------------

    original_filename = os.path.basename(
        image.filename
    )


    input_path = os.path.join(
        UPLOAD_FOLDER,
        original_filename
    )


    image.save(input_path)


    print(
        "Input image saved:"
    )

    print(
        input_path
    )


    # --------------------------------------------------------
    # YOLO PREDICTION
    # --------------------------------------------------------

    print()
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
            "YOLO ERROR:"
        )

        print(
            error
        )

        return jsonify({
            "success": False,
            "error": "YOLO prediction failed",
            "details": str(error)
        }), 500


    # --------------------------------------------------------
    # DETECTIONS
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # PLASTIC COUNT
    # --------------------------------------------------------

    plastic_classes = {

        "fiber",
        "fragment",
        "pellet",
        "bead",
        "hdpe",
        "pet",
        "v.fiber"
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
        total_particles -
        plastic_particles
    )


    # --------------------------------------------------------
    # WATER STATUS
    # --------------------------------------------------------

    if plastic_particles > 10:

        water_status = "Unsafe"

    else:

        water_status = "Safe"


    # --------------------------------------------------------
    # CREATE OUTPUT IMAGE
    # --------------------------------------------------------

    print()
    print(
        "Creating annotated image..."
    )


    try:

        annotated_image = (
            results[0].plot()
        )


        timestamp = int(
            time.time() * 1000
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
            "OUTPUT IMAGE ERROR:"
        )

        print(
            error
        )

        return jsonify({
            "success": False,
            "error": "Could not create output image",
            "details": str(error)
        }), 500


    print()
    print(
        "Output image saved:"
    )

    print(
        output_path
    )


    # --------------------------------------------------------
    # VERIFY FILE
    # --------------------------------------------------------

    if not os.path.exists(
        output_path
    ):

        return jsonify({
            "success": False,
            "error": "Output image does not exist"
        }), 500


    # --------------------------------------------------------
    # OUTPUT URL
    # --------------------------------------------------------

    output_url = (
        "/outputs/"
        + output_filename
    )


    # --------------------------------------------------------
    # RESULTS
    # --------------------------------------------------------

    print()
    print(
        "========== RESULTS =========="
    )

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
        "Output URL:",
        output_url
    )

    print(
        "============================="
    )


    # --------------------------------------------------------
    # SEND RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "success": True,

        "total_particles":
            total_particles,

        "plastic_particles":
            plastic_particles,

        "non_plastic_particles":
            non_plastic_particles,

        "water_status":
            water_status,

        "detections":
            detections,

        "output_url":
            output_url
    })


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    print()
    print("========================================")
    print("MICROPLASTIC DETECTION SYSTEM")
    print("========================================")

    print(
        "Open frontend at:"
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