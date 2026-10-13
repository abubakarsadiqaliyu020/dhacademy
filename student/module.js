console.log("STUDENT MODULE JS LOADED");

let currentUser = null;
let currentModuleId = null;


// ===============================
// START
// ===============================

document.addEventListener("DOMContentLoaded", startModule);


async function startModule() {

    try {

        currentModuleId =
            new URLSearchParams(window.location.search).get("id");

        if (!currentModuleId) {
            showError("Module ID is missing.");
            return;
        }

        // Check login
        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            window.location.href = "../index.html";
            return;
        }

        currentUser = user;


        // Load student profile
        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select("id, full_name, student_id, role, is_active")
            .eq("id", currentUser.id)
            .single();

        if (profileError || !profile) {
            console.error(profileError);
            showError("Unable to load your profile.");
            return;
        }


        if (profile.role !== "student") {
            showError("Only students can access this page.");
            return;
        }


        if (!profile.is_active) {
            showError("Your account has been disabled.");
            return;
        }


        // Load module
        await loadModule();

        // Load materials
        await loadMaterials();

        // Load assignments
        await loadAssignments();

    } catch (error) {

        console.error("Module error:", error);

        showError(
            "Something went wrong while loading this module."
        );
    }
}


// ===============================
// LOAD MODULE
// ===============================

async function loadModule() {

    const {
        data: module,
        error
    } = await supabaseClient
        .from("modules")
        .select(`
            id,
            title,
            description,
            module_number,
            class_id
        `)
        .eq("id", currentModuleId)
        .single();


    if (error || !module) {

        console.error("Module error:", error);

        showError("Unable to load this module.");
        return;
    }


    // Check whether student belongs to this class
    const {
        data: enrollment,
        error: enrollmentError
    } = await supabaseClient
        .from("class_students")
        .select("id")
        .eq("class_id", module.class_id)
        .eq("student_id", currentUser.id)
        .maybeSingle();


    if (enrollmentError) {

        console.error(
            "Enrollment check error:",
            enrollmentError
        );

        showError("Unable to verify your class enrollment.");
        return;
    }


    if (!enrollment) {

        showError(
            "You are not enrolled in this class."
        );

        return;
    }


    document.getElementById("moduleTitle").textContent =
        module.title || "Learning Module";


    document.getElementById("moduleDescription").textContent =
        module.description ||
        "Learning materials and assignments for this module.";


    // Back to class
    const backToClass =
        document.getElementById("backToClass");

    if (backToClass) {

        backToClass.href =
            "class.html?id=" +
            encodeURIComponent(module.class_id);
    }
}


// ===============================
// LOAD MATERIALS
// ===============================

