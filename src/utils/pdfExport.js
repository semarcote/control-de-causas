import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getVencimientoIPP, checkPPStatusSpecial } from '../components/CausasTable';

export function exportFilteredCausasToPdf({
  causas = [],
  currentUser = null,
  statusFilter = 'en trámite',
  searchTerm = '',
  inicioFilter = 'todos',
  fechaDesdeFilter = ''
}) {
  if (!Array.isArray(causas) || causas.length === 0) {
    alert('No hay causas en pantalla para exportar a PDF.');
    return;
  }

  // Create PDF document in Landscape mode for wide tabular layout
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const userName = currentUser?.name || 'SEBASTIÁN MARCOTE';

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('CONTROL DE CAUSAS - MINISTERIO PÚBLICO FISCAL', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Departamento Judicial Zárate-Campana • Reporte Oficial de Expedientes', 14, 18);

  // 2. Metadata Box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 29, 269, 14, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(14, 29, 269, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59); // slate-800

  const filterText = statusFilter === 'todos' ? 'TODAS LAS CAUSAS' : statusFilter.toUpperCase();
  doc.text(`USUARIO: ${userName}`, 18, 35);
  doc.text(`FILTRO APLICADO: ${filterText}${searchTerm ? ` | Búsqueda: "${searchTerm}"` : ''}`, 105, 35);
  doc.text(`TOTAL REGISTROS: ${causas.length}`, 225, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`EMITIDO: ${todayStr} ${timeStr} hs`, 18, 40);

  // 3. Prepare Table Data Rows
  const tableData = causas.map((c, idx) => {
    // Ultimo tramite text (clean up delimiter ///)
    let ultimoTramite = c.tramite || 'Sin trámite registrado';
    if (ultimoTramite.includes('///')) {
      const parts = ultimoTramite.split('///');
      ultimoTramite = parts[parts.length - 1].trim();
    }
    if (ultimoTramite.length > 80) {
      ultimoTramite = ultimoTramite.substring(0, 80) + '...';
    }

    // Pericias & Vencimientos info
    let periciasText = '';
    if (Array.isArray(c.pericias) && c.pericias.length > 0) {
      periciasText = c.pericias.map(p => `${p.tipo} (${p.estado || 'En Proceso'})`).join('\n');
    } else if (c.pericia_detalle) {
      periciasText = c.pericia_detalle;
    }

    let vencText = '';
    if (c.detenido === 'SI' && c.vencimiento_pp1) {
      vencText = `1º PP: ${c.vencimiento_pp1}`;
      if (c.pp_prorrogada && c.vencimiento_pp2) vencText += `\n2º PP: ${c.vencimiento_pp2}`;
    } else if (c.vencimiento_ipp) {
      vencText = `Venc. IPP: ${c.vencimiento_ipp}`;
    }

    const infoAdicional = [periciasText, vencText].filter(Boolean).join('\n') || '-';

    return [
      (c.ipp || '-'),
      (c.caratula || 'SIN CARÁTULA'),
      (c.estado || 'En Trámite'),
      c.revisado ? `${c.revisado}\n(${c.revisar_dias || '30'}d)` : '-',
      (c.denunciado_en || 'Mesa de Entradas'),
      ultimoTramite,
      infoAdicional
    ];
  });

  // 4. Generate AutoTable
  autoTable(doc, {
    startY: 46,
    head: [['N° I.P.P.', 'CARÁTULA / IMPUTADO Y DELITO', 'ESTADO', 'REVISIÓN', 'ORIGEN', 'ÚLTIMO TRÁMITE', 'PERICIAS / VENCIMIENTOS']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' }, // IPP
      1: { cellWidth: 55 }, // Caratula
      2: { cellWidth: 26, fontStyle: 'bold' }, // Estado
      3: { cellWidth: 22, halign: 'center' }, // Revision
      4: { cellWidth: 32 }, // Origen
      5: { cellWidth: 70 }, // Ultimo tramite
      6: { cellWidth: 28 }  // Pericias/Vencimientos
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    margin: { top: 46, left: 14, right: 14, bottom: 14 },
    didDrawPage: (data) => {
      // Footer Page Numbering
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${totalPages}`,
        297 - 14,
        210 - 7,
        { align: 'right' }
      );
      doc.text(
        'Sistema de Control de Causas - Ministerio Público Fiscal PBA',
        14,
        210 - 7
      );
    }
  });

  // 5. Download PDF
  const cleanFilterName = statusFilter.replace(/\s+/g, '_');
  doc.save(`Reporte_Causas_${cleanFilterName}_${todayStr.replace(/\//g, '-')}.pdf`);
}
