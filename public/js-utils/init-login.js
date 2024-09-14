function initLayout() {
    const token = getToken();

    fetch(`../api/users/role`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Если пользователь залогинен
        if (data.role !== undefined) {
            // Перенаправляем его на index.html!
            window.location.href = '/index.html';
        }
        // Если пользователь не залогинен
        else {
            document.querySelector('#login').classList.remove('hidden');
        }
    });

    // Нескучные обои!
    const wallpapers = ['bg-grass.jpeg', 'bg-leaves.jpeg', 'bg-mesa.jpeg', 'bg-sea.jpeg'];
    const wallpaperChoice = Math.floor(Math.random() * wallpapers.length);
    document.querySelector('body').style.backgroundImage = `url('../assets/${wallpapers[wallpaperChoice]}')`;
}



initLayout();
