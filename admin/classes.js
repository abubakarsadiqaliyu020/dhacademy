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

                    <div class="class-actions">

                        <button
                            class="action-btn"
                            onclick="manageClass('${escapeHtml(classItem.id)}')"
                        >
                            Manage
                        </button>

                        <button
                            type="button"
                            class="delete-btn"
                            data-delete-class="${escapeHtml(classItem.id)}"
                        >
                            Delete
                        </button>

                    </div>

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
// DELETE / ARCHIVE CLASS
// Safe rules:
//  - Only a class with NO dependent records is deleted.
//  - A class with students, modules, materials, assignments or
//    submissions is never deleted; it can be archived instead
//    (classes.active = false) and restored later.
//  - Student/facilitator accounts are never touched.
// ========================================

const deleteModal = document.getElementById("deleteModal");
const deleteClassName = document.getElementById("deleteClassName");
const deleteBody = document.getElementById("deleteBody");
const closeDeleteModal = document.getElementById("closeDeleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const archiveClassBtn = document.getElementById("archiveClassBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let deleteTarget = null;
let deleteReturnFocus = null;


function showMessage(text, isError) {
    message.textContent = text;
    message.className = isError ? "error-message" : "success-message";
}


// Counts everything that depends on a class. Any failed request
// throws, so a failed check can never be mistaken for "no records".
async function countClassDependencies(classId) {

    const result = {
        students: 0,
        modules: 0,
        materials: 0,
        assignments: 0,
        submissions: 0
    };

    const studentsReq = await supabaseClient
        .from("class_students")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId);

    if (studentsReq.error) throw studentsReq.error;
    result.students = studentsReq.count || 0;

    const modulesReq = await supabaseClient
        .from("modules")
        .select("id")
        .eq("class_id", classId);

    if (modulesReq.error) throw modulesReq.error;

    const moduleIds = (modulesReq.data || []).map(function (m) {
        return m.id;
    });

    result.modules = moduleIds.length;

    if (moduleIds.length === 0) return result;

    const [materialsReq, assignmentsReq] = await Promise.all([
        supabaseClient
            .from("resources")
            .select("id", { count: "exact", head: true })
            .in("module_id", moduleIds),
        supabaseClient
            .from("assignments")
            .select("id")
            .in("module_id", moduleIds)
    ]);

    if (materialsReq.error) throw materialsReq.error;
    if (assignmentsReq.error) throw assignmentsReq.error;

    result.materials = materialsReq.count || 0;

    const assignmentIds = (assignmentsReq.data || []).map(function (a) {
        return a.id;
    });

    result.assignments = assignmentIds.length;

    if (assignmentIds.length > 0) {
        const submissionsReq = await supabaseClient
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .in("assignment_id", assignmentIds);

        if (submissionsReq.error) throw submissionsReq.error;
        result.submissions = submissionsReq.count || 0;
    }

    return result;
}


function totalDependencies(deps) {
    return (
        deps.students + deps.modules + deps.materials +
        deps.assignments + deps.submissions
    );
}


function setDialogButtons(state) {
    cancelDeleteBtn.disabled = false;
    archiveClassBtn.hidden = !state.archive;
    confirmDeleteBtn.hidden = !state.remove;
    archiveClassBtn.disabled = false;
    confirmDeleteBtn.disabled = false;
    if (state.archive) archiveClassBtn.textContent = state.archive;
}


function closeDeleteDialog() {
    deleteModal.style.display = "none";
    deleteTarget = null;
    if (deleteReturnFocus && deleteReturnFocus.focus) {
        deleteReturnFocus.focus();
    }
}


async function openDeleteDialog(classId, trigger) {

    const classItem = allClasses.find(function (c) {
        return c.id === classId;
    });

    if (!classItem) {
        showMessage("Class not found. Please refresh the page.", true);
        return;
    }

    deleteTarget = classItem;
    deleteReturnFocus = trigger || null;

    deleteClassName.textContent = classItem.name;
    deleteBody.textContent = "Checking records linked to this class...";
    setDialogButtons({});
    deleteModal.style.display = "flex";
    cancelDeleteBtn.focus();

    let deps;

    try {
        deps = await countClassDependencies(classId);
    } catch (error) {
        console.error("Dependency check error:", error);
        if (deleteTarget !== classItem) return;
        deleteBody.innerHTML =
            '<div class="delete-warning">Unable to check this class\'s records, ' +
            'so nothing can be deleted safely right now. Please try again.</div>';
        setDialogButtons({});
        return;
    }

    if (deleteTarget !== classItem) return;

    renderDeleteDialog(classItem, deps);
}


