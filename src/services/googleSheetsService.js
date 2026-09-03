export const SHEETS_URL_KEY = 'control_causas_sheets_url';
export const LAST_SYNC_KEY = 'control_causas_last_sync';

export const APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT PARA CONTROL DE CAUSAS (MINISTERIO PÚBLICO FISCAL)
 * 
 * Instrucciones de instalación:
 * 1. Abre tu hoja de cálculo en Google Sheets (o crea una nueva).
 * 2. Ve al menú superior: Extensiones > Apps Script.
 * 3. Borra todo el código que aparece y pega este código completo.
 * 4. Haz clic en "Guardar" (icono de disco).
 * 5. Haz clic en "Implementar" > "Nueva implementación".
 * 6. Selecciona el tipo: "Aplicación web".
 * 7. En "Ejecutar como", selecciona: "Yo (tu email)".
 * 8. En "Quién tiene acceso", selecciona: "Cualquier persona" (Anyone).
 * 9. Haz clic en "Implementar" y autoriza los permisos de Google.
 * 10. Copia la URL de la aplicación web generada y pégala en la página web.
 */

const SHEET_NAME = 'SEBASTIÁN MARCOTE';

const HEADERS = [
  'id', 'ipp', 'estado', 'revision', 'revisado', 'revisar_dias', 'caratula', 
  'sumario', 'denunciado_en', 'fecha_inicio', 'tramite', 'detenido',
  'vencimiento_pp1', 'vencimiento_pp2', 'vencimiento_ipp', 'pp_prorrogada', 'pericias', 'audiencias'
];

function deleteUnusedDefaultSheets(ss) {
  try {
    const unusedNames = ['Hoja 1', 'Hoja1', 'Sheet1', 'Sheet 1'];
    unusedNames.forEach(name => {
      const s = ss.getSheetByName(name);
      if (s && s.getName() !== SHEET_NAME && s.getLastRow() <= 1 && ss.getSheets().length > 1) {
        ss.deleteSheet(s);
      }
    });
  } catch (e) {}
}

function cleanAndMigrateSheetHeaders(sheet) {
  try {
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      return;
    }

    const hRow = data[0].map(h => String(h || '').trim().toLowerCase());
    const hasFechaInicioCol = hRow.includes('fecha_inicio') || hRow.includes('fecha inicio');
    const currentMaxCols = sheet.getMaxColumns();
    const needsMigration = !hasFechaInicioCol || hRow.length !== HEADERS.length || currentMaxCols !== HEADERS.length;

    if (needsMigration && data.length > 1) {
      const oldMap = {};
      for (let h = 0; h < hRow.length; h++) {
        if (hRow[h]) oldMap[hRow[h]] = h;
      }

      const newRows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] && !row[1]) continue;

        const getOld = (name) => {
          if (oldMap[name] !== undefined && oldMap[name] < row.length) {
            const v = row[oldMap[name]];
            return (v !== undefined && v !== null && String(v).trim() !== '') ? String(v).trim() : null;
          }
          return null;
        };

        let rawEstado = getOld('estado') ?? String(row[2] || 'En Trámite');
        let rawRev = getOld('revision') ?? '';
        if (rawEstado.toLowerCase() === 'esperar' || rawEstado.toLowerCase() === 'revisar') {
          if (!rawRev) rawRev = rawEstado;
          rawEstado = 'En Trámite';
        }

        const fInicio = getOld('fecha_inicio') ?? getOld('fecha inicio') ?? getOld('revisado') ?? String(row[3] || '');
        const vPP1 = getOld('vencimiento_pp1') ?? getOld('vencimiento pp1') ?? getOld('vencimiento_pp') ?? '';
        const vPP2 = getOld('vencimiento_pp2') ?? getOld('vencimiento pp2') ?? '';
        const vIPP = getOld('vencimiento_ipp') ?? getOld('venc_ipp') ?? getOld('vencimiento ipp') ?? getOld('venc. ipp') ?? getOld('vencimiento_fecha') ?? '';
        const ppProrr = getOld('pp_prorrogada') ?? getOld('pp prorrogada') ?? '';
        const pericias = getOld('pericias') ?? '[]';
        const auds = getOld('audiencias') ?? '[]';

        newRows.push([
          getOld('id') ?? String(row[0] || ''),
          getOld('ipp') ?? String(row[1] || ''),
          rawEstado,
          rawRev || (rawEstado.toLowerCase() === 'en trámite' || rawEstado.toLowerCase() === 'en tramite' ? 'Esperar' : '-'),
          getOld('revisado') ?? String(row[3] || ''),
          getOld('revisar_dias') ?? getOld('revisar dias') ?? String(row[4] || ''),
          getOld('caratula') ?? String(row[5] || ''),
          getOld('sumario') ?? String(row[6] || ''),
          getOld('denunciado_en') ?? getOld('denunciado en') ?? String(row[7] || ''),
          fInicio,
          getOld('tramite') ?? String(row[8] || ''),
          getOld('detenido') ?? String(row[9] || ''),
          vPP1,
          vPP2,
          vIPP,
          String(ppProrr).toLowerCase() === 'true' || String(ppProrr).toUpperCase() === 'SI' ? 'true' : 'false',
          pericias,
          auds
        ]);
      }

      sheet.clearContents();

      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');

      if (newRows.length > 0) {
        sheet.getRange(2, 1, newRows.length, HEADERS.length).setValues(newRows);
      }

      if (sheet.getMaxColumns() > HEADERS.length) {
        sheet.deleteColumns(HEADERS.length + 1, sheet.getMaxColumns() - HEADERS.length);
      }
    } else {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');
      if (sheet.getMaxColumns() > HEADERS.length) {
        sheet.deleteColumns(HEADERS.length + 1, sheet.getMaxColumns() - HEADERS.length);
      }
    }
    sheet.setFrozenRows(1);
  } catch (e) {}
}

