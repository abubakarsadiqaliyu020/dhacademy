const facilitatorsTable =
    document.getElementById("facilitatorsTable");

const searchInput =
    document.getElementById("searchInput");

const addFacilitatorBtn =
    document.getElementById("addFacilitatorBtn");

const facilitatorModal =
    document.getElementById("facilitatorModal");

const closeModal =
    document.getElementById("closeModal");

const facilitatorForm =
    document.getElementById("facilitatorForm");

const formMessage =
    document.getElementById("formMessage");

const message =
    document.getElementById("message");

const logoutBtn =
    document.getElementById("logoutBtn");

const resetPinModal =
    document.getElementById("resetPinModal");

const closeResetPinModal =
    document.getElementById("closeResetPinModal");

const resetPinForm =
    document.getElementById("resetPinForm");

const resetPinMessage =
    document.getElementById("resetPinMessage");

const resetFacilitatorName =
    document.getElementById("resetFacilitatorName");

const resetFacilitatorId =
    document.getElementById("resetFacilitatorId");

let facilitators = [];

let selectedFacilitator = null;


/* =========================
   CHECK ADMIN
========================= */

async function checkAdmin() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {

        window.location.href =
            "../index.html";

        return false;
    }

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

    if (
        profileError ||
        !profile ||
        profile.role !== "admin" ||
        !profile.is_active
    ) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

        return false;
    }

    return true;
}


/* =========================
   LOAD FACILITATORS
========================= */

async function loadFacilitators() {

    facilitatorsTable.innerHTML = `
        <tr>
            <td colspan="6">
                Loading facilitators...
            </td>
        </tr>
    `;

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select(
            "id, student_id, full_name, phone, role, is_active"
        )
        .eq("role", "facilitator")
        .order("full_name");

    if (error) {

        console.error(
            "Facilitator loading error:",
            error
        );

        facilitatorsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load facilitators:
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

        return;
    }

    facilitators = data || [];

    displayFacilitators(facilitators);
}


/* =========================
   DISPLAY FACILITATORS
========================= */

