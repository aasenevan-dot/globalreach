============================================
  GlobalReach — Sales OS  (Windows guide)
============================================

WHAT THIS IS
  GlobalReach is a full working app: a B2B sales pipeline plus a
  Consumer (homeowner / roofing) jobs board with referral-source ROI.
  It runs locally on your PC — your data stays on your machine in the
  file "data.db".


------------------------------------------------
  HOW TO RUN IT  (the short version)
------------------------------------------------
  1. Install Node.js ONCE (free):
       - Go to  https://nodejs.org
       - Download the "LTS" version, run the installer, click Next/Install.
  2. Double-click  START.bat
       - The first run installs components (1-3 min). Later runs are instant.
       - Your browser opens to  http://localhost:5000
  3. To stop the app: close the black START window.


------------------------------------------------
  USING THE APP
------------------------------------------------
  Top-right toggles:
    - Business / Consumer  ... switch between the B2B sales OS and the
                               homeowner "Jobs" pipeline.
    - Moon icon            ... light / dark mode.
    - Local / International ... (Business view) basic vs. advanced markets.

  Consumer view gives you:
    - Jobs  ........ drag-and-drop roofing pipeline (Inspection -> Estimate
                     -> Insurance claim -> Approved -> Scheduled -> Completed),
                     add / edit / delete jobs.
    - Dashboard  ... open jobs, completed revenue, active claims.
    - Analytics  ... referral-source ROI, job funnel, work-type mix.


------------------------------------------------
  TROUBLESHOOTING
------------------------------------------------
  "Node.js was not found"  -> install it from https://nodejs.org, then
                              re-run START.bat.

  Port 5000 already in use -> something else is using that port. Close other
                              dev apps, or restart your PC, then try again.

  Want a clean slate?       -> the app re-creates data automatically, but the
                              sample data lives in "data.db". Deleting that
                              file gives you an empty app (it rebuilds the
                              structure on next start).

  Nothing opens in browser -> manually go to  http://localhost:5000
                              while the START window is open.


------------------------------------------------
  WHAT'S INCLUDED
------------------------------------------------
  START.bat          double-click launcher
  data.db            your local database (sample data preloaded)
  client/ server/    app source code
  dist/              prebuilt app (so it runs fast on first launch)
  package.json       dependency list

  Tech: Node.js + Express + React + SQLite. No account or internet
  connection needed to use it (only to install Node the first time).
