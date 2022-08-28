class Game {
    constructor(name = "Гость" + parseInt(Math.random() * 1250)) {
        this.canvasSetup();
        this.messagesElement = document.querySelector('.all_messages_container');
        this.inputMessageElement = document.querySelector('#inputMessage');
        this.getPlayerStatus();
        this.name = name;

        this.socket = io(null, { autoConnect: false });
        this.socket.auth = { name }
        this.socket.connect();
        this.socket.on('new-message', (sender, message, messageId) => {
            this.addMessage(sender, message, messageId)
        });
        this.socket.on('markMessage', (messageId, mark, active) => {
            this.markMessage(messageId, mark, active);
        })
        this.socket.on("dont-draw", () => {
            this.playerStatus = 0;
            this.word = null;
            this.getPlayerSetup()
        })
        this.socket.on("draw", (word) => {
            this.playerStatus = 1;
            this.word = word;
            this.getPlayerSetup();
        })
        this.socket.on("clear", () => {
            this.clear();
        })
        this.socket.on("full-clear", () => {
            this.fullClear();
        })
        this.socket.on("player-drawing", (x, y, color, width) => {
            this.draw(x, y, color, width);
        })
        this.socket.on("mouseDown", (x, y, color, width) => {
            this.drawArc(x, y, color, width);
            this.ctx.beginPath();
        })
        this.socket.on("new-user-draw", (userName) => {
            this.word = userName;
            this.getPlayerSetup();
        })
        this.socket.on("get-picture", (moves) => {
            moves.forEach(move => {
                if (move.type === "draw") {
                    this.draw(move.x, move.y, move.color, move.width)
                }
                if (move.type === "mouseDown") {
                    this.drawArc(move.x, move.y, move.color, move.width)
                    this.ctx.beginPath();
                }
            })
        })
        this.getReplay = this.getReplay.bind(this);
        this.socket.on("get-replay", this.getReplay)
    }

    getReplay(moves) {
        this.clear();
        const interval = setInterval(()=> {
            if (moves.length === 0) {
                clearInterval(interval);
                return;
            }
            const move = moves.shift();
            if (move.type === "draw") {
                this.draw(move.x, move.y, move.color, move.width)
            }
            if (move.type === "mouseDown") {
                this.drawArc(move.x, move.y, move.color, move.width)
                this.ctx.beginPath();
            }
        }, 10)
    }

    canvasSetup() {
        this.canvas = document.querySelector('#canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 600;
        this.canvas.height = 500;
    }

    getPlayerStatus() {
        this.playerStatus = 0;
        this.sendMessageEventListener = this.sendMessageEventListener.bind(this);
        document.addEventListener("keydown",  this.sendMessageEventListener);
    }

    getPlayerSetup() {
        this.eraser = document.querySelector('#eraser');
        this.bin = document.querySelector("#bin");
        this.inputWidthElement = document.querySelector('#inputWidth');
        this.inputColorElement = document.querySelector('#inputColor');
        this.cursor = document.querySelector('.cursor');
        document.querySelector('.word_container').innerHTML = "";
        if (this.playerStatus === 1) {
            this.cursor.classList.remove('hide')
            if (this.word)
                document.querySelector('.word_container').innerHTML = `Текущее слово: ${this.word}`
            this.mouseDown = false;
            this.startDrawerListeners();
            document.querySelector('.canvas_panel_container').classList.remove('hide');
            this.inputMessageElement.disabled = true;
        } else {
            document.querySelector('.canvas_panel_container').classList.add('hide');
            this.cursor.classList.add('hide');
            this.removeDrawerListeners();
            this.inputMessageElement.disabled = false;
            if (this.word) {
                document.querySelector('.word_container').innerHTML = `Сейчас рисует: ${this.word}`
            }
        }
    }


    addMessage(sender, message, messageId) {
        const newMessageElement = document.createElement('div');
        newMessageElement.classList.add('message_container');
        newMessageElement.dataset.messageId = messageId;
        newMessageElement.innerHTML = `
					<div class="mark_container">
						<div class="star_container" data-name="good_mark" data-active="false">
							<img src="./src/images/star.png" alt="star">
						</div>
						<div class="trash_container" data-name="bad_mark" data-active="false">
							<img src="./src/images/trash.png" alt="trash">
						</div>
					</div>
					<div class="name_container">${sender}</div>
					<div class="text_container">${message}</div>
					`
        if (!this.playerStatus) {
            newMessageElement.querySelector('.star_container').classList.add('hide')
            newMessageElement.querySelector('.trash_container').classList.add('hide')
        }
        this.messagesElement.appendChild(newMessageElement);
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
        this.inputMessageElement.value = "";
    }

    markListener(e) {
        if (e.target.dataset.name === "good_mark") {
            if (e.target.dataset.active === "false") {
                e.target.querySelector("img").src = "./src/images/fill_star.png"
                e.target.dataset.active = "true"
            } else {
                e.target.querySelector("img").src = "./src/images/star.png"
                e.target.dataset.active = "false"
            }
            this.socket.emit("markMessage", e.target.closest('.message_container').dataset.messageId, e.target.dataset.name, e.target.dataset.active);
        }
        if (e.target.dataset.name === "bad_mark") {
            if (e.target.dataset.active === "false") {
                e.target.querySelector("img").src = "./src/images/trash_red.png"
                e.target.dataset.active = "true"
            } else {
                e.target.querySelector("img").src = "./src/images/trash.png"
                e.target.dataset.active = "false"
            }
            this.socket.emit("markMessage", e.target.closest('.message_container').dataset.messageId, e.target.dataset.name, e.target.dataset.active);
        }
    }

    markMessage(messageId, mark, active) {
        const messageElement = this.messagesElement.querySelector(`[data-message-id="${messageId}"]`);
        const markElement = messageElement.querySelector(`[data-name="${mark}"]`);
        if (active === "false") {
            markElement.classList.add("hide")
            return;
        }
        markElement.classList.remove('hide');
        if (mark === "good_mark") {
            if (active === "true") {
                markElement.querySelector("img").src = "./src/images/fill_star.png"
            } else {
                markElement.querySelector("img").src = "./src/images/star.png"
            }
        }
        if (mark === "bad_mark") {
            if (active === "true") {
                markElement.querySelector("img").src = "./src/images/trash_red.png"
            } else {
                markElement.querySelector("img").src = "./src/images/trash.png"
            }
        }
    }

    drawArc(x, y, color, width) {
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.arc(x, y, width/2, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    mouseDownListener(e) {
        this.mouseDown = true;
        const targetCoords = this.canvas.getBoundingClientRect();
        const x = e.clientX - targetCoords.left;
        const y = e.clientY - targetCoords.top;
        const color = this.inputColorElement.value;
        const width = this.inputWidthElement.value;
        this.drawArc(x, y, color, width)

        this.ctx.beginPath();
        this.socket.emit("mouseDown", x, y, color, width);
    }

    mouseUpListener() {
        this.mouseDown = false;
    }

    mouseMoveListener(e) {
        const width = this.inputWidthElement.value;
        const targetCoords = this.canvas.getBoundingClientRect();
        const x = e.clientX - targetCoords.left;
        const y = e.clientY - targetCoords.top;
        this.cursor.style.left = x - width/2 + "px";
        this.cursor.style.top = y - width/2 + "px";
        this.cursor.style.width = width + "px";
        this.cursor.style.height = width + "px";
        if (this.mouseDown) {
            const color = this.inputColorElement.value;
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            this.draw(x, y, color, width);
            this.socket.emit("player-drawing", x, y, color, width)
        }
    }

    draw(x, y, color, width) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.drawArc(x, y, color, width)
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    clear() {
        this.ctx.beginPath();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    fullClear() {
        this.clear();
        this.messagesElement.innerHTML = "";
    }

    binListener() {
        this.ctx.beginPath();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.socket.emit("clear");
    }

    eraserListener() {
        this.inputColorElement.value = "#FFFFFF";
    }

    mouseWheelListener(e) {
        if (e.deltaY < 0) {
            this.inputWidthElement.value = parseInt(this.inputWidthElement.value) + 4
        }
        if (e.deltaY > 0)
            this.inputWidthElement.value = parseInt(this.inputWidthElement.value) - 4
        this.changeWidthListener();
    }

    sendMessageEventListener(e) {
        if (e.keyCode === 13 && this.inputMessageElement.value !== "") {
            this.socket.emit('send-message', this.name, this.inputMessageElement.value);
        }
    }

    changeWidthListener() {
        const width = this.inputWidthElement.value;
        this.cursor.style.width = width + "px";
        this.cursor.style.height = width + "px";
    }

    startDrawerListeners() {
        this.mouseUpListener = this.mouseUpListener.bind(this);
        this.mouseDownListener = this.mouseDownListener.bind(this);
        this.mouseWheelListener = this.mouseWheelListener.bind(this);
        this.mouseMoveListener = this.mouseMoveListener.bind(this);
        this.markListener = this.markListener.bind(this);
        this.eraserListener = this.eraserListener.bind(this);
        this.binListener = this.binListener.bind(this);
        this.changeWidthListener = this.changeWidthListener.bind(this);
        document.addEventListener("mouseup", this.mouseUpListener);
        this.canvas.addEventListener("mousedown", this.mouseDownListener);
        document.addEventListener("wheel", this.mouseWheelListener);
        this.canvas.addEventListener("mousemove", this.mouseMoveListener);
        this.messagesElement.addEventListener("click", this.markListener);
        this.eraser.addEventListener("click", this.eraserListener);
        this.bin.addEventListener("click", this.binListener);
        this.inputWidthElement.addEventListener("input", this.changeWidthListener);
    }

    removeDrawerListeners() {
        document.removeEventListener("mouseup", this.mouseUpListener);
        this.canvas.removeEventListener("mousedown", this.mouseDownListener);
        document.removeEventListener("wheel", this.mouseWheelListener);
        this.canvas.removeEventListener("mousemove", this.mouseMoveListener);
        this.messagesElement.removeEventListener("click", this.markListener);
        this.eraser.removeEventListener("click", this.eraserListener);
        this.bin.removeEventListener("click", this.binListener);
        this.inputWidthElement.removeEventListener("change", this.changeWidthListener);
    }
}
