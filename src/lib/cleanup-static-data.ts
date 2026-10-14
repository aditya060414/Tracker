/**
 * Purges legacy static/seed mock data from localStorage if previously stored.
 * Ensures the app starts with a clean, dynamic state for real users.
 */
export function purgeLegacyStaticData() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const isPurged = localStorage.getItem("static_data_purged_v1");
    if (isPurged === "true") return;

    // Check goals
    const rawGoals = localStorage.getItem("goals");
    if (rawGoals && (rawGoals.includes("Morning workout") || rawGoals.includes("Review quarterly roadmap"))) {
      localStorage.removeItem("goals");
    }

    // Check work tasks
    const rawWork = localStorage.getItem("work-tasks");
    if (rawWork && (rawWork.includes("Ship onboarding redesign") || rawWork.includes("w1"))) {
      localStorage.removeItem("work-tasks");
    }

    // Check scheduler
    const rawOd = localStorage.getItem("sched-overdue");
    if (rawOd && (rawOd.includes("Renew car insurance") || rawOd.includes("o1"))) {
      localStorage.removeItem("sched-overdue");
    }
    const rawUp = localStorage.getItem("sched-upcoming");
    if (rawUp && (rawUp.includes("Dentist appointment") || rawUp.includes("u1"))) {
      localStorage.removeItem("sched-upcoming");
    }

    // Check transactions
    const rawTxs = localStorage.getItem("transactions");
    if (rawTxs && (rawTxs.includes("Salary") || rawTxs.includes("t1"))) {
      localStorage.removeItem("transactions");
    }

    // Check ideas
    const rawIdeas = localStorage.getItem("ideas");
    if (rawIdeas && (rawIdeas.includes("Weekly review template") || rawIdeas.includes("i1"))) {
      localStorage.removeItem("ideas");
    }

    // Check health
    if (localStorage.getItem("water") === "5") {
      localStorage.setItem("water", "0");
    }
    const rawHabits = localStorage.getItem("habits");
    if (rawHabits && rawHabits.includes("Stretch") && rawHabits.includes("Take vitamins")) {
      localStorage.setItem("habits", "[]");
    }

    // Check challenges
    if (localStorage.getItem("challenge-day") === "32") {
      localStorage.removeItem("challenge-day");
    }

    // Check profile name
    if (localStorage.getItem("profile-name") === '"Alex"' || localStorage.getItem("profile-name") === "Alex") {
      localStorage.removeItem("profile-name");
    }

    // Check special task
    localStorage.removeItem("special-done");

    localStorage.setItem("static_data_purged_v1", "true");
  } catch (err) {
    console.warn("Could not purge legacy static data:", err);
  }
}
