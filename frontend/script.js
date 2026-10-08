// ============================================================
// MICROPLASTIC DETECTION - MAIN JAVASCRIPT
// Updated for single-class Microplastic YOLO model
// ============================================================

const API_BASE = window.location.origin;

let selectedImage = null;
let cameraStream = null;
let particleChart = null;


// ============================================================
// START ANALYSIS
// ============================================================

async function startAnalysis() {

    try {

        const response = await fetch(`${API_BASE}/api/me`, {
            credentials: "include"
        });

        if (response.ok) {

            window.location.href = "dashboard.html";

        } else {

            window.location.href = "signin.html";

        }

    } catch (error) {

        console.error("Start analysis error:", error);

        window.location.href = "signin.html";

    }
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        await fetch("/api/logout", {
            method: "POST",
            credentials: "include"
        });

    } catch (error) {

        console.error("Logout error:", error);

    }

    localStorage.removeItem("user");
    sessionStorage.clear();

    window.location.href = "/";
}


// ============================================================
// CURRENT USER
// ============================================================

async function loadCurrentUser() {

    try {

        const response = await fetch(`${API_BASE}/api/me`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data.success && data.user) {

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            const userNameElements = [
                "dashboardUserName",
                "historyUserName",
                "resultUserName",
                "userName"
            ];

            userNameElements.forEach(id => {

                const element = document.getElementById(id);

                if (element) {

                    element.textContent =
                        data.user.full_name ||
                        data.user.name ||
                        "User";
                }

            });


            const userEmailElements = [
                "dashboardUserEmail",
                "historyUserEmail",
                "resultUserEmail",
                "userEmail"
            ];

            userEmailElements.forEach(id => {

                const element = document.getElementById(id);

                if (element) {

                    element.textContent =
                        data.user.email || "";
                }

            });

            return data.user;
        }

    } catch (error) {

        console.error("User loading error:", error);

    }

    return null;
}


// ============================================================
// SIGN UP
// ============================================================

async function signupUser() {

    const nameElement =
        document.getElementById("fullName");

    const emailElement =
        document.getElementById("email");

    const passwordElement =
        document.getElementById("password");


    if (
        !nameElement ||
        !emailElement ||
        !passwordElement
    ) {
        return;
    }


    const full_name =
        nameElement.value.trim();

    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;


    if (!full_name || !email || !password) {

        showAuthMessage(
            "Please fill all fields.",
            "error"
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/api/signup`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    full_name,
                    email,
                    password
                })
            }
        );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                data.message ||
                "Signup failed."
            );
        }


        if (data.user) {

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );
        }


        showAuthMessage(
            "Account created successfully. Redirecting...",
            "success"
        );


        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 800);


    } catch (error) {

        console.error("Signup error:", error);

        showAuthMessage(
            error.message,
            "error"
        );
    }
}


// ============================================================
// SIGN IN
// ============================================================

async function signinUser() {

    const emailElement =
        document.getElementById("email");

    const passwordElement =
        document.getElementById("password");


    if (
        !emailElement ||
        !passwordElement
    ) {
        return;
    }


    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;


    if (!email || !password) {

        showAuthMessage(
            "Please enter email and password.",
            "error"
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/api/signin`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                data.message ||
                "Login failed."
            );
        }


        if (data.user) {

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );
        }


        window.location.href =
            "dashboard.html";


    } catch (error) {

        console.error("Signin error:", error);

        showAuthMessage(
            error.message,
            "error"
        );
    }
}


// ============================================================
// AUTH MESSAGE
// ============================================================

function showAuthMessage(
    message,
    type = "error"
) {

    const element =
        document.getElementById(
            "authMessage"
        );


    if (!element) {

        alert(message);

        return;
    }


    element.textContent =
        message;

    element.className =
        `auth-message ${type}`;
}


// ============================================================
// IMAGE SELECTION
// ============================================================

function handleImageSelection(event) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }


    selectedImage = file;

    previewSelectedImage(file);
}


// ============================================================
// PREVIEW SELECTED IMAGE
// ============================================================

