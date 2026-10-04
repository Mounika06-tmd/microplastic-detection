// ============================================================
// MICROPLASTIC DETECTION - MAIN JAVASCRIPT
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
        console.error(error);
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
            localStorage.setItem("user", JSON.stringify(data.user));

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

    const nameElement = document.getElementById("fullName");
    const emailElement = document.getElementById("email");
    const passwordElement = document.getElementById("password");

    if (!nameElement || !emailElement || !passwordElement) {
        return;
    }

    const full_name = nameElement.value.trim();
    const email = emailElement.value.trim();
    const password = passwordElement.value;

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

        const data = await response.json();

        if (!response.ok || !data.success) {
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
            window.location.href = "dashboard.html";
        }, 800);

    } catch (error) {

        console.error(error);

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

    const emailElement = document.getElementById("email");
    const passwordElement = document.getElementById("password");

    if (!emailElement || !passwordElement) {
        return;
    }

    const email = emailElement.value.trim();
    const password = passwordElement.value;

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

        const data = await response.json();

        if (!response.ok || !data.success) {
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

        window.location.href = "dashboard.html";

    } catch (error) {

        console.error(error);

        showAuthMessage(
            error.message,
            "error"
        );
    }
}


// ============================================================
// AUTH MESSAGE
// ============================================================

function showAuthMessage(message, type = "error") {

    const element =
        document.getElementById("authMessage");

    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;
    element.className = `auth-message ${type}`;
}


// ============================================================
// IMAGE SELECTION
// ============================================================

function handleImageSelection(event) {

    const file = event.target.files[0];

    if (!file) {
        return;
    }

    selectedImage = file;

    previewSelectedImage(file);
}


// ============================================================
// PREVIEW IMAGE
// ============================================================

function previewSelectedImage(file) {

    if (!file) {
        return;
    }

    selectedImage = file;

    const preview =
        document.getElementById("previewImage");

    if (preview) {

        if (preview.src &&
            preview.src.startsWith("blob:")) {

            URL.revokeObjectURL(preview.src);
        }

        preview.src =
            URL.createObjectURL(file);

        preview.style.display = "block";
    }

    const previewArea =
        document.getElementById("previewArea");

    if (previewArea) {
        previewArea.style.display = "block";
    }
}


// ============================================================
// FILE TO DATA URL
// Used so original image is available on results page
// ============================================================

function fileToDataURL(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}


// ============================================================
// ANALYZE IMAGE
// ============================================================

