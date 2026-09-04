import React from 'react';
import { Eye, Edit3, Trash2, Clock, AlertTriangle, CheckCircle2, Gavel, ShieldOff, Scale, MapPin, Send, Archive, Activity, RotateCcw, UserX, Calendar, Unlock, FileText, UserCheck, Check, X } from 'lucide-react';

export const INICIO_OPTIONS = [
  'Escobar 1ª, Escobar',
  'Escobar 2ª, Ing. Maschwitz',
  'Escobar 3ª, Garín',
  'Escobar 4ª, Maq. Savio',
  'Escobar 5ª, Matheu',
  'Subcomisaría Loma Verde',
  'Destacamento 24 de Febrero',
  'Destacamento Cazador',
  'Comisaría de La Mujer',
  'Mesa',
  'Mail',
  'Ciudadana',
  'Otro'
];

export function formatAbbreviatedInicio(val = '') {
  if (!val) return '';
  const raw = String(val).trim();
  const lower = raw.toLowerCase();

  if (lower.includes('escobar 1') || lower === 'escobar') return 'Escobar 1ª';
  if (lower.includes('escobar 2') || lower.includes('maschwitz')) return 'Escobar 2ª';
  if (lower.includes('escobar 3') || lower.includes('garín') || lower.includes('garin')) return 'Escobar 3ª';
  if (lower.includes('escobar 4') || lower.includes('savio')) return 'Escobar 4ª';
  if (lower.includes('escobar 5') || lower.includes('matheu')) return 'Escobar 5ª';
  if (lower.includes('loma verde')) return 'Subcom. Loma Verde';
  if (lower.includes('24 de febrero')) return 'Dest. 24 Feb';
  if (lower.includes('cazador')) return 'Dest. Cazador';
  if (lower.includes('mujer')) return 'Comisaría Mujer';

  return raw;
}

export function renderBadgeDenuncia(denuncia) {
  if (!denuncia) return <span className="text-slate-600 font-mono text-xs">-</span>;
  
  const raw = String(denuncia).trim();
  const lower = raw.toLowerCase();

  if (lower.includes('ciudadan')) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-extrabold text-cyan-300 border border-cyan-500/50 shadow-sm"
        title="Denuncia Ciudadana"
      >
        Ciudadana
      </span>
    );
  }

  if (lower.includes('mujer')) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500/20 px-2.5 py-1 text-xs font-bold text-pink-300 border border-pink-500/40"
        title="Comisaría de La Mujer"
      >
        Comisaría Mujer
      </span>
    );
  }

  if (lower === 'mesa') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-300 border border-purple-500/40"
        title="Mesa de Entradas"
      >
        Mesa
      </span>
    );
  }

  if (lower === 'mail') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-300 border border-blue-500/40"
        title="Denuncia por Mail"
      >
        Mail
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs text-slate-200 border border-slate-700/60 font-semibold"
      title={`Dependencia: ${raw}`}
    >
      {formatAbbreviatedInicio(raw)}
    </span>
  );
}

export function causaHasSumario(causa) {
  if (!causa) return false;
  const val = (causa.sumario || '').toString().trim().toLowerCase();
  if (!val || val === 'no' || val === '0' || val === 'false' || val === 'sin' || val === 'n/a' || val === 'no tiene') {
    return false;
  }
  return true;
}

export function isFinalizedState(estado, tramite = '') {
  const st = (estado || '').trim().toLowerCase();
  if (st === 'en trámite' || st === 'en tramite' || st === 'esperar' || st === 'revisar') return false;
  return (
    st === 'archivada' || st === 'archivo' ||
    st === 'desestimada' ||
    st === 'sobreseimiento' ||
    st === 'elevada a juicio' || st.includes('elevada') ||
    st === 'incompetencia' ||
    st === 'remisión a otra ufi' || st.includes('remisi') ||
    st === 'paradero' ||
    st === 'captura'
  );
}

export function checkPPStatusSpecial(val = '') {
  if (!val) return null;
  const norm = String(val).trim().toLowerCase();
  if (norm === 'presentada' || norm.includes('presentad')) return 'Presentada';
  if (norm === 'excarcelado' || norm.includes('excarcelad')) return 'Excarcelado';
  if (norm === 'libertad' || norm.includes('libertad')) return 'Libertad';
  return null;
}

