import { formatDeviceId } from '@remora/shared';
import { t, translatePage } from './i18n.js';
import { generatePassword } from './password.js';
import { SignalingClient } from './signaling-client.js';

/** Server address, configurable at build time with the VITE_SIGNALING_URL variable. */
const SIGNALING_URL: string =
  (import.meta.env.VITE_SIGNALING_URL as string | undefined) ?? 'ws://localhost:8080';

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found;
}

const statusBadge = element('status');
const deviceIdText = element('device-id');
const passwordText = element('password');

function setOnline(online: boolean): void {
  statusBadge.textContent = t(online ? 'status.online' : 'status.offline');
  statusBadge.classList.toggle('status--online', online);
  statusBadge.classList.toggle('status--offline', !online);
  if (!online) deviceIdText.textContent = '— — —';
}

function renewPassword(): void {
  passwordText.textContent = generatePassword();
}

translatePage();
renewPassword();
element('new-password').addEventListener('click', renewPassword);

const signaling = new SignalingClient(SIGNALING_URL, {
  onOnline() {
    setOnline(true);
    signaling.send({ type: 'register-host' });
  },
  onOffline() {
    setOnline(false);
  },
  onMessage(message) {
    if (message.type === 'registered') {
      deviceIdText.textContent = formatDeviceId(message.id);
    }
  },
});
signaling.connect();