async function loadMaterials() {

    const container =
        document.getElementById("materialsContainer");


    const {
        data: materials,
        error
    } = await supabaseClient
        .from("resources")
        .select(`
            id,
            title,
            description,
            content,
            language,
            material_type,
            created_at
        `)
        .eq("module_id", currentModuleId)
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error("Materials error:", error);

        container.innerHTML = `
            <div class="error-message">
                Unable to load learning materials.
            </div>
        `;

        return;
    }


    if (!materials || materials.length === 0) {

        container.innerHTML = `
            <div class="empty-message">
                No learning materials have been added yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        materials
            .map(material => renderMaterial(material))
            .join("");


    attachCopyButtons();
    if (window.hljs) document.querySelectorAll(".lesson-content pre code").forEach(block => window.hljs.highlightElement(block));
}


// ===============================
// RENDER MATERIAL
// ===============================

function renderMaterial(material) {

    const content =
        material.content || "";


    const renderedContent =
        renderLessonContent(content);


    return `
        <article class="material-card">

            <h3>
                ${escapeHtml(material.title || "Learning Material")}
            </h3>

            ${
                material.description
                    ? `
                        <p class="material-description">
                            ${escapeHtml(material.description)}
                        </p>
                    `
                    : ""
            }

            <div class="lesson-content">
                ${renderedContent}
            </div>

        </article>
    `;
}


// ===============================
// RENDER LESSON CONTENT
// ===============================

function renderLessonContent(content) {
    // New lessons are stored as sanitized HTML; older lessons continue using the legacy text/Markdown renderer.
    if (/<(p|div|h[1-6]|table|ul|ol|pre|blockquote)\b/i.test(content || "")) {
        const safeHtml = window.DOMPurify
            ? DOMPurify.sanitize(content, {ALLOWED_TAGS:["p","br","div","span","b","strong","i","em","u","s","strike","h1","h2","h3","h4","ul","ol","li","table","thead","tbody","tr","th","td","pre","code","blockquote"], ALLOWED_ATTR:["style","colspan","rowspan","class"]})
            : escapeHtml(content);
        const parsed = new DOMParser().parseFromString(safeHtml, "text/html");
        parsed.querySelectorAll(".lesson-code-block").forEach(block => {
            const code = block.querySelector("pre code");
            if (!code) return;
            const language = (code.className.match(/language-([\w+#.-]+)/) || [,"text"])[1];
            const wrapper = parsed.createElement("div");
            wrapper.className = "code-block";
            const header = parsed.createElement("div");
            header.className = "code-header";
            const label = parsed.createElement("span");
            label.className = "code-language";
            label.textContent = language;
            const button = parsed.createElement("button");
            button.type = "button";
            button.className = "copy-code-btn";
            button.textContent = "Copy Code";
            button.setAttribute("data-code", encodeURIComponent(code.textContent || ""));
            header.append(label, button);
            wrapper.append(header, code.parentElement.cloneNode(true));
            block.replaceWith(wrapper);
        });
        return parsed.body.innerHTML;
    }

    const codeFenceRegex =
        /```([a-zA-Z0-9+#.-]*)\n?([\s\S]*?)```/g;


    let html = "";
    let lastIndex = 0;
    let match;


    while ((match = codeFenceRegex.exec(content)) !== null) {

        // Normal text before code
        const normalText =
            content.substring(
                lastIndex,
                match.index
            );


        if (normalText.trim()) {

            html +=
                formatNormalText(normalText);
        }


        const language =
            match[1] || "text";


        const code =
            match[2];


        html += `
            <div class="code-block">

                <div class="code-header">

                    <span class="code-language">
                        ${escapeHtml(language)}
                    </span>

                    <button
                        type="button"
                        class="copy-code-btn"
                        data-code="${escapeAttribute(code)}"
                    >
                        Copy Code
                    </button>

                </div>

                <pre><code>${escapeHtml(code)}</code></pre>

            </div>
        `;


        lastIndex =
            codeFenceRegex.lastIndex;
    }


    // Remaining normal text
    const remainingText =
        content.substring(lastIndex);


    if (remainingText.trim()) {

        html +=
            formatNormalText(remainingText);
    }


    return html;
}


// ===============================
// FORMAT NORMAL TEXT
// ===============================

function formatNormalText(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];
    let tableRows = [];

    function flushParagraph() {
        if (!paragraph.length) return;
        const value = paragraph.join("\n").trim();
        if (value) {
            blocks.push("<p>" + escapeHtml(value).replace(/\n/g, "<br>") + "</p>");
        }
        paragraph = [];
    }

    function flushList() {
        if (!listItems.length || !listType) return;
        const tag = listType === "ol" ? "ol" : "ul";
        blocks.push("<" + tag + ">" + listItems.map(item => "<li>" + escapeHtml(item) + "</li>").join("") + "</" + tag + ">");
        listItems = [];
        listType = null;
    }

    function flushTable() {
        if (!tableRows.length) return;
        const rows = tableRows.slice();
        const isSeparator = row => row.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
        const hasHeader = rows.length > 1 && isSeparator(rows[1]);
        const header = hasHeader ? rows[0] : null;
        const bodyRows = hasHeader ? rows.slice(2) : rows;
        let tableHtml = '<div class="lesson-content-table-wrap"><table class="lesson-content-table">';
        if (header) {
            tableHtml += "<thead><tr>" + header.map(cell => "<th>" + escapeHtml(cell.trim()) + "</th>").join("") + "</tr></thead>";
        }
        tableHtml += "<tbody>" + bodyRows.map(row => "<tr>" + row.map(cell => "<td>" + escapeHtml(cell.trim()) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
        blocks.push(tableHtml);
        tableRows = [];
    }

    function parseTableRow(line) {
        const trimmed = line.trim();
        if (!trimmed.includes("|")) return null;
        const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|");
        return cells.length >= 2 ? cells : null;
    }

    for (const line of lines) {
        const trimmed = line.trim();
        const tableRow = parseTableRow(line);

        if (tableRow) {
            flushParagraph();
            flushList();
            tableRows.push(tableRow);
            continue;
        }
        flushTable();

        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length;
            blocks.push("<h" + level + ">" + escapeHtml(heading[2]) + "</h" + level + ">");
            continue;
        }

        const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
        const numbered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
        if (bullet || numbered) {
            flushParagraph();
            const nextType = numbered ? "ol" : "ul";
            if (listType && listType !== nextType) flushList();
            listType = nextType;
            listItems.push((bullet || numbered)[1]);
            continue;
        }

        flushList();
        paragraph.push(line);
    }

    flushParagraph();
    flushList();
    flushTable();
    return blocks.join("");
}

// ===============================
// COPY CODE
// ===============================

function attachCopyButtons() {

    const buttons =
        document.querySelectorAll(".copy-code-btn");


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            async function () {

                const code =
                    this.getAttribute("data-code") || "";


                try {

                    await navigator.clipboard.writeText(code);

                    const originalText =
                        this.textContent;


                    this.textContent =
                        "Copied!";


                    setTimeout(() => {

                        this.textContent =
                            originalText;

                    }, 1500);

                } catch (error) {

                    console.error(
                        "Copy failed:",
                        error
                    );

                    alert(
                        "Unable to copy the code."
                    );
                }
            }
        );
    });
}


