function login() {
    const username = document.querySelector('#auth-login_login').value;
    const password = document.querySelector('#auth-login_password').value;

    fetch(`../api/users/login`, {
    method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        username.value = '';
        password.value = '';

        if (data.message) { alert(data.message); }

        setToken(data.session_token);
        initLayout(data.session_token, data.role);
    })
    .catch(error => console.error(error.message));
}

function register() {
    const username = document.querySelector('#auth-register_login').value;
    const displayName = document.querySelector('#auth-register_displayname').value;
    const password = document.querySelector('#auth-register_password').value;
    const role = document.querySelector('#auth-register_role').checked ? 'operator' : 'user';

    fetch(`../api/users/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, display_name: displayName, password, role })
    })
    .then(response => {
        username.value = '';
        displayName.value = '';
        password.value = '';

        if (response.ok) { toggleLoginRegister(); }

        return response.json();
    })
    .then(data => {
        if (data.message) { alert(data.message); }
    })
    .catch(error => console.error(error.message));
}



function toggleLoginRegister() {
    if (document.querySelector('#auth-login').classList.contains('hidden')) {
        document.querySelector('#auth-login').classList.remove('hidden');
        document.querySelector('#auth-register').classList.add('hidden');
    }
    else {
        document.querySelector('#auth-login').classList.add('hidden');
        document.querySelector('#auth-register').classList.remove('hidden');
    }
}
