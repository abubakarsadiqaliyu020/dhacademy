// Labels each table cell with its column heading so the stacked phone
// layout (css/responsive-table.css) can show "Heading: value" rows.
// Re-labels automatically when a page re-renders its rows.
(function () {

    function label(table) {

        const heads = Array.prototype.map.call(
            table.querySelectorAll("thead th"),
            function (th) { return th.textContent.trim(); }
        );

        table.querySelectorAll("tbody tr").forEach(function (row) {

            if (row.querySelector("td[colspan]")) return;

            Array.prototype.forEach.call(row.children, function (cell, i) {
                if (cell.tagName === "TD" && heads[i] && cell.dataset.label !== heads[i]) {
                    cell.dataset.label = heads[i];
                }
            });
        });
    }

    function init() {
        document.querySelectorAll("table.stack-mobile").forEach(function (table) {
            label(table);
            new MutationObserver(function () { label(table); })
                .observe(table, { childList: true, subtree: true });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
