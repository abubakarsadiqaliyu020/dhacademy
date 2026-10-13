console.log("FACILITATOR ASSIGNMENT JS LOADED");


let currentUser = null;
let currentProfile = null;

let currentAssignment = null;
let currentModule = null;
let currentClass = null;

let currentQuestions = [];


// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        startAssignmentPage();

    }
);


// =========================================================
// START ASSIGNMENT PAGE
// =========================================================

async function startAssignmentPage() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const assignmentId =
            params.get("id");


        if (!assignmentId) {

            showPageError(
                "No assignment was selected."
            );

            return;
        }


        // ---------------------------------------------
        // GET CURRENT USER
        // ---------------------------------------------

        const {
            data: userData,
            error: userError
        } =
            await supabaseClient
                .auth
                .getUser();


        if (
            userError ||
            !userData.user
        ) {

            window.location.href =
                "../index.html";

            return;
        }


        currentUser =
            userData.user;


        // ---------------------------------------------
        // LOAD PROFILE
        // ---------------------------------------------

        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, full_name, student_id, role, is_active"
                )
                .eq(
                    "id",
                    currentUser.id
                )
                .single();


        if (
            profileError ||
            !profile
        ) {

            console.error(
                "Profile error:",
                profileError
            );


            showPageError(
                "Unable to load your facilitator profile."
            );


            return;
        }


        currentProfile =
            profile;


        // ---------------------------------------------
        // CHECK ROLE
        // ---------------------------------------------

        if (
            profile.role !==
            "facilitator"
        ) {

            showPageError(
                "This page is available only to facilitators."
            );


            return;
        }


        // ---------------------------------------------
        // CHECK ACTIVE
        // ---------------------------------------------

        if (
            !profile.is_active
        ) {

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "../index.html";


            return;
        }


        // ---------------------------------------------
        // LOAD ASSIGNMENT
        // ---------------------------------------------

        await loadAssignment(
            assignmentId
        );


        // ---------------------------------------------
        // LOGOUT
        // ---------------------------------------------

        setupLogout();

    }


    catch (error) {

        console.error(
            "Assignment page error:",
            error
        );


        showPageError(
            "Something went wrong while loading the assignment."
        );

    }

}


// =========================================================
// LOAD ASSIGNMENT
// =========================================================

async function loadAssignment(
    assignmentId
) {

    const {
        data: assignment,
        error: assignmentError
    } =
        await supabaseClient
            .from("assignments")
            .select(
                `
                id,
                module_id,
                title,
                instructions,
                due_date,
                max_score,
                created_at
                `
            )
            .eq(
                "id",
                assignmentId
            )
            .single();


    if (
        assignmentError ||
        !assignment
    ) {

        console.error(
            "Assignment error:",
            assignmentError
        );


        showPageError(
            "Unable to load this assignment."
        );


        return;
    }


    currentAssignment =
        assignment;


    // ---------------------------------------------
    // LOAD MODULE
    // ---------------------------------------------

    const {
        data: module,
        error: moduleError
    } =
        await supabaseClient
            .from("modules")
            .select(
                `
                id,
                class_id,
                title,
                description
                `
            )
            .eq(
                "id",
                assignment.module_id
            )
            .single();


    if (
        moduleError ||
        !module
    ) {

        console.error(
            "Module error:",
            moduleError
        );


        showPageError(
            "Unable to load the assignment module."
        );


        return;
    }


    currentModule =
        module;


    // ---------------------------------------------
    // LOAD CLASS
    // ---------------------------------------------

    const {
        data: classData,
        error: classError
    } =
        await supabaseClient
            .from("classes")
            .select(
                `
                id,
                name,
                description,
                facilitator_id
                `
            )
            .eq(
                "id",
                module.class_id
            )
            .single();


    if (
        classError ||
        !classData
    ) {

        console.error(
            "Class error:",
            classError
        );


        showPageError(
            "Unable to verify the class for this assignment."
        );


        return;
    }


    currentClass =
        classData;


    // ---------------------------------------------
    // SECURITY CHECK
    // ---------------------------------------------

    if (
        classData.facilitator_id !==
        currentUser.id
    ) {

        showPageError(
            "You do not have permission to view this assignment."
        );


        return;
    }


    // ---------------------------------------------
    // DISPLAY ASSIGNMENT
    // ---------------------------------------------

    displayAssignment();


    // ---------------------------------------------
    // LOAD QUESTIONS
    // ---------------------------------------------

    await loadQuestions(
        assignment.id
    );


    // ---------------------------------------------
    // LOAD SUBMISSIONS
    // ---------------------------------------------

    await loadSubmissions(
        assignment.id
    );


    // ---------------------------------------------
    // BACK BUTTON
    // ---------------------------------------------

    setupBackButton(
        module.id
    );

}


