const express = require("express")
const app = express();
const path = require("path");
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
app.use(express.static(path.resolve(__dirname, 'client')));
const PORT = 5000

app.get("/", (req, res)=> {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
})

let messageId = 0;
let gameStarted = false;
let drawerId = null;

let users = [];

const words = ["декабрь", "театр", "темнота", "собака", "сигарета", "круг", "ракета", "нога", "король", "зуб"]

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
let currentWord = "";

function changeCurrentWord() {
    const newWord = words[getRandomInt(words.length)];
    if (newWord !== currentWord)
        currentWord = newWord;
    else
        changeCurrentWord();
}
io.on('connection', (socket) => {
    console.log('a user connected');
    users.push(socket);
    if (io.engine.clientsCount === 1) {
        changeCurrentWord();
        socket.emit("draw", currentWord);
        gameStarted = true;
        drawerId = socket.id;
    }
    socket.on('disconnect', () => {
        users = users.filter(user => user !== socket);
        if (drawerId === socket.id) {
            drawerId = null;
            if (users.length) {
                const randomNum = getRandomInt(users.length);
                drawerId = users[randomNum].id;
                changeCurrentWord();
                users[randomNum].emit("draw", currentWord);
            }
            io.sockets.emit("clear");
        }
        console.log('user disconnected');
    });
    if (socket.id !== drawerId)
        socket.emit("dont-draw");

    socket.on('send-message', (sender, message) => {
        io.sockets.emit("new-message", sender, message, messageId);
        messageId+=1;
        const arrMessage = message.split(" ");
        for (let i = 0; i < arrMessage.length; i++) {
            if (arrMessage[i].toUpperCase() === currentWord.toUpperCase()) {
                io.sockets.emit("new-message", "Игра", `${sender} угадал слово! Правильный ответ: ${currentWord}`)
                drawerId = socket.id;
                io.sockets.emit("dont-draw");
                changeCurrentWord();
                setTimeout ( () => {
                    io.sockets.emit("clear");
                    socket.emit("draw", currentWord)
                }, 3000)
                break;
            }
        }
    });
    socket.on('clear', () => {
        socket.broadcast.emit("clear");
    })
    socket.on('player-drawing', (x, y, color, width) => {
        socket.broadcast.emit("player-drawing", x, y, color, width);
    })
    socket.on('mouseDown', () => {
        socket.broadcast.emit("mouseDown");

    })
    socket.on("markMessage", (messageId, mark, active) => {
        socket.broadcast.emit("markMessage", messageId, mark, active);
    })

});

server.listen(PORT, () => console.log(`Server has been started on port ${PORT}`));
