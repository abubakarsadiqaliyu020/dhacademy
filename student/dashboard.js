let currentUser = null;
let currentProfile = null;

let studentClasses = [];


/* =========================
   START
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await checkUser();

            if (!currentUser) {
                return;
            }

            setupLogout();

            await loadStudentClasses();

            await loadStudentAssignments();

        } catch (error) {

            console.error(
                "Student dashboard error:",
                error
            );

            showMessage(
                "Something went wrong while loading the dashboard.",
                true
            );
        }
    }
);


/* =========================
   AUTHENTICATION
========================= */

async function checkUser() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "../index.html";

        return;
    }


    currentUser = user;


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select(`
            id,
            full_name,
            student_id,
            role,
            is_active
        `)
        .eq("id", user.id)
        .single();


    if (profileError || !profile) {

        console.error(
            "Profile error:",
            profileError
        );

        showMessage(
            "Unable to load your profile.",
            true
        );

        // Stop the dashboard from loading any more data
        currentUser = null;

        return;
    }


    currentProfile = profile;


    if (
        profile.role !== "student" ||
        !profile.is_active
    ) {

        await supabaseClient.auth.signOut();

        // Stop the dashboard from loading any more data
        currentUser = null;

        window.location.href =
            "../index.html";

        return;
    }


    displayStudentInformation();
}


/* =========================
   DISPLAY STUDENT INFORMATION
========================= */

function displayStudentInformation() {

    const nameElement =
        document.getElementById(
            "studentName"
        );

    const idElement =
        document.getElementById(
            "studentId"
        );


    if (nameElement) {

        nameElement.textContent =
            currentProfile.full_name;
    }


    if (idElement) {

        idElement.textContent =
            currentProfile.student_id;
    }
}


/* =========================
   LOGOUT
========================= */

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutBtn) {
        return;
    }


    logoutBtn.addEventListener(
        "click",
        async () => {

            await supabaseClient.auth.signOut();

            window.location.href =
                "../index.html";
        }
    );
}


/* =========================
   LOAD STUDENT CLASSES
========================= */

async function loadStudentClasses() {

    const {
        data,
        error
    } = await supabaseClient
        .from("class_students")
        .select(`
            class_id,
            classes (
                id,
                name,
                description,
                active
            )
        `)
        .eq(
            "student_id",
            currentUser.id
        );


    if (error) {

        console.error(
            "Classes error:",
            error
        );

        showMessage(
            "Unable to load your classes: " +
            error.message,
            true
        );

        return;
    }


    studentClasses =
        (data || [])
            .filter(
                item =>
                    item.classes &&
                    item.classes.active !== false
            )
            .map(
                item =>
                    item.classes
            );


    renderClasses();
}


/* =========================
   RENDER CLASSES
========================= */