function previewSelectedImage(file) {

    if (!file) {
        return;
    }


    selectedImage = file;


    const preview =
        document.getElementById(
            "previewImage"
        );


    if (preview) {

        if (
            preview.src &&
            preview.src.startsWith("blob:")
        ) {

            URL.revokeObjectURL(
                preview.src
            );
        }


        preview.src =
            URL.createObjectURL(file);

        preview.style.display =
            "block";
    }


    const previewArea =
        document.getElementById(
            "previewArea"
        );


    if (previewArea) {

        previewArea.style.display =
            "block";
    }
}


// ============================================================
// FILE TO DATA URL
// ============================================================

function fileToDataURL(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload = () => {

                resolve(
                    reader.result
                );
            };


            reader.onerror =
                reject;


            reader.readAsDataURL(file);
        }
    );
}


// ============================================================
// ANALYZE IMAGE
// ============================================================

async function analyzeImage() {

    if (!selectedImage) {

        alert(
            "Please select an image first."
        );

        return;
    }


    const analyzeButton =
        document.getElementById(
            "analyzeButton"
        );


    if (analyzeButton) {

        analyzeButton.disabled =
            true;

        analyzeButton.textContent =
            "Analyzing...";
    }


    try {

        // ----------------------------------------------------
        // CHECK LOGIN
        // ----------------------------------------------------

        const userResponse =
            await fetch(
                `${API_BASE}/api/me`,
                {
                    credentials: "include"
                }
            );


        if (!userResponse.ok) {

            alert(
                "Please sign in first."
            );

            window.location.href =
                "signin.html";

            return;
        }


        // ----------------------------------------------------
        // SAVE ORIGINAL IMAGE
        // ----------------------------------------------------

        const originalImageData =
            await fileToDataURL(
                selectedImage
            );


        // ----------------------------------------------------
        // SEND IMAGE TO BACKEND
        // ----------------------------------------------------

        const formData =
            new FormData();


        formData.append(
            "image",
            selectedImage
        );


        const response =
            await fetch(
                `${API_BASE}/predict`,
                {
                    method: "POST",
                    credentials: "include",
                    body: formData
                }
            );


        // ----------------------------------------------------
        // CHECK RESPONSE
        // ----------------------------------------------------

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            const text =
                await response.text();


            throw new Error(
                "Server did not return JSON. " +
                text.substring(0, 200)
            );
        }


        const data =
            await response.json();


        if (
            !response.ok ||
            data.success === false
        ) {

            if (
                response.status === 401
            ) {

                window.location.href =
                    "signin.html";

                return;
            }


            throw new Error(
                data.error ||
                data.message ||
                "Analysis failed."
            );
        }


        // ----------------------------------------------------
        // CREATE OUTPUT URL
        // ----------------------------------------------------

        if (data.output_url) {

            if (
                data.output_url.startsWith("http")
            ) {

                // Already absolute
                data.output_url =
                    data.output_url;

            } else {

                data.output_url =
                    `${API_BASE}${data.output_url}`;
            }

        } else if (
            data.output_filename
        ) {

            data.output_url =
                `${API_BASE}/outputs/${encodeURIComponent(
                    data.output_filename
                )}`;
        }


        // ----------------------------------------------------
        // ORIGINAL IMAGE
        // ----------------------------------------------------

        data.original_image_data =
            originalImageData;

        data.original_filename =
            selectedImage.name;


        // ----------------------------------------------------
        // SAVE RESULT
        // ----------------------------------------------------

        sessionStorage.setItem(
            "analysisResult",
            JSON.stringify(data)
        );


        // ----------------------------------------------------
        // GO TO RESULTS
        // ----------------------------------------------------

        window.location.href =
            "results.html";


    } catch (error) {

        console.error(
            "Analysis error:",
            error
        );


        alert(
            error.message ||
            "Unable to analyze image."
        );


    } finally {

        if (analyzeButton) {

            analyzeButton.disabled =
                false;

            analyzeButton.textContent =
                "Analyze Image";
        }
    }
}


// ============================================================
// CAMERA
// ============================================================

async function startCamera() {

    const video =
        document.getElementById(
            "cameraVideo"
        );


    if (!video) {
        return;
    }


    try {

        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({
                    video: true,
                    audio: false
                });


        video.srcObject =
            cameraStream;

        video.style.display =
            "block";


        await video.play();


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        alert(
            "Unable to access camera. Please allow camera permission."
        );
    }
}


// ============================================================
// STOP CAMERA
// ============================================================

