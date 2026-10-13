const params = new URLSearchParams(window.location.search);
const classId = params.get("id");

const className = document.getElementById("className");
const classDescription = document.getElementById("classDescription");
const classStatus = document.getElementById("classStatus");

const facilitatorSelect = document.getElementById("facilitatorSelect");
const assignFacilitatorBtn = document.getElementById("assignFacilitatorBtn");

const studentSelect = document.getElementById("studentSelect");
const addStudentBtn = document.getElementById("addStudentBtn");

const studentsTable = document.getElementById("studentsTable");
const studentCount = document.getElementById("studentCount");

const message = document.getElementById("message");
const logoutBtn = document.getElementById("logoutBtn");


/* =========================
   CHECK ADMIN
========================= */

async function checkAdmin() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "../index.html";
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
        window.location.href = "../index.html";
        return false;
    }

    return true;
}


/* =========================
   LOAD CLASS
========================= */

async function loadClass() {

    if (!classId) {
        className.textContent = "Class not found";
        classDescription.textContent = "";
        return;
    }

    const {
        data: classData,
        error
    } = await supabaseClient
        .from("classes")
        .select("id, name, description, facilitator_id, active")
        .eq("id", classId)
        .single();

    if (error) {
        console.error("Class loading error:", error);

        className.textContent = "Unable to load class";
        classDescription.textContent = error.message;

        return;
    }

    if (!classData) {
        className.textContent = "Class not found";
        classDescription.textContent = "";

        return;
    }

    className.textContent = classData.name || "Unnamed Class";

    classDescription.textContent =
        classData.description || "No description provided.";

    classStatus.textContent =
        classData.active ? "Active" : "Inactive";

    await loadFacilitators(classData.facilitator_id);
    await loadStudents();
}


/* =========================
   LOAD FACILITATORS
========================= */

async function loadFacilitators(currentFacilitatorId = null) {

    facilitatorSelect.innerHTML =
        `<option value="">Select Facilitator</option>`;

    const {
        data: facilitators,
        error
    } = await supabaseClient
        .from("profiles")
        .select("id, full_name, student_id")
        .eq("role", "facilitator")
        .eq("is_active", true)
        .order("full_name");

    if (error) {
        console.error("Facilitator loading error:", error);

        facilitatorSelect.innerHTML =
            `<option value="">Unable to load facilitators</option>`;

        return;
    }

    if (!facilitators || facilitators.length === 0) {
        facilitatorSelect.innerHTML =
            `<option value="">No facilitators available</option>`;

        return;
    }

    facilitators.forEach(function (facilitator) {

        const option = document.createElement("option");

        option.value = facilitator.id;

        option.textContent =
            `${facilitator.full_name} (${facilitator.student_id || "No ID"})`;

        if (facilitator.id === currentFacilitatorId) {
            option.selected = true;
        }

        facilitatorSelect.appendChild(option);
    });
}


/* =========================
   ASSIGN FACILITATOR
========================= */

assignFacilitatorBtn.addEventListener(
    "click",
    async function () {

        const facilitatorId =
            facilitatorSelect.value || null;

        assignFacilitatorBtn.disabled = true;

        showMessage("Assigning facilitator...");

        const {
            error
        } = await supabaseClient
            .from("classes")
            .update({
                facilitator_id: facilitatorId
            })
            .eq("id", classId);

        assignFacilitatorBtn.disabled = false;

        if (error) {

            console.error(
                "Assign facilitator error:",
                error
            );

            showMessage(
                "Error: " + error.message,
                true
            );

            return;
        }

        showMessage(
            facilitatorId
                ? "Facilitator assigned successfully."
                : "Facilitator removed successfully."
        );
    }
);


/* =========================
   LOAD STUDENTS
========================= */

