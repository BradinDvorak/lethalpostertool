const canvasDimens = {
    posters: [1024, 1024],
    tips: [796, 1024],
    painting: [512, 512]
}

const dimens = {
    posters: [
        [   0,   0, 341,  559],
        [ 346,   0, 285,  559],
        [ 641,  58, 274,  243],
        [ 184, 620, 411,  364],
        [ 632, 320, 372,  672]
    ],
    tips: [0, 0, 796, 1024],
    painting: [264, 19, 243, 324],
    overscanPainting: [271, 42, 228, 291]
};

const ratios = {
    posters: [
        0.7,
        0.8,
        1.333,
        1.6,
        0.75
    ],
    tips: 0.7,
    painting: 0.8,
    overscanPainting: 0.833
};

const textureCanvas = document.getElementById("texture");
const ctx = textureCanvas.getContext("2d");

ctx.imageSmoothingQuality = "high";

var type = "posters";
var stepDown = false;
var scale = 1;
var overscanCorrection = false;

window.addEventListener("DOMContentLoaded", updateCanvasType);

function clearCanvas() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

document.getElementById("edit-canvas").addEventListener("change", updateCanvasType);

document.getElementById("figurezone").addEventListener("change", function(e) {
    switch (e.target.tagName) {
        case "SELECT":
        case "INPUT":
            updateCanvas();
            break;
    }
});

document.getElementById("input-file").addEventListener("change", function() {
    for (let file of this.files) {
        addImage(URL.createObjectURL(file), file.name);
    }
});

document.getElementById("edit-remove-all").addEventListener("click", removeAllImages);

document.addEventListener("drop", dropImage);

document.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
});

document.getElementById("canvaszone").addEventListener("click", function() {
    this.classList.toggle("zoom");
});

function dropImage(e) {
    e.stopPropagation();
    e.preventDefault();

    for (let item of e.dataTransfer.items) {
        if (item.kind === "file") {
            const file = item.getAsFile();

            if (file.type.startsWith("image/")) {
                addImage(URL.createObjectURL(file), file.name);
            }
        } else if (item.type === "text/uri-list") {
            item.getAsString(url => addImage(url));
            break;
        }
    }
}

function addImage(url, name) {
    let figure = document.getElementById("figure-template").content.cloneNode(true).children[0];
    name ??= url.split("/").pop();

    figure.querySelector("img").src = url;

    figure.querySelector("img").addEventListener("load", function() {
        figure.querySelector(".figure-width").textContent = this.naturalWidth.toLocaleString();
        figure.querySelector(".figure-height").textContent = this.naturalHeight.toLocaleString();

        figure.querySelector(".figure-crop-x").value = 0;
        figure.querySelector(".figure-crop-y").value = 0;
        figure.querySelector(".figure-crop-w").value = this.naturalWidth;
        figure.querySelector(".figure-crop-h").value = this.naturalHeight;

        updateCanvas();
    });

    figure.querySelector("img").addEventListener("error", function(event) {
        figure.parentNode.removeChild(figure);

        Toastify({
            text: "Image failed to load",
            className: "error",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true
        }).showToast();

        updateCanvas();
    });

    figure.querySelector(".figure-name").textContent = name;
    figure.querySelector(".figure-name").title = name;

    figure.querySelector(".figure-button-delete").addEventListener("click", function() {
        figure.parentNode.removeChild(figure);
        updateCanvas();
    });

    figure.querySelector(".figure-select-fit").addEventListener("change", function() {
        let isCrop = this.value === "crop";

        figure.querySelector(".figure-crop").hidden = !isCrop;
        figure.querySelector(".figure-gravity").hidden = isCrop;
    });

    figure.querySelector(".figure-button-crop").addEventListener("click", function() {
        let index = [...figure.parentNode.children].indexOf(figure);
        let ratio = null;

        switch (type) {
            case "tips":
                ratio = ratios.tips;
                break;
            case "painting":
                ratio = ratios[overscanCorrection ? "overscanPainting" : "painting"];
                break;
            case "posters":
                ratio = ratios.posters[index % ratios.posters.length];
                break;
        }

        if (+figure.querySelector(".figure-select-rotate").value % 180) ratio = 1 / ratio;

        createCropperModal(figure, ratio);
    });

    figure = document.getElementById("figurezone").appendChild(figure);
}

function removeAllImages() {
    document.getElementById("figurezone").replaceChildren();
    updateCanvas();
}

