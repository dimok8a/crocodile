
function enterNameEventListener(e) {
    if (e.keyCode === 13) {
        new Game(document.querySelector('#inputName').value || undefined)
        document.querySelector('.user_name_container').remove();
        document.querySelector(".main_container").classList.remove('hide');
        document.removeEventListener('keydown', enterNameEventListener)
    }
}
document.addEventListener("keydown", enterNameEventListener)
