async function login() {

    try {

        const response = await fetch(
            "/api/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username:
                        document.getElementById("username").value,

                    password:
                        document.getElementById("password").value
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            document.getElementById("error").textContent =
                data.error || "Login failed";

            return;
        }

        window.location.href = "/";

    } catch (error) {

        document.getElementById("error").textContent =
            "Unable to connect to server";

        console.error(error);
    }
}


async function register() {

    try {

        const response = await fetch(
            "/api/auth/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username:
                        document.getElementById("username").value,

                    password:
                        document.getElementById("password").value
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            document.getElementById("error").textContent =
                data.error || "Registration failed";

            return;
        }

        window.location.href = "/";

    } catch (error) {

        document.getElementById("error").textContent =
            "Unable to connect to server";

        console.error(error);
    }
}


document
    .getElementById("loginButton")
    .addEventListener("click", login);


document
    .getElementById("registerButton")
    .addEventListener("click", register);