function renderClasses() {

    const container =
        document.getElementById(
            "classesContainer"
        );


    if (!container) {
        return;
    }


    if (!studentClasses.length) {

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    You are not enrolled in any active class yet.
                </p>

            </div>
            `;

        return;
    }


    container.innerHTML = "";


    studentClasses.forEach(
        classItem => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "class-card";


            card.innerHTML =
                `
                <h3>
                    ${escapeHtml(
                        classItem.name
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        classItem.description ||
                        "No description provided."
                    )}
                </p>

                <a
                    href="class.html?id=${classItem.id}"
                    class="open-class-btn"
                >
                    Open Class
                </a>
                `;


            container.appendChild(
                card
            );
        }
    );
}


/* =========================
   LOAD ASSIGNMENTS
========================= */

async function loadStudentAssignments() {

    const container =
        document.getElementById(
            "assignmentsContainer"
        );


    if (!container) {
        return;
    }


    if (!studentClasses.length) {

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    No assignments available.
                </p>

            </div>
            `;

        return;
    }


    const classIds =
        studentClasses.map(
            classItem =>
                classItem.id
        );


    /* =========================
       LOAD MODULES
    ========================== */

    const {
        data: modules,
        error: modulesError
    } = await supabaseClient
        .from("modules")
        .select(`
            id,
            class_id,
            title
        `)
        .in(
            "class_id",
            classIds
        );


    if (modulesError) {

        console.error(
            "Modules error:",
            modulesError
        );

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    Unable to load assignments.
                </p>

            </div>
            `;

        return;
    }


    if (!modules || !modules.length) {

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    No assignments available yet.
                </p>

            </div>
            `;

        return;
    }


    const moduleIds =
        modules.map(
            module =>
                module.id
        );


    /* =========================
       LOAD ASSIGNMENTS
    ========================== */

    const {
        data: assignments,
        error: assignmentsError
    } = await supabaseClient
        .from("assignments")
        .select(`
            id,
            module_id,
            title,
            instructions,
            due_date,
            max_score
        `)
        .in(
            "module_id",
            moduleIds
        )
        .order(
            "due_date",
            {
                ascending: true
            }
        );


    if (assignmentsError) {

        console.error(
            "Assignments error:",
            assignmentsError
        );

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    Unable to load assignments.
                </p>

            </div>
            `;

        return;
    }


    if (!assignments || !assignments.length) {

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    No assignments available yet.
                </p>

            </div>
            `;

        return;
    }


    /* =========================
       LOAD OWN SUBMISSIONS
    ========================== */

    const assignmentIds =
        assignments.map(
            assignment =>
                assignment.id
        );


    const {
        data: submissions,
        error: submissionsError
    } = await supabaseClient
        .from("submissions")
        .select(`
            id,
            assignment_id,
            submitted_at,
            status,
            score,
            feedback,
            marked_at
        `)
        .eq(
            "student_id",
            currentUser.id
        )
        .in(
            "assignment_id",
            assignmentIds
        );


    if (submissionsError) {

        console.error(
            "Submissions error:",
            submissionsError
        );

        container.innerHTML =
            `
            <div class="empty-message">

                <p>
                    Unable to load assignment results.
                </p>

            </div>
            `;

        return;
    }


    const submissionMap =
        new Map();


    (submissions || []).forEach(
        submission => {

            submissionMap.set(
                submission.assignment_id,
                submission
            );
        }
    );


    renderAssignments(
        assignments,
        modules,
        submissionMap
    );
}


/* =========================
   RENDER ASSIGNMENTS
========================= */

