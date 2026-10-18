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
                    type="button"
                    class="action-btn edit-btn"
                    onclick="openEditFacilitator('${facilitator.id}', this)"
                >
                    Edit
                </button>

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
   EDIT FACILITATOR (correct name, Login ID, phone)
   Admin-only page. The database policy on "profiles" is what really
   restricts who may change these fields.
========================= */
const editFacilitatorModal =
    document.getElementById("editFacilitatorModal");
const editFacilitatorForm =
    document.getElementById("editFacilitatorForm");
const closeEditModal =
    document.getElementById("closeEditModal");
const editFullName =
    document.getElementById("editFullName");
const editFacilitatorLoginId =
    document.getElementById("editFacilitatorLoginId");
const editPhone =
    document.getElementById("editPhone");
const editIdWarning =
    document.getElementById("editIdWarning");
const editMessage =
    document.getElementById("editMessage");
const saveEditBtn =
    document.getElementById("saveEditBtn");

let editingFacilitator = null;
let editReturnFocus = null;


function showPageMessage(text, isError) {
    message.textContent = text;
    message.className =
        isError
            ? "error-message"
            : "success-message";
}


function openEditFacilitator(facilitatorId, trigger) {

    const facilitator =
        facilitators.find(
            function (item) {
                return item.id === facilitatorId;
            }
        );

    if (!facilitator) {
        showPageMessage(
            "Facilitator not found. Please refresh the page.",
            true
        );
        return;
    }

    editingFacilitator = facilitator;
    editReturnFocus = trigger || null;

    editFullName.value = facilitator.full_name || "";
    editFacilitatorLoginId.value = facilitator.student_id || "";
    editPhone.value = facilitator.phone || "";
    editIdWarning.hidden = true;
    editMessage.textContent = "";
    saveEditBtn.disabled = false;
    saveEditBtn.textContent = "Save Changes";

    editFacilitatorModal.classList.add("show");
    editFullName.focus();
}


function closeEditFacilitator() {

    editFacilitatorModal.classList.remove("show");
    editingFacilitator = null;

    if (editReturnFocus && editReturnFocus.focus) {
        editReturnFocus.focus();
    }
}


editFacilitatorLoginId.addEventListener(
    "input",
    function () {
        editIdWarning.hidden =
            !editingFacilitator ||
            editFacilitatorLoginId.value.trim() ===
                (editingFacilitator.student_id || "");
    }
);

closeEditModal.addEventListener("click", closeEditFacilitator);

editFacilitatorModal.addEventListener(
    "click",
    function (event) {
        if (event.target === editFacilitatorModal) {
            closeEditFacilitator();
        }
    }
);

document.addEventListener(
    "keydown",
    function (event) {
        if (
            event.key === "Escape" &&
            editFacilitatorModal.classList.contains("show")
        ) {
            closeEditFacilitator();
        }
    }
);


// Looks up the hidden login email for a Login ID (the same function the
// login page uses). Returns {email} or {error}.
async function lookupLoginEmail(loginId) {

    const { data, error } =
        await supabaseClient.rpc(
            "get_login_email",
            {
                student_id_input: loginId
            }
        );

    if (error) {
        console.error("Login lookup error:", error);
        return { error: error };
    }

    return { email: data || null };
}


// Turns a database error into something the admin can act on.
function describeSaveError(error) {

    if (error && error.code === "23505") {
        return "That Login ID is already used by another account.";
    }

    // Messages raised on purpose by a database rule (trigger/policy)
    if (
        error &&
        (error.code === "P0001" || error.code === "42501") &&
        error.message
    ) {
        return error.message;
    }

    return "You may not have permission, or the facilitator no longer exists.";
}


async function saveFacilitatorUpdate(id, fields) {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .update(fields)
            .eq("id", id)
            .eq("role", "facilitator")
            .select("id, student_id, full_name, phone");

    if (error || !data || data.length !== 1) {
        return { error: error || new Error("No row updated") };
    }

    return { row: data[0] };
}


editFacilitatorForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        if (!editingFacilitator) {
            return;
        }

        const facilitator = editingFacilitator;

        const fullName =
            editFullName.value.replace(/\s+/g, " ").trim();
        const newId =
            editFacilitatorLoginId.value.trim();
        const phone =
            editPhone.value.trim();

        const oldId = facilitator.student_id || "";

        const changes = {};

        if (fullName !== (facilitator.full_name || "")) {
            changes.full_name = fullName;
        }

        if (newId !== oldId) {
            changes.student_id = newId;
        }

        if (phone !== (facilitator.phone || "")) {
            changes.phone = phone || null;
        }

        // ----- validation (ID and phone only when they are being changed) -----
        if (!fullName) {
            editMessage.textContent = "Full name cannot be empty.";
            return;
        }

        if (!newId) {
            editMessage.textContent = "Login ID cannot be empty.";
            return;
        }

        if (
            "student_id" in changes &&
            /\s/.test(newId)
        ) {
            editMessage.textContent =
                "Login ID cannot contain spaces.";
            return;
        }

        if (
            "phone" in changes &&
            phone &&
            !/^[0-9+()\-\s]{1,20}$/.test(phone)
        ) {
            editMessage.textContent =
                "Phone number may only contain digits, spaces, + ( ) and -.";
            return;
        }

        if (Object.keys(changes).length === 0) {
            editMessage.textContent = "No changes to save.";
            return;
        }

        saveEditBtn.disabled = true;
        saveEditBtn.textContent = "Saving...";
        editMessage.textContent = "";

        let oldEmail = null;

        try {

            if ("student_id" in changes) {

                // 1. The new ID must not belong to anyone else
                //    (login lookup covers every account type).
                const pattern =
                    newId.replace(/[\\%_]/g, "\\$&");

                const taken =
                    await supabaseClient
                        .from("profiles")
                        .select("id")
                        .ilike("student_id", pattern)
                        .neq("id", facilitator.id)
                        .limit(1);

                if (taken.error) {
                    console.error("ID check error:", taken.error);
                    editMessage.textContent =
                        "Could not check whether that ID is already used. Nothing was changed.";
                    return;
                }

                if (taken.data && taken.data.length > 0) {
                    editMessage.textContent =
                        "That Login ID is already used by another account.";
                    return;
                }

                // 2. Remember which login account the OLD ID reaches,
                //    so we can prove the NEW ID still reaches it.
                const before = await lookupLoginEmail(oldId);

                if (before.error || !before.email) {
                    editMessage.textContent =
                        "Could not verify this facilitator's login link, so the Login ID was not changed.";
                    return;
                }

                oldEmail = before.email;

                if (
                    !window.confirm(
                        "Change this facilitator's ID from " + oldId +
                        " to " + newId + "?\n\n" +
                        "From now on they must log in with the new ID. " +
                        "Their password stays the same."
                    )
                ) {
                    return;
                }
            }

            // 3. Save name / phone FIRST and on their own, so a problem
            //    with the Login ID can never stop a spelling fix.
            const plain = {};

            if ("full_name" in changes) {
                plain.full_name = changes.full_name;
            }

            if ("phone" in changes) {
                plain.phone = changes.phone;
            }

            const hasPlain = Object.keys(plain).length > 0;

            let finalRow = {
                full_name: facilitator.full_name,
                student_id: facilitator.student_id,
                phone: facilitator.phone
            };

            let idNotice = "";

            if (hasPlain) {

                const savedPlain =
                    await saveFacilitatorUpdate(facilitator.id, plain);

                if (savedPlain.error) {
                    console.error("Edit facilitator error:", savedPlain.error);
                    editMessage.textContent =
                        "Could not save. " +
                        describeSaveError(savedPlain.error);
                    return;
                }

                finalRow = savedPlain.row;
            }

            // 4. Login ID as a separate step, then prove login still works
            if ("student_id" in changes) {

                const savedId =
                    await saveFacilitatorUpdate(
                        facilitator.id,
                        { student_id: newId }
                    );

                if (savedId.error) {

                    console.error("Edit login ID error:", savedId.error);

                    // Keep any name / phone fix that did succeed
                    facilitator.full_name = finalRow.full_name;
                    facilitator.phone = finalRow.phone;
                    searchInput.dispatchEvent(new Event("input"));

                    editMessage.textContent =
                        (hasPlain ? "Name/phone were saved. " : "") +
                        "The Login ID was NOT changed. " +
                        describeSaveError(savedId.error);
                    return;
                }

                finalRow = savedId.row;

                const after = await lookupLoginEmail(newId);

                if (after.error || after.email !== oldEmail) {

                    // The login system does not follow the new ID.
                    // Undo the ID change so the facilitator is not locked out.
                    const undone =
                        await saveFacilitatorUpdate(
                            facilitator.id,
                            { student_id: oldId }
                        );

                    if (undone.error) {
                        editMessage.textContent =
                            "WARNING: the ID was changed to " + newId +
                            " but the login check failed and it could not be undone automatically. " +
                            "Set the Login ID back to " + oldId +
                            " (or contact the developer) before the facilitator tries to log in.";
                        await loadFacilitators();
                        return;
                    }

                    finalRow = undone.row;

                    idNotice =
                        " The Login ID was NOT changed: the login system could not be updated safely for the new ID, so " +
                        oldId + " is still the login ID.";
                }
            }

            // 5. Update the page without reloading everything
            facilitator.full_name = finalRow.full_name;
            facilitator.student_id = finalRow.student_id;
            facilitator.phone = finalRow.phone;

            const onlyIdBlocked =
                idNotice &&
                !("full_name" in changes) &&
                !("phone" in changes);

            closeEditFacilitator();
            searchInput.dispatchEvent(new Event("input"));

            showPageMessage(
                onlyIdBlocked
                    ? "No changes were saved." + idNotice
                    : "Facilitator details updated." + idNotice,
                !!onlyIdBlocked
            );

        } catch (error) {

            console.error("Edit facilitator error:", error);
            editMessage.textContent =
                "Something went wrong. Please check the facilitator's details and try again.";

        } finally {

            saveEditBtn.disabled = false;
            saveEditBtn.textContent = "Save Changes";
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