const className =
    document.getElementById("className");

const classDescription =
    document.getElementById("classDescription");

const classStatus =
    document.getElementById("classStatus");

const studentCount =
    document.getElementById("studentCount");

const moduleCount =
    document.getElementById("moduleCount");

const assignmentCount =
    document.getElementById("assignmentCount");

const studentsTable =
    document.getElementById("studentsTable");

const modulesContainer =
    document.getElementById("modulesContainer");

const logoutBtn =
    document.getElementById("logoutBtn");

const addModuleBtn =
    document.getElementById("addModuleBtn");

const moduleModal =
    document.getElementById("moduleModal");

const closeModuleModal =
    document.getElementById("closeModuleModal");

const moduleForm =
    document.getElementById("moduleForm");

const moduleMessage =
    document.getElementById("moduleMessage");


let currentUser = null;

let currentClassId = null;


/* =========================
   GET CLASS ID
========================= */

function getClassId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("id");
}


/* =========================
   CHECK FACILITATOR
========================= */

async function checkFacilitator() {

    const {
        data: { user },
        error
    } =
        await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "../index.html";

        return false;
    }


    currentUser = user;


    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "role, is_active"
            )
            .eq(
                "id",
                user.id
            )
            .single();


    if (
        profileError ||
        !profile
    ) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

        return false;
    }


    if (
        profile.role !== "facilitator" ||
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
   LOAD CLASS
========================= */

async function loadClass() {

    const {
        data: classData,
        error
    } =
        await supabaseClient
            .from("classes")
            .select(
                "id, name, description, active, facilitator_id"
            )
            .eq(
                "id",
                currentClassId
            )
            .eq(
                "facilitator_id",
                currentUser.id
            )
            .single();


    if (
        error ||
        !classData
    ) {

        console.error(
            "Class loading error:",
            error
        );


        document.querySelector(
            "main"
        ).innerHTML = `

            <div class="error-card">

                You do not have permission
                to access this class.

                <br><br>

                <a href="dashboard.html">
                    Return to Dashboard
                </a>

            </div>

        `;

        return false;
    }


    className.textContent =
        classData.name;


    classDescription.textContent =
        classData.description ||
        "No description provided.";


    classStatus.textContent =
        classData.active
            ? "Active"
            : "Inactive";


    return true;
}


/* =========================
   LOAD STUDENTS
========================= */

async function loadStudents() {

    studentsTable.innerHTML = `

        <tr>

            <td colspan="4">
                Loading students...
            </td>

        </tr>

    `;


    const {
        data: enrollments,
        error
    } =
        await supabaseClient
            .from("class_students")
            .select(
                "id, student_id, enrolled_at"
            )
            .eq(
                "class_id",
                currentClassId
            )
            .order(
                "enrolled_at"
            );


    if (error) {

        console.error(
            "Student loading error:",
            error
        );


        studentsTable.innerHTML = `

            <tr>

                <td colspan="4">

                    Unable to load students.

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                </td>

            </tr>

        `;

        return;
    }


    if (
        !enrollments ||
        enrollments.length === 0
    ) {

        studentCount.textContent = "0";


        studentsTable.innerHTML = `

            <tr>

                <td colspan="4">

                    No students assigned
                    to this class yet.

                </td>

            </tr>

        `;

        return;
    }


    const studentIds =
        enrollments.map(
            item => item.student_id
        );


    const {
        data: students,
        error: studentsError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, student_id, full_name, phone"
            )
            .in(
                "id",
                studentIds
            );


    if (studentsError) {

        console.error(
            "Profile loading error:",
            studentsError
        );


        studentsTable.innerHTML = `

            <tr>

                <td colspan="4">

                    Unable to load
                    student information.

                    <br><br>

                    ${escapeHtml(
                        studentsError.message
                    )}

                </td>

            </tr>

        `;

        return;
    }


    studentCount.textContent =
        students.length;


    studentsTable.innerHTML = "";


    students.forEach(
        function (student, index) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHtml(
                        student.student_id ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        student.full_name ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        student.phone ||
                        "-"
                    )}
                </td>

            `;


            studentsTable.appendChild(row);

        }
    );
}


/* =========================
   LOAD MODULES
========================= */

async function loadModules() {

    modulesContainer.innerHTML = `

        <div class="empty-card">

            Loading modules...

        </div>

    `;


    const {
        data: modules,
        error
    } =
        await supabaseClient
            .from("modules")
            .select(
                "id, title, description, module_number"
            )
            .eq(
                "class_id",
                currentClassId
            )
            .order(
                "module_number"
            );


    if (error) {

        console.error(
            "Module loading error:",
            error
        );


        modulesContainer.innerHTML = `

            <div class="error-card">

                Unable to load modules.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

        return;
    }


    moduleCount.textContent =
        modules
            ? modules.length
            : 0;


    if (
        !modules ||
        modules.length === 0
    ) {

        modulesContainer.innerHTML = `

            <div class="empty-card">

                No modules have been created yet.

            </div>

        `;

        return;
    }


    modulesContainer.innerHTML = "";


    modules.forEach(
        function (module) {

            const card =
                document.createElement("div");


            card.className =
                "module-card";


            card.innerHTML = `

                <div class="module-info">

                    <div class="module-number">

                        Module
                        ${escapeHtml(
                            module.module_number
                        )}

                    </div>


                    <h3>

                        ${escapeHtml(
                            module.title
                        )}

                    </h3>


                    <p>

                        ${escapeHtml(
                            module.description ||
                            "No description provided."
                        )}

                    </p>

                </div>


               <div class="module-actions">

    <a
        class="open-btn"
        href="module.html?id=${encodeURIComponent(module.id)}"
    >
        Open Module
    </a>

    <button
        class="delete-btn"
        onclick="deleteModule('${module.id}')"
    >
        Delete
    </button>

</div>

            `;


            modulesContainer.appendChild(
                card
            );

        }
    );
}


