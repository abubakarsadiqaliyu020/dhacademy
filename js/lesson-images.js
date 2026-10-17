/* ==========================================================
   lesson-images.js  —  Development Hub LMS
   Shared helper for images inside lesson content.

   Used by:
     - facilitator/module.js  (upload + edit + preview)
     - the STUDENT lesson viewer (display only)

   Storage model
     Bucket : learning-resources (PRIVATE – never made public)
     Path   : lesson-images/<class_id>/<module_id>/<uuid>.<ext>

   Stored in resources.content (no schema change):
     <img data-lr-path="lesson-images/…/….png" alt="…" data-lr-width="60">
   There is NO src attribute in saved content, so nothing expires.
   A fresh short-lived signed URL is requested whenever a lesson is shown.

   Load order on every page that uses it:
     supabase-js → ../js/supabase.js → DOMPurify → lesson-images.js
   ========================================================== */

(function (global) {
    "use strict";

    const BUCKET = "learning-resources";
    const ROOT_FOLDER = "lesson-images";
    const MAX_BYTES = 5 * 1024 * 1024;          // 5 MB
    const SIGNED_URL_SECONDS = 15 * 60;         // 15 minutes
    const MAX_ALT_LENGTH = 300;

    const MIME_TO_EXT = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp"
    };

    /* Only references of exactly this shape are ever resolved. */
    const PATH_RE =
        /^lesson-images\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}\.(png|jpe?g|gif|webp)$/;

    function client() {
        if (typeof supabaseClient === "undefined" || !supabaseClient) {
            throw new Error("The Supabase client is not available on this page.");
        }
        return supabaseClient;
    }

    function isValidPath(path) {
        return typeof path === "string" && path.length <= 300 && PATH_RE.test(path);
    }

    function cleanWidth(value) {
        const n = parseInt(value, 10);
        if (!Number.isFinite(n)) return null;
        return Math.min(100, Math.max(10, n));
    }

    function cleanAlt(value) {
        return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, MAX_ALT_LENGTH);
    }

    /* ------------------------------------------------------
       FILE VALIDATION (type, size and real file signature)
    ------------------------------------------------------ */

    async function sniffMime(file) {
        const buffer = await new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(reader.error || new Error("read failed")); };
            reader.readAsArrayBuffer(file.slice(0, 12));
        });
        const bytes = new Uint8Array(buffer);
        const ascii = (from, to) => String.fromCharCode.apply(null, bytes.slice(from, to));

        if (bytes.length >= 8 &&
            bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return "image/png";
        }
        if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return "image/jpeg";
        }
        if (bytes.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) {
            return "image/gif";
        }
        if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
            return "image/webp";
        }
        return null;
    }

    async function validateFile(file) {
        if (!file) {
            return { ok: false, message: "No file was selected." };
        }
        if (file.size === 0) {
            return { ok: false, message: "That file is empty." };
        }
        if (file.size > MAX_BYTES) {
            const mb = (file.size / (1024 * 1024)).toFixed(1);
            return { ok: false, message: `That image is ${mb} MB. The maximum allowed size is 5 MB.` };
        }
        if (!MIME_TO_EXT[file.type]) {
            return { ok: false, message: "Unsupported file type. Please choose a PNG, JPG, JPEG, GIF or WebP image." };
        }

        let sniffed = null;
        try {
            sniffed = await sniffMime(file);
        } catch (e) {
            return { ok: false, message: "That file could not be read. Please try again." };
        }
        if (!sniffed || sniffed !== file.type) {
            return { ok: false, message: "That file does not appear to be a genuine PNG, JPG, GIF or WebP image." };
        }

        return { ok: true, mime: sniffed, ext: MIME_TO_EXT[sniffed] };
    }

    /* ------------------------------------------------------
       UPLOAD  (unique name, never overwrites)
    ------------------------------------------------------ */

    function uuid() {
        if (global.crypto && typeof global.crypto.randomUUID === "function") {
            return global.crypto.randomUUID();
        }
        const a = new Uint8Array(16);
        global.crypto.getRandomValues(a);
        return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
    }

    function friendlyUploadError(error) {
        const text = String((error && (error.message || error.error)) || "").toLowerCase();
        const status = Number(error && (error.statusCode || error.status));

        if (status === 401 || text.includes("jwt") || text.includes("not authenticated")) {
            return "Your session has expired. Please log in again, then retry.";
        }
        if (status === 403 || text.includes("row-level security") || text.includes("not authorized") || text.includes("unauthorized")) {
            return "You do not have permission to upload images for this class.";
        }
        if (status === 413 || text.includes("too large") || text.includes("payload")) {
            return "The image is too large for the server. Please choose a smaller file.";
        }
        if (text.includes("failed to fetch") || text.includes("network") || text.includes("load failed")) {
            return "Network error. Please check your connection and try again.";
        }
        if (text.includes("bucket not found")) {
            return "The learning-resources storage bucket could not be found. Please contact the administrator.";
        }
        return "The image could not be uploaded. Please try again.";
    }

    async function uploadImage(file, validated, classId, moduleId) {
        const safeClass = String(classId || "");
        const safeModule = String(moduleId || "");
        const idRe = /^[A-Za-z0-9_-]{1,64}$/;
        if (!idRe.test(safeClass) || !idRe.test(safeModule)) {
            throw new Error("This module cannot accept images (missing class or module information).");
        }

        const path = `${ROOT_FOLDER}/${safeClass}/${safeModule}/${uuid()}.${validated.ext}`;

        let result;
        try {
            result = await client().storage.from(BUCKET).upload(path, file, {
                contentType: validated.mime,
                cacheControl: "3600",
                upsert: false                 // never overwrite an existing object
            });
        } catch (networkError) {
            throw new Error(friendlyUploadError(networkError));
        }

        if (result.error) {
            console.error("Lesson image upload error:", result.error);
            throw new Error(friendlyUploadError(result.error));
        }
        return { path };
    }

    /* ------------------------------------------------------
       SANITIZER SUPPORT
       Anything that uses DOMPurify on lesson content must allow
       the tag/attrs below; the hook enforces the strict rules.
    ------------------------------------------------------ */

    const ALLOWED_TAGS = ["img"];
    const ALLOWED_ATTR = ["alt", "data-lr-path", "data-lr-width"];

    function registerSanitizerHook() {
        if (!global.DOMPurify || global.DOMPurify.__lessonImageHook) return;
        global.DOMPurify.__lessonImageHook = true;

        global.DOMPurify.addHook("afterSanitizeAttributes", function (node) {
            if (!node || !node.tagName) return;

            if (node.tagName !== "IMG") {
                node.removeAttribute("data-lr-path");
                node.removeAttribute("data-lr-width");
                return;
            }

            const path = node.getAttribute("data-lr-path");
            if (!isValidPath(path)) {
                // Not an approved reference to our bucket: drop the element entirely.
                if (node.parentNode) node.parentNode.removeChild(node);
                return;
            }

            // Keep ONLY our own attributes. Never a src, srcset, style, on*, etc.
            Array.from(node.attributes).forEach(function (attr) {
                if (!["data-lr-path", "data-lr-width", "alt"].includes(attr.name)) {
                    node.removeAttribute(attr.name);
                }
            });

            const width = cleanWidth(node.getAttribute("data-lr-width"));
            if (width === null) node.removeAttribute("data-lr-width");
            else node.setAttribute("data-lr-width", String(width));

            node.setAttribute("alt", cleanAlt(node.getAttribute("alt")));
            node.setAttribute("class", "lesson-image");
        });
    }

    registerSanitizerHook();

    /* ------------------------------------------------------
       SIGNED URL RESOLUTION
    ------------------------------------------------------ */

    function applyWidth(img) {
        const width = cleanWidth(img.getAttribute("data-lr-width"));
        img.style.width = width === null ? "" : width + "%";
        img.style.height = "auto";
    }

    function markBroken(img, options, reason) {
        if (options && options.editor) {
            // In the editor keep the element so the reference is not lost on save.
            img.classList.add("lesson-image-missing");
            img.setAttribute("title", reason);
            return;
        }
        const note = document.createElement("span");
        note.className = "lesson-image-unavailable";
        note.setAttribute("role", "img");
        note.setAttribute("aria-label", reason);
        note.textContent = "Image unavailable";
        if (img.parentNode) img.parentNode.replaceChild(note, img);
    }

    async function refreshOne(img, options) {
        const path = img.getAttribute("data-lr-path");
        try {
            const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
            if (error || !data || !data.signedUrl) throw error || new Error("no url");
            img.addEventListener("error", function () {
                markBroken(img, options, "This image could not be loaded.");
            }, { once: true });
            img.src = data.signedUrl;
        } catch (e) {
            markBroken(img, options, "This image could not be loaded.");
        }
    }

    /**
     * Resolve every <img data-lr-path> inside `root` (or `root` itself) to a
     * fresh signed URL. Safe to call repeatedly.
     * options.editor = true keeps broken images in place (facilitator editor).
     */
    async function hydrate(root, options) {
        options = options || {};
        if (!root) return;

        const images = [];
        if (root.matches && root.matches("img[data-lr-path]")) images.push(root);
        if (root.querySelectorAll) {
            root.querySelectorAll("img[data-lr-path]").forEach(function (i) { images.push(i); });
        }
        if (!images.length) return;

        const valid = [];
        images.forEach(function (img) {
            const path = img.getAttribute("data-lr-path");
            if (!isValidPath(path)) {
                markBroken(img, options, "Invalid image reference.");
                return;
            }
            img.setAttribute("loading", "lazy");
            applyWidth(img);
            valid.push(img);
        });
        if (!valid.length) return;

        const paths = Array.from(new Set(valid.map(function (i) { return i.getAttribute("data-lr-path"); })));

        let rows;
        try {
            const { data, error } = await client().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
            if (error) throw error;
            rows = data || [];
        } catch (e) {
            console.error("Lesson image signing error:", e);
            valid.forEach(function (img) { markBroken(img, options, "This image could not be loaded."); });
            return;
        }

        const urlByPath = new Map();
        rows.forEach(function (row) {
            if (row && row.signedUrl && !row.error) urlByPath.set(row.path, row.signedUrl);
        });

        valid.forEach(function (img) {
            const url = urlByPath.get(img.getAttribute("data-lr-path"));
            if (!url) {
                markBroken(img, options, "This image is missing or you do not have access to it.");
                return;
            }
            img.classList.remove("lesson-image-missing");
            img.removeAttribute("title");
            // If the link has expired by the time the browser fetches it, ask once for a new one.
            img.addEventListener("error", function () { refreshOne(img, options); }, { once: true });
            img.src = url;
        });
    }

    /* Signed URL for a single path (used right after upload). */
    async function signedUrl(path) {
        if (!isValidPath(path)) throw new Error("Invalid image reference.");
        const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
        if (error || !data || !data.signedUrl) throw error || new Error("Could not create a signed URL.");
        return data.signedUrl;
    }

    global.LessonImages = {
        BUCKET: BUCKET,
        MAX_BYTES: MAX_BYTES,
        ALLOWED_TAGS: ALLOWED_TAGS,
        ALLOWED_ATTR: ALLOWED_ATTR,
        MAX_ALT_LENGTH: MAX_ALT_LENGTH,
        isValidPath: isValidPath,
        cleanWidth: cleanWidth,
        cleanAlt: cleanAlt,
        validateFile: validateFile,
        uploadImage: uploadImage,
        signedUrl: signedUrl,
        hydrate: hydrate,
        applyWidth: applyWidth,
        registerSanitizerHook: registerSanitizerHook
    };

})(window);