// ===============================
// LOAD ASSIGNMENTS
// ===============================

async function loadAssignments() {

    const container =
        document.getElementById(
            "assignmentsContainer"
        );


    const {
        data: assignments,
        error
    } = await supabaseClient
        .from("assignments")
        .select(`
            id,
            title,
            instructions,
            due_date,
            max_score,
            created_at
        `)
        .eq("module_id", currentModuleId)
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error(
            "Assignments error:",
            error
        );

        container.innerHTML = `
            <div class="error-message">
                Unable to load assignments.
            </div>
        `;

        return;
    }


    if (!assignments || assignments.length === 0) {

        container.innerHTML = `
            <div class="empty-message">
                No assignments have been created yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        assignments
            .map(assignment =>
                renderAssignment(assignment)
            )
            .join("");
}


// ===============================
// RENDER ASSIGNMENT
// ===============================

function renderAssignment(assignment) {

    const dueDate =
        assignment.due_date
            ? new Date(
                assignment.due_date
            ).toLocaleString()
            : "No due date";


    return `
        <article class="assignment-card">

            <h3>
                ${escapeHtml(
                    assignment.title ||
                    "Assignment"
                )}
            </h3>

            ${
                assignment.instructions
                    ? `
                        <p class="assignment-instructions">
                            ${escapeHtml(
                                assignment.instructions
                            )}
                        </p>
                    `
                    : ""
            }

            <div class="assignment-info">

                <span>
                    Maximum Score:
                    ${escapeHtml(
                        String(
                            assignment.max_score || 0
                        )
                    )}
                </span>

                <span>
                    Due:
                    ${escapeHtml(dueDate)}
                </span>

            </div>


            <a
                href="assignment.html?id=${encodeURIComponent(
                    assignment.id
                )}"
                class="assignment-btn"
            >
                Open Assignment
            </a>

        </article>
    `;
}


// ===============================
// LOGOUT
// ===============================

document
    .getElementById("logoutBtn")
    ?.addEventListener(
        "click",
        async function () {

            await supabaseClient.auth.signOut();

            window.location.href =
                "../index.html";
        }
    );


// ===============================
// ERROR MESSAGE
// ===============================

function showError(message) {

    const materials =
        document.getElementById(
            "materialsContainer"
        );

    const assignments =
        document.getElementById(
            "assignmentsContainer"
        );


    if (materials) {

        materials.innerHTML = "";
    }


    if (assignments) {

        assignments.innerHTML = `
            <div class="error-message">
                ${escapeHtml(message)}
            </div>
        `;
    }
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}