function getOrCreateSheet(userName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetName = (userName || SHEET_NAME).trim().toUpperCase();
  let sheet = ss.getSheetByName(targetName);

  // Check case-insensitively and rename to uppercase if found
  if (!sheet) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().trim().toUpperCase() === targetName) {
        sheet = sheets[i];
        try {
          sheet.setName(targetName);
        } catch (e) {}
        break;
      }
    }
  }

  if (!sheet) {
    let oldSheet = ss.getSheetByName('Causas') || ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (oldSheet && (!userName || targetName === SHEET_NAME)) {
      oldSheet.setName(SHEET_NAME);
      sheet = oldSheet;
    } else {
      sheet = ss.insertSheet(targetName);
    }
  }

  cleanAndMigrateSheetHeaders(sheet);
  deleteUnusedDefaultSheets(ss);

  return sheet;
}

function updateCausaInSheet(sheet, causa) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  const targetId = String(causa.id || '').trim().toLowerCase();
  const targetIpp = String(causa.ipp || '').trim().toLowerCase();

  let targetRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0] || '').trim().toLowerCase();
    const rowIpp = String(data[i][1] || '').trim().toLowerCase();

    if ((targetId && rowId === targetId) || (targetIpp && rowIpp === targetIpp)) {
      targetRowIndex = i + 1; // 1-indexed for Sheets API
      break;
    }
  }

  if (targetRowIndex > 0) {
    const updatedRow = causaToRow(causa);
    sheet.getRange(targetRowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
    return true;
  }
  return false;
}

function deleteCausaInSheet(sheet, id, ipp) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  const targetId = String(id || '').trim().toLowerCase();
  const targetIpp = String(ipp || '').trim().toLowerCase();

  const rowsToDelete = [];
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0] || '').trim().toLowerCase();
    const rowIpp = String(data[i][1] || '').trim().toLowerCase();

    if ((targetId && rowId === targetId) || (targetIpp && rowIpp === targetIpp)) {
      rowsToDelete.push(i + 1);
    }
  }

  for (let j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }
  return rowsToDelete.length > 0;
}

