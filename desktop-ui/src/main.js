import { invoke } from "@tauri-apps/api/core";

const root = document.querySelector("#app");

root.innerHTML = `
  <main style="font-family: Inter, Arial, sans-serif; background:#08120f; color:#e8fff5; min-height:100vh; padding:24px;">
    <h1 style="margin-top:0; color:#63ffb8;">BlockSocial Plants Calendar</h1>
    <p style="max-width:820px; color:#b7d8cb;">Der Kalender zeigt jetzt nicht nur Zeiträume, sondern auch visuelle Signale. Zusätzlich siehst du jetzt eine Reminder-Grundlage für offene Tasks mit aktivem Erinnerungs-Flag.</p>

    <section style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin:20px 0;">
      <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
        <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Auth & Sync</h2>
        <label>Backend URL</label>
        <input id="backendUrl" value="http://127.0.0.1:8080" style="width:100%; margin:8px 0 10px; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        <label>E-Mail</label>
        <input id="email" placeholder="du@example.com" style="width:100%; margin:8px 0 10px; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        <label>Passwort</label>
        <input id="password" type="password" placeholder="Passwort" style="width:100%; margin:8px 0 12px; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button id="bootstrap">Guest</button>
          <button id="register">Register</button>
          <button id="login">Login</button>
          <button id="me">/me</button>
          <button id="syncNow">Sync now</button>
        </div>
      </div>

      <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
        <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Live status</h2>
        <div id="status" style="font-size:14px; color:#b7d8cb; line-height:1.6;">Lade Status ...</div>
      </div>

      <div id="subscriptionPanel" style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);"></div>
    </section>

    <section style="display:grid; grid-template-columns: minmax(320px, 420px) 1fr; gap:16px; align-items:start;">
      <div style="display:grid; gap:16px;">
        <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
          <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Neue Pflanze</h2>
          <input id="plantName" placeholder="Pflanzenname" style="width:100%; margin-bottom:10px; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <input id="plantColor" value="#0B3D2E" type="color" style="width:100%; height:44px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
            <select id="plantPhase" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
              <option value="seed">Seed</option>
              <option value="veg" selected>Veg</option>
              <option value="flower">Flower</option>
              <option value="harvest">Harvest</option>
              <option value="dry">Dry</option>
              <option value="cure">Cure</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div id="plantFormError" style="display:none; color:#ff8f8f; font-size:13px; margin-bottom:10px;"></div>
          <div id="plantPlanHint" style="margin-bottom:10px; font-size:12px; color:#8fb8a7;"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="resetPlantForm" type="button">Zurücksetzen</button>
            <button id="createPlant">Pflanze anlegen</button>
          </div>
        </div>

        <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
          <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Task für ausgewählte Pflanze</h2>
          <div style="margin-bottom:10px;">
            <div style="font-size:12px; color:#8fb8a7; margin-bottom:8px;">Schnellvorlagen</div>
            <div id="taskTemplateBar" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <button type="button" data-template="water">Gießen</button>
              <button type="button" data-template="feed">Düngen</button>
              <button type="button" data-template="check">Check-in</button>
              <button type="button" data-template="train">Training</button>
              <button type="button" data-template="reset">Formular leeren</button>
            </div>
            <div style="font-size:12px; color:#8fb8a7; margin-bottom:8px;">Standardsets</div>
            <div id="taskSetBar" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <button type="button" data-task-set="starter">Starter-Woche</button>
              <button type="button" data-task-set="watering">Gießroutine</button>
              <button type="button" data-task-set="flower">Blüte-Checks</button>
            </div>
            <div style="font-size:12px; color:#8fb8a7; margin-bottom:8px;">Phasen-Empfehlungen</div>
            <div id="phaseTaskSetBar" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
          </div>
          <input id="taskTitle" placeholder="Task-Titel" style="width:100%; margin-bottom:10px; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <select id="taskCategory" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
              <option value="water">Water</option>
              <option value="feed">Feed</option>
              <option value="check">Check</option>
              <option value="train">Train</option>
              <option value="note">Note</option>
            </select>
            <input id="taskRepeat" type="number" min="0" placeholder="Repeat h" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          </div>
          <div style="display:grid; grid-template-columns:1fr auto; gap:10px; margin-bottom:10px; align-items:center;">
            <input id="taskDueAt" type="datetime-local" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
            <button id="taskDueFromTimeline" type="button">Aus Zeitraum</button>
          </div>
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; color:#b7d8cb; font-size:13px;">
            <input id="taskNotificationEnabled" type="checkbox" checked />
            Erinnern, sobald der Task fällig wird
          </label>
          <div id="taskFormError" style="display:none; color:#ff8f8f; font-size:13px; margin-bottom:10px;"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="resetTaskForm" type="button">Zurücksetzen</button>
            <button id="createTask">Task anlegen</button>
          </div>
        </div>

        <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
          <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Log für ausgewählte Pflanze</h2>
          <textarea id="logText" placeholder="Notiz oder kurzer Eintrag" rows="4" style="width:100%; margin-bottom:10px; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;"></textarea>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <input id="logPh" type="number" step="0.1" placeholder="pH" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
            <input id="logEc" type="number" step="0.1" placeholder="EC" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <input id="logTemp" type="number" step="0.1" placeholder="Temp °C" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
            <input id="logRh" type="number" step="0.1" placeholder="RH %" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          </div>
          <div style="display:grid; grid-template-columns:1fr auto; gap:10px; margin-bottom:10px; align-items:center;">
            <input id="logCreatedAt" type="datetime-local" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
            <button id="logDateFromTimeline" type="button">Aus Zeitraum</button>
          </div>
          <div id="logDateHint" style="margin:-2px 0 10px; font-size:12px; color:#8fb8a7;">Log-Zeitpunkt folgt dem aktuellen Kalenderfokus.</div>
          <div id="logFormError" style="display:none; color:#ff8f8f; font-size:13px; margin-bottom:10px;"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="resetLogForm" type="button">Zurücksetzen</button>
            <button id="createLog">Log anlegen</button>
          </div>
        </div>
      </div>

      <div style="display:grid; gap:16px;">
        <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <h2 style="margin:0; color:#63ffb8; font-size:18px;">Pflanzen</h2>
            <div id="selectedPlantLabel" style="font-size:13px; color:#8fb8a7;">Keine Pflanze ausgewählt</div>
          </div>
          <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:10px; margin-top:12px;">
            <input id="plantSearch" placeholder="Pflanze suchen..." style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
            <select id="plantPhaseFilter" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
              <option value="all">Alle Phasen</option>
              <option value="seed">Seed</option>
              <option value="veg">Veg</option>
              <option value="flower">Flower</option>
              <option value="harvest">Harvest</option>
              <option value="dry">Dry</option>
              <option value="cure">Cure</option>
              <option value="custom">Custom</option>
            </select>
            <select id="plantStateFilter" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="ended">Beendet</option>
              <option value="inactive">Inaktiv (Beendet + Archiviert)</option>
              <option value="archived">Archiviert</option>
            </select>
            <select id="plantSort" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
              <option value="updated_desc">Zuletzt aktiv</option>
              <option value="name_asc">Name A–Z</option>
              <option value="phase">Phase</option>
              <option value="week_desc">Woche absteigend</option>
            </select>
          </div>
          <div id="plantsFilterStatus" style="margin-top:8px; font-size:12px; color:#8fb8a7;">Alle Pflanzen sichtbar</div>
          <div id="plantsList" style="margin-top:12px; display:grid; gap:10px;"></div>
        </div>

        <div id="homePanel" style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);"></div>

        <div id="detailPanel" style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);"></div>

        <div id="reminderPanel" style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);"></div>

        <div id="timelinePanel" style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);"></div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
            <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Tasks der Auswahl</h2>
            <div id="tasksList" style="display:grid; gap:10px;"></div>
          </div>
          <div style="background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);">
            <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Logs der Auswahl</h2>
            <div id="logsList" style="display:grid; gap:10px;"></div>
          </div>
        </div>
      </div>
    </section>

    <pre id="output" style="white-space:pre-wrap; background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2); margin-top:16px;"></pre>
  </main>
`;

const $ = (id) => document.getElementById(id);
const output = $("output");
const statusBox = $("status");
const subscriptionPanel = $("subscriptionPanel");
const plantsList = $("plantsList");
const tasksList = $("tasksList");
const logsList = $("logsList");
const selectedPlantLabel = $("selectedPlantLabel");
const plantsFilterStatus = $("plantsFilterStatus");
const phaseTaskSetBar = $("phaseTaskSetBar");
const homePanel = $("homePanel");
const detailPanel = $("detailPanel");
const reminderPanel = $("reminderPanel");
const timelinePanel = $("timelinePanel");

const mainShell = root.querySelector("main");
const shellSections = mainShell.querySelectorAll("section");
const overviewSection = shellSections[0];
const workspaceSection = shellSections[1];
const authCard = $("backendUrl")?.closest("div");
const liveStatusCard = statusBox?.closest("div");
const leftWorkspaceColumn = workspaceSection?.firstElementChild;
const rightWorkspaceColumn = workspaceSection?.lastElementChild;
const newPlantCard = $("plantName")?.parentElement;
const taskFormCard = $("taskTitle")?.parentElement;
const logFormCard = $("logText")?.parentElement;
const plantsCard = plantsList?.closest("div");
const tasksLogsGrid = tasksList?.closest("div")?.parentElement;
const settingsPanel = document.createElement("div");
settingsPanel.id = "settingsPanel";
settingsPanel.style.cssText = "background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);";
overviewSection?.appendChild(settingsPanel);
const onboardingPanel = document.createElement("div");
onboardingPanel.id = "onboardingPanel";
onboardingPanel.style.cssText = "background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);";
overviewSection?.appendChild(onboardingPanel);
const mvpReadinessPanel = document.createElement("div");
mvpReadinessPanel.id = "mvpReadinessPanel";
mvpReadinessPanel.style.cssText = "background:#0d1c18; padding:16px; border-radius:16px; border:1px solid rgba(99,255,184,0.2);";
overviewSection?.appendChild(mvpReadinessPanel);

const pageSwitcher = document.createElement("section");
pageSwitcher.id = "pageSwitcher";
pageSwitcher.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin:20px 0 16px; padding:16px; background:#0d1c18; border:1px solid rgba(99,255,184,0.18); border-radius:18px;";
pageSwitcher.innerHTML = `
  <div>
    <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#8fb8a7; margin-bottom:6px;">MVP Navigation</div>
    <div id="pageTitle" style="font-size:20px; color:#e8fff5; font-weight:700;">Dashboard</div>
    <div id="pageIntro" style="font-size:13px; color:#8fb8a7; margin-top:4px; max-width:780px;">Der aktuelle Fokus liegt auf dem Überblick über Pflanzen, Tasks, Reminder und Status.</div>
  </div>
  <div id="pageNav" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
`;
mainShell.insertBefore(pageSwitcher, overviewSection);
const pageTitle = document.getElementById("pageTitle");
const pageIntro = document.getElementById("pageIntro");
const pageNav = document.getElementById("pageNav");

let selectedPlantId = null;
let plants = [];
let tasks = [];
let logs = [];
let allTasks = [];
let allLogs = [];
let editingPlantId = null;
let editingTaskId = null;
let editingLogId = null;
let timelineMode = "week";
let timelineFocusKey = new Date().toISOString().slice(0, 10);
let reminderPermissionState = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
let homeTaskFilter = "all";
let homeTaskGrouping = "flat";
let homeTaskSort = "due";
let homeLogPlantFilter = "all";
let homeLogRangeFilter = "30d";
let homeLogTypeFilter = "all";
let homeMonthFocusKey = new Date().toISOString().slice(0, 10);
let plantSearchQuery = "";
let plantPhaseFilter = "all";
let plantStateFilter = "all";
let plantSort = "updated_desc";
let currentPlan = "free";
let currentPlantLimit = 1;
let currentPlanSource = "guest";
let checkoutState = { status: "idle", plan: null, message: "Noch kein Upgrade gestartet.", checkoutUrl: null, updatedAt: null };

const CHECKOUT_HISTORY_STORAGE_KEY = "bs_checkout_history";
let checkoutHistory = [];
let subscriptionHistory = [];
let subscriptionHistorySource = "local";
let subscriptionStatusSummary = null;


let currentView = "dashboard";
const pageViews = {
  dashboard: {
    label: "Dashboard",
    intro: "Schneller Überblick über aktive Pflanzen, Kalender, Reminder und die letzte Aktivität.",
    topCards: [onboardingPanel, mvpReadinessPanel, liveStatusCard, subscriptionPanel],
    showWorkspace: true,
    showLeftColumn: false,
    showRightColumn: true,
    rightCards: [plantsCard, homePanel, detailPanel, reminderPanel, timelinePanel, tasksLogsGrid],
  },
  plants: {
    label: "Pflanzen",
    intro: "Pflanzen anlegen, bearbeiten, Runs beenden und die komplette Pflanzenliste verwalten.",
    topCards: [onboardingPanel, subscriptionPanel],
    showWorkspace: true,
    showLeftColumn: true,
    showRightColumn: true,
    leftCards: [newPlantCard, taskFormCard, logFormCard],
    rightCards: [plantsCard, detailPanel, tasksLogsGrid],
  },
  calendar: {
    label: "Kalender & Reminder",
    intro: "Timeline, fällige Tasks und Erinnerungslage in einer fokussierten Arbeitsansicht.",
    topCards: [liveStatusCard],
    showWorkspace: true,
    showLeftColumn: false,
    showRightColumn: true,
    rightCards: [timelinePanel, reminderPanel, tasksLogsGrid, homePanel],
  },
  billing: {
    label: "Abo & Billing",
    intro: "Planstatus, freie Slots, Lifecycle und Upgrade-Flow für Free, Basic, Pro und CSC.",
    topCards: [mvpReadinessPanel, liveStatusCard, subscriptionPanel],
    showWorkspace: false,
  },
  settings: {
    label: "Konto & Einstellungen",
    intro: "Backend, Login, Sync und die wichtigsten MVP-Einstellungen für Desktop und Account.",
    topCards: [authCard, liveStatusCard, settingsPanel, mvpReadinessPanel, onboardingPanel],
    showWorkspace: false,
  },
};

function rememberDisplay(el) {
  if (!el) return;
  if (!el.dataset.originalDisplay) {
    const computed = window.getComputedStyle(el).display;
    el.dataset.originalDisplay = computed === "none" ? "" : computed;
  }
}

function setVisible(el, visible) {
  if (!el) return;
  rememberDisplay(el);
  el.style.display = visible ? (el.dataset.originalDisplay || "") : "none";
}

function currentDueTaskCount() {
  return allTasks.filter((task) => !task.done && task.due_at && task.due_at.slice(0, 10) <= todayKey()).length;
}

function currentOpenReminderCount() {
  return allTasks.filter((task) => !task.done && task.reminder).length;
}

function getMvpReadinessItems() {
  const hasAccount = currentPlanSource === "account";
  const hasPlants = plants.some((plant) => plantStatusValue(plant) !== "deleted");
  const hasActivePlant = plants.some((plant) => plantStatusValue(plant) === "active");
  const hasTasks = allTasks.length > 0;
  const hasLogs = allLogs.length > 0;
  const hasReminders = currentOpenReminderCount() > 0;
  const hasBillingContext = currentPlanSource === "account" || checkoutHistory.length > 0 || subscriptionHistory.length > 0;
  const settingsReady = Boolean($("backendUrl")?.value) && reminderPermissionState !== "default";
  return [
    { key: 'auth', label: 'Konto & Sync', done: hasAccount, detail: hasAccount ? 'Cloud-Sync aktiv bzw. Konto verbunden.' : 'Aktuell noch Guest-Modus.' },
    { key: 'plants', label: 'Pflanzenverwaltung', done: hasPlants && hasActivePlant, detail: hasPlants ? `${plants.filter((plant) => plantStatusValue(plant) !== 'deleted').length} sichtbare Pflanze(n) vorhanden.` : 'Noch keine Pflanze angelegt.' },
    { key: 'worklog', label: 'Tasks & Logs', done: hasTasks && hasLogs, detail: `${allTasks.length} Task(s), ${allLogs.length} Log(s).` },
    { key: 'calendar', label: 'Kalender & Reminder', done: hasReminders || hasTasks, detail: hasReminders ? `${currentOpenReminderCount()} Reminder aktiv.` : 'Noch keine Reminder/Tasks geplant.' },
    { key: 'billing', label: 'Abo & Billing', done: hasBillingContext, detail: hasBillingContext ? 'Planstatus und Lifecycle sind bereits befüllt.' : 'Billing ist erreichbar, aber noch ohne Verlauf.' },
    { key: 'settings', label: 'Einstellungen', done: settingsReady, detail: settingsReady ? 'Backend und Desktop-Reminder sind gesetzt.' : 'Backend/Reminder-Berechtigung noch nicht komplett bestätigt.' },
  ];
}

