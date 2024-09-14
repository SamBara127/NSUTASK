function setLastBoard(lastBoardName) {
    const date = new Date();
    date.setTime(date.getTime() + (24 * 60 * 60 * 1000)); // Срок годности куки - 1 день

    document.cookie = 'last_board=' + lastBoardName + ';expires=' + date.toUTCString(); + ';path=/';
}

function getLastBoard() {
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf('last_board=') === 0) {
            const ct = c.substring('last_board='.length, c.length);
            if (ct === 'null') { return null; }

            else { return ct; }
        }
    }
    return null;
}

function clearLastBoard() {
    setLastBoard(null);
}