function syncAllCausasForUser(sheet, causasList) {
  if (!Array.isArray(causasList)) return;

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff');

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  if (causasList.length === 0) return;

  const newRows = causasList.map(c => causaToRow(c));
  sheet.getRange(2, 1, newRows.length, HEADERS.length).setValues(newRows);
}

function getOrCreateUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('USUARIOS') || ss.getSheetByName('Usuarios') || ss.getSheetByName('usuarios');
  if (!sheet) {
    sheet = ss.insertSheet('USUARIOS', 0);
    const uHeaders = ['ID', 'NOMBRE', 'EMAIL', 'PASSWORD', 'ROLE', 'FECHA_REGISTRO'];
    sheet.appendRow(uHeaders);
    sheet.getRange(1, 1, 1, uHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);

    // Auto registrar Administrador General
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    sheet.appendRow(['u-admin-marcote', 'SEBASTIÁN MARCOTE', 'admin@mpba.gov.ar', 'admin', 'Administrador General', nowStr]);
  } else {
    if (sheet.getName() !== 'USUARIOS') {
      try { sheet.setName('USUARIOS'); } catch(e){}
    }
    // Mover a la primera posición
    try {
      if (ss.getSheets()[0].getName() !== sheet.getName()) {
        ss.setActiveSheet(sheet);
        ss.moveActiveSheet(1);
      }
    } catch(e){}
  }

  // Verificar si existe el Administrador
  const uData = sheet.getDataRange().getValues();
  if (uData.length <= 1) {
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    sheet.appendRow(['u-admin-marcote', 'SEBASTIÁN MARCOTE', 'admin@ufi10.gob.ar', 'admin', 'Administrador General', nowStr]);
  }

  return sheet;
}

function syncAllUsersSheet(ss, usersList) {
  if (!Array.isArray(usersList)) return;
  const uSheet = getOrCreateUsersSheet();
  const uHeaders = ['ID', 'NOMBRE', 'EMAIL', 'PASSWORD', 'ROLE', 'FECHA_REGISTRO'];

  uSheet.getRange(1, 1, 1, uHeaders.length).setValues([uHeaders])
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff');

  const lastRow = uSheet.getLastRow();
  if (lastRow > 1) {
    uSheet.getRange(2, 1, lastRow - 1, uSheet.getLastColumn()).clearContent();
  }

  if (usersList.length === 0) return;

  const newRows = usersList.map(u => [
    u.id || '',
    u.name || '',
    u.email || '',
    u.password || '',
    u.role || '',
    u.fechaRegistro || ''
  ]);
  uSheet.getRange(2, 1, newRows.length, uHeaders.length).setValues(newRows);
}

function saveUserToSheet(userObj) {
  if (!userObj) return;
  const idVal = String(userObj.id || userObj.userId || ('u-' + Date.now())).trim();
  const nameVal = String(userObj.name || userObj.userName || '').trim().toUpperCase();
  const emailVal = String(userObj.email || userObj.userEmail || '').trim().toLowerCase();
  const passVal = String(userObj.password || userObj.userPassword || userObj.pass || '').trim();
  const roleVal = String(userObj.role || userObj.userRole || 'Instructor Judicial').trim();

  if (!nameVal && !emailVal) return;

  const uSheet = getOrCreateUsersSheet();
  const uData = uSheet.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < uData.length; i++) {
    const rowId = String(uData[i][0] || '').trim();
    const rowName = String(uData[i][1] || '').trim().toUpperCase();
    const rowEmail = String(uData[i][2] || '').trim().toLowerCase();

    if ((idVal && rowId === idVal) || (emailVal && rowEmail === emailVal) || (nameVal && rowName === nameVal)) {
      rowIdx = i + 1;
      break;
    }
  }

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const existingDate = (rowIdx > 0 && uData[rowIdx - 1][5]) ? String(uData[rowIdx - 1][5]) : nowStr;
  const finalId = (rowIdx > 0 && uData[rowIdx - 1][0]) ? String(uData[rowIdx - 1][0]) : idVal;
  const existingPass = (rowIdx > 0 && uData[rowIdx - 1][3]) ? String(uData[rowIdx - 1][3]) : '';

  const finalPass = passVal ? passVal : (existingPass || 'admin');

  const uRow = [finalId, nameVal, emailVal, finalPass, roleVal, existingDate];

  if (rowIdx > 0) {
    uSheet.getRange(rowIdx, 1, 1, uRow.length).setValues([uRow]);
  } else {
    uSheet.appendRow(uRow);
  }

  deduplicateUsersSheet(uSheet);
}

