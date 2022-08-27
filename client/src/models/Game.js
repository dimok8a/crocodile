class Game {
    constructor() {
        this.canvasSetup();
        this.messagesElement = document.querySelector('.all_messages_container');
        this.inputMessageElement = document.querySelector('#inputMessage');
        this.getPlayerStatus();
        this.name = "Гость" + parseInt(Math.random() * 1250)


        this.socket = io();
        this.socket.on('new-message', (sender, message, messageId) => {
            this.addMessage(sender, message, messageId)
        });
        this.socket.on('markMessage', (messageId, mark, active) => {
            this.markMessage(messageId, mark, active);
        })
        this.socket.on("dont-draw", () => {
            this.playerStatus = 0;
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
        this.socket.on("player-drawing", (x, y, color, width) => {
            this.draw(x, y, color, width);
        })
        this.socket.on("mouseDown", () => {
            this.ctx.beginPath();
        })
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
        this.inputWidthElement = document.querySelector('#inputWidth');
        this.inputColorElement = document.querySelector('#inputColor');
        document.querySelector('.word_container').innerHTML = "";
        if (this.playerStatus === 1) {
            if (this.word)
                document.querySelector('.word_container').innerHTML = `Текущее слово: ${this.word}`
            this.mouseDown = false;
            this.startDrawerListeners();
            document.querySelector('.canvas_panel_container').classList.remove('hide');
            this.inputMessageElement.disabled = true;
        } else {
            document.querySelector('.canvas_panel_container').classList.add('hide');
            this.removeDrawerListeners();
            this.inputMessageElement.disabled = false;
        }
    }

    changePlayerStatus() {
        if (this.playerStatus === 1)
            this.playerStatus = 0;
        else this.playerStatus = 1;
        if (this.playerStatus === 1) {
            this.eraser = document.querySelector('#eraser');
            this.inputWidthElement = document.querySelector('#inputWidth');
            this.inputColorElement = document.querySelector('#inputColor');
            this.mouseDown = false;
            document.querySelector('.canvas_panel_container').classList.remove('hide');
            this.startDrawerListeners();
        } else {
            document.querySelector('.canvas_panel_container').classList.add('hide');
            this.removeDrawerListeners();
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

    mouseDownListener() {
        this.mouseDown = true
        this.ctx.beginPath();
        this.socket.emit("mouseDown");
    }

    mouseUpListener() {
        this.mouseDown = false;
    }

    mouseMoveListener(e) {
        if (this.mouseDown) {
            const color = this.inputColorElement.value;
            const width = this.inputWidthElement.value;
            const targetCoords = this.canvas.getBoundingClientRect();
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            const x = e.clientX - targetCoords.left;
            const y = e.clientY - targetCoords.top;
            this.draw(x, y, color, width);
            this.socket.emit("player-drawing", x, y, color, width)
        }
    }

    draw(x, y, color, width) {
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(x, y, width/2, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    clear() {
        this.ctx.beginPath();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.messagesElement.innerHTML = "";
    }

    eraserListener() {
        this.ctx.beginPath();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.socket.emit("clear");
    }

    mouseWheelListener(e) {
        if (e.deltaY < 0) {
            this.inputWidthElement.value = parseInt(this.inputWidthElement.value) + 2
        }
        if (e.deltaY > 0)
            this.inputWidthElement.value = parseInt(this.inputWidthElement.value) - 2
    }

    sendMessageEventListener(e) {
        if (e.keyCode === 13 && this.inputMessageElement.value !== "") {
            this.socket.emit('send-message', this.name, this.inputMessageElement.value);
        }
    }

    startDrawerListeners() {
        this.mouseUpListener = this.mouseUpListener.bind(this);
        this.mouseDownListener = this.mouseDownListener.bind(this);
        this.mouseWheelListener = this.mouseWheelListener.bind(this);
        this.mouseMoveListener = this.mouseMoveListener.bind(this);
        this.markListener = this.markListener.bind(this);
        this.eraserListener = this.eraserListener.bind(this);
        document.addEventListener("mouseup", this.mouseUpListener);
        document.addEventListener("mousedown", this.mouseDownListener);
        document.addEventListener("wheel", this.mouseWheelListener);
        this.canvas.addEventListener("mousemove", this.mouseMoveListener);
        this.messagesElement.addEventListener("click", this.markListener);
        this.eraser.addEventListener("click", this.eraserListener);
    }

    removeDrawerListeners() {
        document.removeEventListener("mouseup", this.mouseUpListener);
        document.removeEventListener("mousedown", this.mouseDownListener);
        document.removeEventListener("wheel", this.mouseWheelListener);
        this.canvas.removeEventListener("mousemove", this.mouseMoveListener);
        this.messagesElement.removeEventListener("click", this.markListener);
        this.eraser.removeEventListener("click", this.eraserListener);
    }
}
