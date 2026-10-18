// ========================================
// LESSON CONTENT EDITOR
// Formatting toolbar, table builder and student preview for the
// "Lesson Content" box. Content is still plain text (see
// js/lesson-format.js for the syntax), so nothing about how lessons
// are stored changes.
// ========================================

(function () {

    const LF = window.LessonFormat;
    const ta = document.getElementById("materialContent");
    const toolbar = document.getElementById("editorToolbar");

    if (!LF || !ta || !toolbar) return;

    const builder = document.getElementById("tableBuilder");
    const builderTitle = document.getElementById("tbTitle");
    const tbRows = document.getElementById("tbRows");
    const tbCols = document.getElementById("tbCols");
    const tbHeader = document.getElementById("tbHeader");
    const tbGrid = document.getElementById("tbGrid");
    const tbMessage = document.getElementById("tbMessage");
    const tbScrollHint = document.getElementById("tbScrollHint");
    const tbApply = document.getElementById("tbApply");
    const tbCancel = document.getElementById("tbCancel");
    const insertTableBtn = document.getElementById("insertTableBtn");
    const editTableBtn = document.getElementById("editTableBtn");
    const previewBtn = document.getElementById("previewBtn");
    const preview = document.getElementById("contentPreview");
    const languageSelect = document.getElementById("materialLanguage");

    const DEFAULT_MAX_ROWS = 30;
    const DEFAULT_MAX_COLS = 8;

    let maxRows = DEFAULT_MAX_ROWS;
    let maxCols = DEFAULT_MAX_COLS;
    let editRange = null; // {start, end} while editing an existing table
    let previewing = false;


    // ---------- text helpers ----------

    // Replaces a range, using the browser's own insert so Undo keeps working.
    function replaceRange(start, end, text) {

        const before = ta.value;
        const expected = before.slice(0, start) + text + before.slice(end);

        ta.focus();
        ta.setSelectionRange(start, end);

        let done = false;

        try {
            done = !!(document.execCommand &&
                document.execCommand("insertText", false, text));
        } catch (error) {
            done = false;
        }

        if (!done || ta.value !== expected) {
            ta.value = expected;
            ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    function selectedLines() {

        const value = ta.value;
        const s = ta.selectionStart;
        const e = ta.selectionEnd;

        const start = s === 0 ? 0 : value.lastIndexOf("\n", s - 1) + 1;
        const ref = e > s && value.charAt(e - 1) === "\n" ? e - 1 : e;

        let end = value.indexOf("\n", ref);
        if (end === -1) end = value.length;

        return { start: start, end: end };
    }

    const HEAD = /^#{1,3}[ \t]+/;
    const BULLET = /^[ \t]*[-*][ \t]+/;
    const NUMBER = /^[ \t]*\d{1,3}[.)][ \t]+/;

    function stripPrefix(line) {
        if (HEAD.test(line)) return line.replace(HEAD, "");
        if (BULLET.test(line)) return line.replace(BULLET, "");
        if (NUMBER.test(line)) return line.replace(NUMBER, "");
        return line;
    }

    // kind: h1 | h2 | ul | ol. Applying the same format again removes it.
    function formatLines(kind) {

        const range = selectedLines();
        const hadSelection = ta.selectionStart !== ta.selectionEnd;
        const lines = ta.value.slice(range.start, range.end).split("\n");

        const tests = {
            h1: /^#[ \t]+/,
            h2: /^##[ \t]+/,
            ul: BULLET,
            ol: NUMBER
        };

        function prefix(n) {
            return kind === "h1" ? "# "
                : kind === "h2" ? "## "
                : kind === "ul" ? "- "
                : (n + 1) + ". ";
        }

        const filled = lines.filter(function (l) { return l.trim() !== ""; });
        let result;

        if (filled.length === 0) {
            result = [prefix(0)];
        } else if (filled.every(function (l) { return tests[kind].test(l); })) {
            result = lines.map(stripPrefix);
        } else {
            let n = 0;
            result = lines.map(function (l) {
                if (l.trim() === "") return l;
                return prefix(n++) + stripPrefix(l);
            });
        }

        const text = result.join("\n");

        replaceRange(range.start, range.end, text);

        if (hadSelection) {
            ta.setSelectionRange(range.start, range.start + text.length);
        } else {
            ta.setSelectionRange(range.start + text.length, range.start + text.length);
        }

        afterChange();
    }

    function insertCodeBlock() {

        const value = ta.value;
        const s = ta.selectionStart;
        const e = ta.selectionEnd;
        const chosen = value.slice(s, e);

        let tag = languageSelect ? String(languageSelect.value || "") : "";
        tag = tag === "text" ? "" : tag.replace(/[^\w+#-]/g, "");

        const pre = s === 0 || value.charAt(s - 1) === "\n" ? "" : "\n";
        const post = e >= value.length || value.charAt(e) === "\n" ? "" : "\n";
        const head = pre + "```" + tag + "\n";
        const text = head + chosen + "\n```" + post;

        replaceRange(s, e, text);

        const caret = chosen ? s + text.length : s + head.length;
        ta.setSelectionRange(caret, caret);

        afterChange();
    }


    // ---------- table builder ----------

    function gridValues() {
        return Array.prototype.map.call(tbGrid.rows, function (row) {
            return Array.prototype.map.call(row.cells, function (cell) {
                return cell.firstChild.value;
            });
        });
    }

    function clamp(input, max) {
        let n = parseInt(input.value, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > max) n = max;
        input.value = n;
        return n;
    }

    function labelCells() {
        tbGrid.classList.toggle("has-header", tbHeader.checked);
        Array.prototype.forEach.call(tbGrid.rows, function (row, r) {
            Array.prototype.forEach.call(row.cells, function (cell, c) {
                cell.firstChild.setAttribute(
                    "aria-label",
                    "Row " + (r + 1) + ", column " + (c + 1) +
                        (r === 0 && tbHeader.checked ? " (heading)" : "")
                );
            });
        });
    }

    // Shows a hint only when the grid is wider than its box (phones).
    function updateScrollHint() {
        const wrap = tbGrid.parentNode;
        tbScrollHint.hidden = builder.hidden || !(wrap.scrollWidth > wrap.clientWidth + 1);
    }

    function buildGrid(rows, cols, values) {

        tbGrid.innerHTML = "";

        for (let r = 0; r < rows; r++) {

            const tr = tbGrid.insertRow();

            for (let c = 0; c < cols; c++) {
                const input = document.createElement("input");
                input.type = "text";
                input.maxLength = 200;
                input.autocomplete = "off";
                input.value = values && values[r] && values[r][c] ? values[r][c] : "";
                tr.insertCell().appendChild(input);
            }
        }

        labelCells();

        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(updateScrollHint);
        }
    }

    // Only rebuilds when the size really changed. Rebuilding replaces every
    // cell, so doing it needlessly (e.g. when the Rows box loses focus because
    // the user tapped a cell) would destroy the cell they just selected.
    function resizeGrid() {

        const rows = clamp(tbRows, maxRows);
        const cols = clamp(tbCols, maxCols);
        const currentCols = tbGrid.rows.length ? tbGrid.rows[0].cells.length : 0;

        if (rows === tbGrid.rows.length && cols === currentCols) return;

        buildGrid(rows, cols, gridValues());
    }

    function openBuilder(existing) {

        tbMessage.textContent = "";

        if (existing) {
            editRange = { start: existing.start, end: existing.end };
            maxRows = Math.max(DEFAULT_MAX_ROWS, existing.rows.length);
            maxCols = Math.max(DEFAULT_MAX_COLS, existing.rows[0].length);
            tbRows.value = existing.rows.length;
            tbCols.value = existing.rows[0].length;
            tbHeader.checked = existing.hasHeader;
            builderTitle.textContent = "Edit table";
            tbApply.textContent = "Update table";
            buildGrid(existing.rows.length, existing.rows[0].length, existing.rows);
        } else {
            editRange = null;
            maxRows = DEFAULT_MAX_ROWS;
            maxCols = DEFAULT_MAX_COLS;
            tbRows.value = 3;
            tbCols.value = 3;
            tbHeader.checked = true;
            builderTitle.textContent = "Insert table";
            tbApply.textContent = "Insert table";
            buildGrid(3, 3, null);
        }

        tbRows.max = maxRows;
        tbCols.max = maxCols;
        builder.hidden = false;
        updateScrollHint();

        const first = tbGrid.querySelector("input");
        if (first) first.focus();

        if (builder.scrollIntoView) builder.scrollIntoView({ block: "nearest" });
    }

    function closeBuilder() {
        builder.hidden = true;
        editRange = null;
        tbMessage.textContent = "";
    }

    function applyTable() {

        const rows = gridValues();
        const hasHeader = tbHeader.checked;

        const anyText = rows.some(function (row) {
            return row.some(function (cell) { return cell.trim() !== ""; });
        });

        if (!anyText) {
            tbMessage.textContent = "Type something into at least one cell.";
            return;
        }

        if (hasHeader && rows[0].every(function (cell) { return cell.trim() === ""; })) {
            tbMessage.textContent =
                "Add column headings, or untick \"First row is a heading row\".";
            return;
        }

        const table = LF.serializeTable(rows, hasHeader);

        if (editRange) {

            replaceRange(editRange.start, editRange.end, table);

            const caret = editRange.start + table.length;
            ta.setSelectionRange(caret, caret);

        } else {

            const value = ta.value;
            const pos = ta.selectionEnd;
            const before = value.slice(0, pos);
            const after = value.slice(pos);

            const lead = before === "" || before.endsWith("\n\n") ? ""
                : before.endsWith("\n") ? "\n" : "\n\n";
            const tail = after === "" ? "\n"
                : after.startsWith("\n\n") ? ""
                : after.startsWith("\n") ? "\n" : "\n\n";

            const text = lead + table + tail;

            replaceRange(pos, pos, text);
            ta.setSelectionRange(pos + text.length, pos + text.length);
        }

        closeBuilder();
        afterChange();
        ta.focus();
    }


    // ---------- preview ----------

    function renderPreview() {
        const html = LF.render(ta.value, { encodeCode: true });
        preview.innerHTML = html ||
            '<p class="empty-preview">Nothing to preview yet.</p>';
    }

    function setPreview(on, keepFocus) {

        previewing = on;
        previewBtn.setAttribute("aria-pressed", on ? "true" : "false");
        previewBtn.textContent = on ? "Back to editing" : "Preview";
        ta.hidden = on;
        preview.hidden = !on;

        Array.prototype.forEach.call(
            toolbar.querySelectorAll("button"),
            function (button) {
                if (button !== previewBtn) button.disabled = on;
            }
        );

        if (on) {
            closeBuilder();
            renderPreview();
        } else if (!keepFocus) {
            ta.focus();
        }

        refreshEditButton();
    }


    // ---------- toolbar state ----------

    function refreshEditButton() {

        if (previewing) {
            editTableBtn.hidden = true;
            return;
        }

        editTableBtn.hidden = !LF.findTableAt(ta.value, ta.selectionStart);
    }

    function afterChange() {
        refreshEditButton();
    }


    // ---------- events ----------

    toolbar.addEventListener("click", function (event) {

        const button = event.target.closest("button");

        if (!button || !toolbar.contains(button) || button.disabled) return;

        const kind = button.getAttribute("data-fmt");

        if (kind === "code") {
            insertCodeBlock();
        } else if (kind) {
            formatLines(kind);
        }
    });

    insertTableBtn.addEventListener("click", function () {
        openBuilder(null);
    });

    editTableBtn.addEventListener("click", function () {

        const found = LF.findTableAt(ta.value, ta.selectionStart);

        if (found) openBuilder(found);
    });

    previewBtn.addEventListener("click", function () {
        setPreview(!previewing);
    });

    tbRows.addEventListener("change", resizeGrid);
    tbCols.addEventListener("change", resizeGrid);
    tbHeader.addEventListener("change", labelCells);
    window.addEventListener("resize", updateScrollHint);
    tbApply.addEventListener("click", applyTable);
    tbCancel.addEventListener("click", function () {
        closeBuilder();
        insertTableBtn.focus();
    });

    // The builder sits inside the material form: Enter must never submit
    // (and so save) the lesson. In a cell, Enter moves to the cell below.
    builder.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            event.stopPropagation();
            closeBuilder();
            insertTableBtn.focus();
            return;
        }

        if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;

        event.preventDefault();

        const cell = event.target.parentNode;

        if (cell && cell.tagName === "TD") {
            const nextRow = cell.parentNode.nextElementSibling;
            const target = nextRow && nextRow.cells[cell.cellIndex];
            if (target) {
                target.firstChild.focus();
            } else {
                tbApply.focus();
            }
        } else if (event.target === tbRows || event.target === tbCols) {
            resizeGrid();
        }
    });

    ["keyup", "click", "input", "focus", "select"].forEach(function (name) {
        ta.addEventListener(name, refreshEditButton);
    });

    document.addEventListener("selectionchange", function () {
        if (document.activeElement === ta) refreshEditButton();
    });


    // Called by module.js whenever the material form is opened or closed.
    window.ContentEditor = {
        reset: function () {
            closeBuilder();
            if (previewing) setPreview(false, true);
            refreshEditButton();
        },
        refresh: refreshEditButton
    };

})();
