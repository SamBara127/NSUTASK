function setToken(token) {
    const date = new Date();
    date.setTime(date.getTime() + (24 * 60 * 60 * 1000)); // Срок годности куки - 1 день

    document.cookie = 'session_token=' + token + ';expires=' + date.toUTCString(); + ';path=/';
}

function getToken() {
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf('session_token=') === 0) {
            return c.substring('session_token='.length, c.length);
        }
    }
    return null;
}

function clearToken() {
    setToken(null);
}
