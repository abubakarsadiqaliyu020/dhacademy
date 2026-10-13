/* ========================================
   ELEMENTS
======================================== */

const moduleTitle =
    document.getElementById("moduleTitle");

const moduleDescription =
    document.getElementById("moduleDescription");

const backToClass =
    document.getElementById("backToClass");

const logoutBtn =
    document.getElementById("logoutBtn");


/* ========================================
   MATERIAL ELEMENTS
======================================== */

const addMaterialBtn =
    document.getElementById("addMaterialBtn");

const materialModal =
    document.getElementById("materialModal");

const closeMaterialModal =
    document.getElementById("closeMaterialModal");

const cancelMaterialBtn =
    document.getElementById("cancelMaterialBtn");

const materialForm =
    document.getElementById("materialForm");

const materialTitle =
    document.getElementById("materialTitle");

const materialDescription =
    document.getElementById("materialDescription");

const materialContent =
    document.getElementById("materialContent");

const materialLanguage =
    document.getElementById("materialLanguage");

const materialMessage =
    document.getElementById("materialMessage");

const materialsContainer =
    document.getElementById("materialsContainer");


/* ========================================
   ASSIGNMENT ELEMENTS
======================================== */

const addAssignmentBtn =
    document.getElementById("addAssignmentBtn");

const assignmentModal =
    document.getElementById("assignmentModal");

const closeAssignmentModal =
    document.getElementById("closeAssignmentModal");

const cancelAssignmentBtn =
    document.getElementById("cancelAssignmentBtn");

const assignmentForm =
    document.getElementById("assignmentForm");

const assignmentTitle =
    document.getElementById("assignmentTitle");

const assignmentInstructions =
    document.getElementById("assignmentInstructions");

const assignmentDueDate =
    document.getElementById("assignmentDueDate");

const assignmentMaxScore =
    document.getElementById("assignmentMaxScore");

const assignmentMessage =
    document.getElementById("assignmentMessage");

const questionsContainer =
    document.getElementById("questionsContainer");

const addQuestionBtn =
    document.getElementById("addQuestionBtn");

const assignmentsContainer =
    document.getElementById("assignmentsContainer");


/* ========================================
   GLOBAL VARIABLES
======================================== */

let currentUser = null;

let currentModule = null;

let currentClassId = null;

let questions = [];
let editingMaterialId = null;
let assignmentFormDirty = false;
let assignmentFormOpening = false;