function stopCamera() {

    if (!cameraStream) {
        return;
    }


    cameraStream
        .getTracks()
        .forEach(track => {
            track.stop();
        });


    cameraStream = null;
}


// ============================================================
// CAPTURE CAMERA IMAGE
// ============================================================

function captureImage() {

    const video =
        document.getElementById(
            "cameraVideo"
        );


    if (!video) {
        return;
    }


    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        alert(
            "Camera is not ready yet."
        );

        return;
    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext("2d");


    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    canvas.toBlob(
        blob => {

            if (!blob) {
                return;
            }


            selectedImage =
                new File(
                    [blob],
                    "camera_capture.jpg",
                    {
                        type: "image/jpeg"
                    }
                );


            previewSelectedImage(
                selectedImage
            );


            stopCamera();

        },

        "image/jpeg",

        0.95
    );
}


// ============================================================
// LOAD RESULTS
// ============================================================

function loadResults() {

    const resultText =
        sessionStorage.getItem(
            "analysisResult"
        );


    if (!resultText) {

        console.log(
            "No analysis result found."
        );

        return;
    }


    try {

        const data =
            JSON.parse(resultText);


        displayResults(data);


    } catch (error) {

        console.error(
            "Result loading error:",
            error
        );
    }
}


// ============================================================
// DISPLAY RESULTS
// ============================================================

function displayResults(data) {

    console.log(
        "Analysis result:",
        data
    );


    // --------------------------------------------------------
    // TOTAL PARTICLES
    // --------------------------------------------------------

    const total =
        Number(
            data.total_particles || 0
        );


    const totalElement =
        document.getElementById(
            "totalParticles"
        );


    if (totalElement) {

        totalElement.textContent =
            total;
    }


    // --------------------------------------------------------
    // MICROPLASTIC COUNT
    // --------------------------------------------------------

    const microplastic =
        Number(
            data.plastic_particles || 0
        );


    const plasticElement =
        document.getElementById(
            "plasticParticles"
        );


    if (plasticElement) {

        plasticElement.textContent =
            microplastic;
    }


    // --------------------------------------------------------
    // NON-PLASTIC
    // --------------------------------------------------------

    const nonPlastic =
        Number(
            data.non_plastic_particles || 0
        );


    const nonPlasticElement =
        document.getElementById(
            "nonPlasticParticles"
        );


    if (nonPlasticElement) {

        nonPlasticElement.textContent =
            nonPlastic;
    }


    // --------------------------------------------------------
    // MICROPLASTIC DETECTION CARD
    // --------------------------------------------------------

    const microplasticCount =
        document.getElementById(
            "microplasticDetectionCount"
        );


    if (microplasticCount) {

        microplasticCount.textContent =
            microplastic;
    }


    // --------------------------------------------------------
    // MICROPLASTIC PROGRESS
    // --------------------------------------------------------

    const microplasticProgress =
        document.getElementById(
            "microplasticProgress"
        );


    if (microplasticProgress) {

        const percentage =
            total > 0
                ? (microplastic / total) * 100
                : 0;


        microplasticProgress.style.width =
            `${percentage}%`;
    }


    // --------------------------------------------------------
    // PURITY INDEX
    // --------------------------------------------------------

    let purity =
        Number(
            data.purity_index
        );


    if (Number.isNaN(purity)) {

        purity =
            total === 0
                ? 100
                : ((total - microplastic) /
                    total) * 100;
    }


    purity =
        Math.max(
            0,
            Math.min(
                100,
                purity
            )
        );


    const purityElement =
        document.getElementById(
            "purityIndex"
        );


    if (purityElement) {

        purityElement.textContent =
            `${purity.toFixed(1)}%`;
    }


    // --------------------------------------------------------
    // WATER STATUS
    // --------------------------------------------------------

    const status =
        data.water_status ||
        "Unknown";


    const statusElement =
        document.getElementById(
            "waterStatus"
        );


    if (statusElement) {

        statusElement.textContent =
            status;
    }


    const statusDescription =
        document.getElementById(
            "waterStatusDescription"
        );


    if (statusDescription) {

        if (
            status.toLowerCase() ===
            "safe"
        ) {

            statusDescription.textContent =
                "The detected microplastic count is within the application's defined threshold.";

        } else {

            statusDescription.textContent =
                "The detected microplastic count is above the application's defined threshold.";
        }
    }


    const statusCard =
        document.getElementById(
            "waterStatusCard"
        );


    if (statusCard) {

        statusCard.classList.remove(
            "safe",
            "unsafe"
        );


        if (
            status.toLowerCase() ===
            "safe"
        ) {

            statusCard.classList.add(
                "safe"
            );

        } else {

            statusCard.classList.add(
                "unsafe"
            );
        }
    }


    // --------------------------------------------------------
    // LOAD IMAGES
    // --------------------------------------------------------

    loadResultImages(data);


    // --------------------------------------------------------
    // MICROPLASTIC DETAILS
    // --------------------------------------------------------

    displayParticleClasses(
        data.detections || []
    );


    // --------------------------------------------------------
    // CONFIDENCE
    // --------------------------------------------------------

    displayConfidence(
        data.detections || []
    );


    // --------------------------------------------------------
    // DETECTION DETAILS
    // --------------------------------------------------------

    displayDetectionDetails(
        data.detections || []
    );


    // --------------------------------------------------------
    // CHART
    // --------------------------------------------------------

    createParticleChart(
        data.detections || []
    );
}