export function formatDisplayDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  const norm = str.toLowerCase();
  
  if (
    !str ||
    norm === 'si' || norm === 'sí' || norm === 'no' ||
    norm === '0' || norm === '1' ||
    norm === 'true' || norm === 'false' ||
    norm === 'n/a' || norm === '-' || norm === 'sin fecha' ||
    norm.startsWith('no ') || norm.startsWith('si ') || norm.startsWith('sí ')
  ) {
    return '';
  }

  const special = checkPPStatusSpecial(str);
  if (special) return special;

  // 1. If string is already DD/MM/YYYY or D/M/YYYY or DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
    const parts = str.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2].trim();
    if (year.length === 4) year = year.slice(-2);
    return `${day}/${month}/${year}`;
  }

  // 2. Try parsing JS Date / GMT string / ISO string
  const parsedDate = parseAnyDate(str);
  if (parsedDate) {
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const year = String(parsedDate.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  return '';
}

export function getVencimientoIPP(causa) {
  if (!causa || !causa.vencimiento_ipp) return '';
  const str = String(causa.vencimiento_ipp).trim();
  return formatDisplayDate(str);
}

export function renderBadgeIPP(vencIPP, causa = null) {
  const rawVal = vencIPP || (causa ? getVencimientoIPP(causa) : '');
  if (!rawVal) {
    return <span className="text-slate-600 font-mono text-xs">-</span>;
  }

  const specialStatus = checkPPStatusSpecial(rawVal);
  if (specialStatus) {
    return <span className="text-slate-600 font-mono text-xs">-</span>;
  }

  const formatted = formatDisplayDate(rawVal);
  if (!formatted) {
    return <span className="text-slate-600 font-mono text-xs">-</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Vencimiento de la Instrucción Penal Preparatoria (IPP)">
      <Calendar className="h-3 w-3 text-amber-400" />
      {formatted}
    </span>
  );
}

export function parseAnyDate(dateInput) {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput;
  }

  const str = String(dateInput).trim();
  if (!str || str === '-' || str === 'Sin fecha') return null;

  // ISO or hyphenated format (YYYY-MM-DD or DD-MM-YYYY)
  if (str.includes('-') && !str.includes('/')) {
    const isoParts = str.split('T')[0].split('-');
    if (isoParts.length === 3) {
      if (isoParts[0].length === 4) {
        const y = parseInt(isoParts[0], 10);
        const m = parseInt(isoParts[1], 10) - 1;
        const d = parseInt(isoParts[2], 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
      } else if (isoParts[2].length === 4 || isoParts[2].length === 2) {
        const d = parseInt(isoParts[0], 10);
        const m = parseInt(isoParts[1], 10) - 1;
        let y = parseInt(isoParts[2], 10);
        if (y < 100) y += 2000;
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
  }

  // Slash format (DD/MM/YYYY or DD/MM/YY)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10) - 1;
    let y = parseInt(slashMatch[3], 10);
    if (y < 100) y += 2000;
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

export function getCausaIngresoDate(causa) {
  if (!causa) return null;

  // 1. Check earliest actuacion date from tramite timeline
  if (causa.tramite) {
    const items = String(causa.tramite).split('///').map(i => i.trim()).filter(Boolean);
    if (items.length > 0) {
      const firstDate = extractAndFormatDateFromActuacion(items[0]);
      if (firstDate) {
        const parsedFirst = parseAnyDate(firstDate);
        if (parsedFirst) return parsedFirst;
      }
    }
  }

  // 2. Fall back to causa.revisado or fecha_detencion or fecha_flagrancia
  if (causa.revisado) {
    const parsedRev = parseAnyDate(causa.revisado);
    if (parsedRev) return parsedRev;
  }

  if (causa.fecha_detencion) {
    const parsedDet = parseAnyDate(causa.fecha_detencion);
    if (parsedDet) return parsedDet;
  }

  return null;
}

export function isDateInPast(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'Sin fecha' || checkPPStatusSpecial(dateStr)) return false;
  const parts = dateStr.trim().split('/');
  if (parts.length < 3 || parts[2].trim().length < 2) return false;

  try {
    const yearStr = parts[2].trim();
    if (yearStr.length !== 2 && yearStr.length !== 4) return false;

    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    const inputDate = new Date(year, month, day);
    if (isNaN(inputDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inputDate < today;
  } catch (e) {
    return false;
  }
}

export function isAbusoSexual(caratula = '', tramite = '') {
  const text = (caratula + ' ' + tramite).toLowerCase();
  return text.includes('abuso sexual');
}

export function formatCompactMultipleDates(dateParts) {
  if (!dateParts || dateParts.length === 0) return '';
  if (dateParts.length === 1) return formatDisplayDate(dateParts[0]);

  const parsed = dateParts.map(dStr => {
    const formatted = formatDisplayDate(dStr);
    const parts = formatted.split('/');
    if (parts.length === 3) {
      return {
        raw: formatted,
        day: parts[0],
        month: parts[1],
        year: parts[2]
      };
    }
    return { raw: formatted, day: '', month: '', year: '' };
  });

  const firstYear = parsed[0].year;
  const firstMonth = parsed[0].month;
  const sameYear = parsed.every(p => p.year && p.year === firstYear);
  const sameMonth = sameYear && parsed.every(p => p.month && p.month === firstMonth);

  if (sameMonth) {
    const days = parsed.map(p => p.day);
    if (days.length === 2) {
      return `${days[0]} y ${days[1]}/${firstMonth}/${firstYear}`;
    }
    const lastDay = days[days.length - 1];
    const initialDays = days.slice(0, -1).join(', ');
    return `${initialDays} y ${lastDay}/${firstMonth}/${firstYear}`;
  }

  if (sameYear) {
    const dayMonths = parsed.map(p => `${p.day}/${p.month}`);
    if (dayMonths.length === 2) {
      return `${dayMonths[0]} y ${dayMonths[1]}/${firstYear}`;
    }
    const lastDM = dayMonths[dayMonths.length - 1];
    const initialDM = dayMonths.slice(0, -1).join(', ');
    return `${initialDM} y ${lastDM}/${firstYear}`;
  }

  const rawList = parsed.map(p => p.raw);
  if (rawList.length === 2) {
    return `${rawList[0]} y ${rawList[1]}`;
  }
  const lastRaw = rawList[rawList.length - 1];
  const initialRaw = rawList.slice(0, -1).join(', ');
  return `${initialRaw} y ${lastRaw}`;
}

export function renderBadgePericia(pericia_fecha = '', pericia_detalle = '', finalizada = false) {
  if (finalizada) {
    return (
      <span key="badge-cumplida" className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/40 opacity-80" title={`${pericia_detalle} (Cumplida / Finalizada)`}>
        <CheckCircle2 className="h-3 w-3 text-emerald-400 text-xs shrink-0" />
        Cumplida
        {pericia_detalle && <span className="ml-0.5 text-[10px] text-emerald-200/80 font-normal">({pericia_detalle})</span>}
      </span>
    );
  }

  if (!pericia_fecha || pericia_fecha === '-' || pericia_fecha === 'Sin fecha') {
    if (pericia_fecha === 'Sin fecha' || pericia_detalle) {
      return (
        <span key="badge-pendiente" className="inline-flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-xs text-slate-400 border border-slate-700" title={pericia_detalle}>
          <Clock className="h-3 w-3 text-slate-500 shrink-0" />
          Pendiente
        </span>
      );
    }
    return <span key="badge-none" className="text-slate-600 font-mono text-xs">-</span>;
  }

  const rawStr = String(pericia_fecha);
  const dateParts = rawStr.split(/[,;]/).map(d => d.trim()).filter(Boolean);
  const compactDateLabel = formatCompactMultipleDates(dateParts);
  const lowDate = compactDateLabel.toLowerCase();

  if (lowDate.includes('/08/') || lowDate.includes('/05/') || lowDate.includes('/06/') || lowDate.includes('/07/')) {
    return (
      <span key={`badge-urgent-${compactDateLabel}`} className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/40 glow-urgent whitespace-nowrap" title={pericia_detalle || 'Pericia Vencida / Pendiente'}>
        <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
        {compactDateLabel}
        {pericia_detalle && <span className="ml-0.5 text-[10px] text-rose-200/80 font-normal">({pericia_detalle})</span>}
      </span>
    );
  }

  if (lowDate.includes('/09/')) {
    return (
      <span key={`badge-next-${compactDateLabel}`} className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40 whitespace-nowrap" title={pericia_detalle}>
        <Clock className="h-3 w-3 text-amber-400 shrink-0" />
        {compactDateLabel}
        {pericia_detalle && <span className="ml-0.5 text-[10px] text-amber-200/80 font-normal">({pericia_detalle})</span>}
      </span>
    );
  }

  return (
    <span key={`badge-future-${compactDateLabel}`} className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-300 border border-blue-500/30 whitespace-nowrap" title={pericia_detalle}>
      <Calendar className="h-3 w-3 text-blue-400 shrink-0" />
      {compactDateLabel}
      {pericia_detalle && <span className="ml-0.5 text-[10px] text-blue-200/80 font-normal">({pericia_detalle})</span>}
    </span>
  );
}

export function renderMultiplePericiasBadges(causa) {
  let periciasList = Array.isArray(causa.pericias) ? [...causa.pericias] : [];
  if (periciasList.length === 0 && (causa.pericia_fecha || causa.pericia_detalle)) {
    periciasList = [{ id: 'p-legacy', fecha: causa.pericia_fecha, tipo: causa.pericia_detalle, finalizada: causa.pericia_finalizada }];
  }

  if (periciasList.length === 0) {
    return <span className="text-slate-600 font-mono text-xs">-</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      {periciasList.map((p, idx) => (
        <div key={p.id || idx}>
          {renderBadgePericia(p.fecha, p.tipo, p.finalizada)}
        </div>
      ))}
    </div>
  );
}

function formatDateMaskSingle(inputVal) {
  if (!inputVal) return '';

  const str = String(inputVal);
  const norm = str.trim().toLowerCase();
  if (norm === 'presentada' || norm === 'excarcelado' || norm === 'libertad') {
    return inputVal;
  }

  // Extract digits up to 6 (DDMMYY)
  const digits = str.replace(/\D/g, '').slice(0, 6);
  if (digits.length === 0) return '';

  const endsWithSlash = str.endsWith('/');

  if (digits.length <= 2) {
    if (digits.length === 2 && endsWithSlash) return `${digits}/`;
    return digits;
  }

  if (digits.length <= 4) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2);
    if (digits.length === 4 && endsWithSlash) return `${day}/${month}/`;
    return `${day}/${month}`;
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);
  return `${day}/${month}/${year}`;
}

export function formatDateMask(inputVal) {
  if (!inputVal) return '';

  if (String(inputVal).includes(',')) {
    const parts = String(inputVal).split(',');
    const maskedParts = parts.map((p, idx) => {
      if (idx === parts.length - 1) {
        return formatDateMaskSingle(p);
      }
      return p.trim();
    });
    return maskedParts.join(', ');
  }

  return formatDateMaskSingle(inputVal);
}

export function formatCaratulaMask(inputVal = '') {
  if (!inputVal) return '';
  return String(inputVal).toUpperCase();
}

export function extractAndFormatDateFromActuacion(itemStr = '') {
  if (!itemStr) return null;
  const trimmed = String(itemStr).trim();
  const currentYear4Digits = new Date().getFullYear().toString();

  const fullMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (fullMatch) {
    const day = fullMatch[1].padStart(2, '0');
    const month = fullMatch[2].padStart(2, '0');
    let year = fullMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${day}/${month}/${year}`;
  }

  const shortMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})/);
  if (shortMatch) {
    const day = shortMatch[1].padStart(2, '0');
    const month = shortMatch[2].padStart(2, '0');
    return `${day}/${month}/${currentYear4Digits}`;
  }

  const anyFull = trimmed.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (anyFull) {
    const day = anyFull[1].padStart(2, '0');
    const month = anyFull[2].padStart(2, '0');
    let year = anyFull[3];
    if (year.length === 2) year = '20' + year;
    return `${day}/${month}/${year}`;
  }

  const anyShort = trimmed.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if (anyShort) {
    const day = anyShort[1].padStart(2, '0');
    const month = anyShort[2].padStart(2, '0');
    return `${day}/${month}/${currentYear4Digits}`;
  }

  return null;
}

export function isValidDateString(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'Sin fecha') return false;
  const norm = String(dateStr).trim();
  if (norm.toLowerCase() === 'presentada' || norm.toLowerCase() === 'excarcelado' || norm.toLowerCase() === 'libertad') {
    return true;
  }

  const parts = norm.split('/');
  if (parts.length < 3) return false;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const yearStr = parts[2].trim();

  if (isNaN(day) || isNaN(month) || (yearStr.length !== 2 && yearStr.length !== 4)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  let year = parseInt(yearStr, 10);
  if (year < 100) year += 2000;

  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return false;
  if (d.getMonth() + 1 !== month || d.getDate() !== day) return false;

  return true;
}

export function isDateInFuture(dateStr) {
  if (!isValidDateString(dateStr)) return false;
  const norm = String(dateStr).trim().toLowerCase();
  if (norm === 'presentada' || norm === 'excarcelado' || norm === 'libertad') return false;

  const parts = dateStr.trim().split('/');
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  let yearStr = parts[2].trim();
  let year = parseInt(yearStr, 10);
  if (year < 100) year += 2000;

  const inputDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return inputDate > today;
}

export function isPPMaxDaysExceeded(vencDateStr, baseDateStr = null) {
  if (!vencDateStr || checkPPStatusSpecial(vencDateStr)) return false;
  if (!baseDateStr) return false;

  const targetDate = parseAnyDate(vencDateStr);
  const baseDate = parseAnyDate(baseDateStr);
  if (!targetDate || !baseDate) return false;

  targetDate.setHours(0, 0, 0, 0);
  baseDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - baseDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 30;
}

export function calculatePPDatesFromDetencion(fechaDetencionStr) {
  if (!fechaDetencionStr || fechaDetencionStr === '-' || checkPPStatusSpecial(fechaDetencionStr)) {
    return { pp1: '', pp2: '', error: null };
  }

  const parts = fechaDetencionStr.trim().split('/');
  if (parts.length < 3 || parts[2].trim().length < 2) {
    return { pp1: '', pp2: '', error: 'La fecha debe estar en formato DD/MM/AA (Ej. 10/08/26).' };
  }

  if (isDateInFuture(fechaDetencionStr)) {
    return { pp1: '', pp2: '', error: 'La fecha de detención no puede ser una fecha futura.' };
  }

  try {
    const yearStr = parts[2].trim();
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    const d1 = new Date(year, month, day);
    if (isNaN(d1.getTime())) return { pp1: '', pp2: '', error: 'Fecha inválida.' };

    // PP1 = +15 calendar days from detención
    d1.setDate(d1.getDate() + 15);
    const dayStr1 = String(d1.getDate()).padStart(2, '0');
    const monthStr1 = String(d1.getMonth() + 1).padStart(2, '0');
    const yearStr1 = String(d1.getFullYear()).slice(-2);
    const pp1 = `${dayStr1}/${monthStr1}/${yearStr1}`;

    // PP2 = +15 calendar days from PP1 (+30 total from detención)
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 15);
    const dayStr2 = String(d2.getDate()).padStart(2, '0');
    const monthStr2 = String(d2.getMonth() + 1).padStart(2, '0');
    const yearStr2 = String(d2.getFullYear()).slice(-2);
    const pp2 = `${dayStr2}/${monthStr2}/${yearStr2}`;

    return { pp1, pp2, error: null };
  } catch (e) {
    return { pp1: '', pp2: '', error: 'Fecha inválida.' };
  }
}

export function calculateFlagranciaIPPDates(fechaFlagranciaStr) {
  if (!fechaFlagranciaStr || fechaFlagranciaStr === '-' || fechaFlagranciaStr === 'Sin fecha') {
    return { ipp1: '', ipp2: '', error: null };
  }

  const parts = fechaFlagranciaStr.trim().split('/');
  if (parts.length < 3 || parts[2].trim().length < 2) {
    return { ipp1: '', ipp2: '', error: 'La fecha debe estar en formato DD/MM/AA (Ej. 10/08/26).' };
  }

  try {
    const yearStr = parts[2].trim();
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    const d1 = new Date(year, month, day);
    if (isNaN(d1.getTime())) return { ipp1: '', ipp2: '', error: 'Fecha inválida.' };

    // IPP 1º Plazo = +20 calendar days from declaración de flagrancia
    d1.setDate(d1.getDate() + 20);
    const dayStr1 = String(d1.getDate()).padStart(2, '0');
    const monthStr1 = String(d1.getMonth() + 1).padStart(2, '0');
    const yearStr1 = String(d1.getFullYear()).slice(-2);
    const ipp1 = `${dayStr1}/${monthStr1}/${yearStr1}`;

    // IPP 2º Plazo = +20 calendar days from 1º Plazo (+40 total)
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 20);
    const dayStr2 = String(d2.getDate()).padStart(2, '0');
    const monthStr2 = String(d2.getMonth() + 1).padStart(2, '0');
    const yearStr2 = String(d2.getFullYear()).slice(-2);
    const ipp2 = `${dayStr2}/${monthStr2}/${yearStr2}`;

    return { ipp1, ipp2, error: null };
  } catch (e) {
    return { ipp1: '', ipp2: '', error: 'Fecha inválida.' };
  }
}

export function calculatePP2Date(venc1Str) {
  if (!venc1Str || venc1Str === '-' || venc1Str === 'Sin fecha') return '';
  const parts = venc1Str.trim().split('/');
  if (parts.length < 3 || parts[2].trim().length < 2) return '';

  try {
    const yearStr = parts[2].trim();
    if (yearStr.length !== 2 && yearStr.length !== 4) return '';

    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 15); // Add 15 calendar days

    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStrFinal = String(d.getFullYear()).slice(-2);

    return `${dayStr}/${monthStr}/${yearStrFinal}`;
  } catch (e) {
    return '';
  }
}

export function renderBadgePP(causa) {
  const isDetenido = causa.detenido === 'SI' || causa.detenido === 'SÍ';
  const rawVal = causa.estado_pp || causa.vencimiento_pp1 || causa.vencimiento_pp || '';
  const specialStatus = checkPPStatusSpecial(rawVal);

  if (specialStatus === 'Presentada') {
    return (
      <span key="pp-presentada" className="inline-flex items-center gap-1 font-mono text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/40 font-semibold" title="Prisión Preventiva Solicitada / Presentada">
        <FileText className="h-3 w-3 text-blue-400" />
        Presentada
      </span>
    );
  }

  if (specialStatus === 'Excarcelado') {
    return (
      <span key="pp-excarcelado" className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded border border-emerald-500/50 shadow-sm" title="Imputado Excarcelado">
        <Unlock className="h-3.5 w-3.5 text-emerald-400" />
        Excarcelado
      </span>
    );
  }

  if (specialStatus === 'Libertad') {
    return (
      <span key="pp-libertad" className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded border border-emerald-500/50 shadow-sm" title="Libertad Procesal">
        <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
        Libertad
      </span>
    );
  }

  // Si el imputado no está detenido y no posee estado especial, Prisión Preventiva no aplica
  if (!isDetenido) {
    return <span key="pp-none" className="text-slate-600 font-mono text-xs">-</span>;
  }

  const rawV1 = causa.vencimiento_pp1 || causa.vencimiento_pp || '';
  const v1 = formatDisplayDate(rawV1);
  const rawV2 = causa.vencimiento_pp2 || (v1 ? calculatePP2Date(v1) : '');
  const v2 = formatDisplayDate(rawV2);
  const isProrrogada = causa.pp_prorrogada === true || causa.pp_prorrogada === 'SI';

  const isValidDateStr = (s) => /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(s);

  // Si está prorrogada, se muestra ÚNICAMENTE el 2º vencimiento (+15 días) en ROJO
  if (isProrrogada && (isValidDateStr(v2) || isValidDateStr(v1))) {
    const finalV2 = isValidDateStr(v2) ? v2 : formatDisplayDate(calculatePP2Date(v1));
    if (isValidDateStr(finalV2)) {
      return (
        <span key="pp-v2" className="inline-flex items-center gap-1 font-mono text-xs text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 font-bold glow-urgent" title="2º Vencimiento PP (Prorrogado +15 días corridos)">
          <span className="text-[10px] font-extrabold text-white bg-rose-600 px-1 rounded-sm">2º</span>
          {finalV2}
        </span>
      );
    }
  }

  // Si no está prorrogada pero hay 1º vencimiento VÁLIDO, se muestra ÚNICAMENTE el 1º en AMARILLO
  if (isValidDateStr(v1)) {
    return (
      <span key="pp-v1" className="inline-flex items-center gap-1 font-mono text-xs text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-semibold" title="1º Vencimiento Prisión Preventiva">
        <span className="text-[10px] font-extrabold text-amber-950 bg-amber-400 px-1 rounded-sm">1º</span>
        {v1}
      </span>
    );
  }

  return <span key="pp-none" className="text-slate-600 font-mono text-xs">-</span>;
}

export function renderBadgeEstadoProcesal(estado) {
  const st = (estado || '').trim().toLowerCase();

  if (st === 'paradero') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/40 whitespace-nowrap">
        <MapPin className="h-3 w-3 text-amber-400" />
        Paradero
      </span>
    );
  }

  if (st === 'captura') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/40 glow-urgent whitespace-nowrap">
        <UserX className="h-3 w-3 text-rose-400" />
        Captura
      </span>
    );
  }

  if (st === 'elevada a juicio' || st.includes('elevada')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-300 border border-purple-500/40 whitespace-nowrap">
        <Gavel className="h-3 w-3 text-purple-400" />
        Elevada a Juicio
      </span>
    );
  }

  if (st === 'sobreseimiento' || st.includes('sobrese')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700 whitespace-nowrap">
        <Scale className="h-3 w-3 text-amber-500/70" />
        Sobreseimiento
      </span>
    );
  }

  if (st === 'desestimada' || st.includes('desestim')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700 whitespace-nowrap">
        <ShieldOff className="h-3 w-3 text-slate-500" />
        Desestimada
      </span>
    );
  }

  if (st === 'incompetencia' || st.includes('incompet')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700 whitespace-nowrap">
        <MapPin className="h-3 w-3 text-cyan-500/70" />
        Incompetencia
      </span>
    );
  }

  if (st === 'remisión a otra ufi' || (st.includes('remisi') && st.includes('ufi'))) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700 whitespace-nowrap">
        <Send className="h-3 w-3 text-sky-500/70" />
        Remisión UFI
      </span>
    );
  }

  if (st === 'archivada' || st === 'archivo') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700 whitespace-nowrap">
        <Archive className="h-3 w-3 text-slate-500" />
        Archivada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30 whitespace-nowrap">
      <Activity className="h-3 w-3 text-blue-400" />
      En Trámite
    </span>
  );
}

export function isCausaRevisar(causa) {
  if (!causa || isFinalizedState(causa.estado, causa.tramite)) return false;

  const st = (causa.estado || '').trim().toLowerCase();
  if (st === 'revisar') return true;

  let lastRevisadoDate = parseAnyDate(causa.revisado);
  if (!lastRevisadoDate && causa.tramite) {
    const actDate = extractAndFormatDateFromActuacion(causa.tramite);
    if (actDate) {
      lastRevisadoDate = parseAnyDate(actDate);
    }
  }

  if (lastRevisadoDate) {
    let daysLimit = parseInt(causa.revisar_dias, 10);
    if (isNaN(daysLimit)) daysLimit = 10;

    const targetDate = new Date(lastRevisadoDate);
    targetDate.setDate(targetDate.getDate() + daysLimit);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today >= targetDate) {
      return true;
    }
  }

  return false;
}

export function isCausaEsperar(causa) {
  if (!causa || isFinalizedState(causa.estado, causa.tramite)) return false;
  return !isCausaRevisar(causa);
}

export function renderBadgeRevisionStatus(causa) {
  if (!causa) return <span className="text-slate-600 font-mono text-xs">-</span>;

  if (isFinalizedState(causa.estado, causa.tramite)) {
    return <span className="text-slate-600 font-mono text-xs text-center block">-</span>;
  }

  if (isCausaRevisar(causa)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/30 glow-urgent whitespace-nowrap" title="Excedió el plazo de revisión">
        <AlertTriangle className="h-3 w-3" />
        Revisar
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30 whitespace-nowrap" title="En plazo normal de revisión">
      <Clock className="h-3 w-3" />
      Esperar
    </span>
  );
}

export function renderBadgeEstado(estado, tramite = '', causa = null) {
  return renderBadgeEstadoProcesal(estado);
}

export default function CausasTable({ causas, onSelectCausa, onEditCausa, onDeleteCausa, onReabrirCausa, onSaveCausa }) {
  const safeCausas = Array.isArray(causas) ? causas : [];

  if (safeCausas.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-xl p-12 text-center border border-slate-800">
        <Clock className="h-12 w-12 text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-300">No se encontraron causas</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Intente ajustar el término de búsqueda o modifique los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden rounded-xl border border-slate-800 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3.5 text-left">I.P.P.</th>
              <th className="px-4 py-3.5 text-left">Revisión</th>
              <th className="px-4 py-3.5 text-left">Sumario</th>
              <th className="px-4 py-3.5 text-left">Denuncia</th>
              <th className="px-2 py-3.5 text-left w-16">Detenido</th>
              <th className="px-4 py-3.5 text-left">Venc. PP</th>
              <th className="px-4 py-3.5 text-left">Venc. IPP</th>
              <th className="px-4 py-3.5 text-left">Pericias</th>
              <th className="px-4 py-3.5 text-left">Carátula</th>
              <th className="px-4 py-3.5 text-left">Último Trámite / Actuación</th>
              <th className="px-4 py-3.5 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-300">
            {safeCausas.map((causa) => {
              const finalized = isFinalizedState(causa.estado, causa.tramite);
              const isAbuso = isAbusoSexual(causa.caratula, causa.tramite);
              const isAbusoEnTramite = isAbuso && !finalized;
              const isDetenido = causa.detenido === 'SI' || causa.detenido === 'SÍ';
              const isDetenidoEnTramite = isDetenido && !finalized;
              const isCiudadana = (causa.denunciado_en || '').trim().toLowerCase().includes('ciudadan');
              const isCiudadanaEnTramite = isCiudadana && !finalized;
              const ippVal = getVencimientoIPP(causa);
              const hasIPP = !!(ippVal && ippVal.trim() !== '' && ippVal !== '-' && ippVal !== 'Sin fecha');
              const isIPPEnTramite = hasIPP && !finalized;
              const hasSumario = causaHasSumario(causa);

              const parts = causa.tramite ? causa.tramite.split('///').map(p => p.trim()).filter(Boolean) : [];
              const latestTramite = parts.length > 0 ? parts[parts.length - 1] : causa.tramite || 'Sin trámites registrados';

              return (
                <tr
                  key={causa.id}
                  className={`transition-all group cursor-pointer ${
                    finalized
                      ? 'bg-slate-950/80 opacity-60 hover:opacity-100 grayscale-[40%] hover:grayscale-0'
                      : isAbusoEnTramite && isDetenidoEnTramite
                      ? 'bg-emerald-950/60 border-l-4 border-l-rose-500 hover:bg-emerald-900/70 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/30'
                      : isAbusoEnTramite
                      ? 'bg-rose-950/40 border-l-4 border-l-rose-500 hover:bg-rose-900/50 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.2)]'
                      : isDetenidoEnTramite
                      ? 'bg-emerald-950/60 border-l-4 border-l-emerald-400 hover:bg-emerald-900/70 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/30'
                      : isCiudadanaEnTramite
                      ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400 hover:bg-cyan-900/50 text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/20'
                      : 'hover:bg-slate-800/40'
                  }`}
                  onClick={() => onSelectCausa(causa)}
                >
                  {/* IPP */}
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${
                        finalized 
                          ? 'text-slate-400 group-hover:text-slate-200' 
                          : isAbusoEnTramite 
                          ? 'text-rose-400 font-extrabold' 
                          : isDetenidoEnTramite
                          ? 'text-emerald-400 font-extrabold'
                          : isCiudadanaEnTramite
                          ? 'text-cyan-300 font-extrabold'
                          : 'text-white font-bold group-hover:text-slate-200'
                      }`}>
                        {causa.ipp || 'S/N'}
                      </span>
                      {(causa.flagrancia === 'SI' || causa.flagrancia === 'SÍ') && (
                        <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/50" title="Trámite de Flagrancia (FL)">
                          FL
                        </span>
                      )}
                      {isAbusoEnTramite && (
                        <span className="rounded bg-rose-500/25 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-300 border border-rose-500/50 glow-urgent" title="Abuso Sexual (AS)">
                          AS
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Revisión (Plazo de Control) */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderBadgeRevisionStatus(causa)}
                  </td>

                  {/* Sumario (Tilde verde o Cruz roja interactiva) */}
                  <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextVal = hasSumario ? 'NO' : 'SÍ';
                        const updatedCausa = {
                          ...causa,
                          sumario: nextVal
                        };
                        if (onSaveCausa) {
                          onSaveCausa(updatedCausa);
                        }
                      }}
                      title={hasSumario ? 'Sumario: SÍ (Haz clic para cambiar a NO)' : 'Sumario: NO (Haz clic para cambiar a SÍ)'}
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-lg transition border cursor-pointer ${
                        hasSumario
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/35 hover:scale-110'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/35 hover:scale-110'
                      }`}
                    >
                      {hasSumario ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : (
                        <X className="h-4 w-4 stroke-[3]" />
                      )}
                    </button>
                  </td>

                  {/* Denuncia / Inicio (Badge estilizado) */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300 font-medium">
                    {renderBadgeDenuncia(causa.denunciado_en)}
                  </td>

                  {/* Detenido */}
                  <td className="px-2 py-3 whitespace-nowrap text-center w-16">
                    {causa.detenido === 'SI' || causa.detenido === 'SÍ' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/40 glow-urgent">
                        <UserX className="h-3 w-3 text-rose-400" />
                        SÍ
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-xs">NO</span>
                    )}
                  </td>

                  {/* Vencimiento PP (1º en amarillo, 2º en rojo) */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderBadgePP(causa)}
                  </td>

                  {/* Vencimiento IPP */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderBadgeIPP(causa.vencimiento_ipp, causa)}
                  </td>

                  {/* Pericias con alertas de calendario */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderMultiplePericiasBadges(causa)}
                  </td>

                  {/* Carátula */}
                  <td className={`px-4 py-3 max-w-xs sm:max-w-md font-medium truncate ${finalized ? 'text-slate-400' : 'text-slate-200'}`}>
                    <span title={causa.caratula}>
                      {causa.caratula || 'Sin carátula especificada'}
                    </span>
                  </td>

                  {/* Último Trámite */}
                  <td className="px-4 py-3 max-w-xs sm:max-w-lg text-slate-400 truncate">
                    <span className={`font-mono text-[11px] ${finalized ? 'text-slate-500' : 'text-slate-300'}`} title={latestTramite}>
                      {latestTramite}
                    </span>
                    {parts.length > 1 && (
                      <span className="ml-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-sans">
                        +{parts.length - 1} hitos
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {finalized && (
                        <button
                          onClick={() => onReabrirCausa && onReabrirCausa(causa)}
                          title="Reabrir causa (Cambiar estado a En Trámite)"
                          className="flex items-center gap-1 rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition shadow-sm"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reabrir
                        </button>
                      )}

                      {/* Acciones reducidas: Reabrir (si archivada) y Eliminar */}

                      <button
                        onClick={() => onDeleteCausa(causa.id)}
                        title="Eliminar causa"
                        className="rounded p-1.5 text-slate-400 hover:bg-rose-600/20 hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
