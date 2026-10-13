// ========================================
// DEVELOPMENT HUB LMS
// ADMIN - MANAGE CLASSES
// ========================================


console.log("Classes JavaScript started.");


// ========================================
// GET HTML ELEMENTS
// ========================================

const addClassBtn =
    document.getElementById("addClassBtn");

const classModal =
    document.getElementById("classModal");

const closeModal =
    document.getElementById("closeModal");

const classForm =
    document.getElementById("classForm");

const formMessage =
    document.getElementById("formMessage");

const classesTable =
    document.getElementById("classesTable");

const searchInput =
    document.getElementById("searchInput");

const message =
    document.getElementById("message");

const logoutBtn =
    document.getElementById("logoutBtn");


// ========================================
// STORE CLASSES
// ========================================

let allClasses = [];
let studentCounts = {};
let facilitatorNames = {};

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


// ========================================
// OPEN MODAL
// ========================================

addClassBtn.addEventListener(
    "click",
    function () {

        console.log("Add Class clicked.");

        classModal.style.display = "flex";

        document.getElementById(
            "className"
        ).focus();

    }
);


// ========================================
// CLOSE MODAL
// ========================================

closeModal.addEventListener(
    "click",
    function () {

        classModal.style.display = "none";

        classForm.reset();

        formMessage.textContent = "";

    }
);


// ========================================
// CLOSE WHEN CLICKING OUTSIDE
// ========================================

classModal.addEventListener(
    "click",
    function (event) {

        if (event.target === classModal) {

            classModal.style.display = "none";

            classForm.reset();

            formMessage.textContent = "";

        }

    }
);


// ========================================
// CREATE CLASS
// ========================================

classForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const className =
            document.getElementById(
                "className"
            ).value.trim();


        const description =
            document.getElementById(
                "description"
            ).value.trim();


        if (!className) {

            formMessage.textContent =
                "Please enter a class name.";

            return;
        }


        const createButton =
            classForm.querySelector('button[type="submit"]');

        if (createButton) {
            createButton.disabled = true;
        }

        formMessage.textContent =
            "Creating class...";


        const {
            data,
            error
        } = await supabaseClient
            .from("classes")
            .insert({

                name: className,

                description:
                    description || null,

                facilitator_id: null,

                active: true

            })
            .select()
            .single();

        if (createButton) {
            createButton.disabled = false;
        }


        if (error) {

            console.error(
                "Create class error:",
                error
            );


            formMessage.textContent =
                "Error: " + error.message;

            return;
        }


        console.log(
            "Class created:",
            data
        );


        formMessage.textContent =
            "Class created successfully!";


        classForm.reset();


        // Reload classes immediately
        await loadClasses();


        // Close modal
        setTimeout(
            function () {

                classModal.style.display =
                    "none";

                formMessage.textContent = "";

            },
            1000
        );

    }
);


// ========================================
// LOAD CLASSES
// ========================================

async function loadClasses() {

    classesTable.innerHTML = `
        <tr>
            <td colspan="7">
                Loading classes...
            </td>
        </tr>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("classes")
        .select(`
            id,
            name,
            description,
            facilitator_id,
            active,
            created_at
        `)
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Load classes error:",
            error
        );


        classesTable.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load classes.
                </td>
            </tr>
        `;


        message.textContent =
            "Error: " + error.message;


        return;
    }


    allClasses = data || [];

    await loadClassExtras();

    displayClasses(
        allClasses
    );

}


// ========================================
// LOAD STUDENT COUNTS + FACILITATOR NAMES
// (read-only; failures never block the page)
// ========================================
async function loadClassExtras() {

    studentCounts = {};
    facilitatorNames = {};

    try {
        const { data: enrolments } = await supabaseClient
            .from("class_students")
            .select("class_id");

        (enrolments || []).forEach(function (row) {
            studentCounts[row.class_id] =
                (studentCounts[row.class_id] || 0) + 1;
        });

        const facilitatorIds = [
            ...new Set(
                allClasses
                    .map(function (c) { return c.facilitator_id; })
                    .filter(Boolean)
            )
        ];

        if (facilitatorIds.length > 0) {
            const { data: facilitators } = await supabaseClient
                .from("profiles")
                .select("id, full_name")
                .in("id", facilitatorIds);

            (facilitators || []).forEach(function (f) {
                facilitatorNames[f.id] = f.full_name;
            });
        }
    } catch (extraError) {
        console.error("Class extras error:", extraError);
    }
}

// ========================================
// DISPLAY CLASSES
// ========================================

