# Development Hub LMS

Static site (HTML + CSS + vanilla JS) backed by Supabase. No build step.

## Publish

Upload this folder as-is to any static host (Netlify, Vercel, Cloudflare Pages,
GitHub Pages, cPanel). The entry page is `index.html`.

- Netlify / Cloudflare Pages: drag and drop the folder, or connect the repo.
  Leave build command empty; publish directory is the project root.
- Vercel: framework preset "Other", no build command, output directory `.`

Use HTTPS (all of the above do by default).

## Database (unchanged)

The site expects these existing Supabase objects. Nothing here was renamed.

- Tables: profiles, classes, class_students, modules, resources, assignments,
  assignment_questions, submissions, submission_answers
- RPC: get_login_email, get_assignment_submissions
- Edge functions: create-user, create-facilitator, reset-user-password

## Before going live

1. Row Level Security must be enabled on every table. The role checks in the
   JavaScript only control what is shown; RLS is what actually protects data.
2. Test one account of each role (admin, facilitator, student) on the live URL.
3. `js/supabase.js` holds the publishable key. That key is designed to be
   public. Never put a `service_role` key in any file here.

## Structure

    index.html          login
    admin/              students, facilitators, classes, class details
    facilitator/        classes, modules, resources, assignments, grading
    student/            classes, modules, assignments, results
    js/                 supabase client + login


## Upgrade stage 3 notes

- Added a lightweight lesson-formatting toolbar to the facilitator's existing text-based lesson editor.
- Lesson content can use `# Heading`, `## Subheading`, `- list item`, numbered list syntax, fenced code blocks, and pipe-delimited tables.
- Added a table insertion prompt that creates editable text-table markup in the existing `resources.content` field.
- Updated the student lesson renderer to render headings, lists, and responsive tables using escaped text. This avoids trusting raw HTML from lesson content and requires no database schema change.
- No database tables, columns, stored records, authentication configuration, or RLS policies were changed by this stage.
- This stage has passed JavaScript syntax checks. Live Supabase authorization and browser/device tests still require a connected environment.
