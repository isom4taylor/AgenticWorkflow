// Shared app state: the signed-in user, plus convenience accessors that the
// page modules use instead of each reaching back into main.js.

let user = null;
const listeners = new Set();

export function setUser(next) {
  user = next;
  listeners.forEach((fn) => fn(user));
}

export function getUser() {
  return user;
}

export function onUserChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function baseLanguage() {
  return (user && user.base_language) || 'English';
}

export function learningLanguage() {
  return (user && user.learning_languages && user.learning_languages[0]) || 'Spanish';
}

export function learningLanguages() {
  return (user && user.learning_languages) || ['Spanish'];
}

export function fluency() {
  return (user && user.fluency) || 'beginner';
}

// BCP-47-ish codes, supplied by the server alongside the user record so the
// client doesn't need its own copy of the language table. Used for speech
// synthesis/recognition and for picking the right Wikipedia.
export function baseLangCode() {
  return (user && user.base_language_code) || 'en';
}

export function learningLangCode() {
  return (user && user.learning_language_code) || 'es';
}