// =========================================================
// DISPLAY ASSIGNMENT
// =========================================================

function displayAssignment() {

    const title =
        document.getElementById(
            "assignmentTitle"
        );


    const instructions =
        document.getElementById(
            "assignmentInstructions"
        );


    const totalMarks =
        document.getElementById(
            "totalMarks"
        );


    const dueDate =
        document.getElementById(
            "dueDate"
        );


    if (title) {

        title.textContent =
            currentAssignment.title ||
            "Untitled Assignment";

    }


    if (instructions) {

        instructions.textContent =
            currentAssignment.instructions ||
            "No instructions were provided.";

    }


    if (totalMarks) {

        totalMarks.textContent =
            currentAssignment.max_score ||
            0;

    }


    if (dueDate) {

        if (
            currentAssignment.due_date
        ) {

            dueDate.textContent =
                formatDateTime(
                    currentAssignment.due_date
                );

        }

        else {

            dueDate.textContent =
                "No due date";

        }

    }

}


// =========================================================
// LOAD QUESTIONS
// =========================================================

async function loadQuestions(
    assignmentId
) {

    const container =
        document.getElementById(
            "questionsContainer"
        );


    const {
        data: questions,
        error: questionsError
    } =
        await supabaseClient
            .from("assignment_questions")
            .select(
                `
                id,
                assignment_id,
                question_number,
                question_text,
                answer_type,
                language,
                max_score
                `
            )
            .eq(
                "assignment_id",
                assignmentId
            )
            .order(
                "question_number",
                {
                    ascending: true
                }
            );


    if (questionsError) {

        console.error(
            "Questions error:",
            questionsError
        );


        if (container) {

            container.innerHTML = `
                <div class="error-message">
                    Unable to load assignment questions.
                </div>
            `;

        }


        return;
    }


    currentQuestions =
        questions || [];


    const questionCount =
        document.getElementById(
            "questionCount"
        );


    if (questionCount) {

        questionCount.textContent =
            currentQuestions.length;

    }


    if (
        currentQuestions.length ===
        0
    ) {

        if (container) {

            container.innerHTML = `
                <div class="empty-message">
                    No questions have been added to this assignment.
                </div>
            `;

        }


        return;
    }


    renderQuestions();

}


// =========================================================
// RENDER QUESTIONS
// =========================================================

