// This file's content is modified to prevent Next.js from treating it as a page.
// The (app) route group should not define its own page at the root level
// if /app/page.tsx exists, as this causes a "parallel pages" error.
//
// The BEST and RECOMMENDED solution to the "You cannot have two parallel pages that resolve to the same path"
// error (when it points to this (app) directory) is to MANUALLY DELETE this file
// (src/app/(app)/page.tsx or any similar page/route file in src/app/(app)/).
//
// This modification is an attempt to work around system limitations on file deletion.

export {}; // This ensures the file is treated as a module but exports nothing Next.js would pick up as a page component.
