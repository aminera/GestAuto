import { reactive } from 'vue';

export const toasts = reactive([]);
let seq = 0;

/** Affiche une notification éphémère. tone : green | red | amber | blue */
export function notify({ title, message, tone = 'green', timeout = 5000 }) {
  const id = ++seq;
  toasts.push({ id, title, message, tone });
  setTimeout(() => dismiss(id), timeout);
}

export function dismiss(id) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

export const notifyError = (e) => notify({ title: 'Erreur', message: e?.message ?? String(e), tone: 'red' });
