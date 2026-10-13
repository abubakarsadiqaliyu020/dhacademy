let currentUser = null;
let currentProfile = null;

let assignmentId = null;
let assignment = null;

let questions = [];
let currentSubmission = null;
let submissionAnswers = [];


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


            const params =
                new URLSearchParams(
                    window.location.search
                );


            assignmentId =
                params.get("id");


            if (!assignmentId) {

                showMessage(
                    "Assignment ID is missing.",
                    true
                );

                return;
            }


            setupLogout();

            setupSubmitButton();


            await loadAssignment();

            await loadQuestions();

            await loadSubmission();


        } catch (error) {

            console.error(
                "Assignment page error:",
                error
            );


            showMessage(
                "Something went wrong while loading the assignment. Check the browser Console for details.",
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
        window.location.href = "../index.html";
        return;
    }

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("id, full_name, student_id, role, is_active")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        console.error("Profile error:", profileError);
        showMessage("Unable to load your profile. Please log in again.", true);
        return;
    }

    // Only an active student may continue.
    // currentUser is set LAST so nothing loads for other roles.
    if (profile.role !== "student") {
        window.location.href = "../index.html";
        return;
    }

    if (!profile.is_active) {
        await supabaseClient.auth.signOut();
        window.location.href = "../index.html";
        return;
    }

    currentProfile = profile;
    currentUser = user;
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

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "../index.html";
        }
    );
}


/* =========================
   SUBMIT BUTTON
========================= */

function setupSubmitButton() {

    const button =
        document.getElementById(
            "submitAssignmentBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        submitAssignment
    );
}


/* =========================
   LOAD ASSIGNMENT
========================= */