function displayFacilitators(list) {

    if (!list.length) {

        facilitatorsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No facilitators found.
                </td>
            </tr>
        `;

        return;
    }

    facilitatorsTable.innerHTML = "";

    list.forEach(function (facilitator, index) {

        const row =
            document.createElement("tr");

        const status =
            facilitator.is_active
                ? `<span class="status-active">Active</span>`
                : `<span class="status-inactive">Inactive</span>`;

        const toggleButton =
            facilitator.is_active
                ? `
                    <button
                        class="action-btn disable-btn"
                        onclick="toggleFacilitator('${facilitator.id}', false)"
                    >
                        Disable
                    </button>
                  `
                : `
                    <button
                        class="action-btn enable-btn"
                        onclick="toggleFacilitator('${facilitator.id}', true)"
                    >
                        Activate
                    </button>
                  `;

        row.innerHTML = `
            <td>${index + 1}</td>

            <td>
                ${escapeHtml(facilitator.student_id || "-")}
            </td>

            <td>
                ${escapeHtml(facilitator.full_name || "-")}
            </td>

            <td>
                ${escapeHtml(facilitator.phone || "-")}
            </td>

            <td>
                ${status}
            </td>

            <td>

                <button
                    class="action-btn reset-btn"
                    onclick="openResetPin(
                        '${facilitator.id}',
                        '${escapeAttribute(facilitator.full_name)}',
                        '${escapeAttribute(facilitator.student_id)}'
                    )"
                >
                    Reset PIN
                </button>

                ${toggleButton}

            </td>
        `;

        facilitatorsTable.appendChild(row);
    });
}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    function () {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();

        const filtered =
            facilitators.filter(function (facilitator) {

                const name =
                    (facilitator.full_name || "")
                        .toLowerCase();

                const loginId =
                    (facilitator.student_id || "")
                        .toLowerCase();

                return (
                    name.includes(search) ||
                    loginId.includes(search)
                );
            });

        displayFacilitators(filtered);
    }
);


/* =========================
   OPEN ADD MODAL
========================= */

addFacilitatorBtn.addEventListener(
    "click",
    function () {

        facilitatorForm.reset();

        formMessage.textContent = "";

        facilitatorModal.classList.add("show");
    }
);


/* =========================
   CLOSE ADD MODAL
========================= */

closeModal.addEventListener(
    "click",
    function () {

        facilitatorModal.classList.remove(
            "show"
        );
    }
);


/* =========================
   CREATE FACILITATOR
========================= */

facilitatorForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const loginId =
            document.getElementById("loginId")
                .value
                .trim();

        const fullName =
            document.getElementById("fullName")
                .value
                .trim();

        const phone =
            document.getElementById("phone")
                .value
                .trim();

        const password =
            document.getElementById("password")
                .value;

        if (!loginId || !fullName || !password) {

            formMessage.textContent =
                "Login ID, full name and password are required.";

            formMessage.className =
                "error-message";

            return;
        }

        if (password.length < 6) {

            formMessage.textContent =
                "Password must be at least 6 characters.";

            formMessage.className =
                "error-message";

            return;
        }

        const {
            data: sessionData
        } =
            await supabaseClient.auth.getSession();

        const session =
            sessionData.session;

        if (!session) {

            formMessage.textContent =
                "Your session has expired. Please login again.";

            formMessage.className =
                "error-message";

            return;
        }

        const submitButton =
            facilitatorForm.querySelector(
                "button[type='submit']"
            );

        submitButton.disabled = true;

        submitButton.textContent =
            "Creating...";

        formMessage.textContent =
            "Creating facilitator...";

        formMessage.className =
            "";

        try {

            const {
                data,
                error
            } =
                await supabaseClient.functions.invoke(
                    "create-facilitator",
                    {
                        body: {
                            login_id: loginId,
                            full_name: fullName,
                            phone: phone,
                            password: password
                        }
                    }
                );

            if (error) {

                console.error(
                    "Function error:",
                    error
                );

                let errorMessage =
                    error.message;

                if (error.context) {

                    try {

                        const response =
                            await error.context.json();

                        if (response.error) {
                            errorMessage =
                                response.error;
                        }

                    } catch (e) {
                        console.log(
                            "Could not read function response."
                        );
                    }
                }

                throw new Error(
                    errorMessage
                );
            }

            console.log("Create facilitator response:", data);

if (!data) {
    throw new Error(
        "The Edge Function returned no response."
    );
}

if (data.error) {
    throw new Error(data.error);
}

if (!data.success) {
    throw new Error(
        data.message ||
        data.msg ||
        JSON.stringify(data)
    );
}

            formMessage.textContent =
                "Facilitator created successfully.";

            formMessage.className =
                "success-message";

            facilitatorForm.reset();

            await loadFacilitators();

            setTimeout(function () {

                facilitatorModal.classList.remove(
                    "show"
                );

            }, 1000);

        } catch (error) {

            console.error(
                "Create facilitator error:",
                error
            );

            formMessage.textContent =
                error.message ||
                "Unable to create facilitator.";

            formMessage.className =
                "error-message";

        } finally {

            submitButton.disabled = false;

            submitButton.textContent =
                "Create Facilitator";
        }
    }
);


/* =========================
   OPEN RESET PIN
========================= */

function openResetPin(
    facilitatorId,
    facilitatorName,
    loginId
) {

    selectedFacilitator =
        facilitatorId;

    resetFacilitatorName.textContent =
        facilitatorName;

    resetFacilitatorId.textContent =
        loginId;

    resetPinForm.reset();

    resetPinMessage.textContent = "";

    resetPinModal.classList.add("show");
}


/* =========================
   CLOSE RESET PIN
========================= */

closeResetPinModal.addEventListener(
    "click",
    function () {

        resetPinModal.classList.remove(
            "show"
        );
    }
);


/* =========================
   RESET PIN
========================= */

resetPinForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const newPin =
            document.getElementById("newPin")
                .value;

        const confirmPin =
            document.getElementById("confirmPin")
                .value;

        if (newPin !== confirmPin) {

            resetPinMessage.textContent =
                "The PINs do not match.";

            resetPinMessage.className =
                "error-message";

            return;
        }

        if (newPin.length < 6) {

            resetPinMessage.textContent =
                "PIN must be at least 6 characters.";

            resetPinMessage.className =
                "error-message";

            return;
        }

        const {
            data: sessionData
        } =
            await supabaseClient.auth.getSession();

        const session =
            sessionData.session;

        if (!session) {

            resetPinMessage.textContent =
                "Your session has expired.";

            resetPinMessage.className =
                "error-message";

            return;
        }

        const submitButton =
            resetPinForm.querySelector(
                "button[type='submit']"
            );

        submitButton.disabled = true;

        resetPinMessage.textContent =
            "Resetting PIN...";

        try {

            const {
                data,
                error
            } =
                await supabaseClient.functions.invoke(
                    "reset-user-password",
                    {
                        body: {
                            user_id:
                                selectedFacilitator,

                            new_pin:
                                newPin
                        }
                    }
                );

            if (error) {

                console.error(
                    "Reset PIN error:",
                    error
                );

                throw new Error(
                    error.message
                );
            }

            if (!data || !data.success) {

                throw new Error(
                    data?.error ||
                    "PIN reset failed."
                );
            }

            resetPinMessage.textContent =
                "PIN reset successfully.";

            resetPinMessage.className =
                "success-message";

            resetPinForm.reset();

        } catch (error) {

            console.error(error);

            resetPinMessage.textContent =
                error.message ||
                "Unable to reset PIN.";

            resetPinMessage.className =
                "error-message";

        } finally {

            submitButton.disabled = false;
        }
    }
);


/* =========================
   ACTIVATE / DISABLE
========================= */

async function toggleFacilitator(
    facilitatorId,
    active
) {

    const action =
        active
            ? "activate"
            : "disable";

    const confirmed =
        confirm(
            `Are you sure you want to ${action} this facilitator?`
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            is_active: active
        })
        .eq("id", facilitatorId)
        .eq("role", "facilitator");

    if (error) {

        console.error(error);

        showMessage(
            "Error: " + error.message,
            true
        );

        return;
    }

    showMessage(
        active
            ? "Facilitator activated."
            : "Facilitator disabled."
    );

    await loadFacilitators();
}


/* =========================
   MESSAGE
========================= */

function showMessage(
    text,
    isError = false
) {

    message.textContent = text;

    message.className =
        isError
            ? "error-message"
            : "success-message";
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {

    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async function () {
        if (!logoutBtn) return;
        const confirmed = window.confirm("Are you sure you want to log out?");
        if (!confirmed) return;

        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            window.location.href = "../index.html";
        } catch (error) {
            console.error("Logout error:", error);
            logoutBtn.disabled = false;
            logoutBtn.textContent = "Logout";
            if (typeof message !== "undefined" && message) {
                message.textContent = "Unable to log out: " + error.message;
            } else {
                window.alert("Unable to log out: " + error.message);
            }
        }
    }
);


/* =========================
   START PAGE
========================= */

async function startPage() {

    const isAdmin =
        await checkAdmin();

    if (!isAdmin) {
        return;
    }

    await loadFacilitators();
}

startPage();