const studentsTable =
    document.getElementById("studentsTable");

const searchInput =
    document.getElementById("searchInput");

const addStudentBtn =
    document.getElementById("addStudentBtn");

const studentModal =
    document.getElementById("studentModal");

const closeModal =
    document.getElementById("closeModal");

const studentForm =
    document.getElementById("studentForm");

const formMessage =
    document.getElementById("formMessage");

const logoutBtn =
    document.getElementById("logoutBtn");

const message =
    document.getElementById("message");


// ========================================
// RESET PIN ELEMENTS
// ========================================

const resetPinModal =
    document.getElementById("resetPinModal");

const closeResetPinModal =
    document.getElementById("closeResetPinModal");

const resetPinForm =
    document.getElementById("resetPinForm");

const resetStudentName =
    document.getElementById("resetStudentName");

const resetStudentId =
    document.getElementById("resetStudentId");

const newPin =
    document.getElementById("newPin");

const confirmPin =
    document.getElementById("confirmPin");

const resetPinMessage =
    document.getElementById("resetPinMessage");


// ========================================
// STORE STUDENTS
// ========================================

let students = [];

// ========================================
// ESCAPE HTML (prevents injected markup)
// ========================================
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ========================================
// CHECK ADMIN
// ========================================

async function checkAdmin() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "../index.html";

        return;
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
        profile.role !== "admin"
    ) {

        alert(
            "Administrator access required."
        );

        window.location.href =
            "../index.html";

        return;
    }


    if (!profile.is_active) {

        await supabaseClient.auth.signOut();

        alert(
            "Your administrator account is inactive."
        );

        window.location.href =
            "../index.html";

        return;
    }


    loadStudents();
}


// ========================================
// LOAD STUDENTS
// ========================================

async function loadStudents() {

    studentsTable.innerHTML = `
        <tr>
            <td colspan="6">
                Loading students...
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
        .eq("role", "student")
        .order("full_name");


    if (error) {

        console.error(
            "Load students error:",
            error
        );

        studentsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load students.
                </td>
            </tr>
        `;

        return;
    }


    students = data || [];

    displayStudents(students);
}


// ========================================
// DISPLAY STUDENTS
// ========================================