async function analyzeImage() {

    if (!selectedImage) {

        alert("Please select an image first.");

        return;
    }

    const analyzeButton =
        document.getElementById("analyzeButton");

    if (analyzeButton) {

        analyzeButton.disabled = true;
        analyzeButton.textContent = "Analyzing...";
    }

    try {

        // ----------------------------------------------------
        // CHECK LOGIN
        // ----------------------------------------------------

        const userResponse =
            await fetch(`${API_BASE}/api/me`, {
                credentials: "include"
            });

        if (!userResponse.ok) {

            alert("Please sign in first.");

            window.location.href = "signin.html";

            return;
        }


        // ----------------------------------------------------
        // SAVE ORIGINAL IMAGE
        // ----------------------------------------------------

        const originalImageData =
            await fileToDataURL(selectedImage);


        // ----------------------------------------------------
        // SEND IMAGE TO BACKEND
        // ----------------------------------------------------

        const formData = new FormData();

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
            response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {

            const text =
                await response.text();

            throw new Error(
                "Server did not return JSON. " +
                text.substring(0, 200)
            );
        }


        const data =
            await response.json();


        if (!response.ok || data.success === false) {

            if (response.status === 401) {

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
        // CREATE CORRECT OUTPUT URL
        // ----------------------------------------------------

        if (data.output_url) {

            if (data.output_url.startsWith("http")) {

                data.output_url =
                    data.output_url;

            } else {

                data.output_url =
                    `${API_BASE}${data.output_url}`;
            }

        } else if (data.output_filename) {

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

            analyzeButton.disabled = false;

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
        document.getElementById("cameraVideo");

    if (!video) {
        return;
    }

    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({
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
        .forEach(track => track.stop());

    cameraStream = null;
}


// ============================================================
// CAPTURE CAMERA IMAGE
// ============================================================

function captureImage() {

    const video =
        document.getElementById("cameraVideo");

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
        document.createElement("canvas");

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

    const totalElement =
        document.getElementById(
            "totalParticles"
        );

    if (totalElement) {

        totalElement.textContent =
            data.total_particles ?? 0;
    }


    // --------------------------------------------------------
    // PLASTIC PARTICLES
    // --------------------------------------------------------

    const plasticElement =
        document.getElementById(
            "plasticParticles"
        );

    if (plasticElement) {

        plasticElement.textContent =
            data.plastic_particles ?? 0;
    }


    // --------------------------------------------------------
    // NON PLASTIC
    // --------------------------------------------------------

    const nonPlasticElement =
        document.getElementById(
            "nonPlasticParticles"
        );

    if (nonPlasticElement) {

        nonPlasticElement.textContent =
            data.non_plastic_particles ?? 0;
    }


    // --------------------------------------------------------
    // PURITY
    // --------------------------------------------------------

    let purity =
        Number(data.purity_index);

    if (Number.isNaN(purity)) {

        const total =
            Number(data.total_particles || 0);

        const plastic =
            Number(data.plastic_particles || 0);

        purity =
            total === 0
                ? 100
                : ((total - plastic) / total) * 100;
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
                "The detected plastic particle count is within the application's defined safe range.";

        } else {

            statusDescription.textContent =
                "The detected plastic particle count is above the application's defined threshold.";
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
    // PARTICLES
    // --------------------------------------------------------

    displayParticleClasses(
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

        // Highest priority:
        // original image saved in session
        if (data.original_image_data) {

            originalURL =
                data.original_image_data;
        }

        // Backend URL
        else if (data.original_url) {

            originalURL =
                data.original_url;
        }

        // Backend filename
        else if (data.original_filename) {

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

        } else if (data.output_filename) {

            outputURL =
                `${API_BASE}/outputs/${encodeURIComponent(
                    data.output_filename
                )}`;
        }


        if (outputURL) {

            // Make sure relative URL becomes absolute
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
                };
        } else {

            console.error(
                "No output image URL found in backend response.",
                data
            );
        }
    }
}


// ============================================================
// DISPLAY PARTICLE CLASSES
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
            "<p>No particles detected.</p>";

        return;
    }


    const counts = {};


    detections.forEach(
        detection => {

            const name =
                detection.class ||
                detection.name ||
                "Unknown";

            counts[name] =
                (counts[name] || 0) + 1;
        }
    );


    Object.entries(counts)
        .forEach(
            ([name, count]) => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "particle-item";

                item.innerHTML = `
                    <span>${escapeHTML(name)}</span>
                    <strong>${count}</strong>
                `;

                container.appendChild(
                    item
                );
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


    const counts = {};


    (detections || [])
        .forEach(
            detection => {

                const name =
                    detection.class ||
                    detection.name ||
                    "Unknown";

                counts[name] =
                    (counts[name] || 0) + 1;
            }
        );


    if (particleChart) {

        particleChart.destroy();
    }


    particleChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels:
                        Object.keys(counts),

                    datasets: [
                        {
                            label:
                                "Particle Count",

                            data:
                                Object.values(counts)
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
                            beginAtZero: true
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


        if (response.status === 401) {

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


        tableBody.innerHTML = "";


        if (history.length === 0) {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td colspan="9">
                    No analysis history found.
                </td>
            `;

            tableBody.appendChild(
                row
            );

            return;
        }


        history.forEach(
            item => {

                tableBody.appendChild(
                    createHistoryRow(item)
                );
            }
        );

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
        Number(item.purity_index || 0)
            .toFixed(1);


    row.innerHTML = `
        <td>
            ${formatDate(item.created_at)}
        </td>

        <td>
            ${
                originalURL
                ? `
                    <img
                        src="${originalURL}"
                        class="history-image"
                        alt="Original"
                        onerror="this.style.display='none'"
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
                        onerror="this.style.display='none'"
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
                    item.water_status || "Unknown"
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


        if (response.status === 401) {

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
                item.water_status || "Unknown",

            purity_index:
                item.purity_index ?? 100,

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

    if (Array.isArray(detections)) {
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

    if (Number.isNaN(
        date.getTime()
    )) {

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

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(value ?? "");

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
            page === "dashboard.html" ||
            page === ""
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
        // INDEX
        // ----------------------------------------------------

        if (
            page === "index.html"
        ) {

            // Home page does not require login.
            // Analysis button checks login.
        }
    }
);