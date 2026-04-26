# SiteTrack - Construction Site Daily Tracker

SiteTrack is a beginner-friendly full-stack web application built with HTML, CSS, JavaScript, Node.js, Express, MongoDB, Mongoose, and Fetch API.

## Main Features

- Landing page for the website
- Create a new construction project
- Register one Builder, Manager, and Admin account for each project
- Select a project from the login page and sign in by role
- Builder can submit daily site updates
- Manager and Admin can view dashboard, reports, progress, and all updates
- Admin can delete records and view project accounts
- Upload optional site photos
- Export CSV and print reports

## Folder Structure

```text
construction-tracker/
  server.js
  models/
    Project.js
    Update.js
  routes/
    updates.js
  public/
    landing.html
    login.html
    index.html
    css/
      landing.css
      login.css
      style.css
    js/
      landing.js
      login.js
      app.js
```

## Syllabus Concepts Used

- HTML document structure, forms, semantic sections
- CSS layout, responsive design, cards, buttons, and themes
- JavaScript variables, functions, arrays, objects, events, and DOM manipulation
- Fetch API with async and await
- Express routes and middleware
- MongoDB CRUD using Mongoose models
- File upload using Multer

## How to Run

```bash
npm install
$env:MONGODB_URI="your_mongodb_connection_string"
npm start
```

Open:

```text
http://localhost:4001
```

## Deploy on Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. In Vercel project settings, add environment variable:

  - `MONGODB_URI` = your MongoDB connection string

4. Deploy.

This repository includes `vercel.json` so all routes are served through the Express app.

### Important Note About Uploads on Vercel

Uploaded images are written to `/tmp/uploads` on Vercel, which is temporary storage. Files can disappear between invocations or deployments.

For production-grade uploads, use persistent object storage such as Cloudinary, AWS S3, or Vercel Blob.

## Simple Workflow

1. Open the landing page.
2. Click `New project`.
3. Enter project details and create Builder, Manager, and Admin accounts.
4. Go to sign in.
5. Select the project, select the role, and enter that account's username/password.
6. Submit and view construction updates.

## API Endpoints

| Method | URL | Description |
| --- | --- | --- |
| GET | /projects | Get active projects for login dropdown |
| POST | /projects | Create a project with three role accounts |
| POST | /login | Login by project, role, username, and password |
| GET | /project-users | Get accounts for one project |
| POST | /add-update | Add daily site update |
| GET | /updates | Get updates for one project |
| PUT | /update/:id | Edit an update |
| DELETE | /update/:id | Delete an update |
| GET | /site-progress | Latest progress per site |

Note: Passwords are stored plainly here to keep the project within basic syllabus scope. For a real production app, use password hashing and sessions or JWT.