function displayStudents(list) {

    studentsTable.innerHTML = "";


    if (list.length === 0) {

        studentsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No students found.
                </td>
            </tr>
        `;

        return;
    }


    list.forEach(function (student, index) {

        const row =
            document.createElement("tr");


        const statusText =
            student.is_active
                ? "Active"
                : "Inactive";


        const statusClass =
            student.is_active
                ? "active"
                : "inactive";


        row.innerHTML = `

            <td>
                ${index + 1}
            </td>

            <td>
                ${escapeHtml(student.student_id || "-")}
            </td>

            <td>
                ${escapeHtml(student.full_name || "-")}
            </td>

            <td>
                ${escapeHtml(student.phone || "-")}
            </td>

            <td>
                <span class="status ${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>

                <div class="row-actions">
                <button
                    type="button"
                    class="edit-student-btn"
                    data-id="${escapeHtml(student.id)}"
                >
                    Edit
                </button>
                <button
                    type="button"
                    class="reset-pin-btn"
                    data-id="${escapeHtml(student.id)}"
                >
                    Reset PIN
                </button>

                <button
                    type="button"
                    class="toggle-btn"
                    data-id="${escapeHtml(student.id)}"
                    data-active="${student.is_active}"
                >
                    ${
                        student.is_active
                            ? "Deactivate"
                            : "Activate"
                    }
                </button>
                </div>

            </td>

        `;


        studentsTable.appendChild(row);

    });


    // ========================================
    // EDIT STUDENT BUTTONS
    // ========================================
    document
        .querySelectorAll(".edit-student-btn")
        .forEach(function (button) {
            button.addEventListener(
                "click",
                function () {
                    openEditStudent(
                        button.dataset.id,
                        button
                    );
                }
            );
        });

    // ========================================
    // RESET PIN BUTTONS
    // ========================================

    document
        .querySelectorAll(".reset-pin-btn")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    openResetPin(
                        button.dataset.id
                    );

                }
            );

        });


    // ========================================
    // ACTIVATE / DEACTIVATE BUTTONS
    // ========================================

    document
        .querySelectorAll(".toggle-btn")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    toggleStudent(
                        button.dataset.id,
                        button.dataset.active === "true"
                    );

                }
            );

        });

}


// ========================================
// SEARCH
// ========================================

searchInput.addEventListener(
    "input",
    function () {

        const search =
            searchInput.value
                .toLowerCase()
                .trim();


        const filtered =
            students.filter(
                function (student) {

                    const name =
                        (
                            student.full_name || ""
                        ).toLowerCase();


                    const id =
                        (
                            student.student_id || ""
                        ).toLowerCase();


                    const phone =
                        (
                            student.phone || ""
                        ).toLowerCase();


                    return (
                        name.includes(search) ||
                        id.includes(search) ||
                        phone.includes(search)
                    );

                }
            );


        displayStudents(filtered);

    }
);


// ========================================
// ADD STUDENT MODAL
// ========================================

addStudentBtn.addEventListener(
    "click",
    function () {

        studentModal.style.display =
            "flex";

        formMessage.textContent = "";

    }
);


closeModal.addEventListener(
    "click",
    function () {

        studentModal.style.display =
            "none";

    }
);


// ========================================
// CREATE STUDENT
// ========================================

studentForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const studentId =
            document
                .getElementById("studentId")
                .value
                .trim();


        const fullName =
            document
                .getElementById("fullName")
                .value
                .trim();


        const phone =
            document
                .getElementById("phone")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        if (
            !studentId ||
            !fullName ||
            !password
        ) {

            formMessage.textContent =
                "Please complete all required fields.";

            return;
        }


        if (password.length < 6) {

            formMessage.textContent =
                "Password must be at least 6 characters.";

            return;
        }


        const createButton =
            studentForm.querySelector('button[type="submit"]');

        if (createButton) {
            createButton.disabled = true;
        }

        formMessage.textContent =
            "Creating student...";


        try {

            // Refresh the current admin session
            await supabaseClient.auth
                .getSession();


            const {
                data,
                error
            } =
                await supabaseClient.functions.invoke(
                    "create-user",
                    {
                        body: {
                            student_id:
                                studentId,

                            full_name:
                                fullName,

                            phone:
                                phone,

                            password:
                                password
                        }
                    }
                );


            if (error) {

                console.error(
                    "Create student error:",
                    error
                );

                formMessage.textContent =
                    error.message ||
                    "Unable to create student.";

                return;
            }


            if (
                data &&
                data.error
            ) {

                console.error(
                    "Create user function error:",
                    data.error
                );

                formMessage.textContent =
                    data.error;

                return;
            }


            formMessage.textContent =
                "Student created successfully.";


            studentForm.reset();


            setTimeout(
                function () {

                    studentModal.style.display =
                        "none";

                    loadStudents();

                },
                1000
            );

        }
        catch (error) {

            console.error(
                "Create student exception:",
                error
            );

            formMessage.textContent =
                error.message ||
                "Something went wrong.";

        }
        finally {

            if (createButton) {
                createButton.disabled = false;
            }
        }

    }
);


// ========================================
// OPEN RESET PIN
// ========================================

function openResetPin(studentId) {

    const student =
        students.find(
            function (item) {

                return item.id === studentId;

            }
        );


    if (!student) {

        alert(
            "Student not found."
        );

        return;
    }


    resetStudentName.textContent =
        student.full_name || "-";


    resetStudentId.textContent =
        student.student_id || "-";


    resetPinForm.reset();


    resetPinMessage.textContent =
        "";


    resetPinModal.style.display =
        "flex";


    // IMPORTANT:
    // This is the Auth user ID
    resetPinForm.dataset.studentId =
        student.id;
}


// ========================================
// CLOSE RESET PIN
// ========================================

closeResetPinModal.addEventListener(
    "click",
    function () {

        resetPinModal.style.display =
            "none";

    }
);


// ========================================
// RESET PIN
// ========================================

resetPinForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const studentId =
            resetPinForm.dataset.studentId;


        const pin =
            newPin.value;


        const confirmedPin =
            confirmPin.value;


        // --------------------------------
        // VALIDATION
        // --------------------------------

        if (!studentId) {

            resetPinMessage.textContent =
                "Student account could not be identified.";

            return;
        }


        if (pin.length < 6) {

            resetPinMessage.textContent =
                "PIN must be at least 6 characters.";

            return;
        }


        if (pin !== confirmedPin) {

            resetPinMessage.textContent =
                "PINs do not match.";

            return;
        }


        resetPinMessage.textContent =
            "Resetting PIN...";


        try {

            // --------------------------------
            // GET CURRENT ADMIN SESSION
            // --------------------------------

            const {
                data: sessionData,
                error: sessionError
            } =
                await supabaseClient.auth
                    .getSession();


            if (
                sessionError ||
                !sessionData ||
                !sessionData.session
            ) {

                console.error(
                    "Session error:",
                    sessionError
                );

                resetPinMessage.textContent =
                    "Your admin session has expired. Please login again.";

                return;
            }


            // --------------------------------
            // CALL EDGE FUNCTION
            // --------------------------------

            const {
                data,
                error
            } =
                await supabaseClient.functions.invoke(
                    "reset-user-password",
                    {
                        body: {
                            user_id:
                                studentId,

                            new_pin:
                                pin
                        }
                    }
                );


            // --------------------------------
            // EDGE FUNCTION ERROR
            // --------------------------------

            if (error) {

                console.error(
                    "Reset PIN Edge Function error:",
                    error
                );


                // Try to read the actual
                // response from Supabase
                if (
                    error.context &&
                    typeof error.context.json ===
                        "function"
                ) {

                    try {

                        const errorBody =
                            await error.context.json();


                        console.error(
                            "Reset PIN response:",
                            errorBody
                        );


                        if (
                            errorBody &&
                            errorBody.error
                        ) {

                            resetPinMessage.textContent =
                                errorBody.error;

                            return;
                        }

                    }
                    catch (readError) {

                        console.error(
                            "Could not read error response:",
                            readError
                        );

                    }

                }


                resetPinMessage.textContent =
                    error.message ||
                    "Unable to reset PIN.";

                return;
            }


            // --------------------------------
            // FUNCTION RETURNED AN ERROR
            // --------------------------------

            if (
                data &&
                data.error
            ) {

                console.error(
                    "Reset PIN function error:",
                    data.error
                );


                resetPinMessage.textContent =
                    data.error;

                return;
            }


            // --------------------------------
            // SUCCESS
            // --------------------------------

            resetPinMessage.textContent =
                "PIN reset successfully.";


            resetPinForm.reset();


            setTimeout(
                function () {

                    resetPinModal.style.display =
                        "none";

                },
                1200
            );

        }
        catch (error) {

            console.error(
                "Reset PIN exception:",
                error
            );


            resetPinMessage.textContent =
                error.message ||
                "Something went wrong while resetting the PIN.";

        }

    }
);


// ========================================
// ACTIVATE / DEACTIVATE
// ========================================

async function toggleStudent(
    studentId,
    currentlyActive
) {

    const action =
        currentlyActive
            ? "deactivate"
            : "activate";


    const confirmed =
        confirm(
            `Are you sure you want to ${action} this student?`
        );


    if (!confirmed) {

        return;
    }


    const {
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            is_active:
                !currentlyActive
        })
        .eq("id", studentId);


    if (error) {

        console.error(
            "Student status error:",
            error
        );

        alert(
            error.message ||
            "Unable to update student status."
        );

        return;
    }


    loadStudents();
}


// ========================================
// LOGOUT
// ========================================

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


// ========================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ========================================

window.addEventListener(
    "click",
    function (event) {

        if (
            event.target === studentModal
        ) {

            studentModal.style.display =
                "none";

        }


        if (
            event.target === resetPinModal
        ) {

            resetPinModal.style.display =
                "none";

        }

    }
);


// ========================================
// EDIT STUDENT (correct name, Student ID, phone)
// Admin-only page. The database policy on "profiles" is what really
// restricts who may change these fields.
// ========================================
const editStudentModal =
    document.getElementById("editStudentModal");
const editStudentForm =
    document.getElementById("editStudentForm");
const closeEditModal =
    document.getElementById("closeEditModal");
const editFullName =
    document.getElementById("editFullName");
const editStudentId =
    document.getElementById("editStudentId");
const editPhone =
    document.getElementById("editPhone");
const editIdWarning =
    document.getElementById("editIdWarning");
const editMessage =
    document.getElementById("editMessage");
const saveEditBtn =
    document.getElementById("saveEditBtn");

let editingStudent = null;
let editReturnFocus = null;


function showPageMessage(text, isError) {
    message.textContent = text;
    message.className =
        isError
            ? "error-message"
            : "success-message";
}


function openEditStudent(studentId, trigger) {

    const student =
        students.find(
            function (item) {
                return item.id === studentId;
            }
        );

    if (!student) {
        showPageMessage(
            "Student not found. Please refresh the page.",
            true
        );
        return;
    }

    editingStudent = student;
    editReturnFocus = trigger || null;

    editFullName.value = student.full_name || "";
    editStudentId.value = student.student_id || "";
    editPhone.value = student.phone || "";
    editIdWarning.hidden = true;
    editMessage.textContent = "";
    saveEditBtn.disabled = false;
    saveEditBtn.textContent = "Save Changes";

    editStudentModal.style.display = "flex";
    editFullName.focus();
}


function closeEditStudent() {

    editStudentModal.style.display = "none";
    editingStudent = null;

    if (editReturnFocus && editReturnFocus.focus) {
        editReturnFocus.focus();
    }
}


editStudentId.addEventListener(
    "input",
    function () {
        editIdWarning.hidden =
            !editingStudent ||
            editStudentId.value.trim() ===
                (editingStudent.student_id || "");
    }
);

closeEditModal.addEventListener("click", closeEditStudent);

editStudentModal.addEventListener(
    "click",
    function (event) {
        if (event.target === editStudentModal) {
            closeEditStudent();
        }
    }
);

document.addEventListener(
    "keydown",
    function (event) {
        if (
            event.key === "Escape" &&
            editStudentModal.style.display === "flex"
        ) {
            closeEditStudent();
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


async function saveStudentUpdate(id, fields) {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .update(fields)
            .eq("id", id)
            .eq("role", "student")
            .select("id, student_id, full_name, phone");

    if (error || !data || data.length !== 1) {
        return { error: error || new Error("No row updated") };
    }

    return { row: data[0] };
}


editStudentForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        if (!editingStudent) {
            return;
        }

        const student = editingStudent;

        const fullName =
            editFullName.value.replace(/\s+/g, " ").trim();
        const newId =
            editStudentId.value.trim();
        const phone =
            editPhone.value.trim();

        const oldId = student.student_id || "";

        const changes = {};

        if (fullName !== (student.full_name || "")) {
            changes.full_name = fullName;
        }

        if (newId !== oldId) {
            changes.student_id = newId;
        }

        if (phone !== (student.phone || "")) {
            changes.phone = phone || null;
        }

        // ----- validation (ID and phone only when they are being changed) -----
        if (!fullName) {
            editMessage.textContent = "Full name cannot be empty.";
            return;
        }

        if (!newId) {
            editMessage.textContent = "Student ID cannot be empty.";
            return;
        }

        if (
            "student_id" in changes &&
            /\s/.test(newId)
        ) {
            editMessage.textContent =
                "Student ID cannot contain spaces.";
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
                        .neq("id", student.id)
                        .limit(1);

                if (taken.error) {
                    console.error("ID check error:", taken.error);
                    editMessage.textContent =
                        "Could not check whether that ID is already used. Nothing was changed.";
                    return;
                }

                if (taken.data && taken.data.length > 0) {
                    editMessage.textContent =
                        "That Student ID is already used by another account.";
                    return;
                }

                // 2. Remember which login account the OLD ID reaches,
                //    so we can prove the NEW ID still reaches it.
                const before = await lookupLoginEmail(oldId);

                if (before.error || !before.email) {
                    editMessage.textContent =
                        "Could not verify this student's login link, so the Student ID was not changed.";
                    return;
                }

                oldEmail = before.email;

                if (
                    !window.confirm(
                        "Change this student's ID from " + oldId +
                        " to " + newId + "?\n\n" +
                        "From now on they must log in with the new ID. " +
                        "Their password stays the same."
                    )
                ) {
                    return;
                }
            }

            // 3. Save
            const saved =
                await saveStudentUpdate(student.id, changes);

            if (saved.error) {
                console.error("Edit student error:", saved.error);
                editMessage.textContent =
                    saved.error.code === "23505"
                        ? "That Student ID is already used by another account."
                        : "Could not save. You may not have permission, or the student no longer exists.";
                return;
            }

            let finalRow = saved.row;
            let idNotice = "";

            // 4. After an ID change, prove that login still works
            if ("student_id" in changes) {

                const after = await lookupLoginEmail(newId);

                if (after.error || after.email !== oldEmail) {

                    // The login system does not follow the new ID.
                    // Undo the ID change so the student is not locked out.
                    const undone =
                        await saveStudentUpdate(
                            student.id,
                            { student_id: oldId }
                        );

                    if (undone.error) {
                        editMessage.textContent =
                            "WARNING: the ID was changed to " + newId +
                            " but the login check failed and it could not be undone automatically. " +
                            "Set the Student ID back to " + oldId +
                            " (or contact the developer) before the student tries to log in.";
                        await loadStudents();
                        return;
                    }

                    finalRow = undone.row;

                    idNotice =
                        " The Student ID was NOT changed: the login system could not be updated safely for the new ID, so " +
                        oldId + " is still the login ID.";
                }
            }

            // 5. Update the page without reloading everything
            student.full_name = finalRow.full_name;
            student.student_id = finalRow.student_id;
            student.phone = finalRow.phone;

            const onlyIdBlocked =
                idNotice &&
                !("full_name" in changes) &&
                !("phone" in changes);

            closeEditStudent();
            searchInput.dispatchEvent(new Event("input"));

            showPageMessage(
                onlyIdBlocked
                    ? "No changes were saved." + idNotice
                    : "Student details updated." + idNotice,
                !!onlyIdBlocked
            );

        } catch (error) {

            console.error("Edit student error:", error);
            editMessage.textContent =
                "Something went wrong. Please check the student's details and try again.";

        } finally {

            saveEditBtn.disabled = false;
            saveEditBtn.textContent = "Save Changes";
        }
    }
);


// ========================================
// START
// ========================================

checkAdmin();