function renderMvpReadinessPanel() {
  if (!mvpReadinessPanel) return;
  const items = getMvpReadinessItems();
  const doneCount = items.filter((item) => item.done).length;
  const progressPercent = Math.round((doneCount / items.length) * 100);
  const missing = items.filter((item) => !item.done);
  mvpReadinessPanel.innerHTML = `
    <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">MVP Readiness</h2>
    <div style="display:grid; grid-template-columns:1.1fr 1fr; gap:12px; align-items:start;">
      <div style="padding:14px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div>
            <div style="font-size:12px; color:#8fb8a7; text-transform:uppercase; letter-spacing:0.08em;">Abschlussgrad</div>
            <div style="font-size:26px; font-weight:700; color:#e8fff5; margin-top:6px;">${doneCount}/${items.length}</div>
          </div>
          <div style="font-size:28px; font-weight:700; color:#63ffb8;">${progressPercent}%</div>
        </div>
        <div style="margin-top:12px; height:8px; border-radius:999px; background:#08120f; overflow:hidden; border:1px solid rgba(99,255,184,0.08);">
          <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, rgba(99,255,184,0.45), rgba(99,255,184,0.95));"></div>
        </div>
        <div style="display:grid; gap:8px; margin-top:12px;">
          ${items.map((item) => `<div style="padding:10px 12px; border-radius:12px; background:${item.done ? 'rgba(99,255,184,0.08)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${item.done ? 'rgba(99,255,184,0.14)' : 'rgba(255,255,255,0.08)'};">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
              <strong style="color:${item.done ? '#e8fff5' : '#d8ece4'}; font-size:13px;">${item.label}</strong>
              <span style="font-size:11px; color:${item.done ? '#63ffb8' : '#ffcf7b'};">${item.done ? 'bereit' : 'offen'}</span>
            </div>
            <div style="font-size:12px; color:#8fb8a7; margin-top:4px; line-height:1.5;">${item.detail}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="display:grid; gap:10px;">
        <div style="padding:14px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#b7d8cb; line-height:1.6;">
          ${missing.length ? `Offen für den kompletten MVP: <strong style="color:#e8fff5;">${missing.map((item) => item.label).join(', ')}</strong>.` : `Der MVP-Kern ist aktuell komplett durchgeklickt. Als nächstes geht's eher um echten Build, Payment-Finish und Feinschliff.`}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${missing.some((item) => item.key === 'auth' || item.key === 'settings') ? '<button type="button" data-mvp-action="goto-settings">Konto prüfen</button>' : ''}
          ${missing.some((item) => item.key === 'plants') ? '<button type="button" data-mvp-action="goto-plants">Pflanzen vervollständigen</button>' : ''}
          ${missing.some((item) => item.key === 'calendar') ? '<button type="button" data-mvp-action="goto-calendar">Reminder planen</button>' : ''}
          ${missing.some((item) => item.key === 'billing') ? '<button type="button" data-mvp-action="goto-billing">Billing öffnen</button>' : ''}
          <button type="button" data-mvp-action="sync-now">Sync jetzt</button>
        </div>
      </div>
    </div>
  `;
  mvpReadinessPanel.querySelectorAll('[data-mvp-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.mvpAction || '';
      if (action === 'goto-settings') {
        switchPageView('settings');
      } else if (action === 'goto-plants') {
        switchPageView('plants');
      } else if (action === 'goto-calendar') {
        switchPageView('calendar');
      } else if (action === 'goto-billing') {
        switchPageView('billing');
      } else if (action === 'sync-now') {
        $('syncNow')?.click();
      }
    });
  });
}

function renderOnboardingPanel() {
  if (!onboardingPanel) return;
  const hasPlants = plants.length > 0;
  const hasSelection = Boolean(selectedPlant());
  const hasTasks = allTasks.length > 0;
  const hasLogs = allLogs.length > 0;
  const canCreate = canActivateMorePlants();
  const checklist = [
    { done: currentPlanSource === "account", label: "Mit Konto verbinden statt nur als Gast arbeiten" },
    { done: hasPlants, label: "Erste Pflanze anlegen" },
    { done: hasSelection || hasTasks, label: "Ersten Task planen" },
    { done: hasSelection || hasLogs, label: "Ersten Log-Eintrag erfassen" },
  ];
  const doneCount = checklist.filter((item) => item.done).length;
  const progress = `${doneCount}/${checklist.length}`;
  const primaryAction = !hasPlants
    ? { label: canCreate ? "Jetzt erste Pflanze anlegen" : "Planlimit prüfen", action: canCreate ? "goto-create-plant" : "goto-billing" }
    : !hasSelection
      ? { label: "Zur Pflanzenübersicht", action: "goto-plants" }
      : !hasTasks
        ? { label: "Task für Auswahl anlegen", action: "focus-task" }
        : !hasLogs
          ? { label: "Log für Auswahl anlegen", action: "focus-log" }
          : { label: "Kalender öffnen", action: "goto-calendar" };
  onboardingPanel.innerHTML = `
    <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">MVP Flow & erster Start</h2>
    <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:12px; align-items:start;">
      <div style="padding:14px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
        <div style="font-size:12px; color:#8fb8a7; text-transform:uppercase; letter-spacing:0.08em;">Fortschritt</div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:8px;">
          <div style="font-size:24px; font-weight:700; color:#e8fff5;">${progress}</div>
          <div style="font-size:12px; color:#8fb8a7;">MVP-Erstnutzung</div>
        </div>
        <div style="margin-top:12px; height:8px; border-radius:999px; background:#08120f; overflow:hidden; border:1px solid rgba(99,255,184,0.08);">
          <div style="width:${(doneCount / checklist.length) * 100}%; height:100%; background:linear-gradient(90deg, rgba(99,255,184,0.45), rgba(99,255,184,0.9));"></div>
        </div>
        <div style="display:grid; gap:8px; margin-top:12px;">
          ${checklist.map((item) => `<div style="display:flex; gap:8px; align-items:flex-start; color:${item.done ? '#cfe8dd' : '#8fb8a7'};"><span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:999px; background:${item.done ? 'rgba(99,255,184,0.14)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${item.done ? 'rgba(99,255,184,0.26)' : 'rgba(255,255,255,0.10)'}; color:${item.done ? '#63ffb8' : '#8fb8a7'}; font-size:11px;">${item.done ? '✓' : '•'}</span><span style="font-size:13px; line-height:1.4;">${item.label}</span></div>`).join('')}
        </div>
      </div>
      <div style="display:grid; gap:10px;">
        <div style="padding:14px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#b7d8cb; line-height:1.6;">
          ${!hasPlants
            ? `Du hast noch keine Pflanze im Kalender. Lege zuerst eine Pflanze an, damit Timeline, Reminder, Tasks und Logs sinnvoll nutzbar werden.`
            : !hasSelection
              ? `Es gibt schon Pflanzen, aber aktuell ist keine ausgewählt. Öffne eine Pflanze, um Details, Tasks und Logs direkt auszufüllen.`
              : `Die App ist bereits im Arbeitsmodus. Nutze jetzt Reminder, Timeline und Abo-Status als zusammenhängenden MVP-Flow.`}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button type="button" data-onboarding-action="${primaryAction.action}">${primaryAction.label}</button>
          <button type="button" data-onboarding-action="goto-settings">Konto & Einstellungen</button>
          <button type="button" data-onboarding-action="sync-now">Sync jetzt</button>
        </div>
      </div>
    </div>
  `;
  onboardingPanel.querySelectorAll('[data-onboarding-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.onboardingAction || '';
      if (action === 'goto-create-plant') {
        switchPageView('plants');
        window.setTimeout(() => $("plantName")?.focus(), 30);
      } else if (action === 'goto-plants') {
        switchPageView('plants');
      } else if (action === 'focus-task') {
        switchPageView('plants');
        window.setTimeout(() => $("taskTitle")?.focus(), 30);
      } else if (action === 'focus-log') {
        switchPageView('plants');
        window.setTimeout(() => $("logText")?.focus(), 30);
      } else if (action === 'goto-calendar') {
        switchPageView('calendar');
      } else if (action === 'goto-billing') {
        switchPageView('billing');
      } else if (action === 'goto-settings') {
        switchPageView('settings');
      } else if (action === 'sync-now') {
        $("syncNow")?.click();
      }
    });
  });
}

function renderSettingsPanel() {
  if (!settingsPanel) return;
  const reminderLabel = reminderPermissionState === "unsupported"
    ? "Nicht verfügbar"
    : reminderPermissionState === "granted"
      ? "Erlaubt"
      : reminderPermissionState === "denied"
        ? "Blockiert"
        : "Noch nicht bestätigt";
  const syncMode = currentPlanSource === "account" ? "Account + Cloud-Sync" : "Guest + Local Cache";
  const visiblePlants = summaryPlantCount("visible_plants", plants.filter((plant) => plantStatusValue(plant) !== "deleted").length);
  const dueTasks = currentDueTaskCount();
  settingsPanel.innerHTML = `
    <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">MVP Einstellungen</h2>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:12px;">
      <div style="padding:12px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
        <div style="font-size:12px; color:#8fb8a7;">Aktiver Plan</div>
        <div style="font-size:18px; color:#e8fff5; font-weight:700; margin-top:4px;">${planLabel(currentPlan)}</div>
      </div>
      <div style="padding:12px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
        <div style="font-size:12px; color:#8fb8a7;">Sync-Modus</div>
        <div style="font-size:15px; color:#e8fff5; font-weight:600; margin-top:4px;">${syncMode}</div>
      </div>
      <div style="padding:12px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
        <div style="font-size:12px; color:#8fb8a7;">Desktop-Reminder</div>
        <div style="font-size:15px; color:#e8fff5; font-weight:600; margin-top:4px;">${reminderLabel}</div>
      </div>
      <div style="padding:12px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
        <div style="font-size:12px; color:#8fb8a7;">Heute fällig</div>
        <div style="font-size:18px; color:#e8fff5; font-weight:700; margin-top:4px;">${dueTasks}</div>
      </div>
    </div>
    <div style="display:grid; gap:10px;">
      <div style="padding:12px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#b7d8cb; line-height:1.6;">
        Diese MVP-Ansicht bündelt jetzt die wichtigsten Konto-/Settings-Infos plus Schnellaktionen. Profil, Passwortwechsel, Notification-Optionen, Theme und spätere mobile Defaults können hier direkt anschließen.
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        <button type="button" data-settings-action="sync-now">Sync jetzt</button>
        <button type="button" data-settings-action="goto-billing">Abo öffnen</button>
        <button type="button" data-settings-action="goto-calendar">Kalender öffnen</button>
        <button type="button" data-settings-action="focus-backend">Backend prüfen</button>
      </div>
      <div style="padding:12px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#8fb8a7; font-size:13px; line-height:1.7;">
        Backend: ${$("backendUrl")?.value || "-"}<br />
        Sichtbare Pflanzen: ${visiblePlants}<br />
        Freie Slots: ${Number.isFinite(currentPlantLimit) ? remainingPlantSlots() : "∞"}<br />
        Aktive Reminder: ${currentOpenReminderCount()}
      </div>
    </div>
  `;
  settingsPanel.querySelectorAll('[data-settings-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.settingsAction || '';
      if (action === 'sync-now') {
        $('syncNow')?.click();
      } else if (action === 'goto-billing') {
        switchPageView('billing');
      } else if (action === 'goto-calendar') {
        switchPageView('calendar');
      } else if (action === 'focus-backend') {
        $('backendUrl')?.focus();
      }
    });
  });
}

function pageViewBadge(viewKey) {
  if (viewKey === 'plants') return String(plants.filter((plant) => plantStatusValue(plant) !== 'deleted').length);
  if (viewKey === 'calendar') return String(currentDueTaskCount());
  if (viewKey === 'billing') return Number.isFinite(currentPlantLimit) ? String(Math.max(remainingPlantSlots(), 0)) : '∞';
  if (viewKey === 'settings') return currentPlanSource === 'account' ? 'OK' : '!';
  return `${summaryPlantCount('active_plants', activePlantCount())}`;
}

function renderPageNavigation() {
  if (!pageNav) return;
  pageNav.innerHTML = Object.entries(pageViews).map(([key, view]) => `
    <button type="button" data-view="${key}" style="padding:10px 14px; border-radius:999px; border:1px solid ${currentView === key ? 'rgba(99,255,184,0.55)' : 'rgba(99,255,184,0.16)'}; background:${currentView === key ? 'rgba(99,255,184,0.14)' : '#091411'}; color:${currentView === key ? '#63ffb8' : '#cfe8dd'}; font-weight:600; display:inline-flex; align-items:center; gap:8px;">${view.label}<span style="font-size:11px; padding:3px 7px; border-radius:999px; background:${currentView === key ? 'rgba(99,255,184,0.14)' : 'rgba(255,255,255,0.08)'}; border:1px solid ${currentView === key ? 'rgba(99,255,184,0.28)' : 'rgba(255,255,255,0.10)'}; color:${currentView === key ? '#63ffb8' : '#cfe8dd'};">${pageViewBadge(key)}</span></button>
  `).join('');
  pageNav.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchPageView(button.dataset.view || 'dashboard'));
  });
}

function applyPageView() {
  const view = pageViews[currentView] || pageViews.dashboard;
  if (pageTitle) pageTitle.textContent = view.label;
  if (pageIntro) pageIntro.textContent = view.intro;
  [authCard, liveStatusCard, subscriptionPanel, settingsPanel, onboardingPanel, mvpReadinessPanel].forEach((card) => setVisible(card, false));
  (view.topCards || []).forEach((card) => setVisible(card, true));
  setVisible(overviewSection, (view.topCards || []).length > 0);

  setVisible(workspaceSection, view.showWorkspace !== false);
  setVisible(leftWorkspaceColumn, view.showWorkspace !== false && view.showLeftColumn !== false);
  setVisible(rightWorkspaceColumn, view.showWorkspace !== false && view.showRightColumn !== false);

  [newPlantCard, taskFormCard, logFormCard].forEach((card) => setVisible(card, false));
  [plantsCard, homePanel, detailPanel, reminderPanel, timelinePanel, tasksLogsGrid].forEach((card) => setVisible(card, false));

  (view.leftCards || []).forEach((card) => setVisible(card, true));
  (view.rightCards || []).forEach((card) => setVisible(card, true));

  renderPageNavigation();
}

function switchPageView(viewKey) {
  currentView = pageViews[viewKey] ? viewKey : 'dashboard';
  applyPageView();
}


function normalizePlan(plan) {
  const raw = String(plan || "free").toLowerCase();
  if (["basic", "pro", "csc", "free"].includes(raw)) return raw;
  return "free";
}

function planLimitFor(plan) {
  const normalized = normalizePlan(plan);
  if (normalized === "basic") return 3;
  if (normalized === "pro") return 100;
  if (normalized === "csc") return Number.POSITIVE_INFINITY;
  return 1;
}

function plantStatusValue(plant) {
  const raw = plant?.status ? String(plant.status).toLowerCase() : '';
  if (["active", "ended", "archived", "deleted"].includes(raw)) return raw;
  if (plant?.archived === true) return "archived";
  if (plant?.is_active === true) return "active";
  return "ended";
}

function plantStatusLabel(plant) {
  const value = plantStatusValue(plant);
  if (value === "archived") return "Archiviert";
  if (value === "ended") return "Beendet";
  if (value === "deleted") return "Gelöscht";
  return "Aktiv";
}

function plantStatusTone(plant) {
  const value = plantStatusValue(plant);
  if (value === "archived") {
    return {
      bg: 'rgba(255,215,110,0.12)',
      border: 'rgba(255,215,110,0.24)',
      color: '#ffd76e',
    };
  }
  if (value === "ended") {
    return {
      bg: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.12)',
      color: '#cfe8dd',
    };
  }
  if (value === "deleted") {
    return {
      bg: 'rgba(255,120,120,0.12)',
      border: 'rgba(255,120,120,0.24)',
      color: '#ffb3a7',
    };
  }
  return {
    bg: 'rgba(99,255,184,0.12)',
    border: 'rgba(99,255,184,0.24)',
    color: '#63ffb8',
  };
}

function isPlantActive(plant) {
  return plantStatusValue(plant) === "active";
}

function isPlantArchived(plant) {
  return plantStatusValue(plant) === "archived";
}

function isPlantEnded(plant) {
  return plantStatusValue(plant) === "ended";
}

function isPlantInactive(plant) {
  const value = plantStatusValue(plant);
  return value === "ended" || value === "archived";
}

function summaryPlantCount(key, fallback = 0) {
  if (!subscriptionStatusSummary) return fallback;
  const value = subscriptionStatusSummary[key];
  return Number.isFinite(value) ? value : fallback;
}

function planLabel(plan) {
  const normalized = normalizePlan(plan);
  if (normalized === "basic") return "Basic";
  if (normalized === "pro") return "Pro";
  if (normalized === "csc") return "CSC";
  return "Free";
}

function activePlantCount() {
  if (subscriptionStatusSummary && Number.isFinite(subscriptionStatusSummary.active_plants)) {
    return subscriptionStatusSummary.active_plants;
  }
  return plants.filter((plant) => isPlantActive(plant)).length;
}

function formatPlantLimit(limit) {
  return Number.isFinite(limit) ? String(limit) : "∞";
}

function setCurrentPlanState(plan, source = "guest") {
  currentPlan = normalizePlan(plan);
  currentPlantLimit = planLimitFor(currentPlan);
  currentPlanSource = source;
}

function canActivateMorePlants() {
  if (subscriptionStatusSummary && typeof subscriptionStatusSummary.can_create === 'boolean') {
    return subscriptionStatusSummary.can_create;
  }
  return !Number.isFinite(currentPlantLimit) || activePlantCount() < currentPlantLimit;
}

function isOverPlantLimit() {
  if (subscriptionStatusSummary && Number.isFinite(subscriptionStatusSummary.over_limit_by)) {
    return subscriptionStatusSummary.over_limit_by > 0;
  }
  return Number.isFinite(currentPlantLimit) && activePlantCount() > currentPlantLimit;
}

function planLimitMessage(mode = "create") {
  const actionText = mode === "reactivate" ? "reaktivieren" : "anlegen";
  return `Dein ${planLabel(currentPlan)}-Plan erlaubt ${formatPlantLimit(currentPlantLimit)} aktive Pflanze${Number.isFinite(currentPlantLimit) && currentPlantLimit === 1 ? '' : 'n'}. Du kannst aktuell keine weitere Pflanze ${actionText}.`;
}

function remainingPlantSlots() {
  if (subscriptionStatusSummary && subscriptionStatusSummary.remaining_slots != null) {
    return subscriptionStatusSummary.remaining_slots;
  }
  if (!Number.isFinite(currentPlantLimit)) return Number.POSITIVE_INFINITY;
  return Math.max(0, currentPlantLimit - activePlantCount());
}

function overflowPlantCount() {
  if (subscriptionStatusSummary && Number.isFinite(subscriptionStatusSummary.over_limit_by)) {
    return subscriptionStatusSummary.over_limit_by;
  }
  if (!Number.isFinite(currentPlantLimit)) return 0;
  return Math.max(0, activePlantCount() - currentPlantLimit);
}

function grandfatheredActivePlantIds() {
  if (!isOverPlantLimit()) return new Set();
  const overLimit = overflowPlantCount();
  const activePlants = [...plants]
    .filter((plant) => isPlantActive(plant))
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return new Set(activePlants.slice(-overLimit).map((plant) => plant.plant_id));
}

function renderPlanStatusLine() {
  const active = activePlantCount();
  const limitText = formatPlantLimit(currentPlantLimit);
  const withinLimit = canActivateMorePlants();
  const overCount = overflowPlantCount();
  const tone = withinLimit ? '#8fb8a7' : '#ffb3a7';
  const badgeBg = withinLimit ? 'rgba(99,255,184,0.08)' : 'rgba(255,120,120,0.12)';
  const badgeBorder = withinLimit ? 'rgba(99,255,184,0.18)' : 'rgba(255,120,120,0.24)';
  return `
    <div style="margin-top:10px; padding:10px 12px; border-radius:12px; border:1px solid ${badgeBorder}; background:${badgeBg}; font-size:13px; color:${tone};">
      <strong style="color:#e8fff5;">Plan ${planLabel(currentPlan)}</strong> · Aktiv ${active} / ${limitText}${isOverPlantLimit() ? ` · ${overCount} über Limit, keine neuen aktiven Pflanzen möglich` : ` · ${Number.isFinite(remainingPlantSlots()) ? remainingPlantSlots() : '∞'} freie Slots`} · Quelle: ${currentPlanSource === 'account' ? 'Account' : 'Guest'}
    </div>
  `;
}

function setCheckoutState(next) {
  checkoutState = { ...checkoutState, ...next, updatedAt: new Date().toISOString() };
}

function resetCheckoutState(message = "Noch kein Upgrade gestartet.") {
  checkoutState = { status: "idle", plan: null, message, checkoutUrl: null, updatedAt: null };
}

function renderCheckoutStateCard() {
  const tone = checkoutState.status === "ready" ? "#9fd7ff" : checkoutState.status === "error" ? "#ffb3a7" : "#8fb8a7";
  const border = checkoutState.status === "ready" ? "rgba(159,215,255,0.25)" : checkoutState.status === "error" ? "rgba(255,120,120,0.24)" : "rgba(255,255,255,0.08)";
  const bg = checkoutState.status === "ready" ? "rgba(159,215,255,0.08)" : checkoutState.status === "error" ? "rgba(255,120,120,0.10)" : "rgba(255,255,255,0.03)";
  const updated = checkoutState.updatedAt ? ` · ${formatDate(checkoutState.updatedAt)}` : "";
  const action = checkoutState.checkoutUrl
    ? `<div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;"><a href="${checkoutState.checkoutUrl}" target="_blank" rel="noreferrer" style="color:#9fd7ff; text-decoration:none; font-weight:600;">Checkout öffnen</a><button type="button" data-checkout-webhook-plan="${checkoutState.plan || ''}" style="padding:6px 10px;">Webhook Erfolg simulieren</button></div>`
    : checkoutState.plan
      ? `<div style="margin-top:8px; font-size:12px; color:#8fb8a7;">Der Zahlungs-Flow ist als MVP vorbereitet. Sobald ein externer Checkout-Link vorhanden ist, kannst du ihn hier direkt öffnen.</div><div style="margin-top:8px;"><button type="button" data-checkout-webhook-plan="${checkoutState.plan || ''}" style="padding:6px 10px;">Webhook Erfolg simulieren</button></div>`
      : '';
  return `
    <div style="margin:12px 0; padding:12px; border-radius:12px; border:1px solid ${border}; background:${bg}; color:${tone}; font-size:12px; line-height:1.5;">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <strong style="color:#e8fff5;">Checkout-Status</strong>
        <span style="padding:4px 8px; border-radius:999px; background:rgba(255,255,255,0.06); color:${tone};">${checkoutState.status === 'ready' ? 'bereit' : checkoutState.status === 'error' ? 'Fehler' : 'idle'}</span>
      </div>
      <div style="margin-top:6px;">${checkoutState.message}${updated}</div>
      ${checkoutState.plan ? `<div style="margin-top:6px; color:#9fb8ad;">Zielplan: ${planLabel(checkoutState.plan)}</div>` : ''}
      ${action}
    </div>
  `;
}