function deduplicateUsersSheet(uSheet) {
  try {
    if (!uSheet) uSheet = getOrCreateUsersSheet();
    const data = uSheet.getDataRange().getValues();
    if (data.length <= 2) return;

    const seenKeys = {};
    const rowsToDelete = [];

    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][2] || '').trim().toLowerCase();
      const name = String(data[i][1] || '').trim().toUpperCase();
      const key = email || name;

      if (key && seenKeys[key]) {
        rowsToDelete.push(i + 1);
      } else if (key) {
        seenKeys[key] = true;
      }
    }

    for (let j = rowsToDelete.length - 1; j >= 0; j--) {
      uSheet.deleteRow(rowsToDelete[j]);
    }
  } catch (e) {}
}

function rowToCausa(row, headersMap) {
  const getVal = (name) => {
    if (headersMap && headersMap[name] !== undefined && headersMap[name] < row.length) {
      const v = row[headersMap[name]];
      return (v !== undefined && v !== null && String(v).trim() !== '') ? String(v).trim() : null;
    }
    return null;
  };

  let estadoVal = getVal('estado') ?? String(row[2] || 'En Trámite');
  let revisionVal = getVal('revision') ?? (row.length >= 17 ? String(row[3] || '') : '');

  if (estadoVal.toLowerCase() === 'esperar' || estadoVal.toLowerCase() === 'revisar') {
    if (!revisionVal) revisionVal = estadoVal;
    estadoVal = 'En Trámite';
  }

  const revisado = getVal('revisado') ?? (row.length >= 17 ? String(row[4] || '') : String(row[3] || ''));
  const revisarDias = getVal('revisar_dias') ?? getVal('revisar dias') ?? (row.length >= 17 ? String(row[5] || '') : String(row[4] || ''));
  const caratula = getVal('caratula') ?? (row.length >= 17 ? String(row[6] || '') : String(row[5] || ''));
  const sumario = getVal('sumario') ?? (row.length >= 17 ? String(row[7] || '') : String(row[6] || ''));
  const denunciadoEn = getVal('denunciado_en') ?? getVal('denunciado en') ?? (row.length >= 17 ? String(row[8] || '') : String(row[7] || ''));
  const fechaInicio = getVal('fecha_inicio') ?? getVal('fecha inicio') ?? getVal('fecha_creacion') ?? (row.length === 18 ? String(row[9] || '') : '');
  const tramite = getVal('tramite') ?? (row.length === 18 ? String(row[10] || '') : (row.length === 17 ? String(row[9] || '') : String(row[8] || '')));
  const detenido = getVal('detenido') ?? (row.length === 18 ? String(row[11] || '') : (row.length === 17 ? String(row[10] || '') : String(row[9] || '')));

  const vencimientoPP1 = getVal('vencimiento_pp1') ?? getVal('vencimiento pp1') ?? getVal('vencimiento_pp') ?? (row.length === 18 ? String(row[12] || '') : (row.length === 17 ? String(row[11] || '') : String(row[10] || '')));
  const vencimientoPP2 = getVal('vencimiento_pp2') ?? getVal('vencimiento pp2') ?? (row.length === 18 ? String(row[13] || '') : (row.length === 17 ? String(row[12] || '') : String(row[11] || '')));
  const vencimientoIPP = getVal('vencimiento_ipp') ?? getVal('venc_ipp') ?? getVal('vencimiento ipp') ?? getVal('venc. ipp') ?? (row.length === 18 ? String(row[14] || '') : (row.length === 17 ? String(row[13] || '') : String(row[12] || '')));
  const ppProrrogadaVal = getVal('pp_prorrogada') ?? getVal('pp prorrogada') ?? (row.length === 18 ? String(row[15] || '') : (row.length === 17 ? String(row[14] || '') : String(row[13] || '')));
  const periciasVal = getVal('pericias') ?? (row.length === 18 ? String(row[16] || '') : (row.length === 17 ? String(row[15] || '') : String(row[14] || '')));
  const audienciasVal = getVal('audiencias') ?? (row.length === 18 ? String(row[17] || '') : (row.length === 17 ? String(row[16] || '') : String(row[15] || '')));

  let pericias = [];
  try {
    pericias = periciasVal ? JSON.parse(periciasVal) : [];
  } catch (e) {
    pericias = [];
  }

  let audiencias = [];
  try {
    audiencias = audienciasVal ? JSON.parse(audienciasVal) : [];
  } catch (e) {
    audiencias = [];
  }

  return {
    id: getVal('id') ?? String(row[0] || ''),
    ipp: getVal('ipp') ?? String(row[1] || ''),
    estado: estadoVal,
    revision: revisionVal || (estadoVal.toLowerCase() === 'en trámite' || estadoVal.toLowerCase() === 'en tramite' ? 'Esperar' : '-'),
    revisado: revisado,
    revisar_dias: revisarDias,
    caratula: caratula,
    sumario: sumario,
    denunciado_en: denunciadoEn,
    fecha_inicio: fechaInicio || revisado || '',
    tramite: tramite,
    detenido: detenido,
    vencimiento_pp1: vencimientoPP1,
    vencimiento_pp2: vencimientoPP2,
    vencimiento_ipp: vencimientoIPP,
    pp_prorrogada: String(ppProrrogadaVal).toLowerCase() === 'true' || ppProrrogadaVal === true || String(ppProrrogadaVal).toUpperCase() === 'SI',
    pericias: pericias,
    audiencias: audiencias
  };
}

