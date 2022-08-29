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
const russianWords = "подпись вырез гранит кругозор блузка фараон клапан ёж вымя турист колготки стоп-кран питание свёрток дочерь шампунь броня зайчатина гимназист стелька подделка виза затычка решение алкоголь шуруп воровка колодец кабан команда бордель ловушка буква опера сектор математика пароварка невезение глубина штука справочник вождь хобот ширинка усталость служитель жар спальная видео рот просьба фишка рукопись ракетчик каблук шрифт палец ножка халва черника незнайка компания работница мышь исследование кружка мороженое сиденье пулемёт печь солист свёкла стая зелье дума посылка коготь семафор брат различие плоскостопие двигатель сфера тюльпан затвор внедорожник самурай стан алгоритм параграф глаз медалист пульт поводок подлежащее ор бунт удочка лес диспетчер монитор вдова пиратство астролог сосед пуп изобретатель чума танец затишье пластелин йог маска блоха судьба сияние рукавица филе заплыв сёмга"

const words = russianWords.split(" ");

let moves = [];
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
    io.sockets.emit("new-message", "Игра", `К нам присоединился ${socket.handshake.auth.name}`);
    io.sockets.emit("change-online", io.engine.clientsCount);
    if (io.engine.clientsCount === 1) {
        changeCurrentWord();
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
        io.sockets.emit("new-message", "Игра", `${socket.handshake.auth.name} покидает игру`);
        io.sockets.emit("change-online", io.engine.clientsCount);
        console.log('user disconnected');
    });
    socket.on('send-message', (sender, message) => {
        io.sockets.emit("new-message", sender, message, messageId);
        messageId+=1;
        const arrMessage = message.split(" ");
        for (let i = 0; i < arrMessage.length; i++) {
            if (arrMessage[i].toUpperCase() === currentWord.toUpperCase()) {
                io.sockets.emit("new-message", "Игра", `${sender} угадал слово! Правильный ответ: ${currentWord}`)
                drawer = socket;
                io.sockets.emit("dont-draw");
                changeCurrentWord();
                if (moves.length)
                    io.sockets.emit("get-replay", moves);
                setTimeout ( () => {
                    io.sockets.emit("full-clear");
                    socket.emit("draw", currentWord);
                    socket.broadcast.emit("new-user-draw", sender);
                }, 3000)
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
        socket.broadcast.emit("markMessage", messageId, mark, active);
    })

});

server.listen(PORT, () => console.log(`Server has been started on port ${PORT}`));