async function loadStudents() {

    studentsTable.innerHTML = `
        <tr>
            <td colspan="5">Loading students...</td>
        </tr>
    `;

    const {
        data: enrollments,
        error
    } = await supabaseClient
        .from("class_students")
        .select("id, student_id, enrolled_at")
        .eq("class_id", classId)
        .order("enrolled_at", {
            ascending: true
        });

    if (error) {

        console.error(
            "Enrollment loading error:",
            error
        );

        studentsTable.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load students: ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

        studentCount.textContent = "0";

        return;
    }

    studentCount.textContent =
        enrollments ? enrollments.length : 0;

    if (!enrollments || enrollments.length === 0) {

        studentsTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No students assigned to this class yet.
                </td>
            </tr>
        `;

        await loadAvailableStudents([]);

        return;
    }

    const studentIds =
        enrollments.map(
            enrollment => enrollment.student_id
        );

    const {
        data: students,
        error: studentsError
    } = await supabaseClient
        .from("profiles")
        .select("id, student_id, full_name, phone")
        .in("id", studentIds)
        .eq("role", "student");

    if (studentsError) {

        console.error(
            "Student profile loading error:",
            studentsError
        );

        studentsTable.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load student information:
                    ${escapeHtml(studentsError.message)}
                </td>
            </tr>
        `;

        return;
    }

    studentsTable.innerHTML = "";

    students.forEach(function (student, index) {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(student.student_id || "-")}</td>
            <td>${escapeHtml(student.full_name || "-")}</td>
            <td>${escapeHtml(student.phone || "-")}</td>
            <td>
                <button
                    class="remove-btn"
                    onclick="removeStudent('${student.id}')"
                >
                    Remove
                </button>
            </td>
        `;

        studentsTable.appendChild(row);
    });

    await loadAvailableStudents(studentIds);
}


/* =========================
   LOAD AVAILABLE STUDENTS
========================= */

async function loadAvailableStudents(
    enrolledStudentIds = []
) {

    studentSelect.innerHTML =
        `<option value="">Select Student</option>`;

    const {
        data: students,
        error
    } = await supabaseClient
        .from("profiles")
        .select("id, student_id, full_name")
        .eq("role", "student")
        .eq("is_active", true)
        .order("full_name");

    if (error) {

        console.error(
            "Available students error:",
            error
        );

        studentSelect.innerHTML =
            `<option value="">Unable to load students</option>`;

        return;
    }

    const availableStudents =
        (students || []).filter(
            student =>
                !enrolledStudentIds.includes(student.id)
        );

    if (availableStudents.length === 0) {

        studentSelect.innerHTML =
            `<option value="">No students available</option>`;

        return;
    }

    availableStudents.forEach(function (student) {

        const option =
            document.createElement("option");

        option.value = student.id;

        option.textContent =
            `${student.full_name} (${student.student_id || "No ID"})`;

        studentSelect.appendChild(option);
    });
}


/* =========================
   ADD STUDENT
========================= */

addStudentBtn.addEventListener(
    "click",
    async function () {

        const selectedStudent =
            studentSelect.value;

        if (!selectedStudent) {

            showMessage(
                "Please select a student.",
                true
            );

            return;
        }

        addStudentBtn.disabled = true;

        showMessage("Adding student...");

        const {
            error
        } = await supabaseClient
            .from("class_students")
            .insert({
                class_id: classId,
                student_id: selectedStudent
            });

        addStudentBtn.disabled = false;

        if (error) {

            console.error(
                "Add student error:",
                error
            );

            showMessage(
                "Error: " + error.message,
                true
            );

            return;
        }

        showMessage(
            "Student added successfully."
        );

        await loadStudents();
    }
);


/* =========================
   REMOVE STUDENT
========================= */

async function removeStudent(studentId) {

    const confirmed =
        confirm(
            "Remove this student from the class?"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("class_students")
        .delete()
        .eq("class_id", classId)
        .eq("student_id", studentId);

    if (error) {

        console.error(
            "Remove student error:",
            error
        );

        showMessage(
            "Error: " + error.message,
            true
        );

        return;
    }

    showMessage(
        "Student removed successfully."
    );

    await loadStudents();
}


/* =========================
   MESSAGE
========================= */

function showMessage(text, isError = false) {

    message.textContent = text;

    message.className =
        isError ? "error-message" : "success-message";
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
            if (message) message.textContent = "Unable to log out: " + error.message;
            else window.alert("Unable to log out: " + error.message);
        }
    }
);


/* =========================
   START
========================= */

async function startPage() {

    const isAdmin =
        await checkAdmin();

    if (!isAdmin) {
        return;
    }

    await loadClass();
}

startPage();