function causaToRow(c) {
  let cleanEstado = (c.estado || 'En Trámite').trim();
  let cleanRevision = (c.revision || '').trim();

  if (cleanEstado.toLowerCase() === 'esperar' || cleanEstado.toLowerCase() === 'revisar') {
    if (!cleanRevision) cleanRevision = cleanEstado;
    cleanEstado = 'En Trámite';
  }

  if (!cleanRevision) {
    cleanRevision = (cleanEstado.toLowerCase() === 'en trámite' || cleanEstado.toLowerCase() === 'en tramite') ? 'Esperar' : '-';
  }

  const fechaInicio = c.fecha_inicio || c.fecha_creacion || c.revisado || '';

  return [
    c.id || '',
    c.ipp || '',
    cleanEstado,
    cleanRevision,
    c.revisado || '',
    c.revisar_dias || '',
    c.caratula || '',
    c.sumario || '',
    c.denunciado_en || '',
    fechaInicio,
    c.tramite || '',
    c.detenido || '',
    c.vencimiento_pp1 || '',
    c.vencimiento_pp2 || '',
    c.vencimiento_ipp || '',
    c.pp_prorrogada ? 'true' : 'false',
    JSON.stringify(c.pericias || []),
    JSON.stringify(c.audiencias || [])
  ];
}

function readCausasForUser(userName) {
  const sheet = getOrCreateSheet(userName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse({ status: 'success', causas: [] });
  }

  const headersMap = {};
  if (data.length > 0) {
    const hRow = data[0];
    for (let h = 0; h < hRow.length; h++) {
      const colName = String(hRow[h] || '').trim().toLowerCase();
      if (colName) headersMap[colName] = h;
    }
  }

  const causas = [];
  for (let i = 1; i < data.length; i++) {
    const idVal = String(data[i][0] || '').trim().toLowerCase();
    const ippVal = String(data[i][1] || '').trim().toLowerCase();
    if (idVal === 'id' && ippVal === 'ipp') continue;

    if (data[i][0] || data[i][1]) {
      causas.push(rowToCausa(data[i], headersMap));
    }
  }
  return jsonResponse({ status: 'success', causas: causas });
}

