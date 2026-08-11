const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    loginError.textContent = "";

    try {

        const response = await fetch(
           "http://127.0.0.1:3000/admin/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Login failed"
            );
        }

        window.location.href = "admin.html";

    } catch (error) {

        console.error(error);

        loginError.textContent =
            error.message ||
            "Could not connect to the server.";

    }

});