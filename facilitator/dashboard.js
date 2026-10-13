const welcomeMessage =
    document.getElementById("welcomeMessage");

const facilitatorInfo =
    document.getElementById("facilitatorInfo");

const classesContainer =
    document.getElementById("classesContainer");

const logoutBtn =
    document.getElementById("logoutBtn");


let currentUser = null;


/* =========================
   CHECK FACILITATOR
========================= */

async function checkFacilitator() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "../index.html";

        return false;
    }


    currentUser = user;


    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "full_name, student_id, role, is_active"
            )
            .eq("id", user.id)
            .single();


    if (
        profileError ||
        !profile
    ) {

        console.error(
            "Profile error:",
            profileError
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

        return false;
    }


    if (
        profile.role !== "facilitator"
    ) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

        return false;
    }


    if (!profile.is_active) {

        await supabaseClient.auth.signOut();

        alert(
            "Your facilitator account has been disabled."
        );

        window.location.href =
            "../index.html";

        return false;
    }


    welcomeMessage.textContent =
        "Welcome, " +
        (profile.full_name || "Facilitator");


    facilitatorInfo.textContent =
        "Login ID: " +
        (profile.student_id || "-");


    return true;
}


/* =========================
   LOAD MY CLASSES
========================= */

async function loadMyClasses() {

    classesContainer.innerHTML = `
        <div class="loading-card">
            Loading your classes...
        </div>
    `;


    const {
        data: classes,
        error
    } =
        await supabaseClient
            .from("classes")
            .select(
                "id, name, description, active"
            )
            .eq(
                "facilitator_id",
                currentUser.id
            )
            .order(
                "name"
            );


    if (error) {

        console.error(
            "Classes loading error:",
            error
        );


        classesContainer.innerHTML = `
            <div class="error-card">
                Unable to load your classes.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }


    if (
        !classes ||
        classes.length === 0
    ) {

        classesContainer.innerHTML = `
            <div class="empty-card">
                No class has been assigned to you yet.
            </div>
        `;

        return;
    }


    classesContainer.innerHTML = "";

    // One lightweight query for all assigned classes instead of one query per class.
    const classIds = new Set(classes.map(function (item) { return String(item.id); }));
    const studentCounts = Object.create(null);
    classes.forEach(function (item) { studentCounts[String(item.id)] = 0; });

    const { data: enrolments, error: enrolmentError } = await supabaseClient
        .from("class_students")
        .select("class_id, student_id")
        .in("class_id", Array.from(classIds));

    if (enrolmentError) {
        console.error("Student count error:", enrolmentError);
        classesContainer.innerHTML = `
            <div class="error-card">
                Your classes loaded, but student counts could not be retrieved.
                Please refresh the page or contact the administrator.
            </div>
        `;
        return;
    }

    const seenEnrollments = new Set();
    (enrolments || []).forEach(function (enrolment) {
        const id = String(enrolment.class_id);
        const studentId = String(enrolment.student_id);
        const uniqueKey = id + "::" + studentId;
        if (Object.prototype.hasOwnProperty.call(studentCounts, id) && !seenEnrollments.has(uniqueKey)) {
            seenEnrollments.add(uniqueKey);
            studentCounts[id] += 1;
        }
    });

    for (const classItem of classes) {
        const studentCount = studentCounts[String(classItem.id)] || 0;
        const card = document.createElement("div");

        card.className =
            "class-card";


        card.innerHTML = `

            <h3>
                ${escapeHtml(
                    classItem.name
                )}
            </h3>

            <p>
                ${escapeHtml(
                    classItem.description ||
                    "No description provided."
                )}
            </p>

            <div class="student-count">

                Students:
                ${studentCount}

            </div>

            <a
                class="manage-btn"
                href="class.html?id=${encodeURIComponent(classItem.id)}"
            >
                Open Class
            </a>

        `;


        classesContainer.appendChild(
            card
        );
    }
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

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
   LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";
    }
);


/* =========================
   START
========================= */

async function startPage() {

    const isFacilitator =
        await checkFacilitator();


    if (!isFacilitator) {
        return;
    }


    await loadMyClasses();
}


startPage();