function doGet(e) {
  try {
    const userName = (e && e.parameter && e.parameter.userName) ? e.parameter.userName : null;
    return readCausasForUser(userName);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    let contents = {};
    if (e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    }
    const action = contents.action || 'read';
    const rawUser = contents.userName || (typeof contents.user === 'string' ? contents.user : (contents.user && contents.user.name ? contents.user.name : null)) || (e && e.parameter ? e.parameter.userName : null);
    const userName = (typeof rawUser === 'string') ? rawUser : null;
    const sheet = getOrCreateSheet(userName);

    if (action === 'read') {
      return readCausasForUser(userName);
    }

    if (action === 'sync') {
      const causasList = contents.causas || [];
      syncAllCausasForUser(sheet, causasList);
      return jsonResponse({ status: 'success', message: 'Sincronización completa exitosa', count: causasList.length });
    }

    if (action === 'create') {
      const newCausa = contents.causa;
      if (!newCausa) throw new Error('Falta el objeto causa');
      sheet.appendRow(causaToRow(newCausa));
      return jsonResponse({ status: 'success', message: 'Causa creada' });
    }

    if (action === 'update') {
      const updatedCausa = contents.causa;
      if (!updatedCausa) throw new Error('Falta el objeto causa');
      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(updatedCausa.id) || (data[i][1] && String(data[i][1]) === String(updatedCausa.ipp))) {
          foundIndex = i + 1;
          break;
        }
      }
      if (foundIndex !== -1) {
        const newRow = causaToRow(updatedCausa);
        sheet.getRange(foundIndex, 1, 1, HEADERS.length).setValues([newRow]);
        return jsonResponse({ status: 'success', message: 'Causa actualizada' });
      } else {
        sheet.appendRow(causaToRow(updatedCausa));
        return jsonResponse({ status: 'success', message: 'Causa añadida' });
      }
    }

    if (action === 'delete') {
      const causaId = contents.id;
      const ipp = contents.ipp;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if ((causaId && String(data[i][0]) === String(causaId)) || (ipp && String(data[i][1]) === String(ipp))) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ status: 'success', message: 'Causa eliminada' });
        }
      }
      return jsonResponse({ status: 'success', message: 'Causa no encontrada' });
    }

    if (action === 'create_user_tab') {
      const targetUserName = (contents.userName || (contents.user && contents.user.name) || 'USUARIO').trim().toUpperCase();
      const userSheet = getOrCreateSheet(targetUserName);

      // Siempre registrar en la pestaña USUARIOS
      saveUserToSheet(contents.user || contents);

      return jsonResponse({ status: 'success', message: 'Pestaña de usuario creada y registrada en USUARIOS: ' + targetUserName });
    }

    if (action === 'save_user') {
      const uObj = contents.user || {
        id: contents.userId || ('u-' + Date.now()),
        name: contents.userName || '',
        email: contents.userEmail || '',
        password: contents.userPassword || '',
        role: contents.userRole || 'Instructor Judicial'
      };
      saveUserToSheet(uObj);
      return jsonResponse({ status: 'success', message: 'Usuario guardado en pestaña USUARIOS: ' + uObj.name });
    }

    if (action === 'get_users') {
      const uSheet = getOrCreateUsersSheet();
      deduplicateUsersSheet(uSheet);
      const uData = uSheet.getDataRange().getValues();
      const userList = [];
      const seen = {};
      for (let i = 1; i < uData.length; i++) {
        const id = String(uData[i][0] || '').trim();
        const name = String(uData[i][1] || '').trim();
        const email = String(uData[i][2] || '').trim().toLowerCase();
        const key = email || name || id;

        if (key && !seen[key]) {
          seen[key] = true;
          userList.push({
            id: id || ('u-' + Date.now()),
            name: name,
            email: email,
            password: String(uData[i][3] || ''),
            role: String(uData[i][4] || 'Instructor Judicial')
          });
        }
      }
      return jsonResponse({ status: 'success', users: userList });
    }

    if (action === 'delete_user') {
      const uSheet = getOrCreateUsersSheet();
      const uData = uSheet.getDataRange().getValues();
      const targetId = contents.userId || '';
      const targetEmail = (contents.userEmail || '').toLowerCase();
      for (let i = 1; i < uData.length; i++) {
        if ((targetId && String(uData[i][0]) === String(targetId)) || (targetEmail && String(uData[i][2]).toLowerCase() === targetEmail)) {
          uSheet.deleteRow(i + 1);
          return jsonResponse({ status: 'success', message: 'Usuario eliminado de pestaña USUARIOS' });
        }
      }
      return jsonResponse({ status: 'success', message: 'Usuario no encontrado en USUARIOS' });
    }

    if (action === 'delete_user_tab') {
      const targetUserName = (contents.userName || '').trim().toLowerCase();
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = ss.getSheets();
      let deleted = false;
      let deletedName = '';

      for (let i = 0; i < sheets.length; i++) {
        const sName = sheets[i].getName().trim().toLowerCase();
        // Protect main admin sheet
        if (sName === 'sebastián marcote' || sName === 'sebastian marcote') continue;

        if (sName === targetUserName || sName.includes(targetUserName) || targetUserName.includes(sName)) {
          if (ss.getSheets().length > 1) {
            deletedName = sheets[i].getName();
            ss.deleteSheet(sheets[i]);
            deleted = true;
            break;
          }
        }
      }

      return jsonResponse({ status: 'success', message: 'Pestaña de usuario procesada: ' + targetUserName });
    }

    return jsonResponse({ status: 'error', message: 'Acción no válida' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwJ4J7ckbFct7KNEz_L29HZbQdlOCuJXtEmZIkn7aAXXlfC-V0Se7TWNoqzCeCECBY-CA/exec';

export function getStoredSheetsUrl() {
  return localStorage.getItem(SHEETS_URL_KEY) || DEFAULT_SHEETS_URL;
}

export function setStoredSheetsUrl(url) {
  if (url) {
    localStorage.setItem(SHEETS_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(SHEETS_URL_KEY);
  }
}

export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY) || null;
}

export function updateLastSyncTime() {
  const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  localStorage.setItem(LAST_SYNC_KEY, nowStr);
  return nowStr;
}

/**
 * Petición con soporte para la redirección 302 estándar de Google Apps Script Web App
 */
async function postToAppsScript(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message || 'Error en la ejecución del Script de Google');
    }
    return result;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        'No se pudo conectar con Google (Failed to fetch). Verifica que en la implementación del Apps Script en Google hayas seleccionado: "Quién tiene acceso" -> "Cualquiera". Si cambiaste el código, debes ir a Implementar -> Administrar implementaciones -> Editar -> Nueva versión.'
      );
    }
    throw err;
  }
}