function updateCanvas() {
    clearCanvas();

    const images = [...document.querySelectorAll("#figurezone figure")];
    
    switch (type) {
        case "tips": {
            if (!images.length) break;

            let img = images[0].querySelector("img"),
                crop = images[0].querySelector(".figure-select-fit").value,
                gravity = images[0].querySelector(".figure-select-gravity").value,
                rotation = +images[0].querySelector(".figure-select-rotate").value;
            
            if (crop === "crop") crop = [
                images[0].querySelector(".figure-crop-x").value,
                images[0].querySelector(".figure-crop-y").value,
                images[0].querySelector(".figure-crop-w").value,
                images[0].querySelector(".figure-crop-h").value
            ];

            let [dx, dy, dw, dh] = dimens.tips.map(d => d * scale);

            let r = ratios.tips;

            if (rotation) {
                img = rotateImage(img, rotation);
            }
            
            drawImageRatioCrop(
                ctx, img,
                dx, dy, dw, dh,
                r, crop, gravity
            );

            break;
        }
        case "painting": {
            const interpolation = ctx.imageSmoothingEnabled;
            const key = overscanCorrection ? "overscanPainting" : "painting";
            
            ctx.imageSmoothingEnabled = false;
            
            ctx.drawImage(document.getElementById("img-painting-bg"), 0, 0, ctx.canvas.width, ctx.canvas.height);

            ctx.imageSmoothingEnabled = interpolation;

            if (!images.length) break;

            let img = images[0].querySelector("img"),
                crop = images[0].querySelector(".figure-select-fit").value,
                gravity = images[0].querySelector(".figure-select-gravity").value,
                rotation = +images[0].querySelector(".figure-select-rotate").value;

            if (crop === "crop") crop = [
                images[0].querySelector(".figure-crop-x").value,
                images[0].querySelector(".figure-crop-y").value,
                images[0].querySelector(".figure-crop-w").value,
                images[0].querySelector(".figure-crop-h").value
            ];

            let [dx, dy, dw, dh] = dimens[key].map(d => d * scale);

            let r = ratios[key];

            if (rotation) {
                img = rotateImage(img, rotation);
            }
            
            drawImageRatioCrop(
                ctx, img,
                dx, dy, dw, dh,
                r, crop, gravity
            );

            break;
        }
        case "posters":
        default: {
            for (let i = 0; i < Math.min(images.length, 5); ++i) {
                let img = images[i].querySelector("img"),
                    crop = images[i].querySelector(".figure-select-fit").value,
                    gravity = images[i].querySelector(".figure-select-gravity").value,
                    rotation = +images[i].querySelector(".figure-select-rotate").value;
                
                if (crop === "crop") crop = [
                    images[i].querySelector(".figure-crop-x").value,
                    images[i].querySelector(".figure-crop-y").value,
                    images[i].querySelector(".figure-crop-w").value,
                    images[i].querySelector(".figure-crop-h").value
                ];
        
                let [dx, dy, dw, dh] = dimens.posters[i].map(d => d * scale);
        
                let r = ratios.posters[i];

                if (rotation) {
                    img = rotateImage(img, rotation);
                }
        
                drawImageRatioCrop(
                    ctx, img,
                    dx, dy, dw, dh,
                    r, crop, gravity
                );
            }
        }
    }
}

function updateCanvasType() {
    let testType = document.getElementById("edit-canvas-form").elements["radio-canvas-type"].value;

    if (["posters", "tips", "painting"].includes(testType)) type = testType;
    else type = "posters";

    scale = Math.min(Math.max(0.5, +document.getElementById("edit-canvas-form").elements["radio-canvas-scale"].value), 4);

    [textureCanvas.width, textureCanvas.height] = canvasDimens[type].map(d => d * scale);

    switch (document.getElementById("select-canvas-interpolation").value) {
        case "nearest":
            stepDown = false;
            ctx.imageSmoothingEnabled = false;
            break;
        case "stepdown":
            stepDown = true;
            ctx.imageSmoothingEnabled = true;
            break;
        case "linear":
            stepDown = false;
            ctx.imageSmoothingEnabled = true;
            break;
    }

    overscanCorrection = document.getElementById("select-canvas-overscan").checked;

    for (let radio of document.getElementById("edit-canvas-form").elements["radio-canvas-type"]) {
        if (!["posters", "tips", "painting"].includes(radio.value)) return;
        radio.parentNode.title = `${(canvasDimens[radio.value][0] * scale).toLocaleString()} × ${(canvasDimens[radio.value][1] * scale).toLocaleString()}`;
    }

    for (let radio of document.getElementById("edit-canvas-form").elements["radio-canvas-scale"]) {
        radio.parentNode.title = `${(canvasDimens[type][0] * +radio.value).toLocaleString()} × ${(canvasDimens[type][1] * +radio.value).toLocaleString()}`;
    }

    updateCanvas();
}

let figureSort = new Sortable(document.getElementById("figurezone"), {
    ghostClass: "ghost",
    onUpdate() {
        updateCanvas();
    }
});