async function loadAssignment() {

    console.log(
        "Loading assignment:",
        assignmentId
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("assignments")
            .select(`
                id,
                module_id,
                title,
                instructions,
                due_date,
                max_score
            `)
            .eq(
                "id",
                assignmentId
            )
            .single();


    if (error) {

        console.error(
            "Assignment loading error:",
            error
        );


        showMessage(
            "Unable to load assignment: " +
            error.message,
            true
        );


        throw error;
    }


    if (!data) {

        const errorMessage =
            "Assignment was not found.";


        showMessage(
            errorMessage,
            true
        );


        throw new Error(
            errorMessage
        );
    }


    assignment =
        data;


    document.getElementById(
        "assignmentTitle"
    ).textContent =
        assignment.title;


    document.getElementById(
        "assignmentInstructions"
    ).textContent =
        assignment.instructions ||
        "No instructions provided.";


    document.getElementById(
        "totalMarks"
    ).textContent =
        assignment.max_score || 0;


    if (assignment.due_date) {

        document.getElementById(
            "dueDate"
        ).textContent =
            new Date(
                assignment.due_date
            ).toLocaleString();
    }


    const backLink =
        document.getElementById(
            "backToModule"
        );


    if (
        backLink &&
        assignment.module_id
    ) {

        backLink.href =
            `module.html?id=${assignment.module_id}`;
    }


    console.log(
        "Assignment loaded:",
        assignment
    );
}


/* =========================
   LOAD QUESTIONS
========================= */

async function loadQuestions() {

    console.log(
        "Loading questions for assignment:",
        assignmentId
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("assignment_questions")
            .select(`
                id,
                assignment_id,
                question_number,
                question_text,
                answer_type,
                language,
                max_score
            `)
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


    if (error) {

        console.error(
            "Questions loading error:",
            error
        );


        showMessage(
            "Unable to load assignment questions: " +
            error.message,
            true
        );


        throw error;
    }


    questions =
        data || [];


    console.log(
        "Questions loaded:",
        questions
    );


    document.getElementById(
        "totalQuestions"
    ).textContent =
        questions.length;


    renderQuestions();
}


/* =========================
   LOAD SUBMISSION
========================= */

async function loadSubmission() {

    console.log(
        "Loading student submission..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("submissions")
            .select(`
                id,
                assignment_id,
                student_id,
                answer_text,
                submitted_at,
                status,
                score,
                feedback
            `)
            .eq(
                "assignment_id",
                assignmentId
            )
            .eq(
                "student_id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Submission loading error:",
            error
        );


        showMessage(
            "Unable to load your submission: " +
            error.message,
            true
        );


        throw error;
    }


    currentSubmission =
        data;


    /* =========================
       NO SUBMISSION
    ========================== */

    if (!currentSubmission) {

        console.log(
            "No submission found."
        );


        submissionAnswers = [];


        updateStatus(
            "not submitted"
        );


        renderQuestions();


        showSubmitButton();


        return;
    }


    console.log(
        "Submission loaded:",
        currentSubmission
    );


    /*
       Database stores:
       submitted
       marked

       Student sees:
       Submitted
       Marked
    */

    updateStatus(
        currentSubmission.status ||
        "submitted"
    );


    if (
        currentSubmission.submitted_at
    ) {

        document.getElementById(
            "submissionDate"
        ).textContent =
            "Submitted: " +
            new Date(
                currentSubmission.submitted_at
            ).toLocaleString();
    }


    /* =========================
       LOAD ANSWERS
    ========================== */

    const {
        data: answers,
        error: answersError
    } =
        await supabaseClient
            .from("submission_answers")
            .select(`
                id,
                submission_id,
                question_id,
                answer_text,
                score,
                feedback,
                marked_at
            `)
            .eq(
                "submission_id",
                currentSubmission.id
            );


    if (answersError) {

        console.error(
            "Submission answers loading error:",
            answersError
        );


        showMessage(
            "Unable to load your submitted answers: " +
            answersError.message,
            true
        );


        throw answersError;
    }


    submissionAnswers =
        answers || [];


    console.log(
        "Submission answers loaded:",
        submissionAnswers
    );


    renderQuestions();


    /* =========================
       SHOW RESULT
    ========================== */

    const isMarked =
        String(
            currentSubmission.status ||
            ""
        ).toLowerCase() ===
        "marked";


    if (isMarked) {

        showResult();
    }


    /*
       Once a submission exists,
       hide the submit button.
    */

    hideSubmitButton();
}


/* =========================
   RENDER QUESTIONS
========================= */

function renderQuestions() {

    const container =
        document.getElementById(
            "questionsContainer"
        );


    if (!container) {
        return;
    }


    if (!questions.length) {

        container.innerHTML =
            `
            <div class="question-card">

                <p>
                    No questions have been added to this assignment yet.
                </p>

            </div>
            `;


        hideSubmitButton();


        return;
    }


    container.innerHTML =
        "";


    const hasSubmission =
        currentSubmission !== null;


    const isMarked =
        currentSubmission &&
        String(
            currentSubmission.status ||
            ""
        ).toLowerCase() ===
        "marked";


    questions.forEach(
        question => {

            const answer =
                submissionAnswers.find(
                    item =>
                        item.question_id ===
                        question.id
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "question-card";


            const answerText =
                answer &&
                answer.answer_text
                    ? answer.answer_text
                    : "";


            let answerHtml;


            /* =========================
               ALREADY SUBMITTED
            ========================== */

            if (hasSubmission) {

                if (answerText) {

                    answerHtml =
                        `
                        <div class="student-answer">

                            ${escapeHtml(
                                answerText
                            )}

                        </div>
                        `;

                } else {

                    answerHtml =
                        `
                        <div class="student-answer no-answer">

                            No answer submitted.

                        </div>
                        `;
                }


            }


            /* =========================
               NOT SUBMITTED
            ========================== */

            else {

                const inputType =
                    question.answer_type;


                if (
                    inputType ===
                    "code"
                ) {

                    answerHtml =
                        `
                        <textarea
                            class="answer-input code-input"
                            data-question-id="${question.id}"
                            placeholder="Write your ${escapeHtml(question.language || "code")} answer here..."
                            spellcheck="false"
                        ></textarea>
                        `;

                } else {

                    answerHtml =
                        `
                        <textarea
                            class="answer-input"
                            data-question-id="${question.id}"
                            placeholder="Type your answer here..."
                        ></textarea>
                        `;
                }
            }


            /* =========================
               MARKS AND FEEDBACK
            ========================== */

            let resultHtml =
                "";


            if (isMarked) {

                const score =
                    answer &&
                    answer.score !== null &&
                    answer.score !== undefined
                        ? Number(
                            answer.score
                        )
                        : 0;


                const feedback =
                    answer &&
                    answer.feedback
                        ? answer.feedback
                        : "No feedback provided.";


                resultHtml =
                    `
                    <div class="question-result">

                        <div class="question-score">

                            Score:
                            ${score}
                            /
                            ${Number(
                                question.max_score || 0
                            )}

                        </div>


                        <div class="question-feedback">

                            <strong>
                                Facilitator Feedback
                            </strong>


                            <p>
                                ${escapeHtml(
                                    feedback
                                )}
                            </p>

                        </div>

                    </div>
                    `;
            }


            /* =========================
               LANGUAGE
            ========================== */

            let languageHtml =
                "";


            if (
                question.answer_type ===
                    "code" &&
                question.language
            ) {

                languageHtml =
                    `
                    <span class="language-label">

                        Language:
                        ${escapeHtml(
                            question.language
                        )}

                    </span>
                    `;
            }


            /* =========================
               QUESTION CARD
            ========================== */

            card.innerHTML =
                `

                <div class="question-header">

                    <div>

                        <div class="question-number">

                            Question
                            ${question.question_number}

                        </div>


                        <div class="question-text">

                            ${escapeHtml(
                                question.question_text
                            )}

                        </div>

                    </div>


                    <div class="question-marks">

                        ${Number(
                            question.max_score || 0
                        )}
                        marks

                    </div>

                </div>


                ${languageHtml}


                <div class="answer-section">

                    <span class="answer-label">

                        Your Answer

                    </span>


                    ${answerHtml}

                </div>


                ${resultHtml}

                `;


            container.appendChild(
                card
            );
        }
    );
}


/* =========================
   SUBMIT ASSIGNMENT
========================= */

async function submitAssignment() {

    if (
        !currentUser ||
        !assignmentId
    ) {

        showMessage(
            "Unable to submit assignment. Student or assignment information is missing.",
            true
        );


        return;
    }


    if (currentSubmission) {

        showMessage(
            "You have already submitted this assignment.",
            true
        );


        return;
    }


    /* =========================
       GET ANSWERS
    ========================== */

    const answerInputs =
        document.querySelectorAll(
            ".answer-input"
        );


    if (
        !answerInputs.length
    ) {

        showMessage(
            "There are no answer fields available.",
            true
        );


        return;
    }


    const answersToSave =
        [];


    let unansweredCount =
        0;


    answerInputs.forEach(
        input => {

            const answerText =
                input.value.trim();


            if (!answerText) {

                unansweredCount++;
            }


            answersToSave.push({

                question_id:
                    input.dataset.questionId,

                answer_text:
                    answerText

            });
        }
    );


    /* =========================
       UNANSWERED QUESTIONS
    ========================== */

    if (
        unansweredCount >
        0
    ) {

        const proceed =
            confirm(
                `You have ${unansweredCount} unanswered question(s).\n\nDo you still want to submit?`
            );


        if (!proceed) {
            return;
        }
    }


    /* =========================
       FINAL CONFIRMATION
    ========================== */

    const confirmed =
        confirm(
            "Are you sure you want to submit this assignment?\n\nYou will not be able to edit your answers after submission."
        );


    if (!confirmed) {
        return;
    }


    const button =
        document.getElementById(
            "submitAssignmentBtn"
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Submitting...";
        }


        showMessage(
            "Submitting your assignment..."
        );


        /* =========================
           CREATE SUBMISSION
        ========================== */

        const {
            data: submission,
            error: submissionError
        } =
            await supabaseClient
                .from("submissions")
                .insert({

                    assignment_id:
                        assignmentId,

                    student_id:
                        currentUser.id,

                    answer_text:
                        "",

                    submitted_at:
                        new Date().toISOString(),

                    /*
                       IMPORTANT:
                       Database constraint accepts
                       lowercase "submitted".
                    */

                    status:
                        "submitted",

                    score:
                        0

                })
                .select(`
                    id,
                    assignment_id,
                    student_id,
                    answer_text,
                    submitted_at,
                    status,
                    score,
                    feedback
                `)
                .single();


        if (submissionError) {

            console.error(
                "Submission creation error:",
                submissionError
            );


            throw submissionError;
        }


        if (!submission) {

            throw new Error(
                "Submission was not created."
            );
        }


        console.log(
            "Submission created:",
            submission
        );


        /* =========================
           SAVE ANSWERS
        ========================== */

        const answerRows =
            answersToSave.map(
                item => ({

                    submission_id:
                        submission.id,

                    question_id:
                        item.question_id,

                    answer_text:
                        item.answer_text

                })
            );


        const {
            data: savedAnswers,
            error: answersError
        } =
            await supabaseClient
                .from("submission_answers")
                .insert(
                    answerRows
                )
                .select();


        if (answersError) {

            console.error(
                "Answer saving error:",
                answersError
            );


            /*
               Remove the submission if
               the answers could not be saved.
            */

            const {
                error: cleanupError
            } =
                await supabaseClient
                    .from("submissions")
                    .delete()
                    .eq(
                        "id",
                        submission.id
                    );


            if (cleanupError) {

                console.error(
                    "Submission cleanup error:",
                    cleanupError
                );
            }


            throw answersError;
        }


        console.log(
            "Answers saved:",
            savedAnswers
        );


        /* =========================
           UPDATE LOCAL STATE
        ========================== */

        currentSubmission =
            submission;


        submissionAnswers =
            savedAnswers || [];


        /*
           Database:
           submitted

           Display:
           Submitted
        */

        updateStatus(
            "submitted"
        );


        document.getElementById(
            "submissionDate"
        ).textContent =
            "Submitted: " +
            new Date(
                submission.submitted_at
            ).toLocaleString();


        renderQuestions();


        hideSubmitButton();


        showMessage(
            "Assignment submitted successfully."
        );


    } catch (error) {

        console.error(
            "Submit assignment error:",
            error
        );


        showMessage(
            "Unable to submit assignment: " +
            error.message,
            true
        );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Submit Assignment";
        }
    }
}


/* =========================
   SHOW SUBMIT BUTTON
========================= */

function showSubmitButton() {

    const section =
        document.getElementById(
            "submitSection"
        );


    const button =
        document.getElementById(
            "submitAssignmentBtn"
        );


    if (section) {

        section.style.display =
            "block";
    }


    if (button) {

        button.style.display =
            "inline-block";

        button.disabled =
            false;

        button.textContent =
            "Submit Assignment";
    }
}


/* =========================
   HIDE SUBMIT BUTTON
========================= */

function hideSubmitButton() {

    const section =
        document.getElementById(
            "submitSection"
        );


    if (section) {

        section.style.display =
            "none";
    }
}


/* =========================
   SHOW RESULT
========================= */

function showResult() {

    const resultSection =
        document.getElementById(
            "resultSection"
        );


    if (!resultSection) {
        return;
    }


    resultSection.classList.remove(
        "hidden"
    );


    const totalScore =
        Number(
            currentSubmission.score ||
            0
        );


    const totalMarks =
        questions.reduce(
            (
                total,
                question
            ) =>
                total +
                Number(
                    question.max_score ||
                    0
                ),
            0
        );


    const percentage =
        totalMarks > 0
            ? (
                totalScore /
                totalMarks
            ) * 100
            : 0;


    document.getElementById(
        "resultScore"
    ).textContent =
        `${totalScore} / ${totalMarks}`;


    document.getElementById(
        "resultPercentage"
    ).textContent =
        `${percentage.toFixed(1)}%`;


    document.getElementById(
        "resultStatus"
    ).textContent =
        "Marked";


    document.getElementById(
        "overallFeedback"
    ).textContent =
        currentSubmission.feedback ||
        "No overall feedback provided.";
}


/* =========================
   STATUS
========================= */

function updateStatus(status) {

    const element =
        document.getElementById(
            "submissionStatus"
        );


    if (!element) {
        return;
    }


    const cleanStatus =
        String(
            status || ""
        ).toLowerCase();


    element.className =
        "status-badge";


    /* =========================
       STUDENT-FRIENDLY DISPLAY
    ========================== */

    if (
        cleanStatus ===
        "marked"
    ) {

        element.textContent =
            "Marked";

        element.classList.add(
            "marked"
        );

        return;
    }


    if (
        cleanStatus ===
        "submitted"
    ) {

        element.textContent =
            "Submitted";

        element.classList.add(
            "submitted"
        );

        return;
    }


    element.textContent =
        "Not Submitted";

    element.classList.add(
        "not-submitted"
    );
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

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
        "12px 16px";


    element.style.borderRadius =
        "8px";


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