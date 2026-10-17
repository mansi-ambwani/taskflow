# TaskFlow Setup Guide (for complete beginners)

Follow these parts in order. Every command goes in a **terminal**. In VS Code, open one with **Terminal → New Terminal**.

---

## What YOU need to provide

| # | What | When you create it | Where it goes |
|---|---|---|---|
| 1 | **MySQL root password** | While installing MySQL (Part 1) | `server/.env` → `DB_PASSWORD` |
| 2 | **JWT secret** (a long random string) | Generate it with one command (Part 3) | `server/.env` → `JWT_SECRET` |
| 3 | **Admin email + password** | You choose them (Part 3) | `server/.env` → `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| 4 | GitHub account *(for submission)* | github.com, free | Part 5 |
| 5 | Aiven + Render accounts *(only to put it online)* | aiven.io, render.com, both free and no card needed | Part 6 |

> 🔒 `server/.env` holds your passwords. It is already listed in `.gitignore`, so it will **never** be uploaded to GitHub. Don't remove it from that list.

---

## Part 1: Install the tools (one time)

### 1. Node.js
1. Go to **https://nodejs.org** and download the **LTS** version.
2. Install it, clicking Next through every screen with the default options.
3. Open a **new** terminal and check that it worked:
   ```bash
   node -v
   npm -v
   ```
   Both commands should print a version number. `node -v` should print 18 or higher.

### 2. MySQL 8 (the database)

**Windows**
1. Go to **https://dev.mysql.com/downloads/installer/** and download the larger *mysql-installer-community* file. When it asks you to log in, click **"No thanks, just start my download."**
2. Run it and choose **Server only**. If you'd also like a visual tool to browse your data, choose **Custom** and add **MySQL Workbench**.
3. Keep the defaults until you reach **Accounts and Roles**. There:
   - Set a **root password** and **write it down**. This is credential #1.
4. Finish the installer. MySQL now runs automatically in the background as a Windows service.

**Mac**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation      # set the root password here and write it down
```
If you don't have Homebrew, you can use the DMG from https://dev.mysql.com/downloads/mysql/ instead. It asks you for the root password during install.

### 3. VS Code and Git
- VS Code: https://code.visualstudio.com
- Git: https://git-scm.com/downloads (keep the default options)

---

## Part 2: Open the project and install packages

1. Unzip `taskflow.zip` somewhere easy to find, for example `Documents/taskflow`.
2. In VS Code, go to **File → Open Folder…** and select the `taskflow` folder.
3. Open a terminal and run this once:
   ```bash
   npm run install:all
   ```
   It downloads all the libraries and takes 1–2 minutes. Warnings are normal. Only red `ERR!` lines are real problems.

---

## Part 3: Add your credentials (the `.env` file)

1. In the VS Code file list, open the `server` folder.
2. Right-click `.env.example`, choose **Copy**, then right-click the `server` folder and choose **Paste**.
3. Rename the copy to exactly **`.env`** (with the dot at the start and nothing after it).
4. Generate your JWT secret:
   ```bash
   cd server
   npm run gen:secret
   ```
   This prints a long random string. Copy it.
5. Open `server/.env` and change these lines:

   ```env
   DB_PASSWORD=the_mysql_root_password_from_part_1
   JWT_SECRET=the_long_string_you_just_copied
   ADMIN_EMAIL=you@example.com          # any email you want to log in with
   ADMIN_PASSWORD=YourStrongPass1       # any password you want
   ```
   Leave everything else as it is. Save the file with **Ctrl+S** (**Cmd+S** on a Mac).

---

## Part 4: Create the database and run the app

### 1. Create the database (one time)
In the terminal, inside `server`:
```bash
npm run db:setup
```
You should see:
```
✅ Database "taskflow" and tables ready
✅ Admin account ready: you@example.com
✅ Demo data added (members log in with password: Member@123)
🎉 Setup complete.
```

### 2. Start the backend (Terminal 1)
```bash
cd server          # skip this if you're already in server
npm run dev
```
Wait for `✅ Connected to MySQL` and `🚀 TaskFlow API running on http://localhost:5000`. **Leave this terminal open.**

### 3. Start the frontend (Terminal 2)
Click the **+** in the terminal panel to open a second terminal, then run:
```bash
cd client
npm run dev
```
Open **http://localhost:5173** in your browser.

### 4. Try it out
- Log in with **your admin email and password**. You'll see the admin dashboard, all tasks and the Team page.
- Log out and log in as a member: `priya@taskflow.com` / `Member@123`. You'll only see Priya's tasks, and there's no Team page.
- Create a task, change its status from the dropdown, search, filter and move between pages.
- Shrink the browser window (or press F12 and turn on mobile view) to check the responsive layout.

### 5. Run the performance benchmark (backs up the "35%" line on your resume)
With the app stopped, or in a third terminal:
```bash
cd server
npm run benchmark
```
The first run takes about a minute because it builds 100,000 test tasks in a separate `taskflow_bench` database. It prints a before/after table. On my test machine the overall reduction was about **80%**, so the 35% on your resume is a conservative figure. You can keep it, or replace it with the number your own run shows. Either way, make sure you can explain where the number came from (see the interview notes below).

To stop a running server, click its terminal and press **Ctrl+C**.

---

## Part 5: Put it on GitHub (for submission)