/* ========================================
   START PAGE
======================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        setupLessonEditorToolbar();
        startPage();
    }
);

/* Word-like editor helpers. Content is stored in the existing resources.content field. */
function setupLessonEditorToolbar() {
    const editor = document.getElementById("materialContent");
    if (!editor) return;

    document.querySelectorAll("[data-command]").forEach(button => {
        button.addEventListener("click", () => {
            editor.focus();
            document.execCommand(button.dataset.command, false, null);
        });
    });

    const blockFormat = document.getElementById("lessonBlockFormat");
    blockFormat?.addEventListener("change", () => {
        editor.focus();
        document.execCommand("formatBlock", false, blockFormat.value);
    });

    document.getElementById("lessonFontSize")?.addEventListener("change", event => {
        editor.focus();
        document.execCommand("fontSize", false, event.target.value);
    });

    document.getElementById("lessonTextColor")?.addEventListener("input", event => {
        editor.focus();
        document.execCommand("foreColor", false, event.target.value);
    });

    document.getElementById("lessonHighlightColor")?.addEventListener("input", event => {
        editor.focus();
        document.execCommand("hiliteColor", false, event.target.value);
    });

    document.getElementById("clearLessonFormattingBtn")?.addEventListener("click", () => {
        editor.focus();
        document.execCommand("removeFormat", false, null);
        document.execCommand("formatBlock", false, "p");
    });

    document.getElementById("insertLessonTableBtn")?.addEventListener("click", () => {
        const rows = Number(prompt("Number of rows (2–20):", "3"));
        if (!rows || !Number.isInteger(rows) || rows < 2 || rows > 20) return;
        const cols = Number(prompt("Number of columns (2–10):", "3"));
        if (!cols || !Number.isInteger(cols) || cols < 2 || cols > 10) return;
        let table = '<table border="1"><thead><tr>';
        for (let c = 0; c < cols; c++) table += `<th>Heading ${c + 1}</th>`;
        table += '</tr></thead><tbody>';
        for (let r = 1; r < rows; r++) {
            table += '<tr>';
            for (let c = 0; c < cols; c++) table += `<td>Cell ${r}, ${c + 1}</td>`;
            table += '</tr>';
        }
        table += '</tbody></table><p><br></p>';
        insertEditorHtml(table);
    });

    document.getElementById("insertLessonCodeBtn")?.addEventListener("click", () => {
        const language = prompt("Programming language (Python, HTML, CSS, JavaScript, SQL, etc.):", "python");
        if (language === null) return;
        const code = prompt("Enter or paste the code. You can edit it in the inserted block:", "print('Hello, world!')");
        if (code === null) return;
        const safeLanguage = escapeHtml(language.trim() || "text");
        const safeCode = escapeHtml(code);
        insertEditorHtml(`<div class="lesson-code-block"><div class="lesson-code-language">${safeLanguage}</div><pre><code class="language-${safeLanguage.toLowerCase()}">${safeCode}</code></pre></div><p><br></p>`);
    });

    ["addTableRowBtn", "deleteTableRowBtn", "addTableColumnBtn", "deleteTableColumnBtn"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", () => editSelectedTable(id));
    });

    const previewButton = document.getElementById("previewLessonBtn");
    previewButton?.addEventListener("click", () => {
        const panel = document.getElementById("lessonPreviewPanel");
        const content = document.getElementById("lessonPreviewContent");
        if (!panel || !content) return;
        if (!panel.hidden) {
            panel.hidden = true;
            previewButton.textContent = "Preview";
        } else {
            content.innerHTML = sanitizeLessonHtml(editor.innerHTML);
            panel.hidden = false;
            previewButton.textContent = "Hide Preview";
            panel.scrollIntoView({behavior: "smooth", block: "nearest"});
        }
    });

    editor.addEventListener("paste", event => {
        event.preventDefault();
        const html = event.clipboardData?.getData("text/html");
        const plain = event.clipboardData?.getData("text/plain") || "";
        if (html && window.DOMPurify) {
            insertEditorHtml(DOMPurify.sanitize(html, {ALLOWED_TAGS: ["p","br","div","span","b","strong","i","em","u","s","strike","h1","h2","h3","h4","ul","ol","li","table","thead","tbody","tr","th","td","pre","code"], ALLOWED_ATTR: ["style","colspan","rowspan","class"]}));
        } else {
            insertEditorHtml(escapeHtml(plain).replace(/\r?\n/g, "<br>"));
        }
    });
}

function insertEditorHtml(html) {
    const editor = document.getElementById("materialContent");
    if (!editor) return;
    editor.focus();
    if (window.getSelection && window.getSelection().rangeCount) {
        const range = window.getSelection().getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            const fragment = range.createContextualFragment(html);
            const last = fragment.lastChild;
            range.insertNode(fragment);
            if (last) {
                range.setStartAfter(last);
                range.collapse(true);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            }
            return;
        }
    }
    editor.insertAdjacentHTML("beforeend", html);
}

function editSelectedTable(action) {
    const editor = document.getElementById("materialContent");
    const selection = window.getSelection();
    let node = selection?.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const cell = node?.closest?.("td, th");
    const table = cell?.closest("table");
    if (!table || !editor.contains(table)) {
        alert("Click inside a table cell first.");
        return;
    }
    const row = cell.parentElement;
    const cellIndex = Array.from(row.cells).indexOf(cell);
    if (action === "addTableRowBtn") {
        const newRow = table.insertRow(row.rowIndex + 1);
        for (let i = 0; i < row.cells.length; i++) {
            const newCell = newRow.insertCell();
            newCell.innerHTML = "&nbsp;";
        }
    } else if (action === "deleteTableRowBtn") {
        if (table.rows.length <= 1) return alert("A table must keep at least one row.");
        row.remove();
    } else if (action === "addTableColumnBtn") {
        Array.from(table.rows).forEach((r, i) => {
            const newCell = document.createElement(i === 0 && table.tHead?.contains(r) ? "th" : "td");
            newCell.innerHTML = "&nbsp;";
            r.insertBefore(newCell, r.cells[cellIndex + 1] || null);
        });
    } else if (action === "deleteTableColumnBtn") {
        if (row.cells.length <= 1) return alert("A table must keep at least one column.");
        Array.from(table.rows).forEach(r => r.cells[cellIndex]?.remove());
    }
}

function sanitizeLessonHtml(html) {
    if (window.DOMPurify) return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["p","br","div","span","b","strong","i","em","u","s","strike","h1","h2","h3","h4","ul","ol","li","table","thead","tbody","tr","th","td","pre","code","blockquote"],
        ALLOWED_ATTR: ["style","colspan","rowspan","class"]
    });
    return escapeHtml(html).replace(/\n/g, "<br>");
}

