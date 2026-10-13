console.log(
    "FACILITATOR SUBMISSION JS LOADED"
);


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;

let currentProfile = null;

let currentSubmission = null;

let currentAssignment = null;

let currentQuestions = [];

let currentAnswers = [];

let maximumScore = 0;


// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        startSubmissionPage();

    }
);


// =========================================================
// START SUBMISSION PAGE
// =========================================================

async function startSubmissionPage() {

    try {

        // ---------------------------------------------
        // GET URL PARAMETERS
        // ---------------------------------------------

        const params =
            new URLSearchParams(
                window.location.search
            );


        const submissionId =
            params.get("id");


        const assignmentId =
            params.get("assignment");


        if (!submissionId) {

            showError(
                "No submission was selected."
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
                    `
                    id,
                    full_name,
                    student_id,
                    role,
                    is_active
                    `
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


            showError(
                "Unable to load your facilitator profile."
            );


            return;
        }


        currentProfile =
            profile;


        // ---------------------------------------------
        // ROLE CHECK
        // ---------------------------------------------

        if (
            profile.role !==
            "facilitator"
        ) {

            showError(
                "This page is available only to facilitators."
            );


            return;
        }


        // ---------------------------------------------
        // ACTIVE CHECK
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
        // LOAD SUBMISSION
        // ---------------------------------------------

        await loadSubmission(
            submissionId
        );


        // ---------------------------------------------
        // LOAD ASSIGNMENT
        // ---------------------------------------------

        if (
            assignmentId
        ) {

            await loadAssignment(
                assignmentId
            );

        }

        else {

            await loadAssignmentFromSubmission(
                submissionId
            );

        }


        // ---------------------------------------------
        // LOAD QUESTIONS
        // ---------------------------------------------

        await loadQuestions();


        // ---------------------------------------------
        // LOAD ANSWERS
        // ---------------------------------------------

        await loadAnswers(
            submissionId
        );


        // ---------------------------------------------
        // CALCULATE TOTAL
        // ---------------------------------------------

        calculateTotal();


        // ---------------------------------------------
        // SET BACK BUTTON
        // ---------------------------------------------

        setupBackButton();


        // ---------------------------------------------
        // SAVE BUTTON
        // ---------------------------------------------

        setupSaveButton();


        // ---------------------------------------------
        // LOGOUT
        // ---------------------------------------------

        setupLogout();

    }


    catch (error) {

        console.error(
            "Submission page error:",
            error
        );


        showError(
            "Something went wrong while loading this submission."
        );

    }

}


// =========================================================
// LOAD SUBMISSION
// =========================================================

async function loadSubmission(
    submissionId
) {

    const {
        data: submission,
        error: submissionError
    } =
        await supabaseClient
            .from("submissions")
            .select(
                `
                id,
                assignment_id,
                student_id,
                answer_text,
                submitted_at,
                status,
                score,
                feedback,
                marked_by,
                marked_at
                `
            )
            .eq(
                "id",
                submissionId
            )
            .single();


    if (
        submissionError ||
        !submission
    ) {

        console.error(
            "Submission error:",
            submissionError
        );


        showError(
            "Unable to load this student submission."
        );


        return;
    }


    currentSubmission =
        submission;


    // ---------------------------------------------
    // LOAD STUDENT INFORMATION
    // ---------------------------------------------

    const {
        data: studentData,
        error: studentError
    } =
        await supabaseClient.rpc(
            "get_assignment_submissions",
            {
                assignment_id_input:
                    submission.assignment_id
            }
        );


    if (studentError) {

        console.error(
            "Student RPC error:",
            studentError
        );


        showError(
            "Unable to load student information."
        );


        return;
    }


    const studentSubmission =
        (studentData || [])
            .find(
                function (item) {

                    return (
                        item.submission_id ===
                        submission.id
                    );

                }
            );


    if (studentSubmission) {

        displayStudentInformation(
            studentSubmission
        );

    }

}


// =========================================================
// DISPLAY STUDENT INFORMATION
// =========================================================

function displayStudentInformation(
    data
) {

    const studentName =
        document.getElementById(
            "studentName"
        );


    const studentId =
        document.getElementById(
            "studentId"
        );


    const submittedAt =
        document.getElementById(
            "submittedAt"
        );


    const status =
        document.getElementById(
            "submissionStatus"
        );


    if (studentName) {

        studentName.textContent =
            data.student_name ||
            "Unknown Student";

    }


    if (studentId) {

        studentId.textContent =
            data.student_login_id ||
            "Unknown";

    }


    if (submittedAt) {

        submittedAt.textContent =
            formatDateTime(
                data.submitted_at
            );

    }


    if (status) {

        status.textContent =
            formatStatus(
                data.status
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
        error
    } =
        await supabaseClient
            .from("assignments")
            .select(
                `
                id,
                module_id,
                title,
                instructions,
                max_score
                `
            )
            .eq(
                "id",
                assignmentId
            )
            .single();


    if (error || !assignment) {

        console.error(
            "Assignment error:",
            error
        );


        showError(
            "Unable to load the assignment."
        );


        return;
    }


    currentAssignment =
        assignment;


    const title =
        document.getElementById(
            "pageTitle"
        );


    const subtitle =
        document.getElementById(
            "pageSubtitle"
        );


    if (title) {

        title.textContent =
            assignment.title ||
            "Assignment";

    }


    if (subtitle) {

        subtitle.textContent =
            assignment.instructions ||
            "Review and mark this submission.";

    }


    maximumScore =
        Number(
            assignment.max_score || 0
        );


    const maximumScoreElement =
        document.getElementById(
            "maximumScore"
        );


    if (maximumScoreElement) {

        maximumScoreElement.textContent =
            maximumScore;

    }

}


// =========================================================
// LOAD ASSIGNMENT FROM SUBMISSION
// =========================================================

async function loadAssignmentFromSubmission(
    submissionId
) {

    const {
        data: submission,
        error: submissionError
    } =
        await supabaseClient
            .from("submissions")
            .select(
                "assignment_id"
            )
            .eq(
                "id",
                submissionId
            )
            .single();


    if (
        submissionError ||
        !submission
    ) {

        showError(
            "Unable to identify the assignment."
        );


        return;
    }


    await loadAssignment(
        submission.assignment_id
    );

}


// =========================================================
// LOAD QUESTIONS
// =========================================================

async function loadQuestions() {

    if (
        !currentAssignment
    ) {

        return;
    }


    const {
        data: questions,
        error
    } =
        await supabaseClient
            .from("assignment_questions")
            .select(
                `
                id,
                question_number,
                question_text,
                answer_type,
                language,
                max_score
                `
            )
            .eq(
                "assignment_id",
                currentAssignment.id
            )
            .order(
                "question_number",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Questions error:",
            error
        );


        showError(
            "Unable to load assignment questions."
        );


        return;
    }


    currentQuestions =
        questions || [];


    // Calculate from questions
    // instead of relying only
    // on parent max_score.

    maximumScore =
        currentQuestions.reduce(
            function (
                total,
                question
            ) {

                return (
                    total +
                    Number(
                        question.max_score || 0
                    )
                );

            },
            0
        );


    const maximumScoreElement =
        document.getElementById(
            "maximumScore"
        );


    if (maximumScoreElement) {

        maximumScoreElement.textContent =
            maximumScore;

    }

}


// =========================================================
// LOAD ANSWERS
// =========================================================

async function loadAnswers(
    submissionId
) {

    const {
        data: answers,
        error
    } =
        await supabaseClient
            .from("submission_answers")
            .select(
                `
                id,
                submission_id,
                question_id,
                answer_text,
                score,
                feedback,
                marked_by,
                marked_at
                `
            )
            .eq(
                "submission_id",
                submissionId
            );


    if (error) {

        console.error(
            "Answers error:",
            error
        );


        showError(
            "Unable to load the student's answers."
        );


        return;
    }


    currentAnswers =
        answers || [];


    renderAnswers();


    // ---------------------------------------------
    // LOAD EXISTING OVERALL FEEDBACK
    // ---------------------------------------------

    const overallFeedback =
        document.getElementById(
            "overallFeedback"
        );


    if (
        overallFeedback &&
        currentSubmission
    ) {

        overallFeedback.value =
            currentSubmission.feedback ||
            "";

    }

}


// =========================================================
// RENDER ANSWERS
// =========================================================

function renderAnswers() {

    const container =
        document.getElementById(
            "answersContainer"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        currentQuestions.length ===
        0
    ) {

        container.innerHTML = `
            <div class="empty-message">
                No questions were found.
            </div>
        `;


        return;
    }


    currentQuestions.forEach(
        function (
            question,
            index
        ) {

            const existingAnswer =
                currentAnswers.find(
                    function (answer) {

                        return (
                            answer.question_id ===
                            question.id
                        );

                    }
                );


            const answerText =
                existingAnswer &&
                existingAnswer.answer_text
                    ? existingAnswer.answer_text
                    : "";


            const existingScore =
                existingAnswer &&
                existingAnswer.score !== null &&
                existingAnswer.score !== undefined
                    ? existingAnswer.score
                    : "";


            const existingFeedback =
                existingAnswer &&
                existingAnswer.feedback
                    ? existingAnswer.feedback
                    : "";


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "answer-card";


            card.dataset.questionId =
                question.id;


            const answerDisplay =
                createAnswerDisplay(
                    answerText,
                    question.answer_type
                );


            card.innerHTML = `

                <div class="answer-header">

                    <span class="question-number">

                        Question
                        ${index + 1}

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

                </div>


                <div class="question-content">

                    <h3 class="question-text">

                        ${escapeHtml(
                            question.question_text
                        )}

                    </h3>


                    <span class="answer-label">

                        Student Answer

                    </span>


                    ${answerDisplay}


                    <div class="marking-area">

                        <div class="marking-grid">


                            <div class="form-group">

                                <label
                                    for="score-${question.id}"
                                >
                                    Score
                                </label>


                                <input
                                    type="number"
                                    class="score-input"
                                    id="score-${question.id}"
                                    data-score-question="${
                                        question.id
                                    }"
                                    min="0"
                                    max="${
                                        question.max_score
                                    }"
                                    step="0.5"
                                    value="${
                                        existingScore
                                    }"
                                    placeholder="0"
                                >

                                <small>
                                    Maximum:
                                    ${
                                        question.max_score
                                    }
                                    marks
                                </small>

                            </div>


                            <div class="form-group">

                                <label
                                    for="feedback-${question.id}"
                                >
                                    Feedback
                                </label>


                                <textarea
                                    class="feedback-input"
                                    id="feedback-${question.id}"
                                    data-feedback-question="${
                                        question.id
                                    }"
                                    placeholder="Enter feedback for this question..."
                                >${escapeHtml(
                                    existingFeedback
                                )}</textarea>

                            </div>


                        </div>

                    </div>

                </div>

            `;


            container.appendChild(
                card
            );


            const scoreInput =
                card.querySelector(
                    ".score-input"
                );


            if (scoreInput) {

                scoreInput.addEventListener(
                    "input",
                    function () {

                        validateScore(
                            scoreInput,
                            question.max_score
                        );


                        calculateTotal();

                    }
                );

            }

        }
    );


    calculateTotal();

}


// =========================================================
// CREATE ANSWER DISPLAY
// =========================================================

function createAnswerDisplay(
    answerText,
    answerType
) {

    if (
        !answerText
    ) {

        return `
            <div class="student-answer no-answer">
                No answer was provided.
            </div>
        `;

    }


    if (
        answerType ===
        "code"
    ) {

        return `
            <pre class="student-answer code-answer">${escapeHtml(
                answerText
            )}</pre>
        `;

    }


    return `
        <div class="student-answer">
            ${escapeHtml(
                answerText
            )}
        </div>
    `;

}


// =========================================================
// VALIDATE SCORE
// =========================================================

function validateScore(
    input,
    maximum
) {

    const max =
        Number(
            maximum || 0
        );


    let value =
        Number(
            input.value
        );


    if (
        Number.isNaN(value)
    ) {

        return;

    }


    if (
        value < 0
    ) {

        value = 0;

    }


    if (
        value > max
    ) {

        value = max;

    }


    input.value =
        value;

}


// =========================================================
// CALCULATE TOTAL
// =========================================================

function calculateTotal() {

    let total =
        0;


    const scoreInputs =
        document.querySelectorAll(
            ".score-input"
        );


    scoreInputs.forEach(
        function (input) {

            const value =
                Number(
                    input.value
                );


            if (
                !Number.isNaN(value)
            ) {

                total += value;

            }

        }
    );


    total =
        Number(
            total.toFixed(2)
        );


    const totalScoreElement =
        document.getElementById(
            "totalScore"
        );


    if (totalScoreElement) {

        totalScoreElement.textContent =
            total;

    }


    let percentage =
        0;


    if (
        maximumScore > 0
    ) {

        percentage =
            (
                total /
                maximumScore
            ) *
            100;


        percentage =
            Number(
                percentage.toFixed(2)
            );

    }


    const percentageElement =
        document.getElementById(
            "percentage"
        );


    if (percentageElement) {

        percentageElement.textContent =
            percentage +
            "%";

    }


    return total;

}


// =========================================================
// SAVE / MARK SUBMISSION
// =========================================================

async function saveMarking() {

    if (
        !currentSubmission
    ) {

        showSaveMessage(
            "Submission information is missing.",
            true
        );


        return;
    }


    const saveButton =
        document.getElementById(
            "saveMarkBtn"
        );


    const message =
        document.getElementById(
            "saveMessage"
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    if (message) {

        message.textContent =
            "Saving marks...";

        message.style.color =
            "#1e3a8a";

    }


    try {

        // ---------------------------------------------
        // COLLECT QUESTION SCORES
        // ---------------------------------------------

        const answerRecords =
            [];


        for (
            const question
            of currentQuestions
        ) {

            const scoreInput =
                document.querySelector(
                    `[data-score-question="${question.id}"]`
                );


            const feedbackInput =
                document.querySelector(
                    `[data-feedback-question="${question.id}"]`
                );


            if (!scoreInput || scoreInput.value.trim() === "") {
                throw new Error(
                    `Enter a score for Question ${question.question_number}.`
                );
            }

            const score = Number(scoreInput.value);

            if (!Number.isFinite(score)) {
                throw new Error(
                    `Enter a valid numeric score for Question ${question.question_number}.`
                );
            }


            const maximum =
                Number(
                    question.max_score || 0
                );


            // -----------------------------------------
            // SCORE VALIDATION
            // -----------------------------------------

            if (
                score < 0 ||
                score > maximum
            ) {

                throw new Error(
                    `Score for Question ${question.question_number} must be between 0 and ${maximum}.`
                );

            }


            const feedback =
                feedbackInput
                    ? feedbackInput.value.trim()
                    : "";


            const existingAnswer =
                currentAnswers.find(
                    function (answer) {

                        return (
                            answer.question_id ===
                            question.id
                        );

                    }
                );


            const record = {

                submission_id:
                    currentSubmission.id,

                question_id:
                    question.id,

                answer_text:
                    existingAnswer
                        ? existingAnswer.answer_text
                        : null,

                score:
                    score,

                feedback:
                    feedback || null,

                marked_by:
                    currentUser.id,

                marked_at:
                    new Date().toISOString()

            };


            answerRecords.push(
                record
            );

        }


        // ---------------------------------------------
        // SAVE QUESTION MARKS
        // ---------------------------------------------

        if (
            answerRecords.length >
            0
        ) {

            const {
                error: answersError
            } =
                await supabaseClient
                    .from(
                        "submission_answers"
                    )
                    .upsert(
                        answerRecords,
                        {
                            onConflict:
                                "submission_id,question_id"
                        }
                    );


            if (answersError) {

                console.error(
                    "Saving question marks error:",
                    answersError
                );


                throw new Error(
                    answersError.message ||
                    "Unable to save question marks."
                );

            }

        }


        // ---------------------------------------------
        // CALCULATE FINAL SCORE
        // ---------------------------------------------

        const totalScore =
            calculateTotal();


        // ---------------------------------------------
        // OVERALL FEEDBACK
        // ---------------------------------------------

        const overallFeedback =
            document.getElementById(
                "overallFeedback"
            );


        const feedback =
            overallFeedback
                ? overallFeedback.value.trim()
                : "";


        // ---------------------------------------------
        // UPDATE PARENT SUBMISSION
        // ---------------------------------------------

        const {
            error: submissionError
        } =
            await supabaseClient
                .from("submissions")
                .update({

                    score:
                        totalScore,

                    status:
                        "marked",

                    feedback:
                        feedback || null,

                    marked_by:
                        currentUser.id,

                    marked_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    currentSubmission.id
                );


        if (submissionError) {

            console.error(
                "Updating submission error:",
                submissionError
            );


            throw new Error(
                submissionError.message ||
                "Unable to update submission."
            );

        }


        // ---------------------------------------------
        // UPDATE LOCAL DATA
        // ---------------------------------------------

        currentSubmission.score =
            totalScore;

        currentSubmission.status =
            "marked";

        currentSubmission.feedback =
            feedback;


        const statusElement =
            document.getElementById(
                "submissionStatus"
            );


        if (statusElement) {

            statusElement.textContent =
                "Marked";

        }


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        showSaveMessage(
            "Submission marked successfully.",
            false
        );


        // ---------------------------------------------
        // DISABLE SAVE TEMPORARILY
        // ---------------------------------------------

        if (saveButton) {

            saveButton.textContent =
                "Marked Successfully";

        }

    }


    catch (error) {

        console.error(
            "Save marking error:",
            error
        );


        showSaveMessage(
            error.message ||
            "Unable to save the marks.",
            true
        );


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save & Mark Submission";

        }

    }

}


// =========================================================
// SAVE BUTTON
// =========================================================

function setupSaveButton() {

    const button =
        document.getElementById(
            "saveMarkBtn"
        );


    if (!button) {

        return;
    }


    button.addEventListener(
        "click",
        function () {

            saveMarking();

        }
    );

}


// =========================================================
// SAVE MESSAGE
// =========================================================

function showSaveMessage(
    message,
    isError
) {

    const element =
        document.getElementById(
            "saveMessage"
        );


    if (!element) {

        return;
    }


    element.textContent =
        message;


    element.style.color =
        isError
            ? "#b91c1c"
            : "#166534";

}


// =========================================================
// BACK BUTTON
// =========================================================

function setupBackButton() {

    const button =
        document.getElementById(
            "backToAssignment"
        );


    if (
        !button ||
        !currentAssignment
    ) {

        return;
    }


    button.href =
        "assignment.html?id=" +
        encodeURIComponent(
            currentAssignment.id
        );

}


// =========================================================
// LOGOUT
// =========================================================

function setupLogout() {

    const button =
        document.getElementById(
            "logoutBtn"
        );


    if (!button) {

        return;
    }


    button.addEventListener(
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
// ERROR
// =========================================================

function showError(
    message
) {

    const container =
        document.getElementById(
            "answersContainer"
        );


    if (container) {

        container.innerHTML = `
            <div class="error-message">

                ${escapeHtml(
                    message
                )}

            </div>
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