function renderAssignments(
    assignments,
    modules,
    submissionMap
) {

    const container =
        document.getElementById(
            "assignmentsContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    // Keep the list compact: only one assignment detail is expanded at a time.
    if (!container.dataset.accordionBound) {
        container.addEventListener("toggle", function (event) {
            const opened = event.target;
            if (!(opened instanceof HTMLDetailsElement) ||
                !opened.open ||
                !opened.classList.contains("assignment-card")) {
                return;
            }
            container.querySelectorAll("details.assignment-card[open]").forEach(function (item) {
                if (item !== opened) item.open = false;
            });
        }, true);
        container.dataset.accordionBound = "true";
    }

    assignments.forEach(
        assignment => {

            const module =
                modules.find(
                    item =>
                        item.id ===
                        assignment.module_id
                );


            const submission =
                submissionMap.get(
                    assignment.id
                );


            const status =
                submission
                    ? String(
                        submission.status ||
                        "Submitted"
                    )
                    : "Not Submitted";


            const isMarked =
                status.toLowerCase() ===
                "marked";


            let scoreText =
                "Not marked";


            let percentageText =
                "";


            if (isMarked) {

                const score =
                    Number(
                        submission.score || 0
                    );


                const maximum =
                    Number(
                        assignment.max_score || 0
                    );


                const percentage =
                    maximum > 0
                        ? (
                            score /
                            maximum
                        ) * 100
                        : 0;


                scoreText =
                    `${score} / ${maximum}`;


                percentageText =
                    `${percentage.toFixed(1)}%`;
            }


            const card =
                document.createElement(
                    "details"
                );


            card.className =
                "assignment-card";


            card.innerHTML =
                `
                <summary class="assignment-card-summary">
                <div class="assignment-card-header">

                    <div>

                        <h3>
                            ${escapeHtml(
                                assignment.title
                            )}
                        </h3>

                        <p class="assignment-module">

                            Module:
                            ${escapeHtml(
                                module
                                    ? module.title
                                    : "Unknown"
                            )}

                        </p>

                    </div>


                    <span
                        class="assignment-status ${getStatusClass(status)}"
                    >
                        ${escapeHtml(status)}
                    </span>
                    ${isMarked ? `
                        <span class="assignment-score-summary">${scoreText}</span>
                    ` : ""}

                </div>
                <span class="assignment-expand-label">View details ▾</span>
                </summary>

                <p class="assignment-description">

                    ${escapeHtml(
                        assignment.instructions ||
                        "No instructions provided."
                    )}

                </p>


                <div class="assignment-details">

                    <div>

                        <strong>
                            Maximum Score
                        </strong>

                        <span>
                            ${Number(
                                assignment.max_score || 0
                            )}
                        </span>

                    </div>


                    <div>

                        <strong>
                            Your Score
                        </strong>

                        <span>
                            ${scoreText}
                        </span>

                    </div>


                    ${
                        percentageText
                            ? `
                            <div>

                                <strong>
                                    Percentage
                                </strong>

                                <span>
                                    ${percentageText}
                                </span>

                            </div>
                            `
                            : ""
                    }


                    ${
                        submission &&
                        submission.submitted_at
                            ? `
                            <div>

                                <strong>
                                    Submitted
                                </strong>

                                <span>
                                    ${formatDate(
                                        submission.submitted_at
                                    )}
                                </span>

                            </div>
                            `
                            : ""
                    }

                </div>

                ${isMarked ? `
                    <section class="returned-result" aria-label="Returned result">
                        <h4>Result and Feedback</h4>
                        <p><strong>Feedback:</strong> ${escapeHtml(
                            submission.feedback || "No overall feedback provided."
                        )}</p>
                        ${submission.marked_at ? `
                            <p><strong>Marked on:</strong> ${escapeHtml(
                                formatDate(submission.marked_at)
                            )}</p>
                        ` : ""}
                    </section>
                ` : ""}

                <div class="assignment-actions">

                    <a
                        href="assignment.html?id=${assignment.id}"
                        class="view-assignment-btn"
                    >

                        ${
                            isMarked
                                ? "View Result"
                                : submission
                                    ? "View Submission"
                                    : "Open Assignment"
                        }

                    </a>

                </div>
                </details>
                `;

            card.open = false;
            container.appendChild(
                card
            );
        }
    );
}


/* =========================
   STATUS CLASS
========================= */

function getStatusClass(status) {

    const cleanStatus =
        String(
            status || ""
        ).toLowerCase();


    if (
        cleanStatus ===
        "marked"
    ) {

        return "marked";
    }


    if (
        cleanStatus ===
        "submitted"
    ) {

        return "submitted";
    }


    return "not-submitted";
}


/* =========================
   FORMAT DATE
========================= */

function formatDate(
    date
) {

    if (!date) {
        return "-";
    }


    return new Date(
        date
    ).toLocaleString();
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


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
   MESSAGE
========================= */

function showMessage(
    message,
    isError = false
) {

    const element =
        document.getElementById(
            "message"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.style.padding =
        "12px";


    element.style.borderRadius =
        "6px";


    element.style.marginTop =
        "20px";


    if (isError) {

        element.style.background =
            "#fee2e2";

        element.style.color =
            "#991b1b";

    } else {

        element.style.background =
            "#dcfce7";

        element.style.color =
            "#166534";
    }
}