function legacyContentToHtml(content) {
    if (/<(p|div|h[1-6]|table|ul|ol|pre|blockquote)\b/i.test(content)) return sanitizeLessonHtml(content);
    const escaped = escapeHtml(content || "");
    return escaped.replace(/```([\w+#.-]*)\n?([\s\S]*?)```/g, (_, lang, code) => `<div class="lesson-code-block"><div class="lesson-code-language">${escapeHtml(lang || "text")}</div><pre><code class="language-${escapeHtml((lang || "text").toLowerCase())}">${code}</code></pre></div>`).replace(/\n/g, "<br>");
}


async function startPage() {

    console.log(
        "FACILITATOR MODULE JS LOADED"
    );


    try {

        const {
            data: userData,
            error: userError
        } =
            await supabaseClient.auth.getUser();


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


        /* ========================================
           LOAD PROFILE
        ======================================== */

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
                profileError
            );

            alert(
                "Unable to load your profile."
            );

            return;
        }


        if (
            profile.role !==
                "facilitator" ||
            !profile.is_active
        ) {

            alert(
                "You do not have permission to access this page."
            );

            window.location.href =
                "../index.html";

            return;
        }


        /* ========================================
           GET MODULE ID
        ======================================== */

        const urlParams =
            new URLSearchParams(
                window.location.search
            );


        const moduleId =
            urlParams.get("id");


        if (!moduleId) {

            alert(
                "Module ID is missing."
            );

            return;
        }


        /* ========================================
           LOAD PAGE
        ======================================== */

        await loadModule(
            moduleId
        );


        await loadMaterials(
            moduleId
        );


        await loadAssignments(
            moduleId
        );


    } catch (error) {

        console.error(
            error
        );

        alert(
            "Something went wrong while loading the module."
        );

    }

}


/* ========================================
   LOAD MODULE
======================================== */

async function loadModule(
    moduleId
) {

    const {
        data: module,
        error
    } =
        await supabaseClient
            .from("modules")
            .select(
                "id, class_id, title, description, module_number"
            )
            .eq(
                "id",
                moduleId
            )
            .single();


    if (
        error ||
        !module
    ) {

        console.error(
            error
        );

        alert(
            "Unable to load this module."
        );

        return;
    }


    currentModule =
        module;


    currentClassId =
        module.class_id;


    moduleTitle.textContent =
        "Module " +
        module.module_number +
        ": " +
        module.title;


    moduleDescription.textContent =
        module.description ||
        "No module description available.";


    backToClass.href =
        "class.html?id=" +
        encodeURIComponent(
            module.class_id
        );

}


/* ========================================
   LEARNING MATERIALS
======================================== */

async function loadMaterials(
    moduleId
) {

    materialsContainer.innerHTML = `
        <div class="loading-box">

            <div class="loader"></div>

            <p>
                Loading learning materials...
            </p>

        </div>
    `;


    const {
        data: materials,
        error
    } =
        await supabaseClient
            .from("resources")
            .select(
                "id, title, description, content, language, material_type, created_at, updated_at"
            )
            .eq(
                "module_id",
                moduleId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Material loading error:",
            error
        );


        materialsContainer.innerHTML = `
            <div class="error-message">
                Unable to load learning materials.
            </div>
        `;

        return;
    }


    if (
        !materials ||
        materials.length === 0
    ) {

        materialsContainer.innerHTML = `
            <div class="empty-message">
                No learning materials have been created yet.
            </div>
        `;

        return;
    }


    materialsContainer.innerHTML =
        "";


    materials.forEach(
        function (material) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "material-card";


            const contentHtml =
                formatLessonContent(
                    material.content ||
                    ""
                );


            card.innerHTML = `

                <div class="material-card-header">

                    <h3>
                        ${escapeHtml(
                            material.title
                        )}
                    </h3>

                </div>


                ${
                    material.description
                    ?
                    `
                    <p class="material-description">
                        ${escapeHtml(
                            material.description
                        )}
                    </p>
                    `
                    :
                    ""
                }


                <div class="lesson-content">

                    ${contentHtml}

                </div>


                <div class="material-actions">

                    <button class="edit-material-btn" data-id="${material.id}" type="button">Edit Material</button>
                    <button class="delete-material-btn" data-id="${material.id}" type="button">Delete Material</button>

                </div>

            `;


            materialsContainer.appendChild(
                card
            );

        }
    );


    attachMaterialButtons();

}


/* ========================================
   FORMAT LESSON CONTENT
======================================== */