function renderDeleteDialog(classItem, deps) {

    if (totalDependencies(deps) === 0) {
        deleteBody.innerHTML =
            '<div class="delete-ok">This class has no students, modules, ' +
            'materials, assignments or submissions. It can be deleted.</div>' +
            '<p>This cannot be undone. Are you sure you want to delete ' +
            'this class?</p>' +
            (classItem.active
                ? ''
                : '<p>This class is archived. You can also restore it instead.</p>');
        setDialogButtons({
            remove: true,
            archive: classItem.active ? "" : "Restore class"
        });
        return;
    }

    const lines = [];
    if (deps.students) lines.push(deps.students + " enrolled student(s)");
    if (deps.modules) lines.push(deps.modules + " module(s)");
    if (deps.materials) lines.push(deps.materials + " learning material(s)");
    if (deps.assignments) lines.push(deps.assignments + " assignment(s)");
    if (deps.submissions) lines.push(deps.submissions + " student submission(s)");

    deleteBody.innerHTML =
        '<div class="delete-warning"><strong>This class cannot be deleted.</strong> ' +
        'It has linked records:<ul>' +
        lines.map(function (line) {
            return "<li>" + escapeHtml(line) + "</li>";
        }).join("") +
        '</ul>Deleting it would risk losing student work, marks and feedback.</div>' +
        '<p>' +
        (classItem.active
            ? "You can archive the class instead. It is marked Inactive and all records are kept. You can restore it later."
            : "This class is already archived. You can restore it to make it Active again.") +
        '</p>';

    setDialogButtons({
        archive: classItem.active ? "Archive class" : "Restore class"
    });
}


async function archiveOrRestoreClass() {

    if (!deleteTarget) return;

    const classItem = deleteTarget;
    const makeActive = !classItem.active;

    archiveClassBtn.disabled = true;
    cancelDeleteBtn.disabled = true;

    const { data, error } = await supabaseClient
        .from("classes")
        .update({ active: makeActive })
        .eq("id", classItem.id)
        .select("id");

    if (error || !data || data.length === 0) {
        console.error("Archive class error:", error);
        archiveClassBtn.disabled = false;
        cancelDeleteBtn.disabled = false;
        deleteBody.insertAdjacentHTML(
            "beforeend",
            '<div class="delete-warning">Unable to update this class. ' +
            'You may not have permission, or it no longer exists.</div>'
        );
        return;
    }

    classItem.active = makeActive;
    closeDeleteDialog();
    searchInput.dispatchEvent(new Event("input"));
    showMessage(
        makeActive
            ? 'Class "' + classItem.name + '" restored.'
            : 'Class "' + classItem.name + '" archived. Its records were kept.',
        false
    );
}


async function deleteClassPermanently() {

    if (!deleteTarget) return;

    const classItem = deleteTarget;

    confirmDeleteBtn.disabled = true;
    cancelDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = "Deleting...";

    try {
        // Re-check right before deleting in case records were added
        // after the dialog opened.
        const deps = await countClassDependencies(classItem.id);

        if (totalDependencies(deps) > 0) {
            renderDeleteDialog(classItem, deps);
            return;
        }

        const { data, error } = await supabaseClient
            .from("classes")
            .delete()
            .eq("id", classItem.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("No rows were deleted.");
        }

        allClasses = allClasses.filter(function (c) {
            return c.id !== classItem.id;
        });
        delete studentCounts[classItem.id];

        closeDeleteDialog();
        searchInput.dispatchEvent(new Event("input"));
        showMessage('Class "' + classItem.name + '" deleted.', false);

    } catch (error) {
        console.error("Delete class error:", error);
        deleteBody.insertAdjacentHTML(
            "beforeend",
            '<div class="delete-warning">The class was not deleted. ' +
            'You may not have permission, or other records still depend on it.</div>'
        );
    } finally {
        confirmDeleteBtn.disabled = false;
        cancelDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = "Delete permanently";
    }
}


classesTable.addEventListener("click", function (event) {
    const button = event.target.closest("[data-delete-class]");
    if (!button) return;
    openDeleteDialog(button.getAttribute("data-delete-class"), button);
});

closeDeleteModal.addEventListener("click", closeDeleteDialog);
cancelDeleteBtn.addEventListener("click", closeDeleteDialog);
archiveClassBtn.addEventListener("click", archiveOrRestoreClass);
confirmDeleteBtn.addEventListener("click", deleteClassPermanently);

deleteModal.addEventListener("click", function (event) {
    if (event.target === deleteModal) closeDeleteDialog();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && deleteModal.style.display === "flex") {
        closeDeleteDialog();
    }
});


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