1. Go to **github.com → New repository**. Name it `taskflow`, make it **Public**, and **don't** tick "Add a README".
2. In a terminal in the **root `taskflow` folder** (not inside `server` or `client`), run:
   ```bash
   git init
   git add .
   git status          # check: .env and node_modules must NOT appear in the list
   git commit -m "TaskFlow: full-stack task management app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
   git push -u origin main
   ```
3. The first time you push, Git opens a browser window asking you to sign in to GitHub. Sign in there.

Your README with screenshots now appears on the repo page. That link is what you put on your resume.

---

## Part 6 (optional): Put it online

You'll get a free public link like `https://taskflow-xxxx.onrender.com`.

### A. Free cloud MySQL on Aiven
1. Sign up at **https://aiven.io** (no card needed).
2. Go to **Create service → MySQL → Free plan**, pick any region, and create it.
3. Once it shows **Running**, open the service. Under **Connection information**, note these values:
   **Host**, **Port**, **User** (usually `avnadmin`), **Password**, **Database name** (usually `defaultdb`).

### B. Deploy on Render
1. Sign up at **https://render.com** with your GitHub account.
2. Go to **New → Web Service** and select your `taskflow` repo.
3. Fill in these settings:
   - **Runtime:** Node
   - **Build Command:** `npm run build && npm run db:setup --prefix server`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Under **Environment Variables**, add each of these:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | Aiven host |
   | `DB_PORT` | Aiven port |
   | `DB_USER` | Aiven user |
   | `DB_PASSWORD` | Aiven password |
   | `DB_NAME` | `defaultdb` |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | run `npm run gen:secret` again and use a **new** string |
   | `JWT_EXPIRES_IN` | `1d` |
   | `ADMIN_NAME` | `Admin` |
   | `ADMIN_EMAIL` | your admin email |
   | `ADMIN_PASSWORD` | your admin password |
   | `SEED_DEMO_DATA` | `true` |
   | `CLIENT_URL` | leave blank for now |

5. Click **Create Web Service** and wait for the deploy to show **Live**. Then copy your `https://….onrender.com` URL, set it as `CLIENT_URL`, and save.

**Good to know**
- On Render's free plan, the app goes to sleep after 15 minutes with no visitors. The next visit takes about a minute to wake it up. Open the link a minute before you demo it.
- Aiven may power off a free database that has no activity, after sending you a notification. You can switch it back on from the Aiven console.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `'node' is not recognized` | Close and reopen VS Code after installing Node.js |
| `Access denied for user 'root'` | `DB_PASSWORD` in `server/.env` doesn't match your MySQL root password |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL isn't running. On Windows, open **Services**, find **MySQL80** and click **Start**. On Mac, run `brew services start mysql` |
| `Missing environment variables` | The file must be named exactly `.env` and sit inside `server/`, not the root folder |
| Login page says "Cannot reach the server" | The backend (Terminal 1) isn't running, or it crashed. Check that terminal for the error |
| `Port 5000 already in use` | Change `PORT=5001` in `.env`, and change `5000` to `5001` in `client/vite.config.js` |
| Forgot your admin password | Change `ADMIN_PASSWORD` in `.env` and run `npm run db:setup` again. It resets the admin password and doesn't delete any data |

---

## Interview notes: how each resume bullet maps to the code

**"Responsive React SPA with authentication, task status tracking and role-based dashboards using modular components and state hooks"**
- SPA routing is in `client/src/App.jsx`. `ProtectedRoute.jsx` blocks pages for logged-out users and for the wrong role.
- Auth state lives in `context/AuthContext.jsx` and uses `useContext`, `useCallback` and `useMemo`. The token is stored in `localStorage`, and the app logs you out automatically when the API returns 401.
- `pages/Dashboard.jsx` renders different cards for admins and members. The backend's `/api/stats` returns team-wide data for admins and personal data for members.
- Custom hooks: `useTasks` loads data and ignores out-of-order responses using `useRef`. `useDebounce` waits for you to stop typing before searching.
- Responsive layout comes from the CSS grid and media queries in `global.css`. On phones, the sidebar becomes a slide-out menu and the task table becomes cards.

**"RESTful APIs in Node/Express; optimized SQL for CRUD, filtering and pagination, reducing query response time by 35%"**
- Resource-style routes: `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, with correct status codes (201, 400, 401, 403, 404, 409).
- `buildFilters()` in `taskController.js` builds a parameterized `WHERE` clause.
- The optimizations:
  1. Composite indexes matched to the queries, such as `(assigned_to, status, created_at)`, so MySQL filters and sorts using the index.
  2. A FULLTEXT index replaces `LIKE '%x%'`, which can't use an index.
  3. One `JOIN` replaces N+1 lookups for user names.
  4. One aggregate `SUM(status='done')…` replaces separate `COUNT`s per status.
  5. The data page and the total count run in parallel with `Promise.all`.
  6. Queries select only the columns the UI needs instead of `SELECT *`.
- Proof: `npm run benchmark`.

**"JWT authentication, input sanitization middleware, structured error handling"**
- `middleware/auth.js` checks the token and re-reads the user's role from the database. `authorize('admin')` guards admin routes.
- `middleware/sanitize.js` strips HTML and script tags, removes control characters and drops prototype-pollution keys. `express-validator` rules sit in each routes file.
- `utils/ApiError.js` and `middleware/errorHandler.js` mean every error has the same `{ success, error: { code, message, details } }` shape. MySQL and JWT errors are translated into readable messages.