function formatLessonContent(
    content
) {

    if (!content) {
        return "";
    }

    if (/<(p|div|h[1-6]|table|ul|ol|pre|blockquote)\b/i.test(content)) {
        return sanitizeLessonHtml(content);
    }

    const escaped =
        escapeHtml(content);


    const parts =
        escaped.split(
            /```([\w+#-]*)\n?([\s\S]*?)```/g
        );


    let result = "";


    for (
        let i = 0;
        i < parts.length;
        i++
    ) {

        if (i % 3 === 0) {

            const normalText =
                parts[i]
                    .replace(
                        /\n/g,
                        "<br>"
                    );


            result +=
                `<div>${normalText}</div>`;

        }

        else if (
            i % 3 === 1
        ) {

            const language =
                parts[i] ||
                "text";


            const code =
                parts[i + 1] ||
                "";


            result += `

                <div class="code-block">

                    <div class="code-header">

                        <span class="code-language">
                            ${escapeHtml(
                                language
                            )}
                        </span>


                        <button
                            class="copy-code-btn"
                            type="button"
                            data-code="${encodeURIComponent(
                                code
                            )}"
                        >
                            Copy Code
                        </button>

                    </div>


                    <pre>${code}</pre>

                </div>

            `;


            i++;

        }

    }


    return result;

}


/* ========================================
   COPY CODE
======================================== */

document.addEventListener(
    "click",
    async function (event) {

        if (
            !event.target.classList.contains(
                "copy-code-btn"
            )
        ) {

            return;
        }


        const encodedCode =
            event.target.getAttribute(
                "data-code"
            );


        const code =
            decodeURIComponent(
                encodedCode
            );


        try {

            await navigator.clipboard.writeText(
                code
            );


            const originalText =
                event.target.textContent;


            event.target.textContent =
                "Copied!";


            setTimeout(
                function () {

                    event.target.textContent =
                        originalText;

                },
                1500
            );


        } catch (error) {

            console.error(
                error
            );

            alert(
                "Unable to copy the code."
            );

        }

    }
);


/* ========================================
   MATERIAL BUTTONS
======================================== */

function attachMaterialButtons() {
    document.querySelectorAll(".edit-material-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const id = button.getAttribute("data-id");
            const { data, error } = await supabaseClient.from("resources")
                .select("id,title,description,content,language").eq("id", id).single();
            if (error || !data) return alert("Unable to open this material for editing.");
            editingMaterialId = data.id;
            materialTitle.value = data.title || "";
            materialDescription.value = data.description || "";
            materialLanguage.value = data.language || "text";
            materialContent.innerHTML = legacyContentToHtml(data.content || "");
            materialMessage.textContent = "Editing saved material. Save to update it.";
            document.querySelector("#materialModal .modal-header h2").textContent = "Edit Learning Material";
            document.querySelector("#materialForm button[type=submit]").textContent = "Save Changes";
            document.getElementById("lessonPreviewPanel").hidden = true;
            materialModal.classList.add("show");
        });
    });

    const buttons =
        document.querySelectorAll(
            ".delete-material-btn"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const materialId =
                        button.getAttribute(
                            "data-id"
                        );


                    deleteMaterial(
                        materialId
                    );

                }
            );

        }
    );

}


/* ========================================
   OPEN MATERIAL MODAL
======================================== */

addMaterialBtn.addEventListener(
    "click",
    function () {

        materialForm.reset();
        editingMaterialId = null;
        materialContent.innerHTML = "";
        document.querySelector("#materialModal .modal-header h2").textContent = "Add Learning Material";
        document.querySelector("#materialForm button[type=submit]").textContent = "Save Learning Material";
        document.getElementById("lessonPreviewPanel").hidden = true;

        materialLanguage.value =
            "text";

        materialMessage.textContent =
            "";

        materialModal.classList.add(
            "show"
        );

    }
);


/* ========================================
   CLOSE MATERIAL MODAL
======================================== */

closeMaterialModal.addEventListener(
    "click",
    closeMaterialForm
);


cancelMaterialBtn.addEventListener(
    "click",
    closeMaterialForm
);


function closeMaterialForm() {
    materialModal.classList.remove("show");
    editingMaterialId = null;
    document.getElementById("lessonPreviewPanel").hidden = true;
}


/* ========================================
   SAVE MATERIAL
======================================== */

materialForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!currentModule) {

            materialMessage.textContent =
                "Module information is not available.";

            return;
        }


        const title =
            materialTitle.value.trim();


        const description =
            materialDescription.value.trim();


        const content =
            sanitizeLessonHtml(materialContent.innerHTML);


        const language =
            materialLanguage.value;


        if (!title) {

            materialMessage.textContent =
                "Please enter a material title.";

            return;
        }


        if (!content.trim()) {

            materialMessage.textContent =
                "Please enter the lesson content.";

            return;
        }


        materialMessage.textContent =
            "Saving learning material...";


        try {

            const materialPayload = {
                module_id: currentModule.id,
                title,
                description: description || null,
                content,
                language,
                material_type: "text",
                uploaded_by: currentUser.id
            };
            let saveQuery = editingMaterialId
                ? supabaseClient.from("resources").update(materialPayload).eq("id", editingMaterialId)
                : supabaseClient.from("resources").insert(materialPayload);
            const { data, error } = await saveQuery.select().single();


            if (error) {

                console.error(
                    "Material creation error:",
                    error
                );


                materialMessage.textContent =
                    "Unable to save learning material.";

                return;
            }


            console.log(
                "Material created:",
                data
            );


            materialMessage.textContent =
                editingMaterialId ? "Learning material updated successfully." : "Learning material saved successfully.";


            setTimeout(
                async function () {

                    closeMaterialForm();

                    await loadMaterials(
                        currentModule.id
                    );

                },
                700
            );


        } catch (error) {

            console.error(
                error
            );


            materialMessage.textContent =
                "Something went wrong.";

        }

    }
);


/* ========================================
   DELETE MATERIAL
======================================== */

async function deleteMaterial(
    materialId
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this learning material?"
        );


    if (!confirmed) {

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("resources")
            .delete()
            .eq(
                "id",
                materialId
            );


    if (error) {

        console.error(
            "Delete material error:",
            error
        );


        alert(
            "Unable to delete the learning material."
        );

        return;
    }


    await loadMaterials(
        currentModule.id
    );

}


/* ========================================
   ASSIGNMENTS
======================================== */

async function loadAssignments(
    moduleId
) {

    assignmentsContainer.innerHTML = `
        <div class="loading-box">

            <div class="loader"></div>

            <p>
                Loading assignments...
            </p>

        </div>
    `;


    const {
        data: assignments,
        error
    } =
        await supabaseClient
            .from("assignments")
            .select(
                "id, title, instructions, due_date, max_score, created_at"
            )
            .eq(
                "module_id",
                moduleId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Assignment loading error:",
            error
        );


        assignmentsContainer.innerHTML = `
            <div class="error-message">
                Unable to load assignments.
            </div>
        `;

        return;
    }


    if (
        !assignments ||
        assignments.length === 0
    ) {

        assignmentsContainer.innerHTML = `
            <div class="empty-message">
                No assignments have been created yet.
            </div>
        `;

        return;
    }


    assignmentsContainer.innerHTML =
        "";


    assignments.forEach(
        function (assignment) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "assignment-card";


            let dueDateText =
                "No due date";


            if (
                assignment.due_date
            ) {

                dueDateText =
                    new Date(
                        assignment.due_date
                    ).toLocaleString(
                        "en-NG"
                    );

            }


            card.innerHTML = `

                <div class="assignment-card-header">

                    <h3>
                        ${escapeHtml(
                            assignment.title
                        )}
                    </h3>

                </div>


                <div class="assignment-instructions">

                    ${escapeHtml(
                        assignment.instructions
                    ).replace(
                        /\n/g,
                        "<br>"
                    )}

                </div>


                <div class="assignment-info">

                    <span>
                        Due:
                        ${escapeHtml(
                            dueDateText
                        )}
                    </span>


                    <span>
                        Maximum Score:
                        ${assignment.max_score}
                    </span>

                </div>


                <div class="assignment-actions">

                    <button
                        class="open-assignment-btn"
                        data-id="${assignment.id}"
                        type="button"
                    >
                        Open Assignment
                    </button>


                    <button
                        class="delete-assignment-btn"
                        data-id="${assignment.id}"
                        type="button"
                    >
                        Delete Assignment
                    </button>

                </div>

            `;


            assignmentsContainer.appendChild(
                card
            );

        }
    );


    attachAssignmentButtons();

}


/* ========================================
   ASSIGNMENT BUTTONS
======================================== */

function attachAssignmentButtons() {

    const openButtons =
        document.querySelectorAll(
            ".open-assignment-btn"
        );


    openButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const assignmentId =
                        button.getAttribute(
                            "data-id"
                        );


                    window.location.href =
                        "assignment.html?id=" +
                        encodeURIComponent(
                            assignmentId
                        );

                }
            );

        }
    );


    const deleteButtons =
        document.querySelectorAll(
            ".delete-assignment-btn"
        );


    deleteButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const assignmentId =
                        button.getAttribute(
                            "data-id"
                        );


                    deleteAssignment(
                        assignmentId
                    );

                }
            );

        }
    );

}


