const messages = document.querySelector('.all_messages_container');

messages.scrollTop = messages.scrollHeight;
let mouseDown = false;
const canvas = document.querySelector('#canvas');
canvas.width = 600;
canvas.height = 500;
const ctx = canvas.getContext('2d');
document.addEventListener('click', (e) => {
    if (e.target.dataset.name === "good_mark") {
        if (e.target.dataset.active === "false") {
            e.target.querySelector("img").src = "./src/images/fill_star.png"
            e.target.dataset.active = "true"
        } else {
            e.target.querySelector("img").src = "./src/images/star.png"
            e.target.dataset.active = "false"
        }
    }
    if (e.target.dataset.name === "bad_mark") {
        if (e.target.dataset.active === "false") {
            e.target.querySelector("img").src = "./src/images/trash_red.png"
            e.target.dataset.active = "true"
        } else {
            e.target.querySelector("img").src = "./src/images/trash.png"
            e.target.dataset.active = "false"
        }
    }
})

document.addEventListener("mouseup", ()=>mouseDown = false);

document.addEventListener("mousedown", (e) => {
    mouseDown = true
    const targetCoords = canvas.getBoundingClientRect();
    const x = e.clientX - targetCoords.left;
    const y = e.clientY - targetCoords.top;
    ctx.beginPath();
})


canvas.addEventListener("mousemove", (e) => {
    if (mouseDown) {
        const color = document.querySelector("#inputColor").value;
        const width = document.querySelector("#inputWidth").value;
        console.log(width)
        const targetCoords = canvas.getBoundingClientRect();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        const x = e.clientX - targetCoords.left;
        const y = e.clientY - targetCoords.top;
        ctx.lineWidth = width;
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, width/2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y);
    }
})