/**
 * Obtener listado de causas desde Google Sheets para un usuario específico
 */
export async function fetchCausasFromSheets(url, userName = null) {
  if (!url) throw new Error('URL de Google Apps Script no configurada');

  const queryUrl = userName ? `${url}?userName=${encodeURIComponent(userName)}` : url;
  let rawList = [];

  // Primero probar método GET
  try {
    const res = await fetch(queryUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.causas)) {
        rawList = data.causas;
      }
    }
  } catch (e) {
    console.warn('GET fetch direct failed, trying POST fallback', e);
  }

  if (!rawList || rawList.length === 0) {
    const result = await postToAppsScript(url, { action: 'read', userName });
    rawList = result.causas || [];
  }

  updateLastSyncTime();

  // Filtrar cualquier fila de encabezado duplicada accidentalmente
  return rawList.filter(c => {
    const idVal = String(c.id || '').trim().toLowerCase();
    const ippVal = String(c.ipp || '').trim().toLowerCase();
    return idVal !== 'id' && ippVal !== 'ipp';
  });
}

/**
 * Sincronización completa (sobrescribir o empujar todas las causas a Sheets)
 */
export async function syncAllToSheets(url, causasArray, userName = null) {
  if (!url) throw new Error('URL de Google Apps Script no configurada');
  const result = await postToAppsScript(url, {
    action: 'sync',
    causas: causasArray,
    userName
  });
  updateLastSyncTime();
  return result;
}

