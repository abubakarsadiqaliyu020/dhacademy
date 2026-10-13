const className =
    document.getElementById("className");

const classDescription =
    document.getElementById("classDescription");

const classStatus =
    document.getElementById("classStatus");

const classInfo =
    document.getElementById("classInfo");

const modulesContainer =
    document.getElementById("modulesContainer");

const assignmentsContainer =
    document.getElementById("assignmentsContainer");

const logoutBtn =
    document.getElementById("logoutBtn");


// Get class ID from URL
const urlParams =
    new URLSearchParams(window.location.search);

const classId =
    urlParams.get("id");


// Check student and load class
async function loadStudentClass() {

    // Make sure class ID exists
    if (!classId) {

        className.textContent =
            "Class not found";

        classDescription.textContent =
            "No class was selected.";

        return;
    }


    // Check logged-in user
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();


    if (userError || !user) {

        window.location.href =
            "../index.html";

        return;
    }


    // Get student profile
    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select(
            "full_name, student_id, role, is_active"
        )
        .eq("id", user.id)
        .single();


    if (profileError || !profile) {

        alert("Unable to load your profile.");

        return;
    }


    // Student only
    if (profile.role !== "student") {

        window.location.href =
            "../index.html";

        return;
    }


    // Account active
    if (!profile.is_active) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

        return;
    }


    // Check that this student is actually
    // enrolled in this class
    const {
        data: enrollment,
        error: enrollmentError
    } = await supabaseClient
        .from("class_students")
        .select("id")
        .eq("class_id", classId)
        .eq("student_id", user.id)
        .maybeSingle();


    if (enrollmentError) {

        console.error(
            "Enrollment error:",
            enrollmentError
        );

        className.textContent =
            "Unable to verify class";

        classDescription.textContent =
            "Please try again.";

        return;
    }


    // Prevent students from opening
    // classes they are not enrolled in
    if (!enrollment) {

        className.textContent =
            "Access denied";

        classDescription.textContent =
            "You are not enrolled in this class.";

        modulesContainer.innerHTML = "";

        assignmentsContainer.innerHTML = "";

        return;
    }


    // Load class
    const {
        data: classData,
        error: classError
    } = await supabaseClient
        .from("classes")
        .select(
            "id, name, description, active"
        )
        .eq("id", classId)
        .single();


    if (classError || !classData) {

        console.error(
            "Class error:",
            classError
        );

        className.textContent =
            "Unable to load class";

        return;
    }


    // Display class
    className.textContent =
        classData.name;

    classDescription.textContent =
        classData.description ||
        "No description available.";

    classStatus.textContent =
        classData.active
            ? "Active"
            : "Inactive";

    classStatus.className =
        "status";

    classInfo.textContent =
        "You are enrolled in this class as " +
        profile.full_name +
        " (" +
        profile.student_id +
        ").";


    // Load modules
    await loadModules();

}



// Load modules for this class
async function loadModules() {

    modulesContainer.innerHTML = `
        <div class="card">
            <h3>Loading modules...</h3>
            <p>Please wait.</p>
        </div>
    `;


    const {
        data: modules,
        error
    } = await supabaseClient
        .from("modules")
        .select(
            "id, title, description, module_number"
        )
        .eq("class_id", classId)
        .order(
            "module_number",
            { ascending: true }
        );


    if (error) {

        console.error(
            "Modules error:",
            error
        );

        modulesContainer.innerHTML = `
            <div class="card">
                <h3>Unable to load modules</h3>
                <p>
                    There was a problem loading the modules.
                </p>
            </div>
        `;

        return;
    }


    if (!modules || modules.length === 0) {

        modulesContainer.innerHTML = `
            <div class="card">
                <h3>No modules yet</h3>
                <p>
                    Your facilitator has not created
                    any modules for this class yet.
                </p>
            </div>
        `;

        return;
    }


    modulesContainer.innerHTML = "";


    modules.forEach(function (module) {

        const card =
            document.createElement("div");

        card.className = "card";


        card.innerHTML = `
            <h3>
                Module ${module.module_number}:
                ${escapeHtml(module.title)}
            </h3>

            <p>
                ${escapeHtml(
                    module.description ||
                    "No module description available."
                )}
            </p>

            <a
                href="module.html?id=${encodeURIComponent(module.id)}"
                class="open-btn"
            >
                Open Module
            </a>
        `;


        modulesContainer.appendChild(card);

    });

}



// Escape HTML
function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}



// Logout
logoutBtn.addEventListener(
    "click",
    async function () {

        const { error } =
            await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
                error
            );

            alert(
                "Unable to logout. Please try again."
            );

            return;
        }


        window.location.href =
            "../index.html";

    }
);


// Start
loadStudentClass();