/* =========================
   ADD MODULE BUTTON
========================= */

addModuleBtn.addEventListener(
    "click",
    function () {

        moduleMessage.textContent = "";

        moduleForm.reset();

        moduleModal.style.display =
            "flex";

    }
);


/* =========================
   CLOSE MODAL
========================= */

closeModuleModal.addEventListener(
    "click",
    function () {

        moduleModal.style.display =
            "none";

    }
);


/* =========================
   CLOSE WHEN CLICK OUTSIDE
========================= */

window.addEventListener(
    "click",
    function (event) {

        if (
            event.target === moduleModal
        ) {

            moduleModal.style.display =
                "none";

        }

    }
);


/* =========================
   CREATE MODULE
========================= */

moduleForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const moduleNumber =
            document
                .getElementById(
                    "moduleNumber"
                )
                .value
                .trim();


        const title =
            document
                .getElementById(
                    "moduleTitle"
                )
                .value
                .trim();


        const description =
            document
                .getElementById(
                    "moduleDescription"
                )
                .value
                .trim();


        if (
            !moduleNumber ||
            !title
        ) {

            moduleMessage.textContent =
                "Module number and title are required.";

            return;
        }


        moduleMessage.textContent =
            "Creating module...";


        const {
            error
        } =
            await supabaseClient
                .from("modules")
                .insert({
                    class_id:
                        currentClassId,

                    title:
                        title,

                    description:
                        description || null,

                    module_number:
                        Number(
                            moduleNumber
                        ),

                    created_by:
                        currentUser.id
                });


        if (error) {

            console.error(
                "Create module error:",
                error
            );


            moduleMessage.textContent =
                "Unable to create module: " +
                error.message;

            return;
        }


        moduleMessage.textContent =
            "Module created successfully.";


        moduleForm.reset();


        await loadModules();


        setTimeout(
            function () {

                moduleModal.style.display =
                    "none";

            },
            800
        );

    }
);


/* =========================
   DELETE MODULE
========================= */

async function deleteModule(
    moduleId
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this module?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("modules")
            .delete()
            .eq(
                "id",
                moduleId
            )
            .eq(
                "class_id",
                currentClassId
            );


    if (error) {

        console.error(
            "Delete module error:",
            error
        );


        alert(
            "Unable to delete module: " +
            error.message
        );

        return;
    }


    await loadModules();

}


/* =========================
   LOAD ASSIGNMENTS
========================= */

async function loadAssignments() {

    const {
        data: assignments,
        error
    } =
        await supabaseClient
            .from("assignments")
            .select(
                "id"
            );


    if (error) {

        console.error(
            "Assignment loading error:",
            error
        );

        return;
    }


    assignmentCount.textContent =
        assignments
            ? assignments.length
            : 0;
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

    }
);


/* =========================
   START
========================= */

async function startPage() {

    currentClassId =
        getClassId();


    if (!currentClassId) {

        window.location.href =
            "dashboard.html";

        return;
    }


    const allowed =
        await checkFacilitator();


    if (!allowed) {
        return;
    }


    const classLoaded =
        await loadClass();


    if (!classLoaded) {
        return;
    }


    await loadStudents();

    await loadModules();

    await loadAssignments();

}


startPage();