// ============================================================
// LOAD RESULT IMAGES
// ============================================================

function loadResultImages(data) {

    const originalImage =
        document.getElementById(
            "originalResultImage"
        );


    const outputImage =
        document.getElementById(
            "outputResultImage"
        );


    // ========================================================
    // ORIGINAL IMAGE
    // ========================================================

    if (originalImage) {

        let originalURL = null;


        if (data.original_image_data) {

            originalURL =
                data.original_image_data;

        } else if (data.original_url) {

            originalURL =
                data.original_url;

        } else if (
            data.original_filename
        ) {

            originalURL =
                `${API_BASE}/uploads/${encodeURIComponent(
                    data.original_filename
                )}`;
        }


        if (originalURL) {

            originalImage.src =
                originalURL;

            originalImage.style.display =
                "block";


            originalImage.onerror =
                function () {

                    console.error(
                        "Original image could not be loaded:",
                        originalURL
                    );

                    originalImage.style.display =
                        "none";


                    const text =
                        document.getElementById(
                            "originalImageText"
                        );


                    if (text) {

                        text.textContent =
                            "Original image could not be loaded.";
                    }
                };
        }
    }


    // ========================================================
    // OUTPUT / ANNOTATED IMAGE
    // ========================================================

    if (outputImage) {

        let outputURL = null;


        if (data.output_url) {

            outputURL =
                data.output_url;

        } else if (
            data.output_filename
        ) {

            outputURL =
                `${API_BASE}/outputs/${encodeURIComponent(
                    data.output_filename
                )}`;
        }


        if (outputURL) {

            if (
                outputURL.startsWith("/")
            ) {

                outputURL =
                    `${API_BASE}${outputURL}`;
            }


            outputImage.src =
                outputURL;

            outputImage.style.display =
                "block";


            outputImage.onload =
                function () {

                    console.log(
                        "Output image loaded successfully:",
                        outputURL
                    );
                };


            outputImage.onerror =
                function () {

                    console.error(
                        "Output image could not be loaded:",
                        outputURL
                    );


                    outputImage.alt =
                        "Detected image could not be loaded";


                    const text =
                        document.getElementById(
                            "outputImageText"
                        );


                    if (text) {

                        text.textContent =
                            "Detection result could not be loaded.";
                    }
                };

        } else {

            console.error(
                "No output image URL found.",
                data
            );
        }
    }
}


// ============================================================
// DISPLAY PARTICLE CLASSES
// Updated for Microplastic-only model
// ============================================================

function displayParticleClasses(
    detections
) {

    const container =
        document.getElementById(
            "particleList"
        ) ||
        document.getElementById(
            "particleClasses"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !detections ||
        detections.length === 0
    ) {

        container.innerHTML =
            "<p>No microplastic detected.</p>";

        return;
    }


    const count =
        detections.length;


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "particle-item";


    item.innerHTML = `
        <span>Microplastic</span>
        <strong>${count}</strong>
    `;


    container.appendChild(item);
}


// ============================================================
// DISPLAY CONFIDENCE
// ============================================================

