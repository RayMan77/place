/**
 * Created by zeman on 11-Apr-17.
 */
(function () {
    /**
     * Init page
     */
    "use strict";
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    let name = false;
    let body = document.querySelector("body");
    let content = document.querySelector('#content');
    let input = document.querySelector('#inputName');
    let status = document.querySelector('#status');
    let submitName = document.querySelector('#submitName');
    let inputBox = document.querySelector("#inputBox");
    let overlayShade = document.querySelector("#overlayShade");
    let colorPicker = document.querySelector("#colorPicker");
    let mousePosSpan = document.querySelector("#mousePos");
    let mousePixelPosSpan = document.querySelector("#mousePixelPos");
    let socket = io('http://localhost:1337');
    let canvas = document.querySelector("canvas");
    let selectedPixSizeIndex = 1;
    const pixSizes = [50, 20, 10];
    let pixSize = pixSizes[selectedPixSizeIndex];
    let board = [];
    let boardSize = {width: 0, height: 0};
    let mousePos = {x: 0, y: 0};
    let mousePixelPos = {x: 0, y: 0};
    let leftButtonClicked = {clicked: false, startX: 0, startY: 0, mouseMoved: false};
    let renderOptimization = false;
    let currentRenderOptimizationCd = 0;
    const renderOptimizationCd = 10;

    let colorPanel = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange', 'gray', 'black', 'white'];
    let screenLocation = {x: 0, y: 0};

    class Color {
        constructor(r, g, b, a) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }

        toString() {
            return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
        }
    }

    let selectedColor = false;
    overlayShade.width = window.innerWidth;
    overlayShade.height = window.innerHeight;

    /**
     *  Functions
     */

    let getMousePos = (event) => {
        let rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    };

    let getMousePixelPos = (event) => {
        let rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor((event.clientX - rect.left - screenLocation.x) / pixSize),
            y: Math.floor((event.clientY - rect.top - screenLocation.y) / pixSize)
        }
    };

    let writeMousePosition = () => {
        mousePixelPosSpan.innerHTML = "(" + mousePixelPos.x + "," + mousePixelPos.y + ")";
        mousePosSpan.innerHTML = "(" + mousePos.x + " ," + mousePos.y + " )";
    };

    let paintPixels = (context, optimize) => {
        let renderedPixels = board.filter((rec) =>
        (rec.pixelX * pixSize) + screenLocation.x > -pixSize &&
        (rec.pixelY * pixSize) + screenLocation.y > -pixSize &&
        (rec.pixelX * pixSize) + screenLocation.x < canvas.width &&
        (rec.pixelY * pixSize) + screenLocation.y < canvas.height);

        if (optimize) {
            renderedPixels = board.filter((rec) =>
                rec.pixelX >= mousePixelPos.x - 2 &&
                rec.pixelY >= mousePixelPos.y - 2 &&
                rec.pixelX <= mousePixelPos.x + 2 &&
                rec.pixelY <= mousePixelPos.y + 2
            );
        }

        console.log(renderedPixels.length);
        renderedPixels
            .forEach((rec) => {
                context.fillStyle = rec.pixelColor.toString();
                context.fillRect(
                    (rec.pixelX * pixSize) + screenLocation.x,
                    (rec.pixelY * pixSize) + screenLocation.y,
                    pixSize, pixSize);

                if (mousePixelPos.x === rec.pixelX && mousePixelPos.y === rec.pixelY) {
                    context.fillStyle = new Color(selectedColor.r, selectedColor.g, selectedColor.b, 0.5);
                    context.fillRect(
                        (rec.pixelX * pixSize) + screenLocation.x,
                        (rec.pixelY * pixSize) + screenLocation.y,
                        pixSize, pixSize);
                    context.beginPath();
                    context.lineWidth = "1px";
                    context.strokeStyle = "black";
                    context.rect((rec.pixelX * pixSize) + screenLocation.x + 1,
                        (rec.pixelY * pixSize) + screenLocation.y + 1,
                        pixSize - 2, pixSize - 2);
                    context.stroke();
                }
            });
    };

    let refreshCanvas = () => {

        let context = canvas.getContext('2d');
        context.fillStyle = "gray";

        if (!renderOptimization || leftButtonClicked.clicked || currentRenderOptimizationCd >= renderOptimizationCd) {
            context.fillRect(0, 0, canvas.width, canvas.height);
            paintPixels(context, false);

        } else {
            paintPixels(context, true);
            console.log("optimizing");
        }

        if (currentRenderOptimizationCd >= renderOptimizationCd) {
            currentRenderOptimizationCd = 0;
        }

        if (!renderOptimization) {
            renderOptimization = true;
        }
        currentRenderOptimizationCd++;
    };

    let resizeCanvas = () => {
        canvas.height = window.innerHeight - 50;//- bottom panel height
        canvas.width = window.innerWidth;
        renderOptimization = true;
        refreshCanvas();
        console.log("resizing")
    };

    /**
     * Event Listeners
     */

    submitName.addEventListener("click", (event) => {
        name = input.value;
        input.setAttribute("disabled", "disabled");
        overlayShade.style.visibility = "hidden";
        inputBox.style.visibility = "hidden";
        submitName.setAttribute("disabled", "disabled");
        refreshCanvas();

    });

    canvas.addEventListener('mousemove', (event) => {
        mousePos = getMousePos(event);
        writeMousePosition();
        if (leftButtonClicked.clicked) {
            screenLocation.x = (mousePos.x - leftButtonClicked.startX);
            screenLocation.y = (mousePos.y - leftButtonClicked.startY);
            leftButtonClicked.mouseMoved = true;
        }
        let tmp = getMousePixelPos(event);
        if (tmp.x !== mousePixelPos.x || tmp.y !== mousePixelPos.y ||
            (leftButtonClicked.mouseMoved && leftButtonClicked.clicked)) {
            mousePixelPos = getMousePixelPos(event);
            refreshCanvas();
        }

    });

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
            leftButtonClicked.clicked = true;
            leftButtonClicked.mouseMoved = false;
            leftButtonClicked.startX = mousePos.x - screenLocation.x;
            leftButtonClicked.startY = mousePos.y - screenLocation.y;
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            if (selectedPixSizeIndex === pixSizes.length - 1) {
                selectedPixSizeIndex = 0;
            } else {
                selectedPixSizeIndex++;
            }
            pixSize = pixSizes[selectedPixSizeIndex];
            renderOptimization = false;
            refreshCanvas();
        } else if (event.button === 0) {
            leftButtonClicked.clicked = false;
        }
    });

    canvas.addEventListener('click', (event) => {

        if (selectedColor !== false &&
            !leftButtonClicked.mouseMoved &&
            mousePixelPos.x < boardSize.width &&
            mousePixelPos.x >= 0 &&
            mousePixelPos.y < boardSize.height &&
            mousePixelPos.y >= 0) {
            socket.emit("pixel", {
                pixelColor: selectedColor,
                author: name,
                pixelX: mousePixelPos.x,
                pixelY: mousePixelPos.y
            });
            // console.log(event.which);
        }
    });

    canvas.addEventListener('mouseenter', (event) => {
        leftButtonClicked.clicked = false;
        leftButtonClicked.mouseMoved = false;
        renderOptimization = true;
    });

    canvas.addEventListener('mouseleave', (event) => {
        renderOptimization = false;
        refreshCanvas();
    });

    inputBox.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.keyCode === 13) {
            submitName.click();
        }
    });

    window.addEventListener('resize', resizeCanvas);

    /**
     * Socket listeners
     */

    socket.on("connected", (data) => {
        data.board.forEach((x) => x.pixelColor = new Color(x.pixelColor.r, x.pixelColor.g, x.pixelColor.b, x.pixelColor.a));
        boardSize.width = data.xSize;
        boardSize.height = data.ySize;
        board = data.board;
        inputBox.style.visibility = "visible";
        overlayShade.style.visibility = "visible";
        input.removeAttribute("disabled");
        submitName.removeAttribute("disabled");
        input.focus();
        status.innerHTML = 'Choose name:';
    });

    socket.on("error", (error) => {
        console.log("error");
        console.log(error);
    });

    socket.on("pixel", (data) => {
        let pixel = {
            pixelX: data.pixel.pixelX,
            pixelY: data.pixel.pixelY,
            author: data.pixel.author,
            time: data.pixel.time,
            pixelColor: new Color(data.pixel.pixelColor.r, data.pixel.pixelColor.g, data.pixel.pixelColor.b, data.pixel.pixelColor.a)
        };
        board = board.filter((item) => !((item.pixelX === pixel.pixelX) && (item.pixelY === pixel.pixelY)));
        board.push(pixel);
        refreshCanvas();
    });

    /**
     * Init colors and canvas
     */

    let colorToRGBA = (color) => {
        let cvs, ctx;
        cvs = document.createElement('canvas');
        cvs.height = 1;
        cvs.width = 1;
        ctx = cvs.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);

        let resColor = ctx.getImageData(0, 0, 1, 1).data;
        return new Color(resColor[0], resColor[1], resColor[2], resColor[3]);
    };

    for (let i = 0; i < colorPanel.length; i++) {
        colorPanel[i] = colorToRGBA(colorPanel[i]);
    }

    colorPanel.forEach((color) => {
        let newColorDiv = document.createElement("div");
        newColorDiv.classList.add("color");
        newColorDiv.style.backgroundColor = color.toString();
        newColorDiv.addEventListener("click", (event) => {

            if (selectedColor !== false) {
                let selectedColorDiv = colorPicker.querySelector(".selected");
                selectedColorDiv.classList.remove("selected");
            }
            event.target.classList.add("selected");
            selectedColor = color;
        });
        colorPicker.appendChild(newColorDiv);
    });
    resizeCanvas();
})();