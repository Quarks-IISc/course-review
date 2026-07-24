import { msalInstance, loginRequest } from "./auth.js";

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {

    try {
        await msalInstance.loginRedirect(loginRequest);
    }
    catch (err) {
        console.error(err);
    }

});