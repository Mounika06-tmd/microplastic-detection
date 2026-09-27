console.log("=================================");
console.log("MICROPLASTIC DETECTION JS LOADED");
console.log("=================================");


// ============================================================
// ELEMENTS
// ============================================================

const imageInput =
    document.getElementById("imageInput");

const analyzeButton =
    document.getElementById("analyzeButton");

const imagePreview =
    document.getElementById("imagePreview");

const previewText =
    document.getElementById("previewText");

const originalResultImage =
    document.getElementById("originalResultImage");

const originalImageText =
    document.getElementById("originalImageText");

const outputResultImage =
    document.getElementById("outputResultImage");

const outputImageText =
    document.getElementById("outputImageText");

const totalParticles =
    document.getElementById("totalParticles");

const plasticParticles =
    document.getElementById("plasticParticles");

const nonPlasticParticles =
    document.getElementById("nonPlasticParticles");

const waterStatus =
    document.getElementById("waterStatus");

const detectionList =
    document.getElementById("detectionList");

const downloadButton =
    document.getElementById("downloadButton");

const resultsSection =
    document.getElementById("results");


// ============================================================
// SELECTED FILE
// ============================================================

let selectedFile = null;


// ============================================================
// UPLOAD
// ============================================================

imageInput.addEventListener(
    "change",
    function () {

        const file =
            imageInput.files[0];

        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            alert(
                "Please select an image."
            );

            return;
        }


        selectedFile = file;


        console.log(
            "Selected:",
            file.name
        );


        const imageURL =
            URL.createObjectURL(file);


        imagePreview.src =
            imageURL;


        imagePreview.style.display =
            "block";


        previewText.style.display =
            "none";
    }
);


// ============================================================
// ANALYZE
// ============================================================

analyzeButton.addEventListener(
    "click",
    async function () {

        console.log(
            "ANALYZE CLICKED"
        );


        if (!selectedFile) {

            alert(
                "Please upload an image first."
            );

            return;
        }


        // ----------------------------------------------------
        // ORIGINAL IMAGE
        // ----------------------------------------------------

        const originalURL =
            URL.createObjectURL(
                selectedFile
            );


        originalResultImage.src =
            originalURL;


        originalResultImage.style.display =
            "block";


        originalImageText.style.display =
            "none";


        // ----------------------------------------------------
        // FORM DATA
        // ----------------------------------------------------

        const formData =
            new FormData();


        formData.append(
            "image",
            selectedFile
        );


        analyzeButton.disabled =
            true;


        analyzeButton.textContent =
            "Analyzing...";


        try {

            console.log(
                "Sending request..."
            );


            // IMPORTANT:
            // Relative URL because Flask serves frontend.

            const response =
                await fetch(
                    "/predict",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            console.log(
                "Response:",
                response.status
            );


            const data =
                await response.json();


            console.log(
                "Backend response:",
                data
            );


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Backend error"
                );
            }


            if (!data.success) {

                throw new Error(
                    data.error ||
                    "Analysis failed"
                );
            }


            // =================================================
            // OUTPUT IMAGE
            // =================================================

            console.log(
                "Output URL:",
                data.output_url
            );


            /*
                Flask returns:

                /outputs/result_123456.png

                Browser automatically requests:

                http://127.0.0.1:5000/outputs/...
            */

            const outputURL =
                data.output_url
                + "?t="
                + Date.now();


            console.log(
                "Final image URL:",
                outputURL
            );


            // Set image

            outputResultImage.src =
                outputURL;


            // Make image visible

            outputResultImage.style.display =
                "block";


            outputResultImage.style.visibility =
                "visible";


            outputResultImage.style.opacity =
                "1";


            outputResultImage.style.width =
                "100%";


            outputImageText.style.display =
                "none";


            // ------------------------------------------------
            // IMAGE LOAD
            // ------------------------------------------------

            outputResultImage.onload =
                function () {

                    console.log(
                        "********************************"
                    );

                    console.log(
                        "OUTPUT IMAGE LOADED SUCCESSFULLY"
                    );

                    console.log(
                        "********************************"
                    );
                };


            outputResultImage.onerror =
                function () {

                    console.error(
                        "********************************"
                    );

                    console.error(
                        "OUTPUT IMAGE FAILED TO LOAD"
                    );

                    console.error(
                        "********************************"
                    );


                    outputImageText.textContent =
                        "Output image could not be loaded.";

                    outputImageText.style.display =
                        "block";
                };


            // =================================================
            // COUNTS
            // =================================================

            totalParticles.textContent =
                data.total_particles;


            plasticParticles.textContent =
                data.plastic_particles;


            nonPlasticParticles.textContent =
                data.non_plastic_particles;


            // =================================================
            // STATUS
            // =================================================

            waterStatus.textContent =
                data.water_status;


            // =================================================
            // DETECTIONS
            // =================================================

            detectionList.innerHTML =
                "";


            if (
                !data.detections ||
                data.detections.length === 0
            ) {

                detectionList.innerHTML = `
                    <p>
                        No particles detected.
                    </p>
                `;

            }

            else {

                data.detections.forEach(
                    function (detection) {

                        const item =
                            document.createElement(
                                "div"
                            );


                        item.className =
                            "detection-item";


                        item.innerHTML = `
                            <span>
                                ${detection.class}
                            </span>

                            <span>
                                ${(detection.confidence * 100).toFixed(1)}%
                            </span>
                        `;


                        detectionList.appendChild(
                            item
                        );
                    }
                );
            }


            // =================================================
            // DOWNLOAD
            // =================================================

            downloadButton.href =
                data.output_url;


            downloadButton.download =
                "microplastic_detection_result.png";


            downloadButton.style.display =
                "block";


            // =================================================
            // SHOW RESULTS
            // =================================================

            resultsSection.scrollIntoView({
                behavior: "smooth"
            });


        }

        catch (error) {

            console.error(
                "ERROR:",
                error
            );


            alert(
                "Analysis error:\n\n" +
                error.message
            );

        }

        finally {

            analyzeButton.disabled =
                false;

            analyzeButton.textContent =
                "Analyze Image";
        }
    }
);