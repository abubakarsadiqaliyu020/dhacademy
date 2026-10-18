// ========================================
// LESSON CONTENT FORMAT
// One renderer shared by the facilitator editor/preview and the
// student module page, so both always show the same thing.
//
// Lessons stay plain text in resources.content. Supported syntax:
//   # Main heading            ## Subheading           ### Small heading
//   - bullet   * bullet       1. numbered item
//   | A | B |                tables (see below)
//   ```lang ... ```           code block (unchanged from before)
//
// Table: a header row followed by a divider row, e.g.
//   | Week | Topic |
//   | --- | --- |
//   | 1 | Intro |
// A divider row on its own FIRST line makes a table with no heading row.
//
// SAFETY: no raw HTML is ever produced from lesson text. Every piece of
// text is escaped, and links/embeds are not supported, so scripts and
// unsafe URLs cannot be injected.
// ========================================

(function (root) {

    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ---------- tables ----------

    function startsWithPipe(line) {
        return typeof line === "string" && line.trim().charAt(0) === "|";
    }

    // Splits "| a | b \| c |" into ["a", "b | c"]
    function splitRow(line) {

        let text = line.trim();

        if (text.charAt(0) === "|") text = text.slice(1);

        const cells = [];
        let current = "";

        for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i);
            if (ch === "\\" && text.charAt(i + 1) === "|") {
                current += "|";
                i++;
            } else if (ch === "|") {
                cells.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }

        // text after the last pipe is a cell only if it has content
        if (current.trim() !== "") cells.push(current.trim());

        return cells;
    }

    function isSeparator(line) {
        if (!startsWithPipe(line)) return false;
        const cells = splitRow(line);
        return cells.length > 0 && cells.every(function (cell) {
            return /^:?-{3,}:?$/.test(cell);
        });
    }

    // Is there a table starting at lines[i]? Returns its description or null.
    function tableAt(lines, i) {

        let hasHeader;
        let first;

        if (startsWithPipe(lines[i]) && !isSeparator(lines[i]) &&
            i + 1 < lines.length && isSeparator(lines[i + 1])) {
            hasHeader = true;
            first = i + 2;
        } else if (isSeparator(lines[i]) && i + 1 < lines.length &&
                   startsWithPipe(lines[i + 1])) {
            hasHeader = false;
            first = i + 1;
        } else {
            return null;
        }

        const rows = [];

        if (hasHeader) rows.push(splitRow(lines[i]));

        let end = first;

        while (end < lines.length && startsWithPipe(lines[end])) {
            rows.push(splitRow(lines[end]));
            end++;
        }

        if (rows.length === 0) return null;

        const width = rows.reduce(function (max, row) {
            return Math.max(max, row.length);
        }, 1);

        rows.forEach(function (row) {
            while (row.length < width) row.push("");
        });

        return { start: i, end: end, hasHeader: hasHeader, rows: rows };
    }

    function serializeTable(rows, hasHeader) {

        const width = rows.reduce(function (max, row) {
            return Math.max(max, row.length);
        }, 1);

        function line(row) {
            const cells = [];
            for (let c = 0; c < width; c++) {
                let cell = String(row[c] === undefined ? "" : row[c])
                    .replace(/\s*\n\s*/g, " ")
                    .trim()
                    .replace(/\|/g, "\\|");
                if (cell.slice(-1) === "\\") cell += " ";
                cells.push(cell);
            }
            return "| " + cells.join(" | ") + " |";
        }

        const divider = "| " + new Array(width).fill("---").join(" | ") + " |";
        const out = [];

        if (hasHeader) {
            out.push(line(rows[0]));
            out.push(divider);
            rows.slice(1).forEach(function (row) { out.push(line(row)); });
        } else {
            out.push(divider);
            rows.forEach(function (row) { out.push(line(row)); });
        }

        return out.join("\n");
    }

    // Finds the table (outside code blocks) that contains character
    // position `pos` of `text`. Returns {start, end, hasHeader, rows}
    // where start/end are character offsets, or null.
    function findTableAt(text, pos) {

        const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
        let offset = 0;
        const offsets = lines.map(function (line) {
            const o = offset;
            offset += line.length + 1;
            return o;
        });

        let cursorLine = 0;
        for (let i = 0; i < lines.length; i++) {
            if (pos >= offsets[i]) cursorLine = i;
        }

        let inFence = false;

        for (let i = 0; i < lines.length; i++) {

            if (/^\s*```/.test(lines[i])) {
                inFence = !inFence;
                continue;
            }

            if (inFence) continue;

            const table = tableAt(lines, i);

            if (!table) continue;

            if (cursorLine >= table.start && cursorLine < table.end) {
                const last = table.end - 1;
                return {
                    start: offsets[table.start],
                    end: offsets[last] + lines[last].length,
                    hasHeader: table.hasHeader,
                    rows: table.rows
                };
            }

            i = table.end - 1;
        }

        return null;
    }

    function tableHtml(table) {

        const rows = table.rows;
        let html = '<div class="lesson-table-wrap"><table class="lesson-table">';
        let body = rows;

        if (table.hasHeader) {
            html += "<thead><tr>" + rows[0].map(function (cell) {
                return '<th scope="col">' + esc(cell) + "</th>";
            }).join("") + "</tr></thead>";
            body = rows.slice(1);
        }

        html += "<tbody>" + body.map(function (row) {
            return "<tr>" + row.map(function (cell) {
                return "<td>" + esc(cell) + "</td>";
            }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";

        return html;
    }

    // ---------- rendering ----------

    var HEADING = /^(#{1,3})[ \t]+(\S.*)$/;
    var BULLET = /^[ \t]*[-*][ \t]+(\S.*)$/;
    var NUMBERED = /^[ \t]*(\d{1,3})[.)][ \t]+(\S.*)$/;

    function renderBlocks(text) {

        const lines = text.split("\n");
        let html = "";
        let paragraph = [];
        let list = null; // { tag, start, items }

        function flushParagraph() {
            if (paragraph.length) {
                html += "<p>" + paragraph.map(esc).join("<br>") + "</p>";
                paragraph = [];
            }
        }

        function flushList() {
            if (list) {
                html += "<" + list.tag +
                    (list.tag === "ol" && list.start !== 1
                        ? ' start="' + list.start + '"' : "") + ">" +
                    list.items.map(function (item) {
                        return "<li>" + esc(item) + "</li>";
                    }).join("") + "</" + list.tag + ">";
                list = null;
            }
        }

        function flushAll() {
            flushParagraph();
            flushList();
        }

        for (let i = 0; i < lines.length; i++) {

            const line = lines[i];

            if (line.trim() === "") {
                flushAll();
                continue;
            }

            const table = tableAt(lines, i);

            if (table) {
                flushAll();
                html += tableHtml(table);
                i = table.end - 1;
                continue;
            }

            let m = HEADING.exec(line);

            if (m) {
                flushAll();
                html += '<h' + (3 + m[1].length) + ' class="lesson-h' + m[1].length +
                    '">' + esc(m[2].trim()) + "</h" + (3 + m[1].length) + ">";
                continue;
            }

            m = BULLET.exec(line);

            if (m) {
                flushParagraph();
                if (!list || list.tag !== "ul") {
                    flushList();
                    list = { tag: "ul", start: 1, items: [] };
                }
                list.items.push(m[1]);
                continue;
            }

            m = NUMBERED.exec(line);

            if (m) {
                flushParagraph();
                if (!list || list.tag !== "ol") {
                    flushList();
                    list = { tag: "ol", start: parseInt(m[1], 10), items: [] };
                }
                list.items.push(m[2]);
                continue;
            }

            flushList();
            paragraph.push(line);
        }

        flushAll();

        return html;
    }

    // options.encodeCode: true  -> data-code is URI-encoded
    //                     false -> data-code is HTML-escaped (default)
    function render(content, options) {

        if (!content) return "";

        const encodeCode = !!(options && options.encodeCode);
        const text = String(content).replace(/\r\n?/g, "\n");
        const fence = /```([\w+#-]*)[ \t]*\n?([\s\S]*?)```/g;

        let html = "";
        let last = 0;
        let match;

        while ((match = fence.exec(text)) !== null) {

            html += renderBlocks(text.slice(last, match.index));

            const language = match[1] || "text";
            const code = match[2];

            html += '<div class="code-block"><div class="code-header">' +
                '<span class="code-language">' + esc(language) + "</span>" +
                '<button type="button" class="copy-code-btn" data-code="' +
                (encodeCode ? encodeURIComponent(code) : esc(code)) +
                '">Copy Code</button></div><pre><code>' + esc(code) +
                "</code></pre></div>";

            last = fence.lastIndex;
        }

        html += renderBlocks(text.slice(last));

        return html;
    }

    root.LessonFormat = {
        render: render,
        splitRow: splitRow,
        serializeTable: serializeTable,
        findTableAt: findTableAt
    };

})(typeof window !== "undefined" ? window : globalThis);