function loadCheckoutHistory() {
  try {
    const raw = localStorage.getItem(CHECKOUT_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    checkoutHistory = Array.isArray(parsed) ? parsed : [];
  } catch {
    checkoutHistory = [];
  }
}

function persistCheckoutHistory() {
  try {
    localStorage.setItem(CHECKOUT_HISTORY_STORAGE_KEY, JSON.stringify(checkoutHistory.slice(0, 12)));
  } catch {}
}

function addCheckoutHistoryEntry(entry) {
  checkoutHistory = [
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...checkoutHistory,
  ].slice(0, 12);
  persistCheckoutHistory();
}

function mapServerHistoryEntry(entry) {
  return {
    id: entry?.event_id || entry?.eventId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: entry?.created_at || entry?.createdAt || new Date().toISOString(),
    plan: normalizePlan(entry?.plan || "free"),
    previousPlan: entry?.previous_plan || entry?.previousPlan || null,
    checkoutId: entry?.checkout_id || entry?.checkoutId || null,
    provider: entry?.provider || null,
    eventKind: entry?.event_kind || entry?.eventKind || "status",
    checkoutStatus: entry?.checkout_status || entry?.checkoutStatus || null,
    status: String(entry?.checkout_status || entry?.checkoutStatus || entry?.event_kind || entry?.eventKind || "info").toLowerCase(),
    message: entry?.message || "Kein Detailtext vorhanden.",
    mode: String(entry?.event_kind || entry?.eventKind || "status").includes("webhook") ? "webhook" : "checkout",
    source: "server",
  };
}

async function loadSubscriptionHistory() {
  if (currentPlanSource !== "account") {
    subscriptionHistory = [];
    subscriptionHistorySource = "local";
    return;
  }
  try {
    const result = await invoke("subscription_history_smart");
    const items = Array.isArray(result?.history) ? result.history : [];
    subscriptionHistory = items.map(mapServerHistoryEntry);
    subscriptionHistorySource = "server";
  } catch (_) {
    subscriptionHistory = [];
    subscriptionHistorySource = "local";
  }
}


function activeSubscriptionHistory() {
  return subscriptionHistorySource === 'server' && subscriptionHistory.length ? subscriptionHistory : checkoutHistory;
}

function latestSubscriptionHistoryEntry() {
  const history = activeSubscriptionHistory();
  return history.length ? history[0] : null;
}

function normalizedSubscriptionLifecycleStatus() {
  const latest = latestSubscriptionHistoryEntry();
  const raw = String(latest?.checkoutStatus || latest?.status || latest?.eventKind || checkoutState.status || '').toLowerCase();
  if (checkoutState.status === 'error' || raw.includes('error') || raw.includes('fail')) return 'error';
  if (raw.includes('pending') || raw.includes('prepared') || raw.includes('await')) return 'pending';
  if (raw.includes('paid') || raw.includes('active') || raw.includes('success') || raw.includes('activated') || checkoutState.status === 'ready') return 'active';
  return currentPlanSource === 'account' ? 'active' : 'guest';
}

function renderUnifiedSubscriptionStatusCard() {
  const latest = latestSubscriptionHistoryEntry();
  const lifecycle = normalizedSubscriptionLifecycleStatus();
  const tone = lifecycle === 'error'
    ? '#ffb3a7'
    : lifecycle === 'pending'
      ? '#9fd7ff'
      : lifecycle === 'guest'
        ? '#8fb8a7'
        : '#9ff1c5';
  const border = lifecycle === 'error'
    ? 'rgba(255,120,120,0.24)'
    : lifecycle === 'pending'
      ? 'rgba(159,215,255,0.22)'
      : lifecycle === 'guest'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(99,255,184,0.18)';
  const bg = lifecycle === 'error'
    ? 'rgba(255,120,120,0.10)'
    : lifecycle === 'pending'
      ? 'rgba(159,215,255,0.08)'
      : lifecycle === 'guest'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(99,255,184,0.07)';
  const statusLabel = lifecycle === 'error'
    ? 'Problem'
    : lifecycle === 'pending'
      ? 'Checkout offen'
      : lifecycle === 'guest'
        ? 'Guest / Free'
        : 'Aktiv';
  const latestLine = latest
    ? `${latest.message || 'Letzte Statusänderung gespeichert.'} · ${formatDate(latest.createdAt)}`
    : currentPlanSource === 'account'
      ? 'Noch keine serverseitige Abo-Aktivität vorhanden.'
      : 'Ohne Login bleibst du im Free-Plan.';
  const historySourceLabel = subscriptionHistorySource === 'server' && subscriptionHistory.length ? 'Backend' : 'Lokal';
  const active = activePlantCount();
  const limitText = formatPlantLimit(currentPlantLimit);
  const capacityLine = isOverPlantLimit()
    ? `${overflowPlantCount()} aktive Pflanzen liegen aktuell über deinem Planlimit. Bestehende Runs bleiben aktiv, aber neue Pflanzen und Reaktivierungen sind blockiert.`
    : `Du nutzt aktuell ${active} von ${limitText} aktiven Pflanzen. ${Number.isFinite(remainingPlantSlots()) ? `${remainingPlantSlots()} freie Slots.` : 'Keine Begrenzung.'}`;
  const endedCount = summaryPlantCount('ended_plants', plants.filter((plant) => isPlantEnded(plant)).length);
  const archivedCount = summaryPlantCount('archived_plants', plants.filter((plant) => isPlantArchived(plant)).length);
  const visibleCount = summaryPlantCount('visible_plants', plants.filter((plant) => plantStatusValue(plant) !== "deleted").length);
  const detailLine = subscriptionStatusSummary ? `Beendet: ${endedCount} · Archiviert: ${archivedCount} · Sichtbar: ${visibleCount} · Grandfathered aktiv: ${subscriptionStatusSummary.grandfathered_active_plants ?? 0}` : '';
  return `
    <div style="margin:12px 0; padding:12px; border-radius:12px; border:1px solid ${border}; background:${bg}; color:${tone}; font-size:12px; line-height:1.55;">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; flex-wrap:wrap;">
        <strong style="color:#e8fff5;">Abo-Status</strong>
        <span style="padding:4px 8px; border-radius:999px; background:rgba(255,255,255,0.06); color:${tone};">${statusLabel}</span>
      </div>
      <div style="margin-top:8px; color:#e8fff5;"><strong>${planLabel(currentPlan)}</strong> · ${PLAN_CONFIG.find((entry) => entry.key === currentPlan)?.price || '0 € / Monat'} · ${PLAN_CONFIG.find((entry) => entry.key === currentPlan)?.limitText || ''}</div>
      <div style="margin-top:6px; color:#9fb8ad;">${capacityLine}</div>
      ${detailLine ? `<div style="margin-top:6px; color:#8fb8a7;">${detailLine}</div>` : ''}
      <div style="margin-top:6px; color:#8fb8a7;">Quelle: ${currentPlanSource === 'account' ? 'Account' : 'Guest'} · Historie: ${historySourceLabel}</div>
      <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); color:#b7d8cb;">${latestLine}</div>
      ${checkoutState.plan && checkoutState.plan !== currentPlan ? `<div style="margin-top:6px; color:#9fd7ff;">Checkout-Ziel: ${planLabel(checkoutState.plan)}</div>` : ''}
    </div>
  `;
}

function renderCheckoutHistoryCard() {
  const activeHistory = subscriptionHistorySource === 'server' && subscriptionHistory.length ? subscriptionHistory : checkoutHistory;
  const sourceLabel = subscriptionHistorySource === 'server' && subscriptionHistory.length ? 'Backend' : 'Lokal';
  const items = activeHistory.slice(0, 8).map((entry) => {
    const statusTone = String(entry.status || '').includes('success') || String(entry.status || '').includes('active')
      ? '#9ff1c5'
      : String(entry.status || '').includes('error') || String(entry.status || '').includes('fail')
        ? '#ffb3a7'
        : '#9fd7ff';
    const modeLabel = entry.mode === 'webhook'
      ? 'Webhook'
      : entry.mode === 'checkout'
        ? 'Checkout'
        : 'Status';
    const planText = entry.plan ? planLabel(entry.plan) : '—';
    const eventMeta = entry.eventKind ? ` · ${String(entry.eventKind).replaceAll('_', ' ')}` : '';
    return `
      <div style="padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); font-size:12px; line-height:1.45;">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <strong style="color:#e8fff5;">${modeLabel} · ${planText}${eventMeta}</strong>
          <span style="padding:4px 8px; border-radius:999px; background:rgba(255,255,255,0.06); color:${statusTone};">${entry.status || 'info'}</span>
        </div>
        <div style="margin-top:6px; color:#9fb8ad;">${entry.message || 'Kein Detailtext vorhanden.'}</div>
        <div style="margin-top:6px; color:#8fb8a7;">${formatDate(entry.createdAt)}${entry.checkoutId ? ` · ${entry.checkoutId}` : ''}${entry.provider ? ` · ${entry.provider}` : ''}</div>
      </div>
    `;
  }).join('');

  return `
    <div style="margin-top:12px; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.02);">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:8px;">
        <strong style="color:#e8fff5;">Checkout-Historie</strong>
        <span style="font-size:12px; color:#8fb8a7;">${activeHistory.length} Einträge · ${sourceLabel}</span>
      </div>
      ${items || '<div style="font-size:12px; color:#8fb8a7;">Noch keine Checkout- oder Webhook-Aktivität.</div>'}
    </div>
  `;
}

const PLAN_CONFIG = [
  { key: "free", title: "Free", price: "0 € / Monat", limitText: "1 aktive Pflanze", accent: "#8fb8a7", detail: "Perfekt zum Starten mit einer einzelnen Pflanze." },
  { key: "basic", title: "Basic", price: "0,99 € / Monat", limitText: "3 aktive Pflanzen", accent: "#63ffb8", detail: "Für kleine Setups mit etwas mehr Übersicht." },
  { key: "pro", title: "Pro", price: "5,99 € / Monat", limitText: "100 aktive Pflanzen", accent: "#9fd7ff", detail: "Für größere private Setups mit viel Spielraum." },
  { key: "csc", title: "CSC", price: "50 € / Monat", limitText: "Unbegrenzt aktive Pflanzen", accent: "#ffd76e", detail: "Für Clubs und Teams mit sehr vielen aktiven Pflanzen." },
];

function planPreviewFor(targetPlan) {
  const normalized = normalizePlan(targetPlan);
  const currentActive = activePlantCount();
  const nextLimit = planLimitFor(normalized);
  const overAfterChange = Number.isFinite(nextLimit) && currentActive > nextLimit;
  const remainingSlots = Number.isFinite(nextLimit) ? Math.max(0, nextLimit - currentActive) : null;
  const title = planLabel(normalized);
  const price = PLAN_CONFIG.find((entry) => entry.key === normalized)?.price || "";
  const tone = overAfterChange ? '#ffd1c7' : '#a9f7cd';
  const bg = overAfterChange ? 'rgba(255,120,120,0.10)' : 'rgba(99,255,184,0.08)';
  const border = overAfterChange ? 'rgba(255,120,120,0.24)' : 'rgba(99,255,184,0.18)';
  const summary = overAfterChange
    ? `Du würdest mit ${currentActive} aktiven Pflanzen über dem ${title}-Limit von ${formatPlantLimit(nextLimit)} liegen. Deine laufenden Pflanzen bleiben aktiv, aber neue Pflanzen oder Reaktivierungen werden blockiert, bis du wieder auf ${formatPlantLimit(nextLimit)} oder weniger aktive Pflanzen kommst.`
    : `Nach dem Wechsel auf ${title} kannst du aktuell noch ${remainingSlots === null ? 'unbegrenzt viele' : remainingSlots} weitere aktive Pflanze${remainingSlots === 1 ? '' : 'n'} anlegen oder reaktivieren.`;
  const cleanupHint = overAfterChange
    ? 'Platz schaffst du durch Löschen oder Archivieren bestehender aktiver Pflanzen.'
    : 'Deine bestehenden Pflanzen und Runs bleiben unverändert erhalten.';
  return {
    title,
    price,
    summary,
    cleanupHint,
    tone,
    bg,
    border,
    overAfterChange,
  };
}

function renderSubscriptionPanel() {
  if (!subscriptionPanel) return;
  const sessionHint = currentPlanSource === "account"
    ? "Du kannst deinen Plan hier direkt im Desktop-Client umstellen. Vor dem Wechsel siehst du jetzt eine Vorschau, was mit deinem aktuellen Pflanzenstand passiert."
    : "Im Guest-Modus bleibt der Plan auf Free. Melde dich an, um Basic, Pro oder CSC zu aktivieren.";
  const cards = PLAN_CONFIG.map((plan) => {
    const active = normalizePlan(plan.key) === currentPlan;
    const buttonDisabled = currentPlanSource !== "account" || active;
    const buttonLabel = active ? "Aktiv" : currentPlanSource !== "account" ? "Login nötig" : `Checkout für ${plan.title} vorbereiten`;
    const border = active ? `1px solid ${plan.accent}` : '1px solid rgba(255,255,255,0.08)';
    const glow = active ? `0 0 0 1px ${plan.accent} inset, 0 0 18px rgba(99,255,184,0.08)` : 'none';
    const preview = !active ? planPreviewFor(plan.key) : null;
    return `
      <div style="padding:14px; border-radius:16px; background:#08120f; border:${border}; box-shadow:${glow};">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <strong style="font-size:16px; color:${active ? plan.accent : '#e8fff5'};">${plan.title}</strong>
          <span style="font-size:12px; padding:4px 8px; border-radius:999px; background:${active ? 'rgba(99,255,184,0.12)' : 'rgba(255,255,255,0.06)'}; color:${active ? plan.accent : '#9fb8ad'};">${active ? 'Aktiv' : 'Plan'}</span>
        </div>
        <div style="margin-top:8px; font-size:14px; color:#e8fff5;">${plan.price}</div>
        <div style="margin-top:6px; font-size:13px; color:#9fb8ad;">${plan.limitText}</div>
        <div style="margin-top:8px; font-size:12px; color:#8fb8a7; line-height:1.5;">${plan.detail}</div>
        ${preview ? `<div style="margin-top:10px; padding:10px 12px; border-radius:12px; border:1px solid ${preview.border}; background:${preview.bg}; color:${preview.tone}; font-size:12px; line-height:1.5;">
          <div style="font-weight:700; color:#e8fff5; margin-bottom:4px;">Vorschau für ${preview.title}</div>
          <div>${preview.summary}</div>
          <div style="margin-top:6px; color:#9fe0c1;">${preview.cleanupHint}</div>
        </div>` : ''}
        <button ${buttonDisabled ? 'disabled' : ''} data-plan-action="${plan.key}" style="margin-top:12px; width:100%; opacity:${buttonDisabled ? '0.6' : '1'};">${buttonLabel}</button>
        ${!active && currentPlanSource === "account" ? `<div style="margin-top:6px; font-size:11px; color:#8fb8a7;">MVP: Der Checkout wird vorbereitet und der Zielplan direkt an das Backend übergeben.</div>` : ''}
      </div>
    `;
  }).join('');
  subscriptionPanel.innerHTML = `
    <h2 style="margin-top:0; color:#63ffb8; font-size:18px;">Abo & Billing</h2>
    <div style="font-size:13px; color:#8fb8a7; line-height:1.5; margin-bottom:12px;">${sessionHint}</div>
    <div style="margin-bottom:12px; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#9fb8ad; font-size:12px; line-height:1.5;">
      Planwechsel-Regel: Bereits aktive Pflanzen bleiben bei einem Downgrade erhalten. Nur neue aktive Pflanzen oder Reaktivierungen werden blockiert, solange du über dem Limit des neuen Plans liegst.
    </div>
    <div style="margin-bottom:12px; padding:10px 12px; border-radius:12px; border:1px solid rgba(99,255,184,0.10); background:#091411; color:#8fb8a7; font-size:12px; line-height:1.6;">
      MVP-Status für Billing: Planstatus, Slot-Vorschau und Checkout-Historie sind bereits im Client sichtbar. Für produktiven Einsatz fehlt vor allem noch die vollständige externe Zahlungsverdrahtung.
    </div>
    ${renderUnifiedSubscriptionStatusCard()}
    ${renderCheckoutStateCard()}
    ${renderCheckoutHistoryCard()}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-top:12px;">${cards}</div>
  `;
}

const PLANT_FILTER_STORAGE_KEYS = {
  search: 'bs_plants_search_query',
  phase: 'bs_plants_phase_filter',
  state: 'bs_plants_state_filter',
  sort: 'bs_plants_sort',
};

function loadPlantFilterPrefs() {
  try {
    plantSearchQuery = localStorage.getItem(PLANT_FILTER_STORAGE_KEYS.search) || "";
    plantPhaseFilter = localStorage.getItem(PLANT_FILTER_STORAGE_KEYS.phase) || "all";
    plantStateFilter = localStorage.getItem(PLANT_FILTER_STORAGE_KEYS.state) || "all";
    plantSort = localStorage.getItem(PLANT_FILTER_STORAGE_KEYS.sort) || "updated_desc";
  } catch (_) {}
}

function persistPlantFilterPrefs() {
  try {
    localStorage.setItem(PLANT_FILTER_STORAGE_KEYS.search, plantSearchQuery || "");
    localStorage.setItem(PLANT_FILTER_STORAGE_KEYS.phase, plantPhaseFilter || "all");
    localStorage.setItem(PLANT_FILTER_STORAGE_KEYS.state, plantStateFilter || "all");
    localStorage.setItem(PLANT_FILTER_STORAGE_KEYS.sort, plantSort || "updated_desc");
  } catch (_) {}
}

function applyPlantFilterPrefsToControls() {
  if ($("plantSearch")) $("plantSearch").value = plantSearchQuery;
  if ($("plantPhaseFilter")) $("plantPhaseFilter").value = plantPhaseFilter;
  if ($("plantStateFilter")) $("plantStateFilter").value = plantStateFilter;
  if ($("plantSort")) $("plantSort").value = plantSort;
}

const plantFormError = $("plantFormError");
const taskFormError = $("taskFormError");
const logFormError = $("logFormError");
const plantPlanHint = $("plantPlanHint");

function showFormError(node, message) {
  node.textContent = message;
  node.style.display = message ? "block" : "none";
}

function clearFormError(node) {
  showFormError(node, "");
}

function resetPlantForm() {
  $("plantName").value = "";
  $("plantColor").value = "#0B3D2E";
  $("plantPhase").value = "veg";
  clearFormError(plantFormError);
}

function timelineDefaultDueValue() {
  const baseKey = timelineFocusKey || new Date().toISOString().slice(0, 10);
  return `${baseKey}T09:00`;
}

function applyTimelineDueToTaskForm() {
  const input = $("taskDueAt");
  if (!input) return;
  input.value = timelineDefaultDueValue();
}

function timelineDefaultLogValue() {
  const baseKey = timelineFocusKey || new Date().toISOString().slice(0, 10);
  return `${baseKey}T12:00`;
}

function applyTimelineDateToLogForm() {
  const input = $("logCreatedAt");
  if (!input) return;
  input.value = timelineDefaultLogValue();
  const hint = $("logDateHint");
  if (hint) hint.textContent = `Log-Zeitpunkt: ${dateLabelFromKey(timelineFocusKey || new Date().toISOString().slice(0, 10))}`;
}

function resetTaskForm() {
  $("taskTitle").value = "";
  $("taskCategory").value = "water";
  $("taskRepeat").value = "";
  const toggle = $("taskNotificationEnabled");
  if (toggle) toggle.checked = true;
  applyTimelineDueToTaskForm();
  clearFormError(taskFormError);
}

const TASK_TEMPLATES = {
  water: {
    title: "Gießen",
    category: "water",
    repeatHours: 48,
    notificationEnabled: true,
  },
  feed: {
    title: "Düngen",
    category: "feed",
    repeatHours: 168,
    notificationEnabled: true,
  },
  check: {
    title: "Check-in",
    category: "check",
    repeatHours: 24,
    notificationEnabled: true,
  },
  train: {
    title: "Training / LST prüfen",
    category: "train",
    repeatHours: 72,
    notificationEnabled: true,
  },
};

function applyTaskTemplate(templateKey) {
  if (templateKey === "reset") {
    resetTaskForm();
    return;
  }
  const template = TASK_TEMPLATES[templateKey];
  if (!template) return;
  $("taskTitle").value = template.title;
  $("taskCategory").value = template.category;
  $("taskRepeat").value = template.repeatHours ?? "";
  const toggle = $("taskNotificationEnabled");
  if (toggle) toggle.checked = template.notificationEnabled !== false;
  applyTimelineDueToTaskForm();
  clearFormError(taskFormError);
  $("taskTitle")?.focus();
  $("taskTitle")?.select();
}

const TASK_SETS = {
  starter: [
    { title: "Check-in", category: "check", repeat_interval_hours: 24, notification_enabled: true, offsetHours: 0 },
    { title: "Gießen", category: "water", repeat_interval_hours: 48, notification_enabled: true, offsetHours: 12 },
    { title: "Düngen", category: "feed", repeat_interval_hours: 168, notification_enabled: true, offsetHours: 72 },
  ],
  watering: [
    { title: "Gießen", category: "water", repeat_interval_hours: 48, notification_enabled: true, offsetHours: 0 },
    { title: "Drain & Feuchte prüfen", category: "check", repeat_interval_hours: 48, notification_enabled: true, offsetHours: 6 },
    { title: "Nächstes Gießen vorbereiten", category: "note", repeat_interval_hours: 48, notification_enabled: false, offsetHours: 42 },
  ],
  flower: [
    { title: "Blüte-Check", category: "check", repeat_interval_hours: 24, notification_enabled: true, offsetHours: 0 },
    { title: "Gießen Blüte", category: "water", repeat_interval_hours: 48, notification_enabled: true, offsetHours: 10 },
    { title: "Training / Support prüfen", category: "train", repeat_interval_hours: 72, notification_enabled: true, offsetHours: 36 },
  ],
};

const TASK_SET_LABELS = {
  starter: "Starter-Woche",
  watering: "Gießroutine",
  flower: "Blüte-Checks",
};

const PHASE_TASK_SET_SUGGESTIONS = {
  seed: ["starter"],
  veg: ["starter", "watering"],
  flower: ["flower", "watering"],
  harvest: ["flower"],
  dry: ["watering"],
  cure: ["watering"],
  custom: ["starter", "watering"],
};

function phaseSuggestedSetKeys(phase) {
  return PHASE_TASK_SET_SUGGESTIONS[phase || "veg"] || PHASE_TASK_SET_SUGGESTIONS.veg;
}


const PHASE_HINTS = {
  seed: [
    { tone: "focus", title: "Sanfter Start", text: "Halte Check-ins kurz und regelmäßig. In der frühen Phase zählen Konstanz und ruhige Beobachtung." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Plane eher kleine tägliche Kontrollen statt viele schwere Aktionen auf einmal." },
  ],
  veg: [
    { tone: "focus", title: "Wachstum im Blick", text: "Jetzt lohnt sich eine klare Gieß- und Check-Routine. Offene Tasks sollten sichtbar und rhythmisch bleiben." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Verteile Training, Check-in und Gießen über die Woche, damit der Kalender nicht an einem Tag überfüllt ist." },
  ],
  flower: [
    { tone: "focus", title: "Blüte-Fokus", text: "Achte auf engere Check-Abstände, offene Reminder und saubere Log-Einträge für Auffälligkeiten." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Nutze wiederkehrende Tasks für Blüte-Checks und Wasser, damit die Woche planbar bleibt." },
  ],
  harvest: [
    { tone: "focus", title: "Erntefenster", text: "Halte letzte Checks, Notizen und Tageslogs eng zusammen, damit Entscheidungen später nachvollziehbar bleiben." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Blocke dir bewusst freie Tage für Kontrolle, Erntevorbereitung und Log-Dokumentation." },
  ],
  dry: [
    { tone: "focus", title: "Ruhige Nachpflege", text: "In dieser Phase sind kleine tägliche Kontrollen oft wichtiger als viele neue Tasks." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Nutze kurze Reminder für Checks und halte Logs knapp, aber regelmäßig." },
  ],
  cure: [
    { tone: "focus", title: "Konstanz halten", text: "Wiederkehrende kurze Check-Tasks helfen dir, die Routine sauber über mehrere Tage zu halten." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Lege feste Wochenpunkte für Kontrolle und Log-Einträge fest, statt spontan zu arbeiten." },
  ],
  custom: [
    { tone: "focus", title: "Eigener Flow", text: "Nutze Templates und Sets, um deinen eigenen Rhythmus je Pflanze trotzdem konsistent abzubilden." },
    { tone: "calendar", title: "Kalender-Tipp", text: "Wenn die Phase individuell ist, helfen klare Titel und saubere Fälligkeiten im Kalender besonders." },
  ],
};

function phaseHintsForPlant(plant) {
  if (!plant) return [];
  return PHASE_HINTS[plant.phase || 'veg'] || PHASE_HINTS.veg;
}

function phaseHintToneStyles(tone) {
  if (tone === 'calendar') {
    return { border: 'rgba(143,184,167,0.18)', bg: '#0a1512', accent: '#b7d8cb' };
  }
  return { border: 'rgba(99,255,184,0.18)', bg: '#0d1c17', accent: '#63ffb8' };
}

function renderPhaseHintCards(plant, compact = false) {
  const hints = phaseHintsForPlant(plant);
  if (!hints.length) return '';
  return hints.map((hint) => {
    const tone = phaseHintToneStyles(hint.tone);
    return `
      <div style="padding:${compact ? '10px' : '12px'}; border-radius:12px; background:${tone.bg}; border:1px solid ${tone.border};">
        <div style="font-size:12px; color:${tone.accent};">${hint.title}</div>
        <div style="margin-top:6px; font-size:${compact ? '12px' : '13px'}; color:#dffcef; line-height:1.45;">${hint.text}</div>
      </div>`;
  }).join('');
}

function phasePrimaryTaskTitle(phase) {
  const map = {
    seed: 'Sanfter Check-in',
    veg: 'Wachstums-Check',
    flower: 'Blüte-Check',
    harvest: 'Ernte-Vorbereitung',
    dry: 'Trocknungs-Check',
    cure: 'Curing-Check',
    custom: 'Phasen-Task',
  };
  return map[phase] || 'Phasen-Task';
}

function phasePreferredTimelineMode(phase) {
  const map = {
    seed: 'day',
    veg: 'week',
    flower: 'week',
    harvest: 'day',
    dry: 'day',
    cure: 'week',
    custom: 'week',
  };
  return map[phase] || 'week';
}

function renderPhaseHintActions(plant, compact = false) {
  if (!plant) return '';
  const suggested = phaseSuggestedSetKeys(plant.phase);
  const primarySet = suggested[0] || 'starter_week';
  return `
    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:${compact ? '8px' : '10px'};">
      <button type="button" data-phase-action="set" data-phase-set="${primarySet}" style="border:1px solid rgba(99,255,184,0.18); background:#0d1c17; color:#dffcef;">Set anwenden</button>
      <button type="button" data-phase-action="task" style="border:1px solid rgba(99,255,184,0.14); background:#091411; color:#dffcef;">Task vorbereiten</button>
      <button type="button" data-phase-action="focus" style="border:1px solid rgba(143,184,167,0.18); background:#0a1512; color:#b7d8cb;">Kalenderfokus setzen</button>
      <div style="font-size:12px; color:#8fb8a7;">${TASK_SET_LABELS[primarySet] || 'Standardset'} · ${phaseLabel(plant.phase)}</div>
    </div>`;
}

async function runPhaseHintAction(action, plantId, setKey = null) {
  if (!plantId) return;
  const plant = plants.find((entry) => entry.plant_id === plantId);
  if (!plant) return;
  if (selectedPlantId !== plantId) {
    await focusPlantFromHome(plantId);
  }
  if (action === 'set') {
    await createTaskSet(setKey || phaseSuggestedSetKeys(plant.phase)[0] || 'starter_week');
    return;
  }
  if (action === 'task') {
    await prepareTaskFromHome(plantId, { prefillTitle: phasePrimaryTaskTitle(plant.phase) });
    return;
  }
  if (action === 'focus') {
    timelineMode = phasePreferredTimelineMode(plant.phase);
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
    return;
  }
}

function renderPhaseTaskSets() {
  if (!phaseTaskSetBar) return;
  const plant = selectedPlant();
  if (!plant) {
    phaseTaskSetBar.innerHTML = `<div style="font-size:12px; color:#8fb8a7;">Wähle eine Pflanze aus, um phasenbasierte Sets zu sehen.</div>`;
    return;
  }
  const keys = phaseSuggestedSetKeys(plant.phase);
  phaseTaskSetBar.innerHTML = keys.map((key) => `
    <button type="button" data-phase-task-set="${key}" style="border:1px solid rgba(99,255,184,0.18); background:#0a1512; color:#dffcef;">${TASK_SET_LABELS[key] || key}</button>`).join("")
    + `<div style="font-size:12px; color:#8fb8a7; align-self:center;">Empfohlen für ${phaseLabel(plant.phase)}</div>`;
}


function addHoursToIso(baseIso, hours) {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return baseIso;
  base.setHours(base.getHours() + hours);
  return base.toISOString();
}

async function createTaskSet(setKey) {
  clearFormError(taskFormError);
  if (!selectedPlantId) {
    showFormError(taskFormError, "Wähle zuerst eine Pflanze aus.");
    return;
  }
  const set = TASK_SETS[setKey];
  if (!set) return;
  const baseDue = datetimeLocalToIso($("taskDueAt").value) || datetimeLocalToIso(timelineDefaultDueValue()) || new Date().toISOString();
  try {
    for (const item of set) {
      await invoke("create_task_smart", {
        payload: {
          plant_id: selectedPlantId,
          title: item.title,
          category: item.category,
          due_at: addHoursToIso(baseDue, item.offsetHours ?? 0),
          repeat_interval_hours: item.repeat_interval_hours ?? null,
          notification_enabled: item.notification_enabled !== false,
        },
      });
    }
    logOut({ ok: true, task_set: setKey, created: set.length });
    await refreshAll({ autoReminderReason: "task_set_create" });
  } catch (err) {
    showFormError(taskFormError, `Standardset konnte nicht angelegt werden: ${err}`);
  }
}

function resetLogForm() {
  $("logText").value = "";
  $("logPh").value = "";
  $("logEc").value = "";
  $("logTemp").value = "";
  $("logRh").value = "";
  applyTimelineDateToLogForm();
  clearFormError(logFormError);
}

function parseOptionalNumber(inputId) {
  const raw = $(inputId).value.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}


function logOut(data) {
  output.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function phaseLabel(phase) {
  return (phase || "veg").replace(/_/g, " ");
}

function formatDate(value) {
  if (!value) return "-";
  try { return new Date(value).toLocaleString("de-DE"); } catch { return value; }
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function selectedPlant() {
  return plants.find((p) => p.plant_id === selectedPlantId) || null;
}

function plantNameById(plantId) {
  return plants.find((plant) => plant.plant_id === plantId)?.name || "Unbekannte Pflanze";
}

async function focusPlantFromHome(plantId) {
  if (!plantId) return;
  selectedPlantId = plantId;
  renderPlants();
  await loadTasks();
  await loadLogs();
  renderDetailPanel();
  renderTimelinePanel();
  renderReminderPanel();
}

async function prepareLogFromHome(plantId, options = {}) {
  if (!plantId) return;
  await focusPlantFromHome(plantId);
  const targetKey = options.dayKey || normalizeDateKey(options.createdAt) || new Date().toISOString().slice(0, 10);
  setTimelineFocusDay(targetKey);
  timelineMode = 'day';
  renderTimelinePanel();
  renderHomePanel();
  applyTimelineDateToLogForm();
  if (options.prefillText) {
    $("logText").value = options.prefillText;
  }
  $('logText')?.focus();
}

async function prepareTaskFromHome(plantId, options = {}) {
  if (!plantId) return;
  await focusPlantFromHome(plantId);
  const targetKey = options.dayKey || normalizeDateKey(options.dueAt) || new Date().toISOString().slice(0, 10);
  setTimelineFocusDay(targetKey);
  timelineMode = 'day';
  renderTimelinePanel();
  renderHomePanel();
  applyTimelineDueToTaskForm();
  if (options.prefillTitle) {
    $("taskTitle").value = options.prefillTitle;
  }
  $('taskTitle')?.focus();
}

function passesHomeLogRangeFilter(log) {
  if (!log || !log.created_at) return homeLogRangeFilter === 'all';
  const logTime = new Date(log.created_at).getTime();
  if (Number.isNaN(logTime)) return homeLogRangeFilter === 'all';
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (homeLogRangeFilter === 'today') {
    return normalizeDateKey(log.created_at) === new Date().toISOString().slice(0, 10);
  }
  if (homeLogRangeFilter === '7d') return logTime >= now - (7 * dayMs);
  if (homeLogRangeFilter === '30d') return logTime >= now - (30 * dayMs);
  return true;
}

function filteredHomeActivityLogs() {
  return [...allLogs]
    .filter((log) => homeLogPlantFilter === 'all' || log.plant_id === homeLogPlantFilter)
    .filter((log) => homeLogTypeFilter === 'all' || (log.log_type || 'note') === homeLogTypeFilter)
    .filter((log) => passesHomeLogRangeFilter(log))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function homeMonthGridData() {
  const focusKey = homeMonthFocusKey || new Date().toISOString().slice(0, 10);
  return monthGridFromFocusKey(focusKey).map(({ key, inMonth }) => {
    const dayTasks = allTasks.filter((task) => normalizeDateKey(task.due_at || task.updated_at || task.created_at) === key);
    const openTasks = dayTasks.filter((task) => task.status === "open");
    const doneTasks = dayTasks.filter((task) => task.status === "done");
    const dayLogs = allLogs.filter((log) => normalizeDateKey(log.created_at) === key);
    const topPlants = [...new Set([...openTasks.slice(0,2).map((t)=>t.plant_id), ...dayLogs.slice(0,2).map((l)=>l.plant_id)].filter(Boolean))];
    return {
      key,
      inMonth,
      dayNumber: dateFromKey(key).getDate(),
      openCount: openTasks.length,
      doneCount: doneTasks.length,
      logCount: dayLogs.length,
      plantIds: topPlants,
      topTasks: openTasks.sort((a,b)=> new Date(a.due_at||0).getTime()-new Date(b.due_at||0).getTime()).slice(0,2),
    };
  });
}

function navigateHomeMonth(delta) {
  homeMonthFocusKey = addMonthsToKey(homeMonthFocusKey || new Date().toISOString().slice(0, 10), delta);
  renderHomePanel();
}


function renderHomeSubscriptionCard() {
  const active = activePlantCount();
  const ended = summaryPlantCount('ended_plants', plants.filter((plant) => isPlantEnded(plant)).length);
  const archived = summaryPlantCount('archived_plants', plants.filter((plant) => isPlantArchived(plant)).length);
  const visible = summaryPlantCount('visible_plants', plants.filter((plant) => plantStatusValue(plant) !== "deleted").length);
  const limit = currentPlantLimit;
  const over = overflowPlantCount();
  const remaining = remainingPlantSlots();
  const limitText = formatPlantLimit(limit);
  const sourceLabel = currentPlanSource === 'account' ? 'Account' : 'Guest';
  const latestHistory = (subscriptionHistorySource === 'server' && subscriptionHistory.length ? subscriptionHistory : checkoutHistory)[0] || null;
  const latestEvent = latestHistory
    ? `${latestHistory.mode || latestHistory.eventKind || 'Abo'} · ${latestHistory.plan ? planLabel(latestHistory.plan) : '—'} · ${latestHistory.status || '—'}`
    : 'Noch kein Abo-Ereignis';
  const lifecycle = normalizedSubscriptionLifecycleStatus();
  const statusLabel = lifecycle === 'error'
    ? 'Problem'
    : lifecycle === 'pending'
      ? 'Checkout offen'
      : lifecycle === 'guest'
        ? 'Guest / Free'
        : 'Aktiv';
  const toneBorder = isOverPlantLimit()
    ? 'rgba(255,122,122,0.28)'
    : remaining === 0
      ? 'rgba(255,214,102,0.22)'
      : 'rgba(99,255,184,0.18)';
  const toneGlow = isOverPlantLimit()
    ? '0 0 0 1px rgba(255,122,122,0.08) inset'
    : remaining === 0
      ? '0 0 0 1px rgba(255,214,102,0.06) inset'
      : '0 0 0 1px rgba(99,255,184,0.05) inset';
  const headline = isOverPlantLimit()
    ? `${over} über deinem Planlimit`
    : Number.isFinite(remaining)
      ? `${remaining} freie Slots`
      : 'Unbegrenzt freie Slots';
  const subline = isOverPlantLimit()
    ? 'Bestehende Pflanzen bleiben aktiv. Neue Pflanzen oder Reaktivierungen sind aktuell blockiert.'
    : Number.isFinite(remaining)
      ? 'Du kannst neue aktive Pflanzen anlegen, solange noch Slots frei sind.'
      : 'Dein Plan erlaubt praktisch unbegrenzt aktive Pflanzen.';
  return `
    <div style="display:grid; gap:10px; padding:12px; border-radius:12px; background:#091411; border:1px solid ${toneBorder}; box-shadow:${toneGlow};">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
        <div>
          <div style="font-size:13px; color:#8fb8a7;">Abo & Pflanzenslots</div>
          <div style="margin-top:4px; font-size:18px; font-weight:700; color:#e8fff5;">${planLabel(currentPlan)} · Aktiv ${active} / ${limitText}</div>
          <div style="margin-top:4px; font-size:12px; color:${isOverPlantLimit() ? '#ff9b9b' : '#8fb8a7'};">${headline}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <span style="padding:6px 10px; border-radius:999px; background:rgba(99,255,184,0.10); color:#63ffb8; font-size:11px;">Quelle ${sourceLabel}</span>
          <span style="padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.06); color:#dcefe8; font-size:11px;">${PLAN_CONFIG.find((entry) => entry.key === currentPlan)?.price || '0 € / Monat'}</span>
        </div>
      </div>
      <div style="font-size:12px; color:#9fb8ad; line-height:1.5;">${subline}</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
        <div style="padding:10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
          <div style="font-size:11px; color:#8fb8a7;">Aktiver Plan</div>
          <div style="margin-top:4px; font-size:15px; color:#e8fff5; font-weight:700;">${planLabel(currentPlan)}</div>
        </div>
        <div style="padding:10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
          <div style="font-size:11px; color:#8fb8a7;">Slots</div>
          <div style="margin-top:4px; font-size:15px; color:#e8fff5; font-weight:700;">${active} / ${limitText}</div>
        </div>
        <div style="padding:10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
          <div style="font-size:11px; color:#8fb8a7;">Checkout-Status</div>
          <div style="margin-top:4px; font-size:15px; color:#e8fff5; font-weight:700;">${statusLabel}</div>
        </div>
        <div style="padding:10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
          <div style="font-size:11px; color:#8fb8a7;">Statusmix</div>
          <div style="margin-top:4px; font-size:13px; color:#dcefe8; font-weight:600;">Beendet ${ended} · Archiviert ${archived} · Sichtbar ${visible}</div>
        </div>
        <div style="padding:10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
          <div style="font-size:11px; color:#8fb8a7;">Letztes Abo-Ereignis</div>
          <div style="margin-top:4px; font-size:13px; color:#dcefe8; font-weight:600;">${latestEvent}</div>
        </div>
      </div>
    </div>`;
}

function renderHomePanel() {
  const now = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);
  const openTasks = allTasks.filter((task) => task.status === "open");
  const todayTasks = openTasks
    .filter((task) => normalizeDateKey(task.due_at) === todayKey)
    .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime());
  const overdueTasks = openTasks
    .filter((task) => task.due_at && new Date(task.due_at).getTime() < now && normalizeDateKey(task.due_at) !== todayKey)
    .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime());
  const nextReminders = openTasks
    .filter((task) => task.notification_enabled)
    .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime())
    .slice(0, 5);
  const homeWeekKeys = weekKeysFromFocusKey(todayKey);
  const homeWeekLabel = weekRangeLabelFromKey(todayKey);
  const homeWeekDaily = homeWeekKeys.map((dayKey) => {
    const dayOpen = openTasks.filter((task) => normalizeDateKey(task.due_at) === dayKey);
    const dayDueOpen = dayOpen.filter((task) => task.status === 'open');
    const dayDone = allTasks.filter((task) => task.status === 'done' && normalizeDateKey(task.updated_at || task.due_at) === dayKey);
    const dayLogs = allLogs.filter((log) => normalizeDateKey(log.created_at) === dayKey);
    const overdueIntoDay = openTasks.filter((task) => task.due_at && normalizeDateKey(task.due_at) < dayKey && dayKey === todayKey);
    return {
      dayKey,
      label: dateFromKey(dayKey).toLocaleDateString('de-DE', { weekday: 'short' }),
      shortDate: dateFromKey(dayKey).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      openCount: dayDueOpen.length,
      doneCount: dayDone.length,
      logCount: dayLogs.length,
      overdueCount: overdueIntoDay.length,
      items: [...dayDueOpen].sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime()).slice(0, 3),
      logsPreview: [...dayLogs].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 2),
    };
  });
  const homeWeekOpenTotal = homeWeekDaily.reduce((sum, day) => sum + day.openCount, 0);
  const homeWeekDoneTotal = homeWeekDaily.reduce((sum, day) => sum + day.doneCount, 0);
  const homeWeekLogTotal = homeWeekDaily.reduce((sum, day) => sum + day.logCount, 0);
  const homeMonthLabel = monthRangeLabelFromKey(homeMonthFocusKey);
  const homeMonthCells = homeMonthGridData();
  const homeMonthOpenTotal = homeMonthCells.reduce((sum, day) => sum + day.openCount, 0);
  const homeMonthDoneTotal = homeMonthCells.reduce((sum, day) => sum + day.doneCount, 0);
  const homeMonthLogTotal = homeMonthCells.reduce((sum, day) => sum + day.logCount, 0);
  const activityLogs = filteredHomeActivityLogs();
  const latestActivity = activityLogs.slice(0, 8);
  const homeLogTypes = ['all', ...new Set(allLogs.map((log) => log.log_type || 'note').filter(Boolean))];

  const filterMap = {
    all: openTasks,
    today: todayTasks,
    overdue: overdueTasks,
    reminder: openTasks.filter((task) => task.notification_enabled),
  };

  const sorters = {
    due: (a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime(),
    plant: (a, b) => plantNameById(a.plant_id).localeCompare(plantNameById(b.plant_id)) || new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime(),
    title: (a, b) => (a.title || '').localeCompare(b.title || '') || new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime(),
  };

  const filteredHomeTasks = [...(filterMap[homeTaskFilter] || openTasks)].sort(sorters[homeTaskSort] || sorters.due);

  const groupedTaskSections = homeTaskGrouping === 'plant'
    ? Object.entries(filteredHomeTasks.reduce((acc, task) => {
        const key = plantNameById(task.plant_id);
        acc[key] ||= [];
        acc[key].push(task);
        return acc;
      }, {})).sort((a, b) => a[0].localeCompare(b[0]))
    : [['Alle offenen Tasks', filteredHomeTasks]];

  const renderTaskRow = (task, tone = '#63ffb8') => `
    <div style="padding:10px 12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10); display:grid; gap:8px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <div style="font-weight:700;">${task.title}</div>
        <span style="padding:4px 8px; border-radius:999px; background:rgba(99,255,184,0.10); color:${tone}; font-size:11px;">${task.category}</span>
      </div>
      <div style="font-size:12px; color:#8fb8a7;">${plantNameById(task.plant_id)} · ${formatDate(task.due_at)}</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button data-home-task-action="done" data-home-task-id="${task.task_id}">Done</button>
        <button data-home-task-action="skip" data-home-task-id="${task.task_id}">Skip</button>
        <button data-home-task-action="open-plant" data-home-plant-id="${task.plant_id}">Pflanze öffnen</button>
      </div>
    </div>`;

  const renderLogRow = (log) => `
    <div style="padding:10px 12px; border-radius:12px; background:#091411; border:1px solid rgba(143,184,167,0.10); display:grid; gap:8px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <div style="font-weight:700;">${log.log_type}</div>
        <span style="padding:4px 8px; border-radius:999px; background:rgba(111,155,255,0.10); color:#9fc2ff; font-size:11px;">Log</span>
      </div>
      <div style="font-size:12px; color:#8fb8a7;">${plantNameById(log.plant_id)} · ${formatDate(log.created_at)}</div>
      <div style="font-size:13px; color:#dcefe8;">${(log.text || 'Ohne Text').slice(0, 120)}</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button data-home-log-action="open-plant" data-home-plant-id="${log.plant_id}">Pflanze öffnen</button>
        <button data-home-log-action="log-today" data-home-plant-id="${log.plant_id}">Log für heute</button>
        <button data-home-log-action="log-same-day" data-home-plant-id="${log.plant_id}" data-home-log-created-at="${log.created_at || ''}">Log für Tag</button>
      </div>
    </div>`;

  const filterButton = (key, label) => `<button data-home-filter="${key}" style="${homeTaskFilter === key ? 'background:#63ffb8; color:#08120f; border-color:#63ffb8;' : ''}">${label}</button>`;
  const groupingButton = (key, label) => `<button data-home-grouping="${key}" style="${homeTaskGrouping === key ? 'background:#63ffb8; color:#08120f; border-color:#63ffb8;' : ''}">${label}</button>`;
  const sortButton = (key, label) => `<button data-home-sort="${key}" style="${homeTaskSort === key ? 'background:#63ffb8; color:#08120f; border-color:#63ffb8;' : ''}">${label}</button>`;
  const logPlantButton = (key, label) => `<button data-home-log-plant="${key}" style="${homeLogPlantFilter === key ? 'background:#9fc2ff; color:#08120f; border-color:#9fc2ff;' : ''}">${label}</button>`;
  const logRangeButton = (key, label) => `<button data-home-log-range="${key}" style="${homeLogRangeFilter === key ? 'background:#9fc2ff; color:#08120f; border-color:#9fc2ff;' : ''}">${label}</button>`;
  const logTypeButton = (key, label) => `<button data-home-log-type="${key}" style="${homeLogTypeFilter === key ? 'background:#9fc2ff; color:#08120f; border-color:#9fc2ff;' : ''}">${label}</button>`;

  homePanel.innerHTML = `
    <div style="display:grid; gap:14px;">
      <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0; color:#63ffb8; font-size:18px;">Home · Heute</h2>
          <div style="margin-top:4px; color:#8fb8a7; font-size:13px;">Globale Übersicht über alle Pflanzen: heute fällige Tasks, Überfälliges, nächste Reminder und letzte Aktivität.</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#8fb8a7;">Pflanzen ${plants.length}</div>
          <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#8fb8a7;">Heute ${todayTasks.length}</div>
          <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(255,122,122,0.16); font-size:12px; color:#ff9b9b;">Überfällig ${overdueTasks.length}</div>
          <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(111,155,255,0.16); font-size:12px; color:#9fc2ff;">Logs ${allLogs.length}</div>
        </div>
      </div>

      ${renderHomeSubscriptionCard()}

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
          <div style="font-size:12px; color:#8fb8a7;">Heute fällig</div>
          <div style="margin-top:6px; font-size:22px; font-weight:700; color:#63ffb8;">${todayTasks.length}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(255,122,122,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Überfällige Tasks</div>
          <div style="margin-top:6px; font-size:22px; font-weight:700; color:#ff9b9b;">${overdueTasks.length}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Nächste Reminder</div>
          <div style="margin-top:6px; font-size:22px; font-weight:700; color:#b7d8cb;">${nextReminders.length}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(111,155,255,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Letzte Aktivität</div>
          <div style="margin-top:6px; font-size:22px; font-weight:700; color:#9fc2ff;">${latestActivity.length}</div>
        </div>
      </div>

      <div style="display:grid; gap:10px; padding:12px; border-radius:12px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
          <div>
            <div style="font-size:13px; color:#8fb8a7;">Woche über alle Pflanzen</div>
            <div style="margin-top:4px; font-size:12px; color:#6f8d80;">${homeWeekLabel} · offene Aufgaben, erledigte Vorgänge und Logs in einer kompakten Wochenansicht.</div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#63ffb8;">Offen ${homeWeekOpenTotal}</div>
            <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(183,216,203,0.12); font-size:12px; color:#b7d8cb;">Done ${homeWeekDoneTotal}</div>
            <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(111,155,255,0.16); font-size:12px; color:#9fc2ff;">Logs ${homeWeekLogTotal}</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:8px;">
          ${homeWeekDaily.map((day) => `
            <div style="padding:10px; border-radius:12px; background:${day.dayKey === todayKey ? '#10211c' : '#091411'}; border:1px solid ${day.overdueCount ? 'rgba(255,122,122,0.28)' : day.openCount ? 'rgba(99,255,184,0.18)' : 'rgba(143,184,167,0.10)'}; display:grid; gap:8px; min-height:220px; align-content:start;">
              <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                <div>
                  <div style="font-size:12px; color:#8fb8a7; text-transform:uppercase;">${day.label}</div>
                  <div style="font-size:14px; font-weight:700; color:#e8fff5;">${day.shortDate}</div>
                </div>
                ${day.dayKey === todayKey ? '<span style="padding:4px 8px; border-radius:999px; background:rgba(99,255,184,0.12); color:#63ffb8; font-size:11px;">Heute</span>' : ''}
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <span style="padding:4px 8px; border-radius:999px; background:rgba(99,255,184,0.10); color:#63ffb8; font-size:11px;">Open ${day.openCount}</span>
                <span style="padding:4px 8px; border-radius:999px; background:rgba(183,216,203,0.10); color:#b7d8cb; font-size:11px;">Done ${day.doneCount}</span>
                <span style="padding:4px 8px; border-radius:999px; background:rgba(111,155,255,0.10); color:#9fc2ff; font-size:11px;">Logs ${day.logCount}</span>
                ${day.overdueCount ? `<span style="padding:4px 8px; border-radius:999px; background:rgba(255,122,122,0.12); color:#ff9b9b; font-size:11px;">Überfällig ${day.overdueCount}</span>` : ''}
              </div>
              <div style="display:grid; gap:6px; align-content:start;">
                ${day.items.length ? day.items.map((task) => `<div style="display:grid; gap:6px; padding:8px 10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);"><button data-home-week-task="${task.task_id}" data-home-week-plant="${task.plant_id}" style="text-align:left; padding:0; background:transparent; border:none; color:#dcefe8; font-size:12px;">${task.title}<div style="margin-top:4px; color:#8fb8a7; font-size:11px;">${plantNameById(task.plant_id)}</div></button><div style="display:flex; gap:6px; flex-wrap:wrap;"><button data-home-week-action="done" data-home-week-task-id="${task.task_id}" data-home-week-plant-id="${task.plant_id}" style="padding:4px 8px; font-size:11px;">Done</button><button data-home-week-action="skip" data-home-week-task-id="${task.task_id}" data-home-week-plant-id="${task.plant_id}" style="padding:4px 8px; font-size:11px;">Skip</button><button data-home-week-action="open-plant" data-home-week-plant-id="${task.plant_id}" style="padding:4px 8px; font-size:11px;">Pflanze öffnen</button></div></div>`).join('') : '<div style="font-size:12px; color:#6f8d80;">Keine offenen Tasks</div>'}
              </div>
              <div style="display:grid; gap:6px; align-content:start;">
                <div style="font-size:11px; color:#8fb8a7; text-transform:uppercase; letter-spacing:0.04em;">Aktivität</div>
                ${day.logsPreview.length ? day.logsPreview.map((log) => `<div style="display:grid; gap:6px; padding:8px 10px; border-radius:10px; background:#08120f; border:1px solid rgba(111,155,255,0.10);"><div style="font-size:12px; color:#dcefe8;">${((log.text || log.log_type || 'Log') + '').slice(0, 56)}</div><div style="font-size:11px; color:#8fb8a7;">${plantNameById(log.plant_id)} · ${log.log_type || 'note'}</div><div style="display:flex; gap:6px; flex-wrap:wrap;"><button data-home-week-log-action="open-plant" data-home-week-log-plant-id="${log.plant_id}" style="padding:4px 8px; font-size:11px;">Pflanze öffnen</button><button data-home-week-log-action="log-day" data-home-week-log-plant-id="${log.plant_id}" data-home-week-log-day="${day.dayKey}" style="padding:4px 8px; font-size:11px;">Log für Tag</button></div></div>`).join('') : '<div style="font-size:12px; color:#6f8d80;">Keine Logs an diesem Tag</div>'}
                <div style="display:flex; gap:6px; flex-wrap:wrap;"><button data-home-week-day-action="new-task" data-home-week-day="${day.dayKey}" style="padding:4px 8px; font-size:11px;">Task für Tag</button><button data-home-week-day-action="new-log" data-home-week-day="${day.dayKey}" style="padding:4px 8px; font-size:11px;">Log für Tag</button></div>
              </div>
            </div>`).join('')}
        </div>
      <div style="display:grid; gap:10px; padding:12px; border-radius:12px; background:#0b1714; border:1px solid rgba(111,155,255,0.10);">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
          <div>
            <div style="font-size:13px; color:#8fb8a7;">Home · Monat</div>
            <div style="margin-top:4px; font-size:12px; color:#6f8d80;">Monatskontext über alle Pflanzen hinweg mit offenen Tasks, erledigten Vorgängen und Aktivität.</div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button data-home-month-nav="prev">←</button>
            <button data-home-month-nav="today">Heute</button>
            <button data-home-month-nav="next">→</button>
            <span style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(111,155,255,0.12); font-size:12px; color:#9fc2ff;">${homeMonthLabel}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <span style="padding:6px 10px; border-radius:999px; background:rgba(99,255,184,0.10); color:#63ffb8; font-size:11px;">Open ${homeMonthOpenTotal}</span>
          <span style="padding:6px 10px; border-radius:999px; background:rgba(183,216,203,0.10); color:#b7d8cb; font-size:11px;">Done ${homeMonthDoneTotal}</span>
          <span style="padding:6px 10px; border-radius:999px; background:rgba(111,155,255,0.10); color:#9fc2ff; font-size:11px;">Logs ${homeMonthLogTotal}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:8px; font-size:11px; color:#8fb8a7;">
          ${['Mo','Di','Mi','Do','Fr','Sa','So'].map((d)=>`<div style="padding:4px 6px;">${d}</div>`).join('')}
        </div>
        <div style="display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:8px;">
          ${homeMonthCells.map((day) => {
            const focused = day.key === timelineFocusKey;
            const border = day.openCount ? 'rgba(99,255,184,0.18)' : day.logCount ? 'rgba(111,155,255,0.18)' : 'rgba(143,184,167,0.08)';
            const bg = focused ? 'linear-gradient(180deg, rgba(99,255,184,0.08), rgba(9,20,17,0.95))' : '#091411';
            return `<div style="min-height:118px; padding:8px; border-radius:12px; background:${bg}; border:1px solid ${border}; opacity:${day.inMonth ? '1' : '0.55'}; display:grid; gap:6px; align-content:start;">
              <button data-home-month-day="${day.key}" style="text-align:left; padding:0; background:transparent; border:none; color:${focused ? '#63ffb8' : '#e8fff5'}; font-weight:700; font-size:12px;">${day.dayNumber}</button>
              <div style="display:flex; gap:4px; flex-wrap:wrap;">
                ${day.openCount ? `<span style="padding:3px 6px; border-radius:999px; background:rgba(99,255,184,0.12); color:#63ffb8; font-size:10px;">O ${day.openCount}</span>` : ''}
                ${day.doneCount ? `<span style="padding:3px 6px; border-radius:999px; background:rgba(183,216,203,0.10); color:#b7d8cb; font-size:10px;">D ${day.doneCount}</span>` : ''}
                ${day.logCount ? `<span style="padding:3px 6px; border-radius:999px; background:rgba(111,155,255,0.10); color:#9fc2ff; font-size:10px;">L ${day.logCount}</span>` : ''}
              </div>
              <div style="display:grid; gap:4px;">
                ${day.topTasks.length ? day.topTasks.map((task)=>`<button data-home-month-task="${task.task_id}" data-home-month-plant="${task.plant_id}" style="text-align:left; padding:4px 6px; border-radius:8px; border:1px solid rgba(99,255,184,0.08); background:#08120f; color:#dcefe8; font-size:10px;">${task.title}</button>`).join('') : '<div style="font-size:10px; color:#6f8d80;">Keine offenen Tasks</div>'}
              </div>
              <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:auto;">
                <button data-home-month-action="task" data-home-month-day="${day.key}" style="padding:3px 6px; font-size:10px;">+ Task</button>
                <button data-home-month-action="log" data-home-month-day="${day.key}" style="padding:3px 6px; font-size:10px;">+ Log</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div style="display:grid; gap:10px; padding:12px; border-radius:12px; background:#0b1714; border:1px solid rgba(99,255,184,0.10);">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
          <div>
            <div style="font-size:13px; color:#8fb8a7;">Home-Filter & Sortierung</div>
            <div style="margin-top:4px; font-size:12px; color:#6f8d80;">Wähle, welche offenen Aufgaben global gezeigt werden und ob nach Pflanze gruppiert wird.</div>
          </div>
          <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#b7d8cb;">Ansicht ${filteredHomeTasks.length} Tasks</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          ${filterButton('all', 'Alle offen')}
          ${filterButton('today', 'Heute')}
          ${filterButton('overdue', 'Überfällig')}
          ${filterButton('reminder', 'Nur Reminder')}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          ${groupingButton('flat', 'Flach')}
          ${groupingButton('plant', 'Nach Pflanze')}
          ${sortButton('due', 'Nach Datum')}
          ${sortButton('plant', 'Nach Pflanze')}
          ${sortButton('title', 'Nach Titel')}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
        <div style="display:grid; gap:10px;">
          <div style="font-size:13px; color:#8fb8a7;">Heute fällige Tasks</div>
          ${todayTasks.length ? todayTasks.slice(0,6).map((task) => renderTaskRow(task)).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#8fb8a7;">Heute ist aktuell nichts offen.</div>'}
        </div>
        <div style="display:grid; gap:10px;">
          <div style="font-size:13px; color:#8fb8a7;">Überfällige Tasks</div>
          ${overdueTasks.length ? overdueTasks.slice(0,6).map((task) => renderTaskRow(task, '#ff9b9b')).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(255,122,122,0.10); color:#8fb8a7;">Nichts überfällig. Stark.</div>'}
        </div>
      </div>

      <div style="display:grid; grid-template-columns: minmax(280px, 1.25fr) minmax(260px, 1fr); gap:12px; align-items:start;">
        <div style="display:grid; gap:10px;">
          <div style="font-size:13px; color:#8fb8a7;">Globale offene Tasks</div>
          ${groupedTaskSections.length && filteredHomeTasks.length ? groupedTaskSections.map(([groupName, groupTasks]) => `
            <div style="display:grid; gap:8px; padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10);">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div style="font-weight:700; color:#e8fff5;">${groupName}</div>
                <div style="font-size:12px; color:#8fb8a7;">${groupTasks.length} offen</div>
              </div>
              ${groupTasks.slice(0, homeTaskGrouping === 'plant' ? 8 : 10).map((task) => renderTaskRow(task, homeTaskFilter === 'overdue' ? '#ff9b9b' : '#63ffb8')).join('')}
            </div>`).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#8fb8a7;">Für diese Filter sind gerade keine offenen Tasks vorhanden.</div>'}
        </div>
        <div style="display:grid; gap:12px;">
          <div style="display:grid; gap:10px;">
            <div style="font-size:13px; color:#8fb8a7;">Nächste Reminder</div>
            ${nextReminders.length ? nextReminders.map((task) => renderTaskRow(task)).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#8fb8a7;">Aktuell keine offenen Reminder.</div>'}
          </div>
          <div style="display:grid; gap:10px;">
            <div style="display:grid; gap:10px; padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(111,155,255,0.10);">
              <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
                <div>
                  <div style="font-size:13px; color:#8fb8a7;">Letzte Aktivität</div>
                  <div style="margin-top:4px; font-size:12px; color:#6f8d80;">Filtere globale Logs nach Pflanze, Zeitraum und Typ.</div>
                </div>
                <div style="padding:8px 10px; border-radius:999px; background:#0b1714; border:1px solid rgba(111,155,255,0.12); font-size:12px; color:#9fc2ff;">Aktivität ${activityLogs.length}</div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                ${logPlantButton('all', 'Alle Pflanzen')}
                ${plants.slice(0, 8).map((plant) => logPlantButton(plant.plant_id, plant.name || 'Pflanze')).join('')}
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                ${logRangeButton('today', 'Heute')}
                ${logRangeButton('7d', '7 Tage')}
                ${logRangeButton('30d', '30 Tage')}
                ${logRangeButton('all', 'Alles')}
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                ${homeLogTypes.map((type) => logTypeButton(type, type === 'all' ? 'Alle Typen' : type)).join('')}
              </div>
            </div>
            ${latestActivity.length ? latestActivity.map((log) => renderLogRow(log)).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(111,155,255,0.10); color:#8fb8a7;">Keine Aktivität für diese Filter.</div>'}
          </div>
        </div>
      </div>
    </div>`;

  homePanel.querySelectorAll('[data-home-filter]').forEach((btn) => {
    btn.onclick = () => {
      homeTaskFilter = btn.dataset.homeFilter;
      renderHomePanel();
    };
  });
  homePanel.querySelectorAll('[data-home-grouping]').forEach((btn) => {
    btn.onclick = () => {
      homeTaskGrouping = btn.dataset.homeGrouping;
      renderHomePanel();
    };
  });
  homePanel.querySelectorAll('[data-home-sort]').forEach((btn) => {
    btn.onclick = () => {
      homeTaskSort = btn.dataset.homeSort;
      renderHomePanel();
    };
  });
  homePanel.querySelectorAll('[data-home-log-plant]').forEach((btn) => {
    btn.onclick = () => {
      homeLogPlantFilter = btn.dataset.homeLogPlant;
      renderHomePanel();
    };
  });
  homePanel.querySelectorAll('[data-home-log-range]').forEach((btn) => {
    btn.onclick = () => {
      homeLogRangeFilter = btn.dataset.homeLogRange;
      renderHomePanel();
    };
  });
  homePanel.querySelectorAll('[data-home-log-type]').forEach((btn) => {
    btn.onclick = () => {
      homeLogTypeFilter = btn.dataset.homeLogType;
      renderHomePanel();
    };
  });
  homePanel.querySelectorAll('[data-home-week-task]').forEach((btn) => {
    btn.onclick = async () => {
      const plantId = btn.dataset.homeWeekPlant;
      if (!plantId) return;
      await focusPlantFromHome(plantId);
    };
  });
  homePanel.querySelectorAll('[data-home-week-action]').forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.dataset.homeWeekAction;
      const taskId = btn.dataset.homeWeekTaskId;
      const plantId = btn.dataset.homeWeekPlantId;
      try {
        if (action === 'open-plant') {
          await focusPlantFromHome(plantId);
          return;
        }
        if (!taskId) return;
        await invoke('update_task_status_smart', { payload: { task_id: taskId, status: action === 'done' ? 'done' : 'skipped' } });
        await refreshAll({ autoReminderReason: 'home_week_action' });
      } catch (err) {
        logOut(`Home week action error: ${err}`);
      }
    };
  });
  homePanel.querySelectorAll('[data-home-week-log-action]').forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.dataset.homeWeekLogAction;
      const plantId = btn.dataset.homeWeekLogPlantId;
      const dayKey = btn.dataset.homeWeekLogDay;
      try {
        if (action === 'open-plant') {
          await focusPlantFromHome(plantId);
          return;
        }
        if (action === 'log-day') {
          await prepareLogFromHome(plantId, { dayKey });
        }
      } catch (err) {
        logOut(`Home week log action error: ${err}`);
      }
    };
  });
  homePanel.querySelectorAll('[data-home-week-day-action]').forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.dataset.homeWeekDayAction;
      const dayKey = btn.dataset.homeWeekDay;
      try {
        if (action === 'new-task') {
          const plantId = selectedPlantId || plants[0]?.plant_id;
          if (!plantId) {
            logOut('Keine Pflanze verfügbar für Wochen-Quick-Create.');
            return;
          }
          await prepareTaskFromHome(plantId, { dayKey });
          return;
        }
        if (action === 'new-log') {
          const plantId = selectedPlantId || plants[0]?.plant_id;
          if (!plantId) {
            logOut('Keine Pflanze verfügbar für Wochen-Log-Quick-Create.');
            return;
          }
          await prepareLogFromHome(plantId, { dayKey });
        }
      } catch (err) {
        logOut(`Home week day action error: ${err}`);
      }
    };
  });
  homePanel.querySelectorAll('[data-home-task-action]').forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.dataset.homeTaskAction;
      const taskId = btn.dataset.homeTaskId;
      const plantId = btn.dataset.homePlantId;
      try {
        if (action === 'open-plant') {
          await focusPlantFromHome(plantId);
          return;
        }
        if (!taskId) return;
        await invoke('update_task_status_smart', { payload: { task_id: taskId, status: action === 'done' ? 'done' : 'skipped' } });
        await refreshAll({ autoReminderReason: 'home_task_action' });
      } catch (err) {
        logOut(`Home action error: ${err}`);
      }
    };
  });
  homePanel.querySelectorAll('[data-home-log-action]').forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.dataset.homeLogAction;
      const plantId = btn.dataset.homePlantId;
      const createdAt = btn.dataset.homeLogCreatedAt;
      try {
        if (action === 'open-plant') {
          await focusPlantFromHome(plantId);
          return;
        }
        if (action === 'log-today') {
          await prepareLogFromHome(plantId, { dayKey: new Date().toISOString().slice(0, 10) });
          return;
        }
        if (action === 'log-same-day') {
          await prepareLogFromHome(plantId, { createdAt });
        }
      } catch (err) {
        logOut(`Home log action error: ${err}`);
      }
    };
  });
}

function computePlantDashboardSummary(plant) {
  const plantTasks = tasks.filter((t) => t.plant_id === plant.plant_id);
  const openTasks = plantTasks.filter((t) => t.status === "open");
  const nextOpenTask = [...openTasks]
    .sort((a, b) => {
      const aTs = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bTs = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    })[0] || null;

  const reminderCandidates = reminderCandidatesForPlant(plant.plant_id);
  const nextReminder = reminderCandidates[0] || null;

  const plantLogs = logs
    .filter((l) => l.plant_id === plant.plant_id)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const lastLog = plantLogs[0] || null;

  const focusWeekStart = startOfWeekFromKey(timelineFocusKey);
  const focusWeekEnd = new Date(focusWeekStart);
  focusWeekEnd.setDate(focusWeekStart.getDate() + 6);
  const weekTasks = plantTasks.filter((task) => {
    if (!task.due_at) return false;
    const due = new Date(task.due_at);
    return !Number.isNaN(due.getTime()) && due >= focusWeekStart && due <= focusWeekEnd;
  });
  const weekDone = weekTasks.filter((task) => task.status === "done").length;
  const weekTotal = weekTasks.length;
  const weekProgressLabel = weekTotal ? `${weekDone}/${weekTotal} erledigt` : 'Noch keine Wochen-Tasks';
  const weekProgressPercent = weekTotal ? Math.max(6, Math.round((weekDone / weekTotal) * 100)) : 0;

  return {
    nextOpenTask,
    nextReminder,
    lastLog,
    phaseText: `${phaseLabel(plant.phase)} · Woche ${plant.phase_week ?? '-'}`,
    weekProgressLabel,
    weekProgressPercent,
  };
}


function normalizeDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function dateLabelFromKey(key) {
  if (!key) return "Ohne Datum";
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateFromKey(key) {
  return new Date(`${key}T00:00:00`);
}

function startOfWeekFromKey(key) {
  const d = dateFromKey(key);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonthFromKey(key) {
  const d = dateFromKey(key);
  d.setDate(1);
  return d;
}

function endOfMonthFromKey(key) {
  const d = startOfMonthFromKey(key);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d;
}

function addDaysToKey(key, days) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsToKey(key, months) {
  const d = dateFromKey(key);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function weekRangeLabelFromKey(key) {
  const start = startOfWeekFromKey(key);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startLabel = start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const endLabel = end.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function monthRangeLabelFromKey(key) {
  return startOfMonthFromKey(key).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function weekKeysFromFocusKey(key) {
  const start = startOfWeekFromKey(key);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current.toISOString().slice(0, 10);
  });
}

function monthGridFromFocusKey(key) {
  const start = startOfMonthFromKey(key);
  const gridStart = startOfWeekFromKey(start.toISOString().slice(0, 10));
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const currentKey = current.toISOString().slice(0, 10);
    const inMonth = current.getMonth() === start.getMonth();
    return { key: currentKey, inMonth };
  });
}


function dayStats(dayKey) {
  const dayTasks = tasks.filter((task) => normalizeDateKey(task.due_at || task.updated_at || task.created_at) === dayKey);
  const dayLogs = logs.filter((log) => normalizeDateKey(log.created_at) === dayKey);
  const open = dayTasks.filter((task) => task.status === "open").length;
  const done = dayTasks.filter((task) => task.status === "done").length;
  const skipped = dayTasks.filter((task) => task.status === "skipped").length;
  const overdue = dayTasks.filter((task) => task.status === "open" && task.due_at && new Date(task.due_at).getTime() < Date.now()).length;
  return {
    totalTasks: dayTasks.length,
    open,
    done,
    skipped,
    overdue,
    logs: dayLogs.length,
  };
}

function daySignalTone(stats) {
  if (stats.overdue > 0) {
    return {
      border: '#ff7a7a',
      accent: '#ff9b9b',
      glow: '0 0 0 1px rgba(255,122,122,0.14), 0 0 18px rgba(255,122,122,0.08)',
      label: 'Überfällig',
    };
  }
  if (stats.open > 0) {
    return {
      border: '#63ffb8',
      accent: '#63ffb8',
      glow: '0 0 0 1px rgba(99,255,184,0.12), 0 0 18px rgba(99,255,184,0.06)',
      label: 'Offen',
    };
  }
  if (stats.done > 0 || stats.logs > 0) {
    return {
      border: '#8fb8a7',
      accent: '#b7d8cb',
      glow: '0 0 0 1px rgba(143,184,167,0.10)',
      label: 'Aktiv',
    };
  }
  return {
    border: 'rgba(99,255,184,0.10)',
    accent: '#8fb8a7',
    glow: 'none',
    label: 'Leer',
  };
}


function reminderPermissionLabel() {
  if (reminderPermissionState === "granted") return "Desktop-Hinweise erlaubt";
  if (reminderPermissionState === "denied") return "Desktop-Hinweise blockiert";
  if (reminderPermissionState === "unsupported") return "Notifications nicht verfügbar";
  return "Desktop-Hinweise noch nicht erlaubt";
}

async function requestReminderPermission() {
  if (typeof Notification === "undefined") {
    output.textContent = "Dieses Runtime-Fenster unterstützt die Notification-API aktuell nicht.";
    reminderPermissionState = "unsupported";
    renderReminderPanel();
    return;
  }
  reminderPermissionState = await Notification.requestPermission();
  renderReminderPanel();
}

let autoReminderCheckInFlight = false;

async function checkDueNotifications(options = {}) {
  const { silent = false, withinMinutes = 30, reason = "manual" } = options;
  try {
    const result = await invoke("list_due_notification_candidates", { withinMinutes });
    const reminders = result?.reminders ?? [];
    if (!reminders.length) {
      if (!silent) output.textContent = "Keine neuen fälligen Reminder gefunden.";
      renderReminderPanel();
      return { sent: 0, reason };
    }
    if (typeof Notification === "undefined") {
      if (!silent) output.textContent = `Es gibt ${reminders.length} fällige Reminder, aber die Notification-API ist hier nicht verfügbar.`;
      renderReminderPanel();
      return { sent: 0, reason, unsupported: true };
    }
    if (Notification.permission !== "granted") {
      reminderPermissionState = Notification.permission;
      if (!silent) output.textContent = `Es gibt ${reminders.length} fällige Reminder. Erlaube zuerst Desktop-Hinweise.`;
      renderReminderPanel();
      return { sent: 0, reason, permission: Notification.permission };
    }
    for (const reminder of reminders) {
      const dueLabel = formatDate(reminder.due_at);
      const body = reminder.overdue
        ? `Dein Task "${reminder.title}" ist überfällig. Fällig seit ${dueLabel}.`
        : `Dein Task "${reminder.title}" wird fällig am ${dueLabel}.`;
      new Notification("Zeit zum Checken 🌿", { body });
      await invoke("mark_notification_sent", { payload: { task_id: reminder.task_id, due_at: reminder.due_at } });
    }
    if (!silent) output.textContent = `${reminders.length} Reminder als Desktop-Hinweis markiert.`;
    renderReminderPanel();
    await loadSyncStatus();
    return { sent: reminders.length, reason };
  } catch (error) {
    if (!silent) output.textContent = String(error);
    return { sent: 0, reason, error: String(error) };
  }
}

async function autoCheckDueNotifications(reason = "auto") {
  if (autoReminderCheckInFlight) return { skipped: true, reason };
  if (typeof Notification === "undefined") {
    reminderPermissionState = "unsupported";
    renderReminderPanel();
    return { skipped: true, reason, unsupported: true };
  }
  reminderPermissionState = Notification.permission;
  renderReminderPanel();
  if (Notification.permission !== "granted") return { skipped: true, reason, permission: Notification.permission };
  autoReminderCheckInFlight = true;
  try {
    return await checkDueNotifications({ silent: true, withinMinutes: 30, reason });
  } finally {
    autoReminderCheckInFlight = false;
  }
}

function notificationStateBadge(enabled) {
  return enabled
    ? '<span style="padding:4px 8px; border-radius:999px; background:rgba(99,255,184,0.14); color:#63ffb8; font-size:11px;">Reminder an</span>'
    : '<span style="padding:4px 8px; border-radius:999px; background:rgba(143,184,167,0.10); color:#8fb8a7; font-size:11px;">Reminder aus</span>';
}

function reminderCandidatesForPlant(plantId) {
  const now = Date.now();
  return tasks
    .filter((task) => task.plant_id === plantId && task.notification_enabled && task.status === 'open')
    .map((task) => {
      const dueTs = task.due_at ? new Date(task.due_at).getTime() : null;
      const deltaHours = dueTs == null ? null : Math.round((dueTs - now) / 3600000);
      let bucket = 'später';
      if (dueTs != null && dueTs < now) bucket = 'überfällig';
      else if (deltaHours != null && deltaHours <= 6) bucket = 'gleich';
      else if (deltaHours != null && deltaHours <= 24) bucket = 'heute';
      else if (deltaHours != null && deltaHours <= 48) bucket = 'bald';
      return { task, dueTs, deltaHours, bucket };
    })
    .sort((a, b) => (a.dueTs ?? Number.MAX_SAFE_INTEGER) - (b.dueTs ?? Number.MAX_SAFE_INTEGER));
}

function renderReminderPanel() {
  const plant = selectedPlant();
  if (!plant) {
    reminderPanel.innerHTML = `
      <div style="display:grid; gap:10px; color:#8fb8a7;">
        <h2 style="margin:0; color:#63ffb8; font-size:18px;">Reminder</h2>
        <div>Wähle zuerst eine Pflanze aus. Dann siehst du hier die Reminder-Grundlage für offene Tasks.</div>
      </div>`;
    return;
  }

  const candidates = reminderCandidatesForPlant(plant.plant_id);
  const overdue = candidates.filter((item) => item.bucket === 'überfällig').length;
  const dueSoon = candidates.filter((item) => item.bucket === 'gleich' || item.bucket === 'heute').length;
  const later = candidates.filter((item) => item.bucket === 'bald' || item.bucket === 'später').length;

  reminderPanel.innerHTML = `
    <div style="display:grid; gap:14px;">
      <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0; color:#63ffb8; font-size:18px;">Reminder</h2>
          <div style="margin-top:4px; color:#8fb8a7; font-size:13px;">Lokale Notification-Vorbereitung: offene Tasks mit Reminder-Flag können jetzt als Desktop-Hinweis geprüft und markiert werden.</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end;">
          <span style="padding:6px 10px; border-radius:999px; background:rgba(99,255,184,0.10); color:#b7d8cb; font-size:12px;">${reminderPermissionLabel()}</span>
          <div>${notificationStateBadge(candidates.length > 0)}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="allowReminderNotifications" type="button">Desktop-Hinweise erlauben</button>
        <button id="checkReminderNotifications" type="button">Reminder jetzt prüfen</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(255,122,122,0.16);">
          <div style="font-size:12px; color:#8fb8a7;">Überfällig</div>
          <div style="margin-top:6px; font-weight:700; color:#ff9b9b;">${overdue}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.16);">
          <div style="font-size:12px; color:#8fb8a7;">Bis 24h</div>
          <div style="margin-top:6px; font-weight:700; color:#63ffb8;">${dueSoon}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(143,184,167,0.16);">
          <div style="font-size:12px; color:#8fb8a7;">Später</div>
          <div style="margin-top:6px; font-weight:700; color:#b7d8cb;">${later}</div>
        </div>
      </div>

      <div style="display:grid; gap:10px;">
        ${candidates.length ? candidates.slice(0, 6).map(({ task, bucket, deltaHours }) => `
          <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid ${bucket === 'überfällig' ? 'rgba(255,122,122,0.18)' : bucket === 'gleich' || bucket === 'heute' ? 'rgba(99,255,184,0.18)' : 'rgba(143,184,167,0.12)'};">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
              <div>
                <div style="font-weight:700;">${task.title}</div>
                <div style="margin-top:4px; font-size:12px; color:#8fb8a7;">${task.category} · fällig ${formatDate(task.due_at)}</div>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                ${notificationStateBadge(task.notification_enabled)}
                <span style="padding:4px 8px; border-radius:999px; background:${bucket === 'überfällig' ? 'rgba(255,122,122,0.14)' : bucket === 'gleich' || bucket === 'heute' ? 'rgba(99,255,184,0.14)' : 'rgba(143,184,167,0.12)'}; color:${bucket === 'überfällig' ? '#ff9b9b' : bucket === 'gleich' || bucket === 'heute' ? '#63ffb8' : '#b7d8cb'}; font-size:11px;">${bucket}${deltaHours != null ? ` · ${deltaHours}h` : ''}</span>
              </div>
            </div>
          </div>`).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#8fb8a7;">Für diese Pflanze sind aktuell keine offenen Reminder aktiv.</div>'}
      </div>
    </div>`;

  $("allowReminderNotifications")?.addEventListener("click", requestReminderPermission);
  $("checkReminderNotifications")?.addEventListener("click", checkDueNotifications);
}

function daySignalMarkup(stats, compact = false) {
  const pills = [];
  if (stats.overdue > 0) pills.push(`<span style="padding:3px 7px; border-radius:999px; background:rgba(255,122,122,0.14); color:#ff9b9b; font-size:${compact ? '10px' : '11px'};">${stats.overdue} overdue</span>`);
  if (stats.open > 0) pills.push(`<span style="padding:3px 7px; border-radius:999px; background:rgba(99,255,184,0.14); color:#63ffb8; font-size:${compact ? '10px' : '11px'};">${stats.open} offen</span>`);
  if (stats.done > 0) pills.push(`<span style="padding:3px 7px; border-radius:999px; background:rgba(143,184,167,0.14); color:#b7d8cb; font-size:${compact ? '10px' : '11px'};">${stats.done} done</span>`);
  if (stats.skipped > 0) pills.push(`<span style="padding:3px 7px; border-radius:999px; background:rgba(255,214,102,0.12); color:#ffd666; font-size:${compact ? '10px' : '11px'};">${stats.skipped} skipped</span>`);
  if (stats.logs > 0) pills.push(`<span style="padding:3px 7px; border-radius:999px; background:rgba(111,155,255,0.12); color:#9fc2ff; font-size:${compact ? '10px' : '11px'};">${stats.logs} logs</span>`);
  return pills.join('');
}

function itemMatchesTimelineWindow(item, mode, focusKey) {
  if (!item.dateKey) return false;
  if (mode === "day") return item.dateKey === focusKey;
  if (mode === "week") {
    const start = startOfWeekFromKey(focusKey);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const current = dateFromKey(item.dateKey);
    return current >= start && current <= end;
  }
  const monthStart = startOfMonthFromKey(focusKey);
  const monthEnd = endOfMonthFromKey(focusKey);
  const current = dateFromKey(item.dateKey);
  return current >= monthStart && current <= monthEnd;
}

function setTimelineFocusDay(dayKey) {
  if (!dayKey) return;
  timelineFocusKey = dayKey;
  renderTimelinePanel();
  applyTimelineDueToTaskForm();
}

function renderTimelinePanel() {
  const plant = selectedPlant();
  if (!plant) {
    timelinePanel.innerHTML = `
      <div style="display:grid; gap:10px; color:#8fb8a7;">
        <h2 style="margin:0; color:#63ffb8; font-size:18px;">Kalender & Timeline</h2>
        <div>Wähle zuerst eine Pflanze aus. Dann siehst du hier anstehende Tasks und vergangene Logs nach Tagen gruppiert.</div>
      </div>`;
    return;
  }

  const taskItems = tasks
    .filter((task) => task.plant_id === plant.plant_id)
    .map((task) => ({
      type: "task",
      id: task.task_id,
      title: task.title,
      subtitle: `${task.category} · ${task.notification_enabled ? "Reminder an" : "Reminder aus"}`,
      badge: task.status === "done" ? "Done" : task.status === "skipped" ? "Skipped" : "Offen",
      sortAt: task.due_at || task.updated_at || task.created_at,
      dateKey: normalizeDateKey(task.due_at || task.updated_at || task.created_at),
    }));

  const logItems = logs
    .filter((log) => log.plant_id === plant.plant_id)
    .map((log) => ({
      type: "log",
      id: log.log_id,
      title: log.log_type,
      subtitle: log.text || "Ohne Text",
      badge: log.metrics ? `pH ${log.metrics.ph ?? '-'} · EC ${log.metrics.ec ?? '-'}` : "Eintrag",
      sortAt: log.created_at,
      dateKey: normalizeDateKey(log.created_at),
    }));

  const merged = [...taskItems, ...logItems].sort((a, b) => {
    const av = a.sortAt ? new Date(a.sortAt).getTime() : 0;
    const bv = b.sortAt ? new Date(b.sortAt).getTime() : 0;
    return bv - av;
  });

  const availableKeys = merged.map((item) => item.dateKey).filter(Boolean);
  if (!availableKeys.includes(timelineFocusKey)) {
    timelineFocusKey = availableKeys[0] || new Date().toISOString().slice(0, 10);
  }

  const filtered = merged.filter((item) => itemMatchesTimelineWindow(item, timelineMode, timelineFocusKey));
  const grouped = new Map();
  for (const item of filtered) {
    const key = item.dateKey || "ohne-datum";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    if (a === "ohne-datum") return 1;
    if (b === "ohne-datum") return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const nextOpenTasks = taskItems
    .filter((t) => t.badge === "Offen" && itemMatchesTimelineWindow(t, timelineMode, timelineFocusKey))
    .sort((a, b) => {
      const av = a.sortAt ? new Date(a.sortAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bv = b.sortAt ? new Date(b.sortAt).getTime() : Number.MAX_SAFE_INTEGER;
      return av - bv;
    })
    .slice(0, 3);

  const periodLabel = timelineMode === "day"
    ? dateLabelFromKey(timelineFocusKey)
    : timelineMode === "week"
      ? weekRangeLabelFromKey(timelineFocusKey)
      : monthRangeLabelFromKey(timelineFocusKey);
  const weekKeys = weekKeysFromFocusKey(timelineFocusKey);
  const monthGrid = monthGridFromFocusKey(timelineFocusKey);

  timelinePanel.innerHTML = `
    <div style="display:grid; gap:14px;">
      <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0; color:#63ffb8; font-size:18px;">Kalender & Timeline</h2>
          <div style="margin-top:4px; color:#8fb8a7; font-size:13px;">${timelineMode === 'day' ? 'Tagesansicht' : timelineMode === 'week' ? 'Wochenansicht' : 'Monatsansicht'} für die aktuelle Auswahl.</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button id="timelineModeDay" style="${timelineMode === 'day' ? 'background:#63ffb8; color:#08120f; border-color:#63ffb8;' : ''}">Tag</button>
          <button id="timelineModeWeek" style="${timelineMode === 'week' ? 'background:#63ffb8; color:#08120f; border-color:#63ffb8;' : ''}">Woche</button>
          <button id="timelineModeMonth" style="${timelineMode === 'month' ? 'background:#63ffb8; color:#08120f; border-color:#63ffb8;' : ''}">Monat</button>
          <button id="timelinePrev">←</button>
          <div style="padding:8px 12px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#e8fff5;">${periodLabel}</div>
          <button id="timelineToday">Heute</button>
          <button id="timelineNext">→</button>
        </div>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#8fb8a7;">Tasks ${taskItems.filter((item) => itemMatchesTimelineWindow(item, timelineMode, timelineFocusKey)).length}</div>
        <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#8fb8a7;">Logs ${logItems.filter((item) => itemMatchesTimelineWindow(item, timelineMode, timelineFocusKey)).length}</div>
        <div style="padding:8px 10px; border-radius:999px; background:#091411; border:1px solid rgba(99,255,184,0.12); font-size:12px; color:#8fb8a7;">Tage ${sortedKeys.length}</div>
      </div>

      <div style="display:grid; gap:10px;">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap;">
          <div style="font-size:12px; color:#8fb8a7;">Phasen-Hinweise im Kalender</div>
          <div style="font-size:12px; color:#8fb8a7;">${phaseLabel(plant.phase)} · ${timelineMode === 'day' ? 'Tagesfokus' : timelineMode === 'week' ? 'Wochenfokus' : 'Monatsfokus'}</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
          ${renderPhaseHintCards(plant, true)}
          ${renderPhaseHintActions(plant, true)}
        </div>
      </div>

      <div style="display:grid; gap:8px;">
        <div style="font-size:12px; color:#8fb8a7;">Direkt im Kalender auf einen Tag klicken:</div>
        ${timelineMode === 'month' ? `
        <div style="display:grid; gap:8px;">
          <div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:8px; font-size:11px; color:#8fb8a7; text-transform:uppercase; letter-spacing:0.04em;">
            ${['Mo','Di','Mi','Do','Fr','Sa','So'].map((label) => `<div style="padding:0 6px;">${label}</div>`).join('')}
          </div>
          <div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:8px;">
            ${monthGrid.map(({ key: dayKey, inMonth }) => {
              const isFocused = dayKey === timelineFocusKey;
              const stats = dayStats(dayKey);
              const tone = daySignalTone(stats);
              return `
                <div
                  style="text-align:left; min-height:120px; padding:10px; border-radius:12px; border:1px solid ${isFocused ? '#63ffb8' : tone.border}; box-shadow:${isFocused ? '0 0 0 1px rgba(99,255,184,0.16), 0 0 24px rgba(99,255,184,0.10)' : tone.glow}; background:${isFocused ? '#123227' : inMonth ? '#091411' : '#07100d'}; color:${inMonth ? '#e8fff5' : '#7b978b'}; opacity:${inMonth ? '1' : '0.72'}; display:grid; gap:10px; align-content:start;">
                  <button
                    data-timeline-day="${dayKey}"
                    style="text-align:left; background:none; border:none; padding:0; color:inherit; cursor:pointer;">
                    <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                      <div style="font-size:11px; color:${isFocused ? '#63ffb8' : tone.accent};">${dateFromKey(dayKey).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                      <div style="font-weight:700;">${dateFromKey(dayKey).toLocaleDateString('de-DE', { day: '2-digit' })}</div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;">${daySignalMarkup(stats, true) || '<span style="font-size:10px; color:#6f8d80;">Keine Einträge</span>'}</div>
                    <div style="font-size:11px; margin-top:10px; color:#8fb8a7;">${stats.totalTasks} Tasks · ${stats.logs} Logs</div>
                  </button>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button
                      data-quick-create-day="${dayKey}"
                      style="padding:6px 8px; border-radius:999px; background:${inMonth ? '#123227' : '#0a1512'}; border:1px solid ${stats.open > 0 || stats.overdue > 0 ? tone.border : 'rgba(99,255,184,0.16)'}; color:${stats.open > 0 || stats.overdue > 0 ? tone.accent : inMonth ? '#63ffb8' : '#7b978b'}; font-size:11px; cursor:pointer;">
                      + Task
                    </button>
                    <button
                      data-quick-log-day="${dayKey}"
                      style="padding:6px 8px; border-radius:999px; background:${inMonth ? '#10211c' : '#0a1512'}; border:1px solid rgba(143,184,167,0.18); color:${inMonth ? '#b7d8cb' : '#7b978b'}; font-size:11px; cursor:pointer;">
                      + Log
                    </button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>` : `
        <div style="display:grid; grid-template-columns:repeat(${7}, minmax(0, 1fr)); gap:8px;">
          ${weekKeys.map((dayKey) => {
            const isFocused = dayKey === timelineFocusKey;
            const stats = dayStats(dayKey);
            const tone = daySignalTone(stats);
            return `
              <button
                data-timeline-day="${dayKey}"
                style="text-align:left; padding:10px; border-radius:12px; border:1px solid ${isFocused ? '#63ffb8' : tone.border}; box-shadow:${isFocused ? '0 0 0 1px rgba(99,255,184,0.16), 0 0 20px rgba(99,255,184,0.08)' : tone.glow}; background:${isFocused ? '#123227' : '#091411'}; color:${isFocused ? '#e8fff5' : '#b7d8cb'}; cursor:pointer;">
                <div style="font-size:11px; color:${isFocused ? '#63ffb8' : tone.accent};">${dateFromKey(dayKey).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                <div style="font-weight:700; margin-top:4px;">${dateFromKey(dayKey).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">${daySignalMarkup(stats, true) || '<span style="font-size:10px; color:#6f8d80;">Keine Einträge</span>'}</div>
              </button>`;
          }).join('')}
        </div>`}
      </div>

      <div style="display:grid; grid-template-columns: minmax(220px, 280px) 1fr; gap:14px; align-items:start;">
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7; margin-bottom:8px;">Nächste offene Tasks im Zeitraum</div>
          ${nextOpenTasks.length ? nextOpenTasks.map((item) => `
            <div style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.06);">
              <div style="font-weight:700;">${item.title}</div>
              <div style="font-size:12px; color:#8fb8a7;">${formatDate(item.sortAt)} · ${item.subtitle}</div>
            </div>`).join('') : '<div style="color:#8fb8a7; font-size:13px;">Gerade keine offenen Tasks in diesem Zeitraum.</div>'}
        </div>

        <div style="display:grid; gap:12px;">
          ${sortedKeys.length ? sortedKeys.map((key) => `
            <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:8px;">
                <button data-timeline-day="${key}" style="font-weight:700; color:#e8fff5; background:none; border:none; padding:0; text-align:left; cursor:${key === 'ohne-datum' ? 'default' : 'pointer'};">${key === 'ohne-datum' ? 'Ohne Datum' : dateLabelFromKey(key)}</button>
                <div style="display:flex; gap:8px; align-items:center;">
                  ${key !== 'ohne-datum' ? `<button data-use-day-for-task="${key}" style="padding:6px 10px; border-radius:999px; background:#123227; border:1px solid rgba(99,255,184,0.18); color:#63ffb8; font-size:11px; cursor:pointer;">Task für Tag</button>` : ''}
                  ${key !== 'ohne-datum' ? `<button data-use-day-for-log="${key}" style="padding:6px 10px; border-radius:999px; background:#10211c; border:1px solid rgba(143,184,167,0.18); color:#b7d8cb; font-size:11px; cursor:pointer;">Log für Tag</button>` : ''}
                  <div style="font-size:12px; color:#8fb8a7;">${grouped.get(key).length} Einträge</div>
                </div>
              </div>
              <div style="display:grid; gap:8px;">
                ${grouped.get(key).map((item) => `
                  <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:10px; border-radius:10px; background:#0b1714; border:1px solid rgba(99,255,184,0.08);">
                    <div style="flex:1;">
                      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span style="display:inline-block; padding:3px 8px; border-radius:999px; font-size:11px; background:${item.type === 'task' ? 'rgba(99,255,184,0.12)' : 'rgba(143,184,167,0.12)'}; color:${item.type === 'task' ? '#63ffb8' : '#b7d8cb'};">${item.type === 'task' ? 'Task' : 'Log'}</span>
                        <strong>${item.title}</strong>
                      </div>
                      <div style="margin-top:6px; font-size:12px; color:#8fb8a7;">${item.subtitle}</div>
                    </div>
                    <div style="font-size:12px; color:#8fb8a7; white-space:nowrap;">${item.badge}</div>
                  </div>`).join('')}
              </div>
            </div>`).join('') : '<div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12); color:#8fb8a7;">Keine Timeline-Einträge in diesem Zeitraum.</div>'}
        </div>
      </div>
    </div>`;

  timelinePanel.querySelectorAll('[data-timeline-day]').forEach((node) => {
    node.addEventListener('click', () => {
      const dayKey = node.getAttribute('data-timeline-day');
      if (!dayKey || dayKey === 'ohne-datum') return;
      setTimelineFocusDay(dayKey);
      timelineMode = timelineMode === 'month' ? 'day' : timelineMode;
      renderTimelinePanel();
      applyTimelineDueToTaskForm();
      applyTimelineDateToLogForm();
    });
  });
  timelinePanel.querySelectorAll('[data-use-day-for-task]').forEach((node) => {
    node.addEventListener('click', () => {
      const dayKey = node.getAttribute('data-use-day-for-task');
      if (!dayKey) return;
      setTimelineFocusDay(dayKey);
      timelineMode = timelineMode === 'month' ? 'day' : timelineMode;
      renderTimelinePanel();
      applyTimelineDueToTaskForm();
      $('taskTitle')?.focus();
    });
  });
  timelinePanel.querySelectorAll('[data-use-day-for-log]').forEach((node) => {
    node.addEventListener('click', () => {
      const dayKey = node.getAttribute('data-use-day-for-log');
      if (!dayKey) return;
      setTimelineFocusDay(dayKey);
      timelineMode = timelineMode === 'month' ? 'day' : timelineMode;
      renderTimelinePanel();
      applyTimelineDateToLogForm();
      $('logText')?.focus();
    });
  });
  timelinePanel.querySelectorAll('[data-quick-log-day]').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      const dayKey = node.getAttribute('data-quick-log-day');
      if (!dayKey) return;
      setTimelineFocusDay(dayKey);
      timelineMode = 'day';
      renderTimelinePanel();
      applyTimelineDateToLogForm();
      $('logText')?.focus();
    });
  });
  timelinePanel.querySelectorAll('[data-quick-create-day]').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      const dayKey = node.getAttribute('data-quick-create-day');
      if (!dayKey) return;
      setTimelineFocusDay(dayKey);
      timelineMode = 'day';
      renderTimelinePanel();
      applyTimelineDueToTaskForm();
      $('taskTitle')?.focus();
    });
  });
  timelinePanel.querySelectorAll('[data-phase-action]').forEach((node) => {
    node.addEventListener('click', async (event) => {
      event.stopPropagation();
      const action = node.getAttribute('data-phase-action');
      const setKey = node.getAttribute('data-phase-set');
      await runPhaseHintAction(action, plant.plant_id, setKey);
    });
  });

  $("timelineModeDay")?.addEventListener("click", () => {
    timelineMode = "day";
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
  });
  $("timelineModeWeek")?.addEventListener("click", () => {
    timelineMode = "week";
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
  });
  $("timelineModeMonth")?.addEventListener("click", () => {
    timelineMode = "month";
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
  });
  $("timelinePrev")?.addEventListener("click", () => {
    timelineFocusKey = timelineMode === "month" ? addMonthsToKey(timelineFocusKey, -1) : addDaysToKey(timelineFocusKey, timelineMode === "day" ? -1 : -7);
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
  });
  $("timelineNext")?.addEventListener("click", () => {
    timelineFocusKey = timelineMode === "month" ? addMonthsToKey(timelineFocusKey, 1) : addDaysToKey(timelineFocusKey, timelineMode === "day" ? 1 : 7);
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
  });
  $("timelineToday")?.addEventListener("click", () => {
    timelineFocusKey = new Date().toISOString().slice(0, 10);
    renderTimelinePanel();
    applyTimelineDueToTaskForm();
    applyTimelineDateToLogForm();
  });
}

function renderDetailPanel() {
  const plant = selectedPlant();
  if (!plant) {
    detailPanel.innerHTML = `
      <div style="display:grid; gap:10px; color:#8fb8a7;">
        <h2 style="margin:0; color:#63ffb8; font-size:18px;">Pflanzendetails</h2>
        <div>Noch nix ausgewählt. Klick links auf eine Pflanze, dann siehst du hier Überblick, Status und die wichtigsten Aktionen.</div>
      </div>`;
    return;
  }

  const plantTasks = tasks.filter((t) => t.plant_id === plant.plant_id);
  const taskCount = plantTasks.length;
  const openTasks = plantTasks.filter((t) => t.status === 'open').length;
  const reminderEnabled = plantTasks.filter((t) => t.notification_enabled).length;
  const reminderOpen = plantTasks.filter((t) => t.status === 'open' && t.notification_enabled).length;
  const logCount = logs.filter((l) => l.plant_id === plant.plant_id).length;
  const summary = computePlantDashboardSummary(plant);

  detailPanel.innerHTML = `
    <div style="display:grid; gap:14px;">
      <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="width:18px; height:18px; border-radius:999px; margin-top:4px; background:${plant.color_tag}; border:1px solid rgba(255,255,255,0.18);"></div>
          <div>
            <h2 style="margin:0; color:#63ffb8; font-size:20px;">${plant.name}</h2>
            <div style="margin-top:4px; color:#8fb8a7; font-size:13px;">${phaseLabel(plant.phase)} · Woche ${plant.phase_week ?? '-'} · ${plantStatusLabel(plant)}</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button id="detailAdvanceWeek">+ Woche</button>
          <button id="detailEditToggle">${editingPlantId === plant.plant_id ? 'Edit schließen' : 'Edit öffnen'}</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Status</div>
          <div style="margin-top:6px; font-weight:700;">${isPlantActive(plant) ? 'Aktiv' : 'Read only'}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Offene Tasks</div>
          <div style="margin-top:6px; font-weight:700;">${openTasks}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Tasks gesamt</div>
          <div style="margin-top:6px; font-weight:700;">${taskCount}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Reminder aktiv</div>
          <div style="margin-top:6px; font-weight:700;">${reminderEnabled}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Offene Reminder</div>
          <div style="margin-top:6px; font-weight:700;">${reminderOpen}</div>
        </div>
        <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
          <div style="font-size:12px; color:#8fb8a7;">Logs gesamt</div>
          <div style="margin-top:6px; font-weight:700;">${logCount}</div>
        </div>
      </div>

      <div style="display:grid; gap:10px;">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap;">
          <div>
            <div style="font-size:12px; color:#8fb8a7;">Pflanzen-Dashboard</div>
            <div style="margin-top:4px; color:#b7d8cb; font-size:13px;">Die wichtigsten nächsten Punkte für genau diese Pflanze auf einen Blick.</div>
          </div>
          <div style="font-size:12px; color:#8fb8a7;">Fokuswoche: ${weekRangeLabelFromKey(timelineFocusKey)}</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
          <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
            <div style="font-size:12px; color:#8fb8a7;">Nächster offener Task</div>
            <div style="margin-top:6px; font-weight:700; color:#e8fff5;">${summary.nextOpenTask ? summary.nextOpenTask.title : 'Gerade nichts offen'}</div>
            <div style="margin-top:4px; font-size:12px; color:#8fb8a7;">${summary.nextOpenTask ? `Fällig ${formatDate(summary.nextOpenTask.due_at)}` : 'Alles erledigt oder noch ungeplant.'}</div>
          </div>
          <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
            <div style="font-size:12px; color:#8fb8a7;">Nächster Reminder</div>
            <div style="margin-top:6px; font-weight:700; color:${summary.nextReminder ? '#63ffb8' : '#e8fff5'};">${summary.nextReminder ? summary.nextReminder.task.title : 'Kein Reminder aktiv'}</div>
            <div style="margin-top:4px; font-size:12px; color:#8fb8a7;">${summary.nextReminder ? `${summary.nextReminder.bucket} · ${formatDate(summary.nextReminder.task.due_at)}` : 'Aktiviere Reminder direkt im Task.'}</div>
          </div>
          <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
            <div style="font-size:12px; color:#8fb8a7;">Letzter Log</div>
            <div style="margin-top:6px; font-weight:700; color:#e8fff5;">${summary.lastLog ? formatDate(summary.lastLog.created_at) : 'Noch kein Log'}</div>
            <div style="margin-top:4px; font-size:12px; color:#8fb8a7;">${summary.lastLog ? (summary.lastLog.text || summary.lastLog.log_type || 'Eintrag vorhanden') : 'Dokumentiere den nächsten Check direkt hier.'}</div>
          </div>
          <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
            <div style="font-size:12px; color:#8fb8a7;">Aktuelle Phase</div>
            <div style="margin-top:6px; font-weight:700; color:#e8fff5;">${summary.phaseText}</div>
            <div style="margin-top:4px; font-size:12px; color:#8fb8a7;">Status ${plantStatusLabel(plant)}</div>
          </div>
          <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12);">
            <div style="font-size:12px; color:#8fb8a7;">Wochenfortschritt</div>
            <div style="margin-top:6px; font-weight:700; color:#e8fff5;">${summary.weekProgressLabel}</div>
            <div style="margin-top:8px; height:8px; border-radius:999px; background:#0b1714; border:1px solid rgba(99,255,184,0.08); overflow:hidden;">
              <div style="width:${summary.weekProgressPercent}%; height:100%; background:linear-gradient(90deg, #0B3D2E 0%, #63ffb8 100%);"></div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid; gap:10px;">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap;">
          <div>
            <div style="font-size:12px; color:#8fb8a7;">Phasen-Hinweise</div>
            <div style="margin-top:4px; color:#b7d8cb; font-size:13px;">Kompakte Empfehlungen für ${phaseLabel(plant.phase)} direkt aus dem aktuellen Pflanzenstatus.</div>
          </div>
          <div style="font-size:12px; color:#8fb8a7;">${TASK_SET_LABELS[phaseSuggestedSetKeys(plant.phase)[0]] || 'Standardset verfügbar'}</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
          ${renderPhaseHintCards(plant)}
          ${renderPhaseHintActions(plant)}
        </div>
      </div>

      <div style="padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12); color:#b7d8cb; font-size:13px;">
        Da siehst du jetzt die ausgewählte Pflanze als zentrales Detailpanel. Tasks und Logs rechts unten beziehen sich immer auf genau diese Auswahl.
      </div>
    </div>`;

  $("detailAdvanceWeek")?.addEventListener("click", async () => {
    const updated = await invoke("update_plant_smart", {
      payload: {
        plant_id: plant.plant_id,
        name: plant.name,
        color_tag: plant.color_tag,
        phase: plant.phase,
        phase_week: (plant.phase_week ?? 0) + 1,
        status: plantStatusValue(plant),
      },
    });
    logOut(updated);
    await refreshAll();
  });

  $("detailEditToggle")?.addEventListener("click", () => {
    editingPlantId = editingPlantId === plant.plant_id ? null : plant.plant_id;
    renderPlants();
    renderDetailPanel();
  });

  detailPanel.querySelectorAll('[data-phase-action]').forEach((node) => {
    node.addEventListener('click', async () => {
      const action = node.getAttribute('data-phase-action');
      const setKey = node.getAttribute('data-phase-set');
      await runPhaseHintAction(action, plant.plant_id, setKey);
    });
  });

  renderReminderPanel();
}

async function refreshStatus() {
  try {
    const status = await invoke("get_sync_status");
    let plan = "free";
    let source = status.session_active ? "account" : "guest";
    try {
      const summary = await invoke("subscription_status_smart");
      subscriptionStatusSummary = summary || null;
      plan = summary?.plan || plan;
    } catch (_) {
      subscriptionStatusSummary = null;
      if (status.session_active) {
        try {
          const me = await invoke("auth_fetch_me");
          plan = me?.plan || "free";
        } catch (_) {
          plan = "free";
          source = "guest";
        }
      }
    }
    setCurrentPlanState(plan, source);
    if (subscriptionStatusSummary?.plant_limit == null) {
      currentPlantLimit = Number.POSITIVE_INFINITY;
    } else if (Number.isFinite(subscriptionStatusSummary?.plant_limit)) {
      currentPlantLimit = subscriptionStatusSummary.plant_limit;
    }
    await loadSubscriptionHistory();
    statusBox.innerHTML = `
      <div>Session aktiv: ${status.session_active ? "ja" : "nein"}</div>
      <div>User ID: ${status.user_id ?? "-"}</div>
      <div>Auth-Mode: ${status.auth_mode ?? "-"}</div>
      <div>Backend URL: ${status.backend_url ?? "-"}</div>
      <div>Offene Dirty-Records: ${status.dirty_count ?? 0}</div>
      <div>Last Sync: ${status.last_sync_at ?? "-"}</div>
      ${renderPlanStatusLine()}
    `;
    renderSubscriptionPanel();
    renderSettingsPanel();
    applyPageView();
  } catch (err) {
    setCurrentPlanState("free", "guest");
    subscriptionStatusSummary = null;
    subscriptionHistory = [];
    subscriptionHistorySource = "local";
    statusBox.textContent = `Statusfehler: ${err}`;
    renderSubscriptionPanel();
    renderSettingsPanel();
    applyPageView();
  }
}


function filteredPlants() {
  const query = plantSearchQuery.trim().toLowerCase();
  const visible = plants.filter((plant) => {
    const matchesQuery = !query || [plant.name, plant.phase, plant.plant_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
    const matchesPhase = plantPhaseFilter === "all" || plant.phase === plantPhaseFilter;
    const matchesState = plantStateFilter === "all"
      || (plantStateFilter === "active" && isPlantActive(plant))
      || (plantStateFilter === "ended" && isPlantEnded(plant))
      || (plantStateFilter === "inactive" && isPlantInactive(plant))
      || (plantStateFilter === "archived" && isPlantArchived(plant));
    return matchesQuery && matchesPhase && matchesState;
  });
  return visible.sort((a, b) => {
    if (plantSort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""), "de");
    if (plantSort === "phase") return String(a.phase || "").localeCompare(String(b.phase || ""), "de");
    if (plantSort === "week_desc") return Number(b.phase_week || 0) - Number(a.phase_week || 0);
    return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
  });
}

function renderPlantFilterStatus(visibleCount, totalCount) {
  if (!plantsFilterStatus) return;
  const parts = [];
  if (plantSearchQuery.trim()) parts.push(`Suche: ${plantSearchQuery.trim()}`);
  if (plantPhaseFilter !== "all") parts.push(`Phase: ${phaseLabel(plantPhaseFilter)}`);
  if (plantStateFilter !== "all") parts.push(`Status: ${plantStateFilter === "active" ? "Aktiv" : plantStateFilter === "ended" ? "Beendet" : plantStateFilter === "inactive" ? "Inaktiv (Beendet + Archiviert)" : "Archiviert"}`);
  const filterText = parts.length ? parts.join(" · ") : "Keine Filter aktiv";
  plantsFilterStatus.textContent = `${visibleCount} von ${totalCount} Pflanzen · ${filterText} · Aktiv ${activePlantCount()}/${formatPlantLimit(currentPlantLimit)} · Plan ${planLabel(currentPlan)}`;
}

function renderPlantPlanHint() {
  if (!plantPlanHint) return;
  const active = activePlantCount();
  const limitText = formatPlantLimit(currentPlantLimit);
  const blocked = !canActivateMorePlants();
  const overLimit = isOverPlantLimit();
  plantPlanHint.innerHTML = blocked
    ? `<span style="color:#ffb3a7;">Plan ${planLabel(currentPlan)} · Aktiv ${active}/${limitText}. ${overLimit ? `Du bist aktuell ${overflowPlantCount()} Pflanze${overflowPlantCount() === 1 ? '' : 'n'} über deinem Planlimit. Bestehende Runs bleiben aktiv. Neue aktive Pflanzen oder Reaktivierungen sind gesperrt, bis du wieder auf ${limitText} oder weniger aktive Pflanzen kommst.` : 'Planlimit erreicht. Du kannst aktuell keine weitere aktive Pflanze anlegen oder reaktivieren.'}</span>`
    : `<span>Plan ${planLabel(currentPlan)} · Aktiv ${active}/${limitText}. Du kannst ${Number.isFinite(currentPlantLimit) ? remainingPlantSlots() : 'weitere'} aktive Pflanzen zusätzlich anlegen.</span>`;
}

function renderPlants() {
  const current = selectedPlant();
  selectedPlantLabel.textContent = current ? `Ausgewählt: ${current.name}` : "Keine Pflanze ausgewählt";
  renderPlantPlanHint();
  renderDetailPanel();
  if (!plants.length) {
    renderPlantFilterStatus(0, 0);
    plantsList.innerHTML = `<div style="padding:16px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#b7d8cb; line-height:1.6;">Noch keine Pflanzen vorhanden.<br /><span style="color:#8fb8a7; font-size:13px;">Starte den MVP-Flow mit deiner ersten Pflanze. Danach werden Timeline, Reminder, Tasks und Logs automatisch sinnvoll befüllt.</span><div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;"><button type="button" id="emptyPlantsCreate">Erste Pflanze anlegen</button><button type="button" id="emptyPlantsBilling">Plan ansehen</button></div></div>`;
    $("emptyPlantsCreate")?.addEventListener("click", () => { switchPageView("plants"); $("plantName")?.focus(); });
    $("emptyPlantsBilling")?.addEventListener("click", () => switchPageView("billing"));
    renderDetailPanel();
    renderTimelinePanel();
    renderPhaseTaskSets();
    return;
  }
  const visiblePlants = filteredPlants();
  renderPlantFilterStatus(visiblePlants.length, plants.length);
  if (!visiblePlants.length) {
    plantsList.innerHTML = `<div style="padding:16px; border-radius:14px; background:#091411; border:1px solid rgba(99,255,184,0.10); color:#b7d8cb; line-height:1.6;">Keine Pflanzen passen zu deinen Filtern.<br /><span style="color:#8fb8a7; font-size:13px;">Passe Suche, Phase oder Status an, damit wieder Treffer sichtbar werden.</span><div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;"><button type="button" id="resetPlantFilters">Filter zurücksetzen</button></div></div>`;
    $("resetPlantFilters")?.addEventListener("click", () => { plantSearchQuery = ""; plantPhaseFilter = "all"; plantStateFilter = "all"; plantSort = "updated_desc"; applyPlantFilterPrefsToControls(); persistPlantFilterPrefs(); renderPlants(); });
    renderTimelinePanel();
    renderPhaseTaskSets();
    return;
  }
  const grandfatheredIds = grandfatheredActivePlantIds();
  plantsList.innerHTML = visiblePlants.map((plant) => {
    const isEditing = editingPlantId === plant.plant_id;
    const isGrandfathered = grandfatheredIds.has(plant.plant_id);
    const primaryStatusTone = plantStatusTone(plant);
    const statusBadges = [
      `<span style="font-size:11px; padding:4px 8px; border-radius:999px; background:${primaryStatusTone.bg}; border:1px solid ${primaryStatusTone.border}; color:${primaryStatusTone.color};">${plantStatusLabel(plant).toLowerCase()}</span>`,
      isGrandfathered
        ? '<span style="font-size:11px; padding:4px 8px; border-radius:999px; background:rgba(255,120,120,0.12); border:1px solid rgba(255,120,120,0.24); color:#ffb3a7;">läuft trotz Überlimit weiter</span>'
        : '',
      isPlantActive(plant) && !isGrandfathered && Number.isFinite(currentPlantLimit)
        ? '<span style="font-size:11px; padding:4px 8px; border-radius:999px; background:rgba(159,215,255,0.12); border:1px solid rgba(159,215,255,0.24); color:#9fd7ff;">innerhalb Planlimit</span>'
        : '',
    ].filter(Boolean).join(' ');
    return `
    <div data-plant-id="${plant.plant_id}" style="padding:12px; border-radius:14px; border:1px solid ${isGrandfathered ? 'rgba(255,120,120,0.32)' : selectedPlantId === plant.plant_id ? '#63ffb8' : 'rgba(99,255,184,0.15)'}; background:${selectedPlantId === plant.plant_id ? '#10231d' : isGrandfathered ? '#1a1212' : '#0b1714'}; box-shadow:${isGrandfathered ? '0 0 0 1px rgba(255,120,120,0.08), 0 0 24px rgba(255,120,120,0.06)' : 'none'};">
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
        <div style="display:flex; gap:10px; align-items:flex-start; flex:1;">
          <div style="width:14px; height:14px; border-radius:999px; margin-top:4px; background:${plant.color_tag}; border:1px solid rgba(255,255,255,0.15);"></div>
          <div style="flex:1;">
            <div style="font-weight:700; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">${plant.name}</div>
            <div style="font-size:12px; color:#8fb8a7; margin-top:4px;">${phaseLabel(plant.phase)} · Woche ${plant.phase_week ?? '-'} · ${plantStatusLabel(plant)}${isPlantEnded(plant) ? ' · zählt nicht ins Limit' : isPlantArchived(plant) ? ' · reaktivierbar' : ''}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">${statusBadges}</div>
            ${isGrandfathered ? `<div style="margin-top:8px; font-size:12px; color:#ffb3a7;">Diese Pflanze bleibt trotz Downgrade aktiv. Für neue aktive Pflanzen musst du erst wieder unter dein Planlimit kommen.</div>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
          <button data-action="select" data-plant-id="${plant.plant_id}">Öffnen</button>
          <button data-action="advance" data-plant-id="${plant.plant_id}">+ Woche</button>
          <button data-action="prepare-task" data-plant-id="${plant.plant_id}">Task</button>
          <button data-action="prepare-log" data-plant-id="${plant.plant_id}">Log</button>
          <button data-action="toggle-archive" data-plant-id="${plant.plant_id}" ${isPlantArchived(plant) && !canActivateMorePlants() ? 'data-blocked-reactivate="1"' : ''}>${isPlantArchived(plant) ? 'Reaktivieren' : 'Archivieren'}</button>
          <button data-action="end-run" data-plant-id="${plant.plant_id}" ${!isPlantActive(plant) ? "disabled" : ""}>Run beenden</button>
          <button data-action="edit" data-plant-id="${plant.plant_id}">${isEditing ? 'Schließen' : 'Edit'}</button>
          <button data-action="delete" data-plant-id="${plant.plant_id}">Löschen</button>
        </div>
      </div>
      ${isEditing ? `
        <div style="margin-top:12px; padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12); display:grid; gap:10px;">
          <input data-edit-field="name" data-plant-id="${plant.plant_id}" value="${plant.name}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <input data-edit-field="color" data-plant-id="${plant.plant_id}" type="color" value="${plant.color_tag}" style="width:100%; height:44px; border-radius:10px; border:1px solid #1f4036; background:#08120f;" />
            <select data-edit-field="phase" data-plant-id="${plant.plant_id}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
              <option value="seed" ${plant.phase === 'seed' ? 'selected' : ''}>Seed</option>
              <option value="veg" ${plant.phase === 'veg' ? 'selected' : ''}>Veg</option>
              <option value="flower" ${plant.phase === 'flower' ? 'selected' : ''}>Flower</option>
              <option value="harvest" ${plant.phase === 'harvest' ? 'selected' : ''}>Harvest</option>
              <option value="dry" ${plant.phase === 'dry' ? 'selected' : ''}>Dry</option>
              <option value="cure" ${plant.phase === 'cure' ? 'selected' : ''}>Cure</option>
              <option value="custom" ${plant.phase === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
            <input data-edit-field="phase_week" data-plant-id="${plant.plant_id}" type="number" min="0" value="${plant.phase_week ?? 0}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button data-action="save-edit" data-plant-id="${plant.plant_id}">Speichern</button>
            <button data-action="cancel-edit" data-plant-id="${plant.plant_id}">Abbrechen</button>
          </div>
        </div>` : ''}
    </div>`;
  }).join("");

  plantsList.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const plantId = btn.dataset.plantId;
      const action = btn.dataset.action;
      if (action === "select") {
        selectedPlantId = plantId;
        renderPlants();
        await loadTasks();
        await loadLogs();
        return;
      }
      if (action === "advance") {
        const plant = plants.find((p) => p.plant_id === plantId);
        if (!plant) return;
        const updated = await invoke("update_plant_smart", {
          payload: {
            plant_id: plant.plant_id,
            name: plant.name,
            color_tag: plant.color_tag,
            phase: plant.phase,
            phase_week: (plant.phase_week ?? 0) + 1,
            status: plantStatusValue(plant),
          },
        });
        logOut(updated);
        await refreshAll();
        return;
      }
      if (action === "end-run") {
        const plant = plants.find((p) => p.plant_id === plantId);
        if (!plant) return;
        const updated = await invoke("update_plant_smart", {
          payload: {
            plant_id: plant.plant_id,
            name: plant.name,
            color_tag: plant.color_tag,
            phase: plant.phase,
            phase_week: plant.phase_week,
            status: "ended",
          },
        });
        logOut(updated);
        await refreshAll();
        return;
      }
      if (action === "prepare-task") {
        await prepareTaskFromHome(plantId, {});
        return;
      }
      if (action === "prepare-log") {
        await prepareLogFromHome(plantId, {});
        return;
      }
      if (action === "toggle-archive") {
        const plant = plants.find((p) => p.plant_id === plantId);
        if (!plant) return;
        const archived = !isPlantArchived(plant);
        if (!archived && !canActivateMorePlants()) {
          logOut(planLimitMessage("reactivate"));
          return;
        }
        const nextStatus = archived ? 'archived' : 'active';
        const updated = await invoke("update_plant_smart", {
          payload: {
            plant_id: plant.plant_id,
            name: plant.name,
            color_tag: plant.color_tag,
            phase: plant.phase,
            phase_week: plant.phase_week ?? 0,
            status: nextStatus,
          },
        });
        if (selectedPlantId === plantId && archived) {
          selectedPlantId = plantId;
        }
        logOut(updated);
        await refreshAll();
        return;
      }
      if (action === "edit") {
        editingPlantId = editingPlantId === plantId ? null : plantId;
        renderPlants();
        return;
      }
      if (action === "cancel-edit") {
        editingPlantId = null;
        renderPlants();
        return;
      }
      if (action === "save-edit") {
        const plant = plants.find((p) => p.plant_id === plantId);
        if (!plant) return;
        const name = plantsList.querySelector(`[data-edit-field="name"][data-plant-id="${plantId}"]`)?.value?.trim() || plant.name;
        const color = plantsList.querySelector(`[data-edit-field="color"][data-plant-id="${plantId}"]`)?.value || plant.color_tag;
        const phase = plantsList.querySelector(`[data-edit-field="phase"][data-plant-id="${plantId}"]`)?.value || plant.phase;
        const phaseWeekRaw = plantsList.querySelector(`[data-edit-field="phase_week"][data-plant-id="${plantId}"]`)?.value;
        const phaseWeek = phaseWeekRaw === "" || phaseWeekRaw == null ? null : Number(phaseWeekRaw);
        const updated = await invoke("update_plant_smart", {
          payload: {
            plant_id: plant.plant_id,
            name,
            color_tag: color,
            phase,
            phase_week: phaseWeek,
            status: plantStatusValue(plant),
          },
        });
        editingPlantId = null;
        logOut(updated);
        await refreshAll();
        return;
      }
      if (action === "delete") {
        await invoke("delete_plant_smart", { plant_id: plantId });
        if (selectedPlantId === plantId) selectedPlantId = null;
        if (editingPlantId === plantId) editingPlantId = null;
        await refreshAll();
      }
    });
  });
}

function renderTasks() {
  const visible = selectedPlantId ? tasks.filter((task) => task.plant_id === selectedPlantId) : [];
  if (!selectedPlantId) {
    tasksList.innerHTML = `<div style="color:#8fb8a7;">Wähle zuerst eine Pflanze aus.</div>`;
    renderDetailPanel();
    renderReminderPanel();
    renderTimelinePanel();
  renderPhaseTaskSets();
    return;
  }
  if (!visible.length) {
    tasksList.innerHTML = `<div style="color:#8fb8a7;">Noch keine Tasks für diese Pflanze.</div>`;
    renderDetailPanel();
    renderReminderPanel();
    renderTimelinePanel();
  renderPhaseTaskSets();
    return;
  }
  tasksList.innerHTML = visible.map((task) => {
    const isEditing = editingTaskId === task.task_id;
    return `
    <div style="padding:12px; border-radius:14px; border:1px solid rgba(99,255,184,0.15); background:#0b1714;">
      <div style="display:flex; justify-content:space-between; gap:8px;">
        <div style="flex:1;">
          <div style="font-weight:700;">${task.title}</div>
          <div style="font-size:12px; color:#8fb8a7;">${task.category} · ${task.status} · fällig ${formatDate(task.due_at)}</div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
          <button data-action="done" data-task-id="${task.task_id}">Done</button>
          <button data-action="skip" data-task-id="${task.task_id}">Skip</button>
          <button data-action="edit" data-task-id="${task.task_id}">${isEditing ? 'Schließen' : 'Edit'}</button>
          <button data-action="delete" data-task-id="${task.task_id}">Delete</button>
        </div>
      </div>
      ${isEditing ? `
      <div style="margin-top:12px; padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12); display:grid; gap:10px;">
        <input data-task-edit="title" data-task-id="${task.task_id}" value="${task.title}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <select data-task-edit="category" data-task-id="${task.task_id}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
            <option value="water" ${task.category === 'water' ? 'selected' : ''}>Water</option>
            <option value="feed" ${task.category === 'feed' ? 'selected' : ''}>Feed</option>
            <option value="check" ${task.category === 'check' ? 'selected' : ''}>Check</option>
            <option value="train" ${task.category === 'train' ? 'selected' : ''}>Train</option>
            <option value="note" ${task.category === 'note' ? 'selected' : ''}>Note</option>
          </select>
          <input data-task-edit="repeat" data-task-id="${task.task_id}" type="number" min="0" value="${task.repeat_interval_hours ?? ''}" placeholder="Repeat h" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          <select data-task-edit="status" data-task-id="${task.task_id}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
            <option value="open" ${task.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
            <option value="skipped" ${task.status === 'skipped' ? 'selected' : ''}>Skipped</option>
          </select>
        </div>
        <input data-task-edit="due_at" data-task-id="${task.task_id}" type="datetime-local" value="${toDatetimeLocalValue(task.due_at)}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        <label style="display:flex; align-items:center; gap:8px; color:#b7d8cb; font-size:13px;">
          <input data-task-edit="notification_enabled" data-task-id="${task.task_id}" type="checkbox" ${task.notification_enabled ? 'checked' : ''} />
          Reminder aktiv
        </label>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button data-action="save-edit" data-task-id="${task.task_id}">Speichern</button>
          <button data-action="cancel-edit" data-task-id="${task.task_id}">Abbrechen</button>
        </div>
      </div>` : ''}
    </div>`;
  }).join("");
  renderDetailPanel();
  renderReminderPanel();
  renderTimelinePanel();

  tasksList.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const taskId = btn.dataset.taskId;
      const action = btn.dataset.action;
      const task = visible.find((item) => item.task_id === taskId);
      if (!task) return;
      if (action === "delete") {
        await invoke("delete_task_smart", { task_id: taskId });
      } else if (action === "edit") {
        editingTaskId = editingTaskId === taskId ? null : taskId;
        renderTasks();
  renderDetailPanel();
        return;
      } else if (action === "cancel-edit") {
        editingTaskId = null;
        renderTasks();
        return;
      } else if (action === "save-edit") {
        const title = tasksList.querySelector(`[data-task-edit="title"][data-task-id="${taskId}"]`)?.value?.trim() || task.title;
        const category = tasksList.querySelector(`[data-task-edit="category"][data-task-id="${taskId}"]`)?.value || task.category;
        const status = tasksList.querySelector(`[data-task-edit="status"][data-task-id="${taskId}"]`)?.value || task.status;
        const repeatRaw = tasksList.querySelector(`[data-task-edit="repeat"][data-task-id="${taskId}"]`)?.value;
        const repeat = repeatRaw === "" || repeatRaw == null ? null : Number(repeatRaw);
        const dueAtRaw = tasksList.querySelector(`[data-task-edit="due_at"][data-task-id="${taskId}"]`)?.value;
        const due_at = datetimeLocalToIso(dueAtRaw) || task.due_at;
        const notification_enabled = !!tasksList.querySelector(`[data-task-edit="notification_enabled"][data-task-id="${taskId}"]`)?.checked;
        await invoke("update_task_smart", { payload: { task_id: taskId, title, category, due_at, repeat_interval_hours: repeat, status, notification_enabled } });
        editingTaskId = null;
      } else {
        await invoke("update_task_status_smart", { payload: { task_id: taskId, status: action === "done" ? "done" : "skipped" } });
      }
      await refreshAll({ autoReminderReason: "task_action" });
    });
  });
}

function renderLogs() {
  const visible = selectedPlantId ? logs.filter((log) => log.plant_id === selectedPlantId) : [];
  if (!selectedPlantId) {
    logsList.innerHTML = `<div style="color:#8fb8a7;">Wähle zuerst eine Pflanze aus.</div>`;
    renderDetailPanel();
    renderReminderPanel();
    renderTimelinePanel();
  renderPhaseTaskSets();
    return;
  }
  if (!visible.length) {
    logsList.innerHTML = `<div style="color:#8fb8a7;">Noch keine Logs für diese Pflanze.</div>`;
    renderDetailPanel();
    renderReminderPanel();
    renderTimelinePanel();
  renderPhaseTaskSets();
    return;
  }
  logsList.innerHTML = visible.map((log) => {
    const isEditing = editingLogId === log.log_id;
    return `
    <div style="padding:12px; border-radius:14px; border:1px solid rgba(99,255,184,0.15); background:#0b1714;">
      <div style="display:flex; justify-content:space-between; gap:8px;">
        <div style="flex:1;">
          <div style="font-weight:700;">${log.log_type}</div>
          <div style="font-size:12px; color:#8fb8a7;">${formatDate(log.created_at)}</div>
          <div style="margin-top:8px;">${log.text ?? "-"}</div>
          ${log.metrics ? `<div style="margin-top:6px; font-size:12px; color:#8fb8a7;">pH ${log.metrics.ph ?? '-'} · EC ${log.metrics.ec ?? '-'} · Temp ${log.metrics.temp_c ?? '-'} · RH ${log.metrics.rh ?? '-'}</div>` : ""}
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;"><button data-action="edit" data-log-id="${log.log_id}">${isEditing ? 'Schließen' : 'Edit'}</button><button data-action="delete" data-log-id="${log.log_id}">Delete</button></div>
      </div>
      ${isEditing ? `
      <div style="margin-top:12px; padding:12px; border-radius:12px; background:#091411; border:1px solid rgba(99,255,184,0.12); display:grid; gap:10px;">
        <select data-log-edit="log_type" data-log-id="${log.log_id}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">
          <option value="note" ${log.log_type === 'note' ? 'selected' : ''}>Note</option>
          <option value="measurement" ${log.log_type === 'measurement' ? 'selected' : ''}>Measurement</option>
          <option value="action" ${log.log_type === 'action' ? 'selected' : ''}>Action</option>
          <option value="photo" ${log.log_type === 'photo' ? 'selected' : ''}>Photo</option>
        </select>
        <textarea data-log-edit="text" data-log-id="${log.log_id}" rows="3" style="width:100%; padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;">${log.text ?? ''}</textarea>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <input data-log-edit="ph" data-log-id="${log.log_id}" type="number" step="0.1" value="${log.metrics?.ph ?? ''}" placeholder="pH" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          <input data-log-edit="ec" data-log-id="${log.log_id}" type="number" step="0.1" value="${log.metrics?.ec ?? ''}" placeholder="EC" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <input data-log-edit="temp_c" data-log-id="${log.log_id}" type="number" step="0.1" value="${log.metrics?.temp_c ?? ''}" placeholder="Temp °C" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
          <input data-log-edit="rh" data-log-id="${log.log_id}" type="number" step="0.1" value="${log.metrics?.rh ?? ''}" placeholder="RH %" style="padding:10px; border-radius:10px; border:1px solid #1f4036; background:#08120f; color:#e8fff5;" />
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button data-action="save-edit" data-log-id="${log.log_id}">Speichern</button>
          <button data-action="cancel-edit" data-log-id="${log.log_id}">Abbrechen</button>
        </div>
      </div>` : ''}
    </div>`;
  }).join("");
  renderDetailPanel();
  renderReminderPanel();
  renderTimelinePanel();

  logsList.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const logId = btn.dataset.logId;
      const action = btn.dataset.action;
      const log = visible.find((item) => item.log_id === logId);
      if (!log) return;
      if (action === "edit") {
        editingLogId = editingLogId === logId ? null : logId;
        renderLogs();
  renderDetailPanel();
        return;
      }
      if (action === "cancel-edit") {
        editingLogId = null;
        renderLogs();
        return;
      }
      if (action === "save-edit") {
        const logType = logsList.querySelector(`[data-log-edit="log_type"][data-log-id="${logId}"]`)?.value || log.log_type;
        const textValue = logsList.querySelector(`[data-log-edit="text"][data-log-id="${logId}"]`)?.value ?? log.text ?? "";
        const numberFrom = (field) => {
          const raw = logsList.querySelector(`[data-log-edit="${field}"][data-log-id="${logId}"]`)?.value;
          return raw === "" || raw == null ? null : Number(raw);
        };
        await invoke("update_log_smart", { payload: {
          log_id: logId,
          log_type: logType,
          text: textValue,
          ph: numberFrom('ph'),
          ec: numberFrom('ec'),
          temp_c: numberFrom('temp_c'),
          rh: numberFrom('rh'),
        }});
        editingLogId = null;
      } else if (action === "delete") {
        await invoke("delete_log_smart", { log_id: logId });
      }
      await refreshAll({ autoReminderReason: "log_action" });
    });
  });
}

async function loadPlants() {
  plants = await invoke("list_current_plants");
  if (selectedPlantId && !plants.some((p) => p.plant_id === selectedPlantId)) selectedPlantId = null;
  if (!selectedPlantId && plants.length) selectedPlantId = plants[0].plant_id;
  renderPlants();
  renderTimelinePanel();
  renderPhaseTaskSets();
}

async function loadTasks() {
  tasks = selectedPlantId ? await invoke("list_current_tasks", { plant_id: selectedPlantId }) : [];
  renderTasks();
}

async function loadLogs() {
  logs = selectedPlantId ? await invoke("list_current_logs", { plant_id: selectedPlantId }) : [];
  renderLogs();
}

async function loadAllTasks() {
  const grouped = await Promise.all(plants.map((plant) => invoke("list_current_tasks", { plant_id: plant.plant_id }).catch(() => [])));
  allTasks = grouped.flat();
  renderHomePanel();
}

async function loadAllLogs() {
  const grouped = await Promise.all(plants.map((plant) => invoke("list_current_logs", { plant_id: plant.plant_id }).catch(() => [])));
  allLogs = grouped.flat();
  renderHomePanel();
}

async function refreshAll(options = {}) {
  const { autoReminderReason = null } = options;
  await refreshStatus();
  await loadPlants();
  await Promise.all([loadTasks(), loadLogs(), loadAllTasks(), loadAllLogs()]);
  renderHomePanel();
  if (autoReminderReason) {
    await autoCheckDueNotifications(autoReminderReason);
  }
}

$("bootstrap").addEventListener("click", async () => {
  logOut(await invoke("bootstrap_local_user"));
  await refreshAll({ autoReminderReason: "guest_bootstrap" });
});

$("register").addEventListener("click", async () => {
  const result = await invoke("auth_register", { payload: { email: $("email").value, password: $("password").value, backend_url: $("backendUrl").value } });
  logOut(result);
  await refreshAll({ autoReminderReason: "auth_change" });
});

$("login").addEventListener("click", async () => {
  const result = await invoke("auth_login", { payload: { email: $("email").value, password: $("password").value, backend_url: $("backendUrl").value } });
  logOut(result);
  await refreshAll({ autoReminderReason: "auth_change" });
});

$("me").addEventListener("click", async () => {
  logOut(await invoke("auth_fetch_me"));
  await refreshStatus();
});

$("syncNow").addEventListener("click", async () => {
  logOut(await invoke("sync_now"));
  await refreshAll({ autoReminderReason: "sync_now" });
});

subscriptionPanel?.addEventListener("click", async (event) => {
  const webhookPlan = event.target?.dataset?.checkoutWebhookPlan;
  if (webhookPlan) {
    try {
      setCheckoutState({ status: "idle", plan: webhookPlan, message: `Webhook-Bestätigung für ${planLabel(webhookPlan)} wird simuliert...`, checkoutUrl: checkoutState.checkoutUrl || null });
      addCheckoutHistoryEntry({ mode: 'webhook', status: 'pending', plan: webhookPlan, message: `Webhook-Bestätigung für ${planLabel(webhookPlan)} wird simuliert.` });
      renderSubscriptionPanel();
      const result = await invoke("subscription_webhook_stub_smart", { plan: webhookPlan, checkoutStatus: "paid" });
      setCheckoutState({
        status: "ready",
        plan: webhookPlan,
        message: result?.message || `Webhook für ${planLabel(webhookPlan)} verarbeitet.`,
        checkoutUrl: checkoutState.checkoutUrl || null,
      });
      addCheckoutHistoryEntry({ mode: 'webhook', status: 'success', plan: webhookPlan, message: result?.message || `Webhook für ${planLabel(webhookPlan)} verarbeitet.` , checkoutId: result?.checkout_id || result?.checkoutId || null });
      logOut(result);
      await refreshAll({ autoReminderReason: "subscription_webhook" });
    } catch (err) {
      setCheckoutState({ status: "error", plan: webhookPlan, message: `Webhook-Simulation fehlgeschlagen: ${err}`, checkoutUrl: checkoutState.checkoutUrl || null });
      addCheckoutHistoryEntry({ mode: 'webhook', status: 'error', plan: webhookPlan, message: `Webhook-Simulation fehlgeschlagen: ${err}` });
      renderSubscriptionPanel();
      logOut(`Webhook-Simulation fehlgeschlagen: ${err}`);
    }
    return;
  }

  const plan = event.target?.dataset?.planAction;
  if (!plan) return;
  const preview = planPreviewFor(plan);
  const confirmed = window.confirm([
    `Checkout vorbereiten für ${preview.title}${preview.price ? ` (${preview.price})` : ""}`,
    "",
    preview.summary,
    preview.cleanupHint,
    "",
    "Checkout jetzt vorbereiten?",
  ].join("\n"));
  if (!confirmed) return;
  try {
    setCheckoutState({ status: "idle", plan, message: `Checkout für ${preview.title} wird vorbereitet...`, checkoutUrl: null });
    addCheckoutHistoryEntry({ mode: 'checkout', status: 'pending', plan, message: `Checkout für ${preview.title} wird vorbereitet.` });
    renderSubscriptionPanel();
    const result = await invoke("subscription_checkout_smart", { plan });
    setCheckoutState({
      status: "ready",
      plan,
      message: result?.message || `Checkout für ${preview.title} vorbereitet. Der Zielplan wurde an das Backend übergeben und kann jetzt weiter verdrahtet werden.`,
      checkoutUrl: result?.checkout_url || result?.url || null,
    });
    addCheckoutHistoryEntry({ mode: 'checkout', status: 'success', plan, message: result?.message || `Checkout für ${preview.title} vorbereitet.`, checkoutId: result?.checkout_id || result?.checkoutId || null });
    logOut(result);
    await refreshAll({ autoReminderReason: "plan_change" });
  } catch (err) {
    setCheckoutState({ status: "error", plan, message: `Checkout-Vorbereitung fehlgeschlagen: ${err}`, checkoutUrl: null });
    addCheckoutHistoryEntry({ mode: 'checkout', status: 'error', plan, message: `Checkout-Vorbereitung fehlgeschlagen: ${err}` });
    renderSubscriptionPanel();
    logOut(`Planwechsel fehlgeschlagen: ${err}`);
  }
});

$("resetPlantForm").addEventListener("click", resetPlantForm);
$("resetTaskForm").addEventListener("click", resetTaskForm);
$("taskSetBar")?.addEventListener("click", async (event) => {
  const key = event.target?.dataset?.taskSet;
  if (!key) return;
  await createTaskSet(key);
});

phaseTaskSetBar?.addEventListener("click", async (event) => {
  const key = event.target?.dataset?.phaseTaskSet;
  if (!key) return;
  await createTaskSet(key);
});

$("taskDueFromTimeline").addEventListener("click", applyTimelineDueToTaskForm);
$("logDateFromTimeline").addEventListener("click", applyTimelineDateToLogForm);
$("resetLogForm").addEventListener("click", resetLogForm);

$("createPlant").addEventListener("click", async () => {
  clearFormError(plantFormError);
  const name = $("plantName").value.trim();
  if (!name) {
    showFormError(plantFormError, "Bitte gib deiner Pflanze einen Namen.");
    return;
  }
  if (!canActivateMorePlants()) {
    showFormError(plantFormError, planLimitMessage("create"));
    return;
  }
  try {
    const payload = {
      name,
      color_tag: $("plantColor").value,
      phase: $("plantPhase").value,
      phase_week: 1,
    };
    const plant = await invoke("create_plant_smart", { payload });
    resetPlantForm();
    selectedPlantId = plant.plant_id;
    logOut(plant);
    await refreshAll({ autoReminderReason: "plant_create" });
  } catch (err) {
    showFormError(plantFormError, `Pflanze konnte nicht angelegt werden: ${err}`);
  }
});

$("createTask").addEventListener("click", async () => {
  clearFormError(taskFormError);
  if (!selectedPlantId) {
    showFormError(taskFormError, "Wähle zuerst eine Pflanze aus.");
    return;
  }
  const title = $("taskTitle").value.trim();
  if (!title) {
    showFormError(taskFormError, "Bitte gib dem Task einen Titel.");
    return;
  }
  const repeat = parseOptionalNumber("taskRepeat");
  if (Number.isNaN(repeat) || (repeat !== null && repeat < 0)) {
    showFormError(taskFormError, "Repeat muss leer oder eine Zahl ab 0 sein.");
    return;
  }
  const due_at = datetimeLocalToIso($("taskDueAt").value);
  const notification_enabled = $("taskNotificationEnabled")?.checked ?? true;
  if (!due_at) {
    showFormError(taskFormError, "Bitte wähle ein gültiges Fälligkeitsdatum.");
    return;
  }
  try {
    const task = await invoke("create_task_smart", {
      payload: {
        plant_id: selectedPlantId,
        title,
        category: $("taskCategory").value,
        due_at,
        repeat_interval_hours: repeat,
        notification_enabled,
      },
    });
    resetTaskForm();
    logOut(task);
    await refreshAll({ autoReminderReason: "task_create" });
  } catch (err) {
    showFormError(taskFormError, `Task konnte nicht angelegt werden: ${err}`);
  }
});

$("createLog").addEventListener("click", async () => {
  clearFormError(logFormError);
  if (!selectedPlantId) {
    showFormError(logFormError, "Wähle zuerst eine Pflanze aus.");
    return;
  }
  const textValue = $("logText").value.trim();
  const ph = parseOptionalNumber("logPh");
  const ec = parseOptionalNumber("logEc");
  const temp_c = parseOptionalNumber("logTemp");
  const rh = parseOptionalNumber("logRh");
  if ([ph, ec, temp_c, rh].some(Number.isNaN)) {
    showFormError(logFormError, "Messwerte müssen leer oder gültige Zahlen sein.");
    return;
  }
  if (!textValue && ph === null && ec === null && temp_c === null && rh === null) {
    showFormError(logFormError, "Bitte gib mindestens Text oder einen Messwert ein.");
    return;
  }
  try {
    const payload = {
      plant_id: selectedPlantId,
      log_type: "note",
      created_at: datetimeLocalToIso($("logCreatedAt").value),
      text: textValue,
      ph,
      ec,
      temp_c,
      rh,
    };
    const log = await invoke("create_log_smart", { payload });
    resetLogForm();
    logOut(log);
    await refreshAll({ autoReminderReason: "log_create" });
  } catch (err) {
    showFormError(logFormError, `Log konnte nicht angelegt werden: ${err}`);
  }
});

loadPlantFilterPrefs();
applyPlantFilterPrefsToControls();
bindPlantFilterControls();
resetTaskForm();
renderSettingsPanel();
renderOnboardingPanel();
applyPageView();

refreshAll({ autoReminderReason: "app_start" }).catch((err) => {
  statusBox.textContent = `Init-Fehler: ${err}`;
  renderSettingsPanel();
  renderOnboardingPanel();
  applyPageView();
  logOut(String(err));
});


function bindPlantFilterControls() {
  $("plantSearch")?.addEventListener("input", (event) => {
    plantSearchQuery = event.target.value || "";
    persistPlantFilterPrefs();
    renderPlants();
  });
  $("plantPhaseFilter")?.addEventListener("change", (event) => {
    plantPhaseFilter = event.target.value || "all";
    persistPlantFilterPrefs();
    renderPlants();
  });
  $("plantStateFilter")?.addEventListener("change", (event) => {
    plantStateFilter = event.target.value || "all";
    persistPlantFilterPrefs();
    renderPlants();
  });
  $("plantSort")?.addEventListener("change", (event) => {
    plantSort = event.target.value || "updated_desc";
    persistPlantFilterPrefs();
    renderPlants();
  });
}


loadCheckoutHistory();