/* ========================================
   ASSIGNMENT MODAL / CANCEL SAFETY
======================================== */
function closeAssignmentForm() {
    if (assignmentFormDirty && !confirm("Discard your unsaved assignment changes?")) return;
    assignmentModal.classList.remove("show");
    assignmentFormDirty = false;
}

closeAssignmentModal?.addEventListener("click", closeAssignmentForm);
cancelAssignmentBtn?.addEventListener("click", closeAssignmentForm);
assignmentForm?.addEventListener("input", () => {
    if (!assignmentFormOpening) assignmentFormDirty = true;
});

/* ========================================
   OPEN ASSIGNMENT MODAL
======================================== */

addAssignmentBtn.addEventListener(
    "click",
    function () {

        assignmentFormOpening = true;
        assignmentForm.reset();
        assignmentFormDirty = false;
        assignmentFormOpening = false;

        questions = [];


        assignmentMaxScore.value =
            0;


        assignmentMessage.textContent =
            "";


        questionsContainer.innerHTML =
            "";


        /*
           Start with Question 1
        */

        addQuestion();


        assignmentModal.classList.add(
            "show"
        );

    }
);


/* ========================================
   ADD QUESTION BUTTON
======================================== */

addQuestionBtn.addEventListener(
    "click",
    function () {

        addQuestion();

    }
);


/* ========================================
   ADD QUESTION
======================================== */

function addQuestion() {

    const questionNumber =
        questions.length + 1;


    questions.push({

        question_number:
            questionNumber,

        question_text:
            "",

        answer_type:
            "text",

        language:
            "text",

        max_score:
            1

    });


    renderQuestions();

    updateTotalScore();

}


/* ========================================
   RENDER QUESTIONS
======================================== */

function renderQuestions() {

    questionsContainer.innerHTML =
        "";


    questions.forEach(
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


            card.innerHTML = `

                <div class="question-card-header">

                    <h3>
                        Question
                        ${index + 1}
                    </h3>


                    ${
                        questions.length > 1
                        ?
                        `
                        <button
                            type="button"
                            class="remove-question-btn"
                            data-index="${index}"
                        >
                            Remove
                        </button>
                        `
                        :
                        ""
                    }

                </div>


                <div class="question-fields">


                    <!-- QUESTION TEXT -->

                    <div class="form-group">

                        <label>
                            Question
                        </label>

                        <textarea
                            class="question-text-input"
                            data-index="${index}"
                            rows="4"
                            placeholder="Write the question here..."
                            required
                        >${escapeHtml(
                            question.question_text
                        )}</textarea>

                    </div>


                    <!-- ANSWER TYPE + MARKS -->

                    <div class="two-column">


                        <div class="form-group">

                            <label>
                                Answer Type
                            </label>

                            <select
                                class="answer-type-input"
                                data-index="${index}"
                            >

                                <option
                                    value="text"
                                    ${
                                        question.answer_type ===
                                        "text"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Short Answer
                                </option>


                                <option
                                    value="long_text"
                                    ${
                                        question.answer_type ===
                                        "long_text"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Long Answer
                                </option>


                                <option
                                    value="code"
                                    ${
                                        question.answer_type ===
                                        "code"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Code
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label>
                                Marks
                            </label>

                            <input
                                type="number"
                                class="question-score-input"
                                data-index="${index}"
                                min="1"
                                step="1"
                                value="${question.max_score}"
                                required
                            >

                        </div>


                    </div>


                    <!-- LANGUAGE -->

                    <div
                        class="form-group language-group"
                        style="${
                            question.answer_type === "code"
                                ? ""
                                : "display:none;"
                        }"
                    >

                        <label>
                            Programming Language
                        </label>

                        <select
                            class="question-language-input"
                            data-index="${index}"
                        >

                            <option
                                value="python"
                                ${
                                    question.language ===
                                    "python"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Python
                            </option>


                            <option
                                value="html"
                                ${
                                    question.language ===
                                    "html"
                                        ? "selected"
                                        : ""
                                }
                            >
                                HTML
                            </option>


                            <option
                                value="css"
                                ${
                                    question.language ===
                                    "css"
                                        ? "selected"
                                        : ""
                                }
                            >
                                CSS
                            </option>


                            <option
                                value="javascript"
                                ${
                                    question.language ===
                                    "javascript"
                                        ? "selected"
                                        : ""
                                }
                            >
                                JavaScript
                            </option>


                            <option
                                value="sql"
                                ${
                                    question.language ===
                                    "sql"
                                        ? "selected"
                                        : ""
                                }
                            >
                                SQL
                            </option>


                            <option
                                value="java"
                                ${
                                    question.language ===
                                    "java"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Java
                            </option>


                            <option
                                value="c"
                                ${
                                    question.language ===
                                    "c"
                                        ? "selected"
                                        : ""
                                }
                            >
                                C
                            </option>


                            <option
                                value="cpp"
                                ${
                                    question.language ===
                                    "cpp"
                                        ? "selected"
                                        : ""
                                }
                            >
                                C++
                            </option>


                            <option
                                value="php"
                                ${
                                    question.language ===
                                    "php"
                                        ? "selected"
                                        : ""
                                }
                            >
                                PHP
                            </option>


                            <option
                                value="json"
                                ${
                                    question.language ===
                                    "json"
                                        ? "selected"
                                        : ""
                                }
                            >
                                JSON
                            </option>


                            <option
                                value="bash"
                                ${
                                    question.language ===
                                    "bash"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Bash
                            </option>


                            <option
                                value="markdown"
                                ${
                                    question.language ===
                                    "markdown"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Markdown
                            </option>

                        </select>

                    </div>


                </div>

            `;


            questionsContainer.appendChild(
                card
            );

        }
    );


    attachQuestionEvents();

}


