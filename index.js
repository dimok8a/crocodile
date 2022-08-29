const express = require("express")
const app = express();
const path = require("path");
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
app.use(express.static(path.resolve(__dirname, 'client')));
const PORT = process.env.PORT || 5000

app.get("/", (req, res)=> {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
})

let messageId = 0;
let gameStarted = false;
let drawer = null;

let users = [];
const russianWords = "Скунс Креветка Бабочка Краб Гусеница Страус Панда Медуза Паук Аллигатор Кит Жираф Рамен Суши Борщ Шпроты Салями Угорь Конфеты Мидии Хинкали Аватар Человек-паук Симпсоны Мадагаскар Хатико Матрица Ералаш стриптизер официант сантехник дворник ежедневник субботник календарь Супермен"
const dbWords = russianWords.split(" ");
let words = russianWords.split(" ");

let moves = [];
let chat = [];
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
let currentWord = "";

function changeCurrentWord() {
    words = words.filter(word => word !== currentWord)
    if (words.length) {
        currentWord = words[getRandomInt(words.length)];
    } else {
        words = dbWords;
    }
    chat = [];
}

const MAIN_SENDER = "Игра"

function newPlayerMessage(namePlayer) {
    messageId += 1;
    const newMessage = {
        sender: MAIN_SENDER,
        message: `К нам присоединился ${namePlayer}`,
        messageId: messageId-1,
        canMark: false
    }
    chat.push(newMessage);
    return newMessage;
}

function playerLeaveMessage(namePlayer) {
    messageId += 1;
    const newMessage = {
        sender: MAIN_SENDER,
        message: ` ${namePlayer} покидает игру`,
        messageId: messageId-1,
        canMark: false
    };
    chat.push(newMessage);
    return newMessage;
}

function playerGuessedMessage(namePlayer, rightWord) {
    messageId += 1;
    const newMessage = {
        sender: MAIN_SENDER,
        message: ` ${namePlayer} угадал слово! Правильный ответ: ${rightWord}`,
        messageId: messageId-1,
        canMark: false
    }
    chat.push(newMessage);
    return newMessage;
}

function playerMessage(namePlayer, message) {
    messageId += 1;
    const newMessage = {
        sender: namePlayer,
        message,
        messageId: messageId-1,
        canMark: true
    }
    chat.push(newMessage);
    return newMessage;
}
let newMessage = null;
changeCurrentWord();
io.on('connection', (socket) => {
    console.log('a user connected');
    users.push(socket);
    socket.broadcast.emit("new-message", newPlayerMessage(socket.handshake.auth.name));
    io.sockets.emit("change-online", io.engine.clientsCount);
    if (chat.length) {
        socket.emit("get-chat", chat);
    }
    if (io.engine.clientsCount === 1) {
        socket.emit("draw", currentWord);
        gameStarted = true;
        drawer = socket;
        moves = [];
    } else {
        if (socket !== drawer)
            socket.emit("dont-draw");
        if (drawer) {
            socket.emit("new-user-draw", drawer.handshake.auth.name)
            if (moves.length) {
                socket.emit("get-picture", moves);
            }
        }
    }
    socket.on('disconnect', () => {
        users = users.filter(user => user !== socket);
        if (drawer === socket) {
            drawer = null;
            if (users.length) {
                const randomNum = getRandomInt(users.length);
                drawer = users[randomNum];
                changeCurrentWord();
                drawer.broadcast.emit("new-user-draw", users[randomNum].handshake.auth.name);
                users[randomNum].emit("draw", currentWord);
            }
            moves = [];
            io.sockets.emit("full-clear");
        }
        newMessage = playerLeaveMessage(socket.handshake.auth.name);
        io.sockets.emit("new-message", newMessage);
        io.sockets.emit("change-online", io.engine.clientsCount);
        if (io.engine.clientsCount === 0)
            chat = [];
        console.log('user disconnected');
    });
    socket.on('send-message', (sender, message) => {
        io.sockets.emit("new-message", playerMessage(sender, message));
        const arrMessage = message.split(" ");
        for (let i = 0; i < arrMessage.length; i++) {
            if (arrMessage[i].toUpperCase() === currentWord.toUpperCase()) {
                io.sockets.emit("new-message", playerGuessedMessage(sender, currentWord))
                io.sockets.emit("dont-draw");
                changeCurrentWord();
                if (moves.length)
                    io.sockets.emit("get-replay", moves);
                setTimeout ( () => {
                    io.sockets.emit("full-clear");
                    if (users.find(user => user===socket)) {
                        drawer = socket;
                        socket.emit("draw", currentWord);
                        socket.broadcast.emit("new-user-draw", sender);
                    } else {
                        if (users.length) {
                            const randomNum = getRandomInt(users.length);
                            drawer = users[randomNum];
                            drawer.broadcast.emit("new-user-draw", users[randomNum].handshake.auth.name);
                            users[randomNum].emit("draw", currentWord);
                        } else {
                            drawer = null;
                        }

                    }
                }, moves.length + 3000)
                moves = [];
                break;
            }
        }
    });
    socket.on('clear', () => {
        socket.broadcast.emit("clear");
        moves = [];
    })

    socket.on('player-drawing', (x, y, color, width) => {
        socket.broadcast.emit("player-drawing", x, y, color, width);
        moves.push({x, y, color, width, type: "draw"})
    })
    socket.on('mouseDown', (x, y, color, width) => {
        socket.broadcast.emit("mouseDown", x, y, color, width);
        moves.push({x, y, color, width, type: "mouseDown"})
    })
    socket.on("markMessage", (messageId, mark, active) => {
        for (let i = 0; i<chat.length; i++) {
            if (chat[i].messageId === parseInt(messageId)) {
                chat[i].markStatus = {mark, active}
            }
        }
        socket.broadcast.emit("markMessage", messageId, mark, active);
    })

});

server.listen(PORT, () => console.log(`Server has been started on port ${PORT}`));