function displayConfidence(
    detections
) {

    const container =
        document.getElementById(
            "confidenceList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !detections ||
        detections.length === 0
    ) {

        container.innerHTML =
            "<p>No detections available.</p>";

        return;
    }


    detections.forEach(
        (detection, index) => {

            const confidence =
                Number(
                    detection.confidence || 0
                );


            const percentage =
                confidence <= 1
                    ? confidence * 100
                    : confidence;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "confidence-item";


            item.innerHTML = `
                <div class="confidence-header">
                    <span>
                        Microplastic ${index + 1}
                    </span>

                    <strong>
                        ${percentage.toFixed(1)}%
                    </strong>
                </div>

                <div class="confidence-bar">
                    <div
                        class="confidence-fill"
                        style="width: ${Math.min(
                            100,
                            percentage
                        )}%"
                    ></div>
                </div>
            `;


            container.appendChild(item);
        }
    );
}


// ============================================================
// DISPLAY DETECTION DETAILS
// ============================================================

function displayDetectionDetails(
    detections
) {

    const container =
        document.getElementById(
            "detectionList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !detections ||
        detections.length === 0
    ) {

        container.innerHTML =
            "<p>No microplastic detections found.</p>";

        return;
    }


    detections.forEach(
        (detection, index) => {

            const confidence =
                Number(
                    detection.confidence || 0
                );


            const percentage =
                confidence <= 1
                    ? confidence * 100
                    : confidence;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "detection-item";


            item.innerHTML = `
                <div>
                    <strong>
                        Detection ${index + 1}
                    </strong>

                    <span>
                        Microplastic
                    </span>
                </div>

                <strong>
                    ${percentage.toFixed(1)}%
                </strong>
            `;


            container.appendChild(item);
        }
    );
}


// ============================================================
// CREATE PARTICLE CHART
// ============================================================

function createParticleChart(
    detections
) {

    const canvas =
        document.getElementById(
            "particleChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.log(
            "Chart.js is not loaded."
        );

        return;
    }


    const count =
        detections
            ? detections.length
            : 0;


    if (particleChart) {

        particleChart.destroy();

        particleChart = null;
    }


    particleChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels: [
                        "Microplastic"
                    ],

                    datasets: [
                        {
                            label:
                                "Particle Count",

                            data: [
                                count
                            ]
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: true
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );
}


// ============================================================
// HISTORY
// ============================================================

