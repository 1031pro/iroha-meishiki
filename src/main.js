import { calculateAnnualLuck, calculateChart, calculateMajorLuck, createInterpretation } from "./four-pillars.js";
import { fitSheet, renderResult } from "./view.js";

const form = document.querySelector("#birth-form");
const inputScreen = document.querySelector("#input-screen");
const results = document.querySelector("#results");
const yearSelect = document.querySelector("#birth-year");
const monthSelect = document.querySelector("#birth-month");
const daySelect = document.querySelector("#birth-day");
const hourSelect = document.querySelector("#birth-hour");
const minuteSelect = document.querySelector("#birth-minute");
const unknownTime = document.querySelector("#unknown-time");
const formError = document.querySelector("#form-error");

function options(start, end, selected, suffix = "") {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
    .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}${suffix}</option>`).join("");
}

function daysInMonth() {
  return new Date(Number(yearSelect.value), Number(monthSelect.value), 0).getDate();
}

function refreshDays() {
  const previous = Number(daySelect.value) || 1;
  const total = daysInMonth();
  daySelect.innerHTML = options(1, total, Math.min(previous, total));
}

function setTimeDisabled() {
  hourSelect.disabled = unknownTime.checked;
  minuteSelect.disabled = unknownTime.checked;
}

function initializeForm() {
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = options(1900, 2100, 1990);
  monthSelect.innerHTML = options(1, 12, 1);
  daySelect.innerHTML = options(1, 31, 1);
  hourSelect.innerHTML = options(0, 23, 12);
  minuteSelect.innerHTML = options(0, 59, 0);
  document.querySelector("#current-year").value = currentYear;
  setTimeDisabled();
}

function readInput() {
  return {
    year: Number(yearSelect.value), month: Number(monthSelect.value), day: Number(daySelect.value),
    hour: Number(hourSelect.value), minute: Number(minuteSelect.value), unknownTime: unknownTime.checked,
    sex: form.elements.sex.value, currentYear: Number(document.querySelector("#current-year").value),
  };
}

function showInput() {
  document.body.classList.remove("result-mode");
  results.hidden = true;
  inputScreen.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showResult(input) {
  const chart = calculateChart(input);
  const majorLuck = calculateMajorLuck(chart);
  const annualLuck = calculateAnnualLuck(chart, input.currentYear);
  const interpretation = createInterpretation(chart, majorLuck, annualLuck);
  renderResult(results, { chart, majorLuck, annualLuck, interpretation });
  inputScreen.hidden = true;
  results.hidden = false;
  document.body.classList.add("result-mode");
  requestAnimationFrame(() => requestAnimationFrame(fitSheet));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    formError.hidden = true;
    showResult(readInput());
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  }
});

yearSelect.addEventListener("change", refreshDays);
monthSelect.addEventListener("change", refreshDays);
unknownTime.addEventListener("change", setTimeDisabled);

results.addEventListener("click", (event) => {
  if (event.target.closest("[data-edit-input]")) return showInput();
  const button = event.target.closest("[data-target]");
  if (!button) return;
  document.querySelector(`#${button.dataset.target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("resize", () => {
  if (document.body.classList.contains("result-mode")) fitSheet();
});

initializeForm();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
