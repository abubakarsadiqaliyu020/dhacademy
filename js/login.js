const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = loginForm.querySelector('button[type="submit"]');

// Where each role lands after login
const DASHBOARDS = {
    admin: "admin/dashboard.html",
    facilitator: "facilitator/dashboard.html",
    student: "student/dashboard.html"
};

function setBusy(isBusy) {
    loginButton.disabled = isBusy;
    loginButton.textContent = isBusy ? "Logging in..." : "Login";
}

// If someone is already signed in, skip the form
async function redirectIfLoggedIn() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) return;

        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role, is_active")
            .eq("id", session.user.id)
            .single();

        if (profile && profile.is_active && DASHBOARDS[profile.role]) {
            window.location.href = DASHBOARDS[profile.role];
        }
    } catch (error) {
        console.error("Session check error:", error);
    }
}

redirectIfLoggedIn();

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const loginId = document
        .getElementById("loginId")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    if (!loginId || !password) {
        message.textContent = "Please enter your Login ID and password.";
        return;
    }

    message.textContent = "";
    setBusy(true);

    try {

        // Find the internal Supabase email
        // using the Login ID
        const {
            data: email,
            error: emailError
        } = await supabaseClient.rpc(
            "get_login_email",
            {
                student_id_input: loginId
            }
        );

        if (emailError) {
            console.error(emailError);
            message.textContent = "Unable to find your account.";
            setBusy(false);
            return;
        }

        if (!email) {
            message.textContent = "Login ID not found.";
            setBusy(false);
            return;
        }

        // Login with Supabase
        const {
            data,
            error: loginError
        } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (loginError) {
            console.error(loginError);
            message.textContent = "Incorrect Login ID or password.";
            setBusy(false);
            return;
        }

        // Get the logged-in user's profile
        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select("full_name, student_id, role, is_active")
            .eq("id", data.user.id)
            .single();

        if (profileError || !profile) {
            console.error(profileError);
            await supabaseClient.auth.signOut();
            message.textContent = "Unable to load your account profile.";
            setBusy(false);
            return;
        }

        // Check account status
        if (!profile.is_active) {
            await supabaseClient.auth.signOut();
            message.textContent = "Your account has been disabled.";
            setBusy(false);
            return;
        }

        // Send user to the correct dashboard
        if (DASHBOARDS[profile.role]) {
            window.location.href = DASHBOARDS[profile.role];
            return;
        }

        await supabaseClient.auth.signOut();
        message.textContent = "Your account role is not configured.";
        setBusy(false);

    } catch (error) {

        console.error(error);
        message.textContent = "Something went wrong. Please try again.";
        setBusy(false);
    }
});