function renderQuestions() {

    const container =
        document.getElementById(
            "questionsContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    currentQuestions.forEach(
        function (
            question,
            index
        ) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "question-card";


            let languageHtml =
                "";


            if (
                question.answer_type ===
                    "code" &&
                question.language
            ) {

                languageHtml = `
                    <span class="question-language">
                        ${escapeHtml(
                            question.language
                        )}
                    </span>
                `;

            }


            card.innerHTML = `

                <span class="question-number">

                    Question
                    ${index + 1}

                </span>


                <h3 class="question-text">

                    ${escapeHtml(
                        question.question_text
                    )}

                </h3>


                <div class="question-meta">

                    <span class="question-type">

                        ${formatAnswerType(
                            question.answer_type
                        )}

                    </span>


                    <span class="question-score">

                        ${question.max_score}
                        mark${
                            Number(
                                question.max_score
                            ) === 1
                                ? ""
                                : "s"
                        }

                    </span>


                    ${languageHtml}

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


// =========================================================
// LOAD SUBMISSIONS
// =========================================================

async function loadSubmissions(
    assignmentId
) {

    const table =
        document.getElementById(
            "submissionsTable"
        );


    const message =
        document.getElementById(
            "submissionsMessage"
        );


    if (!table) {
        return;
    }


    // ---------------------------------------------
    // LOADING
    // ---------------------------------------------

    table.innerHTML = `
        <tr>
            <td colspan="7">
                Loading submissions...
            </td>
        </tr>
    `;


    // ---------------------------------------------
    // USE SECURE RPC
    // ---------------------------------------------

    const {
        data: submissions,
        error: submissionsError
    } =
        await supabaseClient.rpc(
            "get_assignment_submissions",
            {
                assignment_id_input:
                    assignmentId
            }
        );


    // ---------------------------------------------
    // ERROR
    // ---------------------------------------------

    if (submissionsError) {

        console.error(
            "Submissions error:",
            submissionsError
        );


        if (message) {

            message.textContent =
                "Unable to load student submissions.";

        }


        table.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="error-message">

                        Unable to load student submissions.

                    </div>

                </td>
            </tr>
        `;


        return;
    }


    // ---------------------------------------------
    // NO SUBMISSIONS
    // ---------------------------------------------

    if (
        !submissions ||
        submissions.length === 0
    ) {

        if (message) {

            message.textContent =
                "No students have submitted this assignment yet.";

        }


        table.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-message">

                        No students have submitted
                        this assignment yet.

                    </div>

                </td>
            </tr>
        `;


        return;
    }


    // ---------------------------------------------
    // SUBMISSION COUNT
    // ---------------------------------------------

    if (message) {

        message.textContent =
            `${submissions.length} student submission${
                submissions.length === 1
                    ? ""
                    : "s"
            }`;

    }


    // ---------------------------------------------
    // CLEAR TABLE
    // ---------------------------------------------

    table.innerHTML = "";


    // ---------------------------------------------
    // CREATE ROWS
    // ---------------------------------------------

    submissions.forEach(
        function (
            submission,
            index
        ) {

            const studentId =
                submission.student_login_id ||
                "Unknown";


            const studentName =
                submission.student_name ||
                "Unknown Student";


            const status =
                submission.status ||
                "submitted";


            const score =
                submission.score !== null &&
                submission.score !== undefined
                    ? submission.score
                    : "Not marked";


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>
                    ${escapeHtml(
                        studentId
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        studentName
                    )}
                </td>


                <td>
                    ${formatDateTime(
                        submission.submitted_at
                    )}
                </td>


                <td>

                    <span class="
                        status-badge
                        ${getStatusClass(
                            status
                        )}
                    ">

                        ${formatStatus(
                            status
                        )}

                    </span>

                </td>


                <td>
                    ${escapeHtml(
                        String(score)
                    )}
                </td>


                <td>

                    <button
                        type="button"
                        class="view-btn"
                        data-submission-id="${
                            submission.submission_id
                        }"
                    >

                        View Submission

                    </button>

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );


    // ---------------------------------------------
    // VIEW BUTTONS
    // ---------------------------------------------

    setupSubmissionButtons();

}


// =========================================================
// SUBMISSION BUTTONS
// =========================================================

function setupSubmissionButtons() {

    const buttons =
        document.querySelectorAll(
            ".view-btn"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const submissionId =
                        button.dataset
                            .submissionId;


                    if (!submissionId) {
                        return;
                    }


                    openSubmission(
                        submissionId
                    );

                }
            );

        }
    );

}


// =========================================================
// OPEN SUBMISSION
// =========================================================

function openSubmission(
    submissionId
) {

    window.location.href =
        "submission.html?id=" +
        encodeURIComponent(
            submissionId
        ) +
        "&assignment=" +
        encodeURIComponent(
            currentAssignment.id
        );

}


// =========================================================
// BACK BUTTON
// =========================================================

function setupBackButton(
    moduleId
) {

    const backButton =
        document.getElementById(
            "backToModule"
        );


    if (!backButton) {
        return;
    }


    backButton.href =
        "module.html?id=" +
        encodeURIComponent(
            moduleId
        );

}


// =========================================================
// LOGOUT
// =========================================================

function setupLogout() {

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        async function () {

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "../index.html";

        }
    );

}


// =========================================================
// FORMAT STATUS
// =========================================================

function formatStatus(
    status
) {

    if (
        status === "marked"
    ) {

        return "Marked";

    }


    if (
        status === "submitted"
    ) {

        return "Submitted";

    }


    return "Pending";

}


// =========================================================
// STATUS CSS CLASS
// =========================================================

function getStatusClass(
    status
) {

    if (
        status === "marked"
    ) {

        return "status-marked";

    }


    if (
        status === "submitted"
    ) {

        return "status-submitted";

    }


    return "status-pending";

}


// =========================================================
// FORMAT ANSWER TYPE
// =========================================================

function formatAnswerType(
    type
) {

    if (
        type === "long_text"
    ) {

        return "Long Answer";

    }


    if (
        type === "code"
    ) {

        return "Code";

    }


    return "Short Answer";

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDateTime(
    dateValue
) {

    if (!dateValue) {

        return "Not specified";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Invalid date";

    }


    return date.toLocaleString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =========================================================
// PAGE ERROR
// =========================================================

function showPageError(
    message
) {

    const questionsContainer =
        document.getElementById(
            "questionsContainer"
        );


    if (questionsContainer) {

        questionsContainer.innerHTML = `
            <div class="error-message">

                ${escapeHtml(
                    message
                )}

            </div>
        `;

    }


    const submissionsTable =
        document.getElementById(
            "submissionsTable"
        );


    if (submissionsTable) {

        submissionsTable.innerHTML = `
            <tr>

                <td colspan="7">

                    <div class="error-message">

                        ${escapeHtml(
                            message
                        )}

                    </div>

                </td>

            </tr>
        `;

    }

}


// =========================================================
// ESCAPE HTML
// =========================================================

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