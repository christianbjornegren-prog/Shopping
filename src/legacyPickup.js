// Ska vi försöka hämta Inköp-listan från den gamla platsen?
//
// Den gamla platsen är en underkollektion som de driftsatta säkerhetsreglerna
// nekar. Att fråga vid varje start gav en permission-denied-rad i driftloggen
// varje gång, vilket såg ut som ett fel trots att allt fungerade. Men vi kan
// inte sluta fråga helt heller: klistras reglerna in i Firebase-konsolen ska
// varorna plockas upp av sig själva utan att någon behöver komma ihåg det.
//
// Alltså: en gång, sedan en gång om dygnet, och aldrig mer när det är klart.
export const DONE = 'klart';
export const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

// `last` är vad som ligger i localStorage: null, DONE, eller en ISO-tid.
export const shouldTryLegacyPickup = (last, now = Date.now()) => {
  if (last === DONE) return false;
  if (!last) return true;
  const attempted = Date.parse(last);
  if (Number.isNaN(attempted)) return true;
  return now - attempted >= RETRY_AFTER_MS;
};