function drawImageRatioCrop(context, image, destX, destY, destW, destH, ratio = 1, crop = "contain", gravity = "ne") {
    let sourceW = image.naturalWidth ?? image.width,
        sourceH = image.naturalHeight ?? image.height,
        sourceRatio = sourceW / sourceH;
    let offsetX = 0,
        offsetY = 0,
        offsetW = sourceW,
        offsetH = sourceH;
    let scale = 1;
    
    if (!ratio || isNaN(ratio)) ratio = destW / destH;

    switch (crop) {
        case "contain":
            if (sourceRatio > ratio) {
                offsetH = sourceW / ratio;

                if (gravity.includes("s")) {
                    offsetY = sourceH - offsetH;
                } else if (!gravity.includes("n")) {
                    offsetY = (sourceH - offsetH) / 2;
                }
            } else {
                offsetW = sourceH * ratio;

                if (gravity.includes("e")) {
                    offsetX = sourceW - offsetW;
                } else if (!gravity.includes("w")) {
                    offsetX = (sourceW - offsetW) / 2;
                }
            }

            break;
        case "cover":
            if (sourceRatio < ratio) {
                offsetH = sourceW / ratio;

                if (gravity.includes("s")) {
                    offsetY = sourceH - offsetH;
                } else if (!gravity.includes("n")) {
                    offsetY = (sourceH - offsetH) / 2;
                }
            } else {
                offsetW = sourceH * ratio;

                if (gravity.includes("e")) {
                    offsetX = sourceW - offsetW;
                } else if (!gravity.includes("w")) {
                    offsetX = (sourceW - offsetW) / 2;
                }
            }
            break;
        default:
            if (Array.isArray(crop)) [offsetX, offsetY, offsetW, offsetH] = crop;
            break;
        }
    
    if (stepDown) {
        image = stepDownImage(image, destW * (sourceW / offsetW), destH * (sourceH / offsetH));

        if ((image.naturalWidth ?? image.width) !== sourceW) {
            scale = (image.naturalWidth ?? image.width) / sourceW;

            offsetX *= scale;
            offsetY *= scale;
            offsetW *= scale;
            offsetH *= scale;
        }
    }

    context.drawImage(image, offsetX, offsetY, offsetW, offsetH, destX, destY, destW, destH);
};

function rotateImage(image, angle) {
    let rotationCanvas = new OffscreenCanvas(...(angle % 180 === 0 ? [image.naturalWidth, image.naturalHeight] : [image.naturalHeight, image.naturalWidth])),
        rotationCtx = rotationCanvas.getContext("2d");
    
    rotationCtx.imageSmoothingQuality = "high";
    
    rotationCtx.translate(rotationCanvas.width / 2, rotationCanvas.height / 2);
    rotationCtx.rotate(angle * Math.PI / 180);

    rotationCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    return rotationCanvas;
}

function stepDownImage(image, minW, minH) {
    let width = image.naturalWidth ?? image.width,
        height = image.naturalHeight ?? image.height;

    if (minW >= width / 2 || minH >= height / 2) return image;
    
    while (minW < width / 2 && minH < height / 2) {
        image = halveImage(image);

        width = image.naturalWidth ?? image.width;
        height = image.naturalHeight ?? image.height;
    }

    return image;
}

function halveImage(image) {
    let halveCanvas = new OffscreenCanvas((image.naturalWidth ?? image.width) / 2, (image.naturalHeight ?? image.height) / 2),
        halveCtx = halveCanvas.getContext("2d");
    
    halveCtx.drawImage(image, 0, 0, halveCanvas.width, halveCanvas.height);

    return halveCanvas;
}


// Croppr Modal

function createCropperModal(figure, ratio) {
    let cropModal = document.getElementById("cropmodal");
    let cropDialog = document.getElementById("cropmodal-template").content.cloneNode(true).children[0];
    let cropDefault = null;

    /* Glitchy
    if (figure.querySelector(".figure-crop-x").value !== "") cropDefault = [
        +figure.querySelector(".figure-crop-x").value,
        +figure.querySelector(".figure-crop-y").value,
        +figure.querySelector(".figure-crop-w").value,
        +figure.querySelector(".figure-crop-h").value
    ];
    */

    cropDialog.querySelector(".cropmodal-image").src = figure.querySelector("img").src;

    cropDialog.querySelector(".cropmodal-ratio").value = ratio;

    croppr = new Croppr(cropDialog.querySelector(".cropmodal-image"), {
        aspectRatio: ratio ? 1 / ratio : null,
        startSize: cropDefault ? [cropDefault[2], cropDefault[3], "px"] : null,
        onInitialize: cropDefault ? function(instance) {
            instance.moveTo(cropDefault[0], cropDefault[1]);
        } : null
    });

    const closeFunction = function() {
        let cropValue = croppr.getValue();

        figure.querySelector(".figure-crop-x").value = cropValue.x;
        figure.querySelector(".figure-crop-y").value = cropValue.y;
        figure.querySelector(".figure-crop-w").value = cropValue.width;
        figure.querySelector(".figure-crop-h").value = cropValue.height;

        figure.querySelector(".figure-select-fit").value = "crop";

        cropModal.close();
        cropModal.removeChild(cropDialog);
        updateCanvas();
    };

    cropDialog.querySelector(".cropmodal-close").addEventListener("click", closeFunction);

    cropModal.addEventListener("mousedown", function(event) {
        if (clickedOutOfBounds(event)) closeFunction();
    }, {once: true});

    cropModal.appendChild(cropDialog);

    cropModal.showModal();
}

document.getElementById("helpmodal").addEventListener("mousedown", function(event) {
    if (clickedOutOfBounds(event)) this.close();
});

function clickedOutOfBounds(event) {
    return event.offsetX < 0 || event.offsetX > event.target.offsetWidth || event.offsetY < 0 || event.offsetY > event.target.offsetHeight;
}