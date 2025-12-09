import jsPDF from 'jspdf';

export const generarTicketVenta = (items, total, nombreNegocio, folio, direccion = "", telefono = "") => {
  // Configuración: 58mm ancho (estándar impresoras térmicas pequeñas)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [58, 210] 
  });

  // Márgenes y configuración inicial
  let y = 5; // Posición vertical inicial
  const margenIzq = 2;
  const anchoUtil = 54; // 58mm - bordes
  const centro = 29; // Centro del papel

  // --- 1. ENCABEZADO ---
  // Nombre del Negocio (Grande y Negrita)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(nombreNegocio.toUpperCase(), centro, y, { align: "center", maxWidth: 50 });
  
  // Dirección y Teléfono (Normal y Pequeño)
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  
  if(direccion) {
      doc.text(direccion, centro, y, { align: "center", maxWidth: 50 });
      y += (direccion.length > 30 ? 6 : 3); // Ajuste de espacio si es larga
  }
  if(telefono) {
      doc.text(`Tel: ${telefono}`, centro, y, { align: "center" });
      y += 4;
  }

  // Separador elegante
  y += 1;
  doc.setLineWidth(0.2);
  doc.line(margenIzq, y, margenIzq + anchoUtil, y);
  y += 4;

  // Datos del Ticket
  doc.setFontSize(8);
  doc.text(`FOLIO: ${folio}`, margenIzq, y);
  doc.text(new Date().toLocaleDateString(), margenIzq + anchoUtil, y, { align: "right" });
  y += 4;
  doc.text(new Date().toLocaleTimeString(), margenIzq + anchoUtil, y, { align: "right" });
  y += 2;

  // --- 2. TABLA DE PRODUCTOS ---
  
  // Encabezados de tabla (Negrita con fondo gris simulado por línea gruesa? No, mejor limpio)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CANT", margenIzq, y);
  doc.text("DESCRIPCION", margenIzq + 8, y);
  doc.text("IMPORTE", margenIzq + anchoUtil, y, { align: "right" });
  
  y += 1;
  doc.line(margenIzq, y, margenIzq + anchoUtil, y); // Línea bajo encabezados
  y += 4;

  // Lista de items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  items.forEach(item => {
    const cantidad = item.cantidad.toString();
    const precioTotal = (item.precio_venta * item.cantidad).toFixed(2);
    let nombre = item.nombre;

    // Columna Cantidad
    doc.text(cantidad, margenIzq + 2, y, { align: "center" });

    // Columna Precio (Derecha)
    doc.text(`$${precioTotal}`, margenIzq + anchoUtil, y, { align: "right" });

    // Columna Nombre (Centro - Manejo de texto largo)
    // Si el nombre es muy largo, jsPDF puede escribir encima del precio.
    // Vamos a recortarlo o dividirlo.
    if (nombre.length > 16) {
        // Opción A: Recortar con "..."
        // nombre = nombre.substring(0, 15) + "..";
        // doc.text(nombre, margenIzq + 8, y);
        
        // Opción B: Multilínea (Más profesional)
        const lineasNombre = doc.splitTextToSize(nombre, 30); // 30mm ancho max para nombre
        doc.text(lineasNombre, margenIzq + 8, y);
        
        // Si ocupa más de 1 línea, bajamos el cursor extra
        y += (lineasNombre.length * 3.5); 
    } else {
        doc.text(nombre, margenIzq + 8, y);
        y += 4; // Salto normal
    }
  });

  // --- 3. TOTALES ---
  y += 2;
  doc.line(margenIzq, y, margenIzq + anchoUtil, y);
  y += 5;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", margenIzq + 15, y, { align: "right" });
  doc.text(`$${total}`, margenIzq + anchoUtil, y, { align: "right" });
  
  y += 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  
  // Mensaje final (Pie de página)
  y += 8;
  doc.text("¡Gracias por su visita!", centro, y, { align: "center" });
  y += 4;
  doc.setFontSize(6);
  doc.text("Este no es un comprobante fiscal", centro, y, { align: "center" });

  // Imprimir directo
  doc.autoPrint();
  return doc.output('bloburl');
};