/**
 * Guardar/Actualizar una causa individual en Sheets
 */
export async function updateCausaInSheets(url, causa, userName = null) {
  if (!url) return null;
  const result = await postToAppsScript(url, {
    action: 'update',
    causa: causa,
    userName
  });
  updateLastSyncTime();
  return result;
}

/**
 * Crear causa en Sheets
 */
export async function createCausaInSheets(url, causa, userName = null) {
  if (!url) return null;
  const result = await postToAppsScript(url, {
    action: 'create',
    causa: causa,
    userName
  });
  updateLastSyncTime();
  return result;
}

/**
 * Eliminar causa en Sheets
 */
export async function deleteCausaInSheets(url, id, ipp, userName = null) {
  if (!url) return null;
  const result = await postToAppsScript(url, {
    action: 'delete',
    id: id,
    ipp: ipp,
    userName
  });
  updateLastSyncTime();
  return result;
}

/**
 * Crear pestaña nueva de usuario en Google Sheets
 */
export async function createUserSheetTab(url, user) {
  if (!url || !user) return null;
  try {
    const result = await postToAppsScript(url, {
      action: 'create_user_tab',
      userName: user.name || '',
      userEmail: user.email || '',
      userPassword: user.password || '',
      userRole: user.role || 'Instructor Judicial',
      userId: user.id || '',
      user: user
    });
    return result;
  } catch (err) {
    console.warn('Error al crear la pestaña del usuario en Google Sheets:', err.message);
    return null;
  }
}

/**
 * Eliminar pestaña de usuario en Google Sheets
 */
export async function deleteUserSheetTab(url, userName) {
  if (!url || !userName) return null;
  try {
    const result = await postToAppsScript(url, {
      action: 'delete_user_tab',
      userName: userName
    });
    return result;
  } catch (err) {
    console.warn('Error al eliminar la pestaña del usuario en Google Sheets:', err.message);
    return null;
  }
}

/**
 * Guardar o actualizar datos de usuario en la pestaña USUARIOS de Google Sheets
 */
export async function saveUserToSheetsTab(url, user) {
  if (!url || !user) return null;
  try {
    const result = await postToAppsScript(url, {
      action: 'save_user',
      userName: user.name || '',
      userEmail: user.email || '',
      userPassword: user.password || '',
      userRole: user.role || '',
      user: user
    });
    return result;
  } catch (err) {
    console.warn('Error al guardar el usuario en la pestaña USUARIOS de Google Sheets:', err.message);
    return null;
  }
}

/**
 * Obtener todos los usuarios registrados desde la pestaña USUARIOS de Google Sheets
 */
export async function fetchUsersFromSheetsTab(url) {
  if (!url) return [];
  try {
    const result = await postToAppsScript(url, { action: 'get_users' });
    const rawUsers = result.users || [];
    const uniqueUsers = [];
    const seen = new Set();
    for (const u of rawUsers) {
      const key = (u.email || u.name || u.id || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueUsers.push(u);
      }
    }
    return uniqueUsers;
  } catch (err) {
    console.warn('Error al obtener usuarios desde Google Sheets:', err.message);
    return [];
  }
}

/**
 * Eliminar registro de usuario de la pestaña USUARIOS de Google Sheets
 */
export async function deleteUserFromSheetsTab(url, user) {
  if (!url || !user) return null;
  try {
    const result = await postToAppsScript(url, {
      action: 'delete_user',
      userId: user.id || '',
      userEmail: user.email || ''
    });
    return result;
  } catch (err) {
    console.warn('Error al eliminar el usuario de la pestaña USUARIOS de Google Sheets:', err.message);
    return null;
  }
}
