// Countdown Event Planner script
// Handles event creation, editing, countdown updates, search, sort, and local storage.

const eventForm = document.getElementById('eventForm');
const titleInput = document.getElementById('title');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');
const eventList = document.getElementById('eventList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearButton = document.getElementById('clearButton');
const celebrationOverlay = document.getElementById('celebrationOverlay');
const closeCelebration = document.getElementById('closeCelebration');

let events = [];
let editEventId = null;
let countdownInterval = null;

const STORAGE_KEY = 'countdownEventPlanner.events';

function loadEvents() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      events = JSON.parse(saved).map(event => ({
        ...event,
        dateTime: new Date(event.dateTime),
      }));
    } catch (error) {
      events = [];
    }
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'event-card';
  if (event.finished) {
    card.classList.add('celebrated');
  }

  const content = document.createElement('div');
  content.className = 'event-card-content';

  const meta = document.createElement('div');
  meta.className = 'event-meta';
  meta.innerHTML = `
    <div>
      <h3>${escapeHtml(event.title)}</h3>
      <p>${formatDateTime(event.dateTime)}</p>
    </div>
    <p>${event.finished ? 'Celebrated' : 'Counting down'}</p>
  `;

  const countdown = document.createElement('div');
  countdown.className = 'countdown-list';
  countdown.innerHTML = createCountdownMarkup(event.timeLeft);
  countdown.dataset.eventId = event.id;

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.innerHTML = `
    <button class="btn btn-edit" data-action="edit" data-id="${event.id}">Edit</button>
    <button class="btn btn-delete" data-action="delete" data-id="${event.id}">Delete</button>
  `;

  content.appendChild(meta);
  content.appendChild(countdown);
  content.appendChild(actions);
  card.appendChild(content);

  return card;
}

function updateCountdowns() {
  const now = new Date();
  let celebrationTarget = null;

  events = events.map(event => {
    const diff = event.dateTime - now;
    const finished = diff <= 0;
    const remaining = finished ? 0 : diff;

    return {
      ...event,
      timeLeft: remaining,
      finished,
    };
  });

  const filteredEvents = getFilteredEvents();
  renderEventList(filteredEvents);

  const justFinished = events.find(event => event.finished && !event.celebrationShown);
  if (justFinished) {
    celebrationTarget = justFinished;
    justFinished.celebrationShown = true;
    showCelebration();
    saveEvents();
  }

  if (celebrationTarget) {
    saveEvents();
  }
}

function createCountdownMarkup(timeLeft) {
  const totalSeconds = Math.max(0, Math.floor(timeLeft / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `
    ${createCountdownItem(days, 'Days')}
    ${createCountdownItem(hours, 'Hours')}
    ${createCountdownItem(minutes, 'Minutes')}
    ${createCountdownItem(seconds, 'Seconds')}
  `;
}

function createCountdownItem(value, label) {
  return `
    <div class="countdown-item">
      <span class="countdown-value">${String(value).padStart(2, '0')}</span>
      <span class="countdown-label">${label}</span>
    </div>
  `;
}

function renderEventList(displayEvents) {
  eventList.innerHTML = '';
  if (displayEvents.length === 0) {
    eventList.innerHTML = '<p class="empty-state">No matching events yet. Add one above to begin.</p>';
    return;
  }

  displayEvents.forEach(event => {
    eventList.appendChild(createEventCard(event));
  });
}

function getFilteredEvents() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filtered = events.filter(event => event.title.toLowerCase().includes(searchTerm));
  return sortEvents(filtered);
}

function sortEvents(eventArray) {
  const option = sortSelect.value;
  return [...eventArray].sort((a, b) => {
    if (option === 'dateAsc') return a.dateTime - b.dateTime;
    if (option === 'dateDesc') return b.dateTime - a.dateTime;
    if (option === 'titleAsc') return a.title.localeCompare(b.title);
    if (option === 'titleDesc') return b.title.localeCompare(a.title);
    if (option === 'remainingAsc') return a.timeLeft - b.timeLeft;
    if (option === 'remainingDesc') return b.timeLeft - a.timeLeft;
    return a.dateTime - b.dateTime;
  });
}

function resetForm() {
  eventForm.reset();
  editEventId = null;
  eventForm.querySelector('button[type="submit"]').textContent = 'Save event';
}

function handleFormSubmit(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  if (!title || !date || !time) return;

  const dateTime = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dateTime.getTime())) return;

  if (editEventId) {
    events = events.map(item => item.id === editEventId ? {
      ...item,
      title,
      dateTime,
      finished: dateTime - new Date() <= 0 ? true : false,
      celebrationShown: item.celebrationShown && dateTime - new Date() > 0 ? false : item.celebrationShown,
    } : item);
  } else {
    events.push({
      id: Date.now().toString(),
      title,
      dateTime,
      timeLeft: dateTime - new Date(),
      finished: dateTime - new Date() <= 0,
      celebrationShown: false,
    });
  }

  saveEvents();
  resetForm();
  renderEventList(getFilteredEvents());
}

function handleEventListClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'delete') {
    events = events.filter(item => item.id !== id);
    saveEvents();
    renderEventList(getFilteredEvents());
  }

  if (action === 'edit') {
    const target = events.find(item => item.id === id);
    if (!target) return;
    editEventId = target.id;
    titleInput.value = target.title;
    dateInput.value = target.dateTime.toISOString().slice(0, 10);
    timeInput.value = target.dateTime.toTimeString().slice(0, 5);
    eventForm.querySelector('button[type="submit"]').textContent = 'Update event';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function formatDateTime(dateObj) {
  return dateObj.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function showCelebration() {
  celebrationOverlay.classList.remove('hidden');
  createConfetti();
}

function hideCelebration() {
  celebrationOverlay.classList.add('hidden');
  const pieces = celebrationOverlay.querySelectorAll('.confetti-piece');
  pieces.forEach(piece => piece.remove());
}

function createConfetti() {
  const zone = celebrationOverlay.querySelector('.confetti-zone');
  zone.innerHTML = '';
  const colors = ['#facc15', '#fb7185', '#60a5fa', '#38bdf8', '#a78bfa'];

  for (let i = 0; i < 20; i += 1) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.background = colors[i % colors.length];
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.width = `${8 + Math.random() * 8}px`;
    confetti.style.height = `${12 + Math.random() * 12}px`;
    zone.appendChild(confetti);
  }
}

function initialize() {
  loadEvents();
  renderEventList(getFilteredEvents());

  countdownInterval = setInterval(updateCountdowns, 1000);
  updateCountdowns();

  eventForm.addEventListener('submit', handleFormSubmit);
  clearButton.addEventListener('click', resetForm);
  eventList.addEventListener('click', handleEventListClick);
  searchInput.addEventListener('input', () => renderEventList(getFilteredEvents()));
  sortSelect.addEventListener('change', () => renderEventList(getFilteredEvents()));
  closeCelebration.addEventListener('click', hideCelebration);
  celebrationOverlay.addEventListener('click', event => {
    if (event.target === celebrationOverlay) hideCelebration();
  });
}

initialize();
