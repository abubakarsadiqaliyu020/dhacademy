// ========================================
// STUDENT ASSIGNMENT ACCORDION
// Shared by dashboard.html and module.html.
// Everything shown is data that was already loaded, so opening and
// closing an assignment never makes a network request.
// ========================================

function accEscape(value) {
    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function accFormatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "" : date.toLocaleString();
}


// Works out what the student is allowed to see for one assignment.
// Marks and feedback are only ever read when the saved status is "marked".
function accStatusInfo(submission, statusKnown) {

    if (statusKnown === false) {
        return { label: "", css: "", marked: false };
    }

    if (!submission) {
        return { label: "Not Submitted", css: "not-submitted", marked: false };
    }

    const raw = String(submission.status || "submitted").toLowerCase();

    if (raw === "marked") {
        return { label: "Marked", css: "marked", marked: true };
    }

    if (raw === "submitted") {
        return { label: "Submitted", css: "submitted", marked: false };
    }

    return {
        label: raw.charAt(0).toUpperCase() + raw.slice(1),
        css: "submitted",
        marked: false
    };
}


// options: { statusKnown: boolean, level: heading level (default 4) }
function accItemHtml(assignment, submission, options) {

    const opts = options || {};
    const level = opts.level || 4;
    const info = accStatusInfo(submission, opts.statusKnown);
    const id = accEscape(assignment.id);
    const maximum = Number(assignment.max_score) || 0;

    let score = null;
    let percentage = "";

    if (info.marked) {
        score = Number(submission.score) || 0;
        if (maximum > 0) {
            percentage = " (" + (Math.round((score / maximum) * 1000) / 10) + "%)";
        }
    }

    const facts = [];

    facts.push(["Maximum score", String(maximum)]);

    if (info.marked) {
        facts.push(["Your score", score + " / " + maximum + percentage]);
    }

    if (assignment.due_date) {
        facts.push(["Due", accFormatDate(assignment.due_date)]);
    }

    if (submission && submission.submitted_at) {
        facts.push(["Submitted", accFormatDate(submission.submitted_at)]);
    }

    if (info.marked && submission.marked_at) {
        facts.push(["Marked on", accFormatDate(submission.marked_at)]);
    }

    const factsHtml = facts.map(function (fact) {
        return '<div><dt>' + accEscape(fact[0]) + '</dt><dd>' +
            accEscape(fact[1]) + '</dd></div>';
    }).join("");

    const feedbackHtml = info.marked
        ? '<div class="acc-feedback"><strong>Feedback</strong><p>' +
            accEscape(
                submission.feedback && String(submission.feedback).trim()
                    ? submission.feedback
                    : "No feedback was added."
            ) + '</p></div>'
        : "";

    const linkText = info.marked
        ? "View Result"
        : submission && info.label
            ? "View Submission"
            : "Open Assignment";

    return '' +
        '<div class="acc-item">' +
            '<h' + level + ' class="acc-heading">' +
                '<button type="button" class="acc-trigger" id="acc-btn-' + id + '"' +
                    ' aria-expanded="false" aria-controls="acc-panel-' + id + '">' +
                    '<span class="acc-title">' +
                        accEscape(assignment.title || "Assignment") +
                    '</span>' +
                    '<span class="acc-meta">' +
                        (info.label
                            ? '<span class="acc-badge ' + info.css + '">' + info.label + '</span>'
                            : "") +
                        (info.marked
                            ? '<span class="acc-score">' + score + '/' + maximum + '</span>'
                            : "") +
                    '</span>' +
                    '<span class="acc-chevron" aria-hidden="true"></span>' +
                '</button>' +
            '</h' + level + '>' +
            '<div class="acc-panel" id="acc-panel-' + id + '" role="region"' +
                ' aria-labelledby="acc-btn-' + id + '" hidden>' +
                (assignment.instructions
                    ? '<p class="acc-instructions">' +
                        accEscape(assignment.instructions) + '</p>'
                    : '<p class="acc-instructions acc-muted">No instructions provided.</p>') +
                '<dl class="acc-facts">' + factsHtml + '</dl>' +
                feedbackHtml +
                '<a class="acc-link" href="assignment.html?id=' +
                    encodeURIComponent(assignment.id) + '">' + linkText + '</a>' +
            '</div>' +
        '</div>';
}


// One assignment open at a time inside the given container.
function initAccordion(root) {

    if (!root || root.dataset.accordionReady) return;

    root.dataset.accordionReady = "true";

    function setOpen(trigger, open) {
        const panel = document.getElementById(
            trigger.getAttribute("aria-controls")
        );
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (panel) panel.hidden = !open;
    }

    root.addEventListener("click", function (event) {

        const trigger = event.target.closest(".acc-trigger");

        if (!trigger || !root.contains(trigger)) return;

        const wasOpen = trigger.getAttribute("aria-expanded") === "true";

        root.querySelectorAll('.acc-trigger[aria-expanded="true"]')
            .forEach(function (other) {
                setOpen(other, false);
            });

        if (!wasOpen) setOpen(trigger, true);
    });
}
