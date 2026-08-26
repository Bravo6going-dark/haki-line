const SESSION_TTL_MS = 10 * 60 * 1000;
const sessions = new Map();

const MAIN_MENU = `Haki-Line
Reply with:
1. Know your rights
2. Report a case
3. Emergency contacts
0. Menu`;

const RIGHTS_MENU = `Know your rights
1. Arrest & police
2. Domestic violence
3. Work & labour
0. Back`;

const RIGHTS = {
  1: `Arrest: You must be told why you are held, you may stay silent, and you have a right to a lawyer. You should be taken to court within 24 hours. If this is happening now, call 999 or 112.`,
  2: `GBV: You can report at a police station or hospital. Keep evidence if it is safe. Helpline 1195. Emergency 999 / 112.`,
  3: `Work: You have a right to fair pay, rest, and a safe workplace. Unfair dismissal can be challenged. Note dates, names, and any documents.`,
};

const EMERGENCY = `Emergency contacts
Police / ambulance: 999 or 112
GBV helpline: 1195
Childline: 116
Reply 0 for menu.`;

function normalizePhone(phone) {
  if (!phone) return '';
  let value = String(phone).trim().replace(/[\s-]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  else if (value && !value.startsWith('+')) value = `+${value}`;
  return value;
}

function now() {
  return Date.now();
}

function getSession(phone) {
  const session = sessions.get(phone);
  if (!session) return { step: 'menu', data: {}, updatedAt: now() };
  if (now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(phone);
    return { step: 'menu', data: {}, updatedAt: now() };
  }
  return session;
}

function saveSession(phone, session) {
  sessions.set(phone, { ...session, updatedAt: now() });
}

function clearSession(phone) {
  sessions.delete(phone);
}

function isMenuKeyword(input) {
  return ['0', 'menu', 'help', 'hi', 'hello', 'haki', 'start'].includes(input);
}

function nextCaseRef() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `HAKI-${stamp}`;
}

function handleIncomingSms({ from, text }) {
  const input = String(text || '').trim();
  const key = input.toLowerCase();
  const session = getSession(from);

  if (!input || isMenuKeyword(key)) {
    saveSession(from, { step: 'menu', data: {} });
    return MAIN_MENU;
  }

  if (session.step === 'report_details') {
    const description = input.slice(0, 480);
    const ref = nextCaseRef();
    console.log(`Case ${ref} from ${from}: ${description}`);
    clearSession(from);
    return `Report logged. Ref ${ref}. We will follow up. If you are in danger now, call 999 or 112. Reply 0 for menu.`;
  }

  if (session.step === 'rights') {
    if (key === '1' || key === '2' || key === '3') {
      return `${RIGHTS[key]}\n\nReply 0 for menu.`;
    }
    return `Reply 1, 2, 3, or 0.\n\n${RIGHTS_MENU}`;
  }

  if (key === '1') {
    saveSession(from, { step: 'rights', data: {} });
    return RIGHTS_MENU;
  }

  if (key === '2') {
    saveSession(from, { step: 'report_details', data: {} });
    return `Describe what happened (who, where, when). Do not send photos here. Reply 0 to cancel.`;
  }

  if (key === '3') {
    saveSession(from, { step: 'menu', data: {} });
    return EMERGENCY;
  }

  return `I did not get that.\n\n${MAIN_MENU}`;
}

module.exports = {
  handleIncomingSms,
  nextCaseRef,
  normalizePhone,
  sessions,
};