async function loadHistory() {

    const tableBody =
        document.getElementById(
            "historyTableBody"
        );


    if (!tableBody) {
        return;
    }


    try {

        const user =
            await loadCurrentUser();


        if (!user) {

            window.location.href =
                "signin.html";

            return;
        }


        const response =
            await fetch(
                `${API_BASE}/api/history`,
                {
                    credentials: "include"
                }
            );


        if (
            response.status ===
            401
        ) {

            window.location.href =
                "signin.html";

            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                "Could not load history."
            );
        }


        const history =
            data.history ||
            data.analyses ||
            data.results ||
            [];


        tableBody.innerHTML =
            "";


        if (
            history.length === 0
        ) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `
                <td colspan="9">
                    No analysis history found.
                </td>
            `;


            tableBody.appendChild(row);

            return;
        }


        history.forEach(item => {

            tableBody.appendChild(
                createHistoryRow(item)
            );

        });


    } catch (error) {

        console.error(
            "History error:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    Unable to load history.
                </td>
            </tr>
        `;
    }
}


// ============================================================
// CREATE HISTORY ROW
// ============================================================

function createHistoryRow(item) {

    const row =
        document.createElement(
            "tr"
        );


    const originalURL =
        item.original_filename
            ? `${API_BASE}/uploads/${encodeURIComponent(
                item.original_filename
            )}`
            : "";


    const outputURL =
        item.output_filename
            ? `${API_BASE}/outputs/${encodeURIComponent(
                item.output_filename
            )}`
            : "";


    const purity =
        Number(
            item.purity_index || 0
        ).toFixed(1);


    row.innerHTML = `

        <td>
            ${formatDate(
                item.created_at
            )}
        </td>


        <td>

            ${
                originalURL

                ? `
                    <img
                        src="${originalURL}"
                        class="history-image"
                        alt="Original"
                        onerror="
                            this.style.display='none'
                        "
                    >
                  `

                : "No image"
            }

        </td>


        <td>

            ${
                outputURL

                ? `
                    <img
                        src="${outputURL}"
                        class="history-image"
                        alt="Detected"
                        onerror="
                            this.style.display='none'
                        "
                    >
                  `

                : "No image"
            }

        </td>


        <td>
            ${item.total_particles ?? 0}
        </td>


        <td>
            ${item.plastic_particles ?? 0}
        </td>


        <td>
            ${item.non_plastic_particles ?? 0}
        </td>


        <td>
            ${purity}%
        </td>


        <td>

            <span class="status-badge">

                ${escapeHTML(
                    item.water_status ||
                    "Unknown"
                )}

            </span>

        </td>


        <td>

            <button
                type="button"
                class="view-history-btn"
                onclick="viewHistoryResult(${item.id})"
            >
                View
            </button>

        </td>

    `;


    return row;
}


// ============================================================
// VIEW OLD HISTORY RESULT
// ============================================================

async function viewHistoryResult(
    analysisId
) {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/history`,
                {
                    credentials: "include"
                }
            );


        if (
            response.status ===
            401
        ) {

            window.location.href =
                "signin.html";

            return;
        }


        const data =
            await response.json();


        const history =
            data.history ||
            data.analyses ||
            data.results ||
            [];


        const item =
            history.find(
                record =>
                    Number(record.id) ===
                    Number(analysisId)
            );


        if (!item) {

            alert(
                "Analysis record not found."
            );

            return;
        }


        const result = {

            analysis_id:
                item.id,


            total_particles:
                item.total_particles || 0,


            plastic_particles:
                item.plastic_particles || 0,


            non_plastic_particles:
                item.non_plastic_particles || 0,


            water_status:
                item.water_status ||
                "Unknown",


            purity_index:
                item.purity_index ??
                100,


            detections:
                parseDetections(
                    item.detections
                ),


            original_filename:
                item.original_filename,


            output_filename:
                item.output_filename,


            original_url:
                item.original_filename
                    ? `${API_BASE}/uploads/${encodeURIComponent(
                        item.original_filename
                    )}`
                    : null,


            output_url:
                item.output_filename
                    ? `${API_BASE}/outputs/${encodeURIComponent(
                        item.output_filename
                    )}`
                    : null
        };


        sessionStorage.setItem(
            "analysisResult",
            JSON.stringify(result)
        );


        window.location.href =
            "results.html";


    } catch (error) {

        console.error(
            "View history error:",
            error
        );


        alert(
            "Unable to open analysis."
        );
    }
}


// ============================================================
// PARSE DETECTIONS
// ============================================================

function parseDetections(
    detections
) {

    if (
        Array.isArray(
            detections
        )
    ) {

        return detections;
    }


    if (!detections) {
        return [];
    }


    try {

        return JSON.parse(
            detections
        );

    } catch (error) {

        console.error(
            "Detection parsing error:",
            error
        );

        return [];
    }
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;
    }


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// ============================================================
// DOWNLOAD / PRINT REPORT
// ============================================================

function downloadPDFReport() {

    window.print();
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(
            value ?? ""
        );


    return div.innerHTML;
}


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    const user =
        await loadCurrentUser();


    if (!user) {

        window.location.href =
            "signin.html";

        return;
    }
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const page =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        // ----------------------------------------------------
        // AUTH PAGES
        // ----------------------------------------------------

        if (
            page === "signin.html" ||
            page === "signup.html"
        ) {

            return;
        }


        // ----------------------------------------------------
        // DASHBOARD
        // ----------------------------------------------------

        if (
            page === "dashboard.html"
        ) {

            await loadDashboard();
        }


        // ----------------------------------------------------
        // RESULTS
        // ----------------------------------------------------

        if (
            page === "results.html"
        ) {

            const user =
                await loadCurrentUser();


            if (!user) {

                window.location.href =
                    "signin.html";

                return;
            }


            loadResults();
        }


        // ----------------------------------------------------
        // HISTORY
        // ----------------------------------------------------

        if (
            page === "history.html"
        ) {

            await loadHistory();
        }


        // ----------------------------------------------------
        // INDEX / HOME
        // ----------------------------------------------------

        if (
            page === "index.html" ||
            page === ""
        ) {

            // Home page does not require login.
            // Analysis button checks login.
        }

    }
);