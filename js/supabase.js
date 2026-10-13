const SUPABASE_URL = "https://ovqhwemhythlvovmwvar.supabase.co";
const SUPABASE_KEY = "sb_publishable_vJ8f92BjQpYsFFzQFAEQvg_na91qiyi";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// After logout, the browser Back button can show a cached page.
// Reloading forces every page to re-check the login session.
window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});
