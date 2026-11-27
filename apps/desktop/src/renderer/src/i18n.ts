const en = {
  'status.online': 'Connected',
  'status.offline': 'Offline',
  'host.title': 'Allow remote access',
  'host.hint': 'Give these details to the person who will help you.',
  'host.idLabel': 'Your ID',
  'host.passwordLabel': 'Password',
  'host.newPassword': 'New',
  'viewer.title': 'Control a remote device',
  'viewer.soon': 'Coming soon.',
};

/** Every language must define exactly the same keys as English (checked by TypeScript). */
const fr: Record<keyof typeof en, string> = {
  'status.online': 'Connecté',
  'status.offline': 'Hors ligne',
  'host.title': "Autoriser l'accès à ce poste",
  'host.hint': 'Communiquez ces informations à la personne qui doit vous aider.',
  'host.idLabel': 'Votre ID',
  'host.passwordLabel': 'Mot de passe',
  'host.newPassword': 'Nouveau',
  'viewer.title': 'Contrôler un poste distant',
  'viewer.soon': 'Bientôt disponible.',
};

export type TranslationKey = keyof typeof en;

const languages = { en, fr };
type Language = keyof typeof languages;

/** French if the system is in French, English otherwise. */
export const language: Language = navigator.language.startsWith('fr') ? 'fr' : 'en';

export function t(key: TranslationKey): string {
  return languages[language][key];
}

function isTranslationKey(key: string): key is TranslationKey {
  return key in en;
}

/** Fills every element that has a `data-i18n="key"` attribute with its translation. */
export function translatePage(): void {
  document.documentElement.lang = language;
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key && isTranslationKey(key)) element.textContent = t(key);
  }
}