function displayClasses(classes) {

    if (
        !classes ||
        classes.length === 0
    ) {

        classesTable.innerHTML = `
            <tr>
                <td colspan="7">
                    No classes found.
                </td>
            </tr>
        `;

        return;
    }


    classesTable.innerHTML = "";


    classes.forEach(
        function (classItem, index) {

            const row =
                document.createElement("tr");


            const status =
                classItem.active
                    ? "Active"
                    : "Inactive";


            const statusClass =
                classItem.active
                    ? "status-active"
                    : "status-inactive";


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>
                    <strong>
                        ${escapeHtml(classItem.name)}
                    </strong>
                </td>


                <td>
                    ${escapeHtml(
                        classItem.description
                        || "-"
                    )}
                </td>


                <td>
                    ${
                        classItem.facilitator_id
                        ? escapeHtml(
                            facilitatorNames[classItem.facilitator_id]
                            || "Assigned"
                        )
                        : "Not assigned"
                    }
                </td>


                <td>
                    ${studentCounts[classItem.id] || 0}
                </td>


                <td>
                    <span
                        class="${statusClass}"
                    >
                        ${status}
                    </span>
                </td>


                <td>

                    <button
                        type="button"
                        class="action-btn"
                        onclick="manageClass('${escapeHtml(classItem.id)}')"
                    >
                        Manage
                    </button>

                    <button
                        type="button"
                        class="action-btn delete-class-btn"
                        onclick="deleteClass('${escapeHtml(classItem.id)}')"
                    >
                        Delete
                    </button>

                </td>

            `;


            classesTable.appendChild(
                row
            );

        }
    );

}


// ========================================
// MANAGE CLASS
// ========================================

function manageClass(classId) {
    if (!classId) {
        alert("Unable to open this class.");
        return;
    }

    window.location.href =
        "class-details.html?id=" +
        encodeURIComponent(classId);
}


// ========================================
// SAFE CLASS DELETION
// Only deletes an empty class; dependent academic records are preserved.
// ========================================
async function deleteClass(classId) {
    const classItem = allClasses.find(function (item) {
        return String(item.id) === String(classId);
    });
    if (!classItem) {
        window.alert("This class could not be found. Refresh the page and try again.");
        return;
    }

    const confirmed = window.confirm(
        `Delete the class "${classItem.name}"?\n\n` +
        "Deletion is allowed only when the class has no enrolled students or modules. " +
        "Student and facilitator accounts will not be deleted."
    );
    if (!confirmed) return;

    const deleteButtons = Array.from(document.querySelectorAll(".delete-class-btn"));
    deleteButtons.forEach(function (button) { button.disabled = true; });

    try {
        const [enrolmentsResult, modulesResult] = await Promise.all([
            supabaseClient.from("class_students")
                .select("class_id", { count: "exact", head: true })
                .eq("class_id", classItem.id),
            supabaseClient.from("modules")
                .select("id", { count: "exact", head: true })
                .eq("class_id", classItem.id)
        ]);
        if (enrolmentsResult.error || modulesResult.error) {
            throw enrolmentsResult.error || modulesResult.error;
        }

        const enrolmentCount = enrolmentsResult.count || 0;
        const moduleCount = modulesResult.count || 0;
        if (enrolmentCount > 0 || moduleCount > 0) {
            window.alert(
                `Class "${classItem.name}" was not deleted because it has dependent records.\n\n` +
                `Enrolled students: ${enrolmentCount}\nModules: ${moduleCount}\n\n` +
                "To protect learning materials, assignments, submissions, and results, " +
                "use an approved archive/data-management process."
            );
            return;
        }

        const { error } = await supabaseClient.from("classes")
            .delete().eq("id", classItem.id);
        if (error) throw error;

        message.textContent = `Class "${classItem.name}" was deleted successfully.`;
        allClasses = allClasses.filter(function (item) {
            return String(item.id) !== String(classItem.id);
        });
        await loadClasses();
    } catch (error) {
        console.error("Delete class error:", error);
        window.alert(
            "Unable to delete this class. The database may have blocked the operation. " +
            "No dependent records should be removed. Details: " +
            (error && error.message ? error.message : "Unknown error")
        );
    } finally {
        deleteButtons.forEach(function (button) { button.disabled = false; });
    }
}

// ========================================
// SEARCH
// ========================================

searchInput.addEventListener(
    "input",
    function () {

        const search =
            this.value
                .toLowerCase()
                .trim();


        if (!search) {

            displayClasses(
                allClasses
            );

            return;
        }


        const filtered =
            allClasses.filter(
                function (classItem) {

                    const name =
                        (
                            classItem.name
                            || ""
                        )
                        .toLowerCase();


                    const description =
                        (
                            classItem.description
                            || ""
                        )
                        .toLowerCase();


                    return (
                        name.includes(search)
                        ||
                        description.includes(search)
                    );

                }
            );


        displayClasses(
            filtered
        );

    }
);


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
// START PAGE
// ========================================

async function startPage() {

    console.log(
        "Checking admin..."
    );


    const isAdmin =
        await checkAdmin();


    if (!isAdmin) {

        return;

    }


    console.log(
        "Admin verified."
    );


    await loadClasses();

}


startPage();