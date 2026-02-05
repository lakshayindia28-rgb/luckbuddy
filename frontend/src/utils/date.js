export function formatDDMMYY(isoDate) {
  if (!isoDate) return "";
  const m = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(isoDate);
  const yy = m[1].slice(2);
  return `${m[3]}/${m[2]}/${yy}`;
}

export function parseDateToISO(input) {
  const s = String(input || "").trim();
  if (!s) return null;

  // Accept ISO already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Accept DD/MM/YY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (Number.isNaN(dd) || Number.isNaN(mm) || Number.isNaN(yyyy)) return null;

  if (yyyy < 100) yyyy = 2000 + yyyy;

  // Basic range checks
  if (yyyy < 2000 || yyyy > 2099) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  // Validate actual calendar date
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.toISOString().slice(0, 10) !== iso) return null;

  return iso;
}