/* ========================================
   QUESTION EVENTS
======================================== */

function attachQuestionEvents() {

    const textInputs =
        document.querySelectorAll(
            ".question-text-input"
        );


    textInputs.forEach(
        function (input) {

            input.addEventListener(
                "input",
                function () {

                    const index =
                        Number(
                            input.dataset.index
                        );


                    questions[index]
                        .question_text =
                        input.value;

                }
            );

        }
    );


    const typeInputs =
        document.querySelectorAll(
            ".answer-type-input"
        );


    typeInputs.forEach(
        function (select) {

            select.addEventListener(
                "change",
                function () {

                    const index =
                        Number(
                            select.dataset.index
                        );


                    questions[index]
                        .answer_type =
                        select.value;


                    if (
                        select.value !==
                        "code"
                    ) {

                        questions[index]
                            .language =
                            "text";

                    }


                    renderQuestions();

                    updateTotalScore();

                }
            );

        }
    );


    const scoreInputs =
        document.querySelectorAll(
            ".question-score-input"
        );


    scoreInputs.forEach(
        function (input) {

            input.addEventListener(
                "input",
                function () {

                    const index =
                        Number(
                            input.dataset.index
                        );


                    let score =
                        Number(
                            input.value
                        );


                    if (
                        !score ||
                        score < 1
                    ) {

                        score = 1;

                    }


                    questions[index]
                        .max_score =
                        score;


                    updateTotalScore();

                }
            );

        }
    );


    const languageInputs =
        document.querySelectorAll(
            ".question-language-input"
        );


    languageInputs.forEach(
        function (select) {

            select.addEventListener(
                "change",
                function () {

                    const index =
                        Number(
                            select.dataset.index
                        );


                    questions[index]
                        .language =
                        select.value;

                }
            );

        }
    );


    const removeButtons =
        document.querySelectorAll(
            ".remove-question-btn"
        );


    removeButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            button.dataset.index
                        );


                    questions.splice(
                        index,
                        1
                    );


                    renumberQuestions();

                    renderQuestions();

                    updateTotalScore();

                }
            );

        }
    );

}


/* ========================================
   RENUMBER QUESTIONS
======================================== */

function renumberQuestions() {

    questions.forEach(
        function (
            question,
            index
        ) {

            question.question_number =
                index + 1;

        }
    );

}


/* ========================================
   UPDATE TOTAL SCORE
======================================== */

function updateTotalScore() {

    let total =
        0;


    questions.forEach(
        function (question) {

            const score =
                Number(
                    question.max_score
                );


            if (
                score > 0
            ) {

                total += score;

            }

        }
    );


    assignmentMaxScore.value =
        total;

}


/* ========================================
   CREATE ASSIGNMENT
======================================== */

assignmentForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!currentModule) {

            assignmentMessage.textContent =
                "Module information is not available.";

            return;
        }


        const title =
            assignmentTitle.value.trim();


        const instructions =
            assignmentInstructions.value.trim();


        const dueDate =
            assignmentDueDate.value;


        /* ====================================
           VALIDATE QUESTIONS
        ==================================== */

        if (
            questions.length === 0
        ) {

            assignmentMessage.textContent =
                "Please add at least one question.";

            return;
        }


        for (
            let i = 0;
            i < questions.length;
            i++
        ) {

            if (
                !questions[i]
                    .question_text
                    .trim()
            ) {

                assignmentMessage.textContent =
                    "Please enter text for Question " +
                    (i + 1) +
                    ".";

                return;
            }


            if (
                !questions[i].max_score ||
                Number(
                    questions[i].max_score
                ) <= 0
            ) {

                assignmentMessage.textContent =
                    "Please enter valid marks for Question " +
                    (i + 1) +
                    ".";

                return;
            }

        }


        const maxScore =
            questions.reduce(
                function (
                    total,
                    question
                ) {

                    return total +
                        Number(
                            question.max_score
                        );

                },
                0
            );


        if (!title) {

            assignmentMessage.textContent =
                "Please enter an assignment title.";

            return;
        }


        if (!instructions) {

            assignmentMessage.textContent =
                "Please enter the assignment instructions.";

            return;
        }


        if (
            maxScore <= 0
        ) {

            assignmentMessage.textContent =
                "The assignment must have a valid total score.";

            return;
        }


        assignmentMessage.textContent =
            "Creating assignment...";


        try {

            /* ====================================
               CREATE ASSIGNMENT
            ==================================== */

            const {
                data: assignment,
                error: assignmentError
            } =
                await supabaseClient
                    .from("assignments")
                    .insert({

                        module_id:
                            currentModule.id,

                        title:
                            title,

                        instructions:
                            instructions,

                        due_date:
                            dueDate
                                ?
                                new Date(
                                    dueDate
                                ).toISOString()
                                :
                                null,

                        max_score:
                            maxScore,

                        created_by:
                            currentUser.id

                    })
                    .select()
                    .single();


            if (assignmentError) {

                console.error(
                    "Assignment creation error:",
                    assignmentError
                );


                assignmentMessage.textContent =
                    "Unable to create the assignment.";

                return;
            }


            /* ====================================
               CREATE QUESTIONS
            ==================================== */

            const questionRows =
                questions.map(
                    function (question) {

                        return {

                            assignment_id:
                                assignment.id,

                            question_number:
                                question.question_number,

                            question_text:
                                question.question_text
                                    .trim(),

                            answer_type:
                                question.answer_type,

                            language:
                                question.answer_type ===
                                "code"
                                    ?
                                    question.language
                                    :
                                    "text",

                            max_score:
                                Number(
                                    question.max_score
                                )

                        };

                    }
                );


            const {
                error: questionError
            } =
                await supabaseClient
                    .from(
                        "assignment_questions"
                    )
                    .insert(
                        questionRows
                    );


            /* ====================================
               IF QUESTION CREATION FAILS
            ==================================== */

            if (questionError) {

                console.error(
                    "Question creation error:",
                    questionError
                );


                /*
                   Delete the parent assignment
                   so we don't leave an empty
                   assignment behind.
                */

                await supabaseClient
                    .from("assignments")
                    .delete()
                    .eq(
                        "id",
                        assignment.id
                    );


                assignmentMessage.textContent =
                    "The assignment could not be saved because the questions could not be created.";

                return;
            }


            /* ====================================
               SUCCESS
            ==================================== */

            assignmentMessage.textContent =
                "Assignment created successfully.";
            assignmentFormDirty = false;


            /*
               Open the assignment details page
               after a short delay.
            */

            setTimeout(
                function () {

                    window.location.href =
                        "assignment.html?id=" +
                        encodeURIComponent(
                            assignment.id
                        );

                },
                700
            );


        } catch (error) {

            console.error(
                "Create assignment error:",
                error
            );


            assignmentMessage.textContent =
                "Something went wrong while creating the assignment.";

        }

    }
);


/* ========================================
   DELETE ASSIGNMENT
======================================== */

async function deleteAssignment(
    assignmentId
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this assignment?"
        );


    if (!confirmed) {

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("assignments")
            .delete()
            .eq(
                "id",
                assignmentId
            );


    if (error) {

        console.error(
            "Delete assignment error:",
            error
        );


        alert(
            "Unable to delete the assignment."
        );

        return;
    }


    await loadAssignments(
        currentModule.id
    );

}


/* ========================================
   LOGOUT
======================================== */

logoutBtn.addEventListener(
    "click",
    async function () {

        await supabaseClient
            .auth
            .signOut();


        window.location.href =
            "../index.html";

    }
);


/* ========================================
   ESCAPE HTML
======================================== */

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