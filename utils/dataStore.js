const users = require('../mock-server/mocks/user.json');

const events = [];
const eventsByUser = new Map();

function addEvent(event) {
  event.id = event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  events.push(event);
  if (!eventsByUser.has(event.userId)) eventsByUser.set(event.userId, []);
  eventsByUser.get(event.userId).push(event);
  return event;
}

function getEvents() {
  return events;
}

function getEventsByUserId(userId) {
  return eventsByUser.get(userId) || [];
}

function getUsers() {
  return users;
}

module.exports = { addEvent, getEvents, getEventsByUserId, getUsers };
