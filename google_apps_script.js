/**
 * ARCHIVO ARTÍSTICO JOSÉ LUIS GUTIÉRREZ
 * Backend Serverless para recepción de obras familiares,
 * guardado de fotografías en Google Drive, registro en Google Sheets
 * y notificación con previsualización de fotos por correo a Olmo.
 */

// Configuración básica
const CARPETA_RAIZ_DRIVE = "Archivo José Luis - Obras Familiares";
const HOJA_REGISTRO_SHEETS = "Registro Obras - Archivo José Luis";
const NOTIFICAR_EMAIL = "olmo.gutcal@gmail.com"; 

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No se recibieron datos en la petición."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const nombre = (data.nombre || "Anónimo").trim();
    const ubicacion = (data.ubicacion || "No especificada").trim();
    const titulo = (data.titulo || "Sin título indicado").trim();
    const dimensiones = (data.dimensiones || "No especificadas").trim();
    const historia = (data.historia || "Sin notas adicionales").trim();
    const fotos = data.fotos || [];
    const fechaHora = Utilities.formatDate(new Date(), "Europe/Madrid", "dd/MM/yyyy HH:mm:ss");

    // 1. Obtener o crear la carpeta principal en Google Drive
    let rootFolder;
    const folderSearch = DriveApp.getFoldersByName(CARPETA_RAIZ_DRIVE);
    if (folderSearch.hasNext()) {
      rootFolder = folderSearch.next();
    } else {
      rootFolder = DriveApp.createFolder(CARPETA_RAIZ_DRIVE);
    }

    // 2. Crear subcarpeta específica para esta obra aportada
    const cleanDate = fechaHora.substring(0, 10).replace(/\//g, "-");
    const subfolderName = `${cleanDate} - ${nombre} - ${titulo}`.replace(/[\/\\:*?"<>|]/g, "_");
    const obraFolder = rootFolder.createFolder(subfolderName);

    // 3. Guardar las fotografías enviadas dentro de la subcarpeta y preparar previsualización
    const inlineImages = {};
    let photosHtml = "";
    
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i];
      if (f.base64) {
        const decoded = Utilities.base64Decode(f.base64);
        const fileName = f.name || `foto_${i + 1}.jpg`;
        const contentType = f.type || "image/jpeg";
        const blob = Utilities.newBlob(decoded, contentType, fileName);
        
        // Guardar archivo original en Google Drive
        obraFolder.createFile(blob);

        // Asociar para vista previa visual incrustada en el correo
        const cid = `preview_foto_${i}`;
        inlineImages[cid] = blob;
        photosHtml += `
          <div style="margin-bottom: 20px; text-align: center;">
            <img src="cid:${cid}" alt="${fileName}" style="max-width: 100%; max-height: 540px; border-radius: 6px; border: 1px solid #D8D2C5; box-shadow: 0 4px 14px rgba(0,0,0,0.08); display: inline-block;" />
            <div style="font-size: 11px; color: #777; margin-top: 6px; font-family: sans-serif;">${fileName}</div>
          </div>
        `;
      }
    }

    // 4. Obtener o crear la hoja de cálculo de Google Sheets
    let spreadsheet;
    const fileSearch = DriveApp.getFilesByName(HOJA_REGISTRO_SHEETS);
    if (fileSearch.hasNext()) {
      const file = fileSearch.next();
      spreadsheet = SpreadsheetApp.open(file);
    } else {
      spreadsheet = SpreadsheetApp.create(HOJA_REGISTRO_SHEETS);
      const sheet = spreadsheet.getActiveSheet();
      sheet.appendRow([
        "Fecha y Hora",
        "Nombre",
        "Ubicación",
        "Título Obra",
        "Dimensiones",
        "Detalles / Recuerdos",
        "Nº Fotos",
        "Carpeta Google Drive"
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#EFECE6");
      sheet.setFrozenRows(1);

      // Mover la hoja de cálculo dentro de la carpeta del archivo para tener todo ordenado
      const sheetFile = DriveApp.getFileById(spreadsheet.getId());
      rootFolder.addFile(sheetFile);
      DriveApp.getRootFolder().removeFile(sheetFile);
    }

    const mainSheet = spreadsheet.getActiveSheet();
    mainSheet.appendRow([
      fechaHora,
      nombre,
      ubicacion,
      titulo,
      dimensiones,
      historia,
      fotos.length,
      obraFolder.getUrl()
    ]);

    // 5. Enviar notificación por correo con previsualización de imágenes a Olmo
    const emailDestino = (NOTIFICAR_EMAIL || Session.getEffectiveUser().getEmail() || "olmo.gutcal@gmail.com").trim();
    if (emailDestino) {
      const asunto = `[Archivo Jose Luis] Nueva obra: "${titulo}" (${nombre})`;
      
      const cuerpoPlano = `¡Hola Olmo!\n\n` +
        `Se ha recibido una nueva aportación en la web del Archivo de José Luis Gutiérrez:\n\n` +
        `• Subido por: ${nombre}\n` +
        `• Título de la obra: ${titulo}\n` +
        `• Ubicación: ${ubicacion}\n` +
        `• Medidas: ${dimensiones}\n` +
        `• Detalles / Recuerdos: ${historia}\n` +
        `• Fotografías subidas: ${fotos.length} archivo(s)\n\n` +
        `Ver las fotos en Google Drive:\n${obraFolder.getUrl()}\n\n` +
        `Ver la hoja de registro en Google Sheets:\n${spreadsheet.getUrl()}\n\n` +
        `---\nArchivo Artístico José Luis Gutiérrez`;

      const htmlCuerpo = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1a1a1a; background: #FAF8F5; border: 1px solid #E2DCD1; border-radius: 8px; overflow: hidden;">
          <div style="background: #0C0C0C; color: #F5F3F0; padding: 20px 24px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #B23A22; margin-bottom: 4px;">Archivo José Luis Gutiérrez</div>
            <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.02em;">Nueva Obra Recibida</div>
          </div>
          
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
              <tr style="border-bottom: 1px solid #EADDCF;">
                <td style="padding: 8px 0; font-weight: bold; color: #666; width: 130px;">Subido por:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0C0C0C;">${nombre}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EADDCF;">
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Título de la obra:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #B23A22;">${titulo}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EADDCF;">
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Ubicación:</td>
                <td style="padding: 8px 0;">${ubicacion}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EADDCF;">
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Dimensiones:</td>
                <td style="padding: 8px 0;">${dimensiones}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666; vertical-align: top;">Recuerdos / Notas:</td>
                <td style="padding: 8px 0; line-height: 1.45;">${historia}</td>
              </tr>
            </table>

            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin-bottom: 16px; border-bottom: 2px solid #0C0C0C; padding-bottom: 4px;">
              Previsualización de fotografías (${fotos.length}):
            </div>
            
            ${photosHtml || '<p style="color: #888; font-style: italic;">No se adjuntaron fotografías.</p>'}

            <div style="margin-top: 26px; padding-top: 20px; border-top: 1px solid #E2DCD1;">
              <a href="${obraFolder.getUrl()}" style="display: inline-block; background: #0C0C0C; color: #FFF; text-decoration: none; padding: 11px 18px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 10px; margin-bottom: 8px;">Ver Carpeta en Drive</a>
              <a href="${spreadsheet.getUrl()}" style="display: inline-block; background: #FFF; color: #0C0C0C; border: 1px solid #0C0C0C; text-decoration: none; padding: 11px 18px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Ver Hoja de Cálculo</a>
            </div>
          </div>
          
          <div style="background: #EFECE6; padding: 12px 24px; font-size: 11px; color: #777; border-top: 1px solid #E2DCD1;">
            Notificación automática del Archivo Artístico José Luis Gutiérrez · ${fechaHora}
          </div>
        </div>
      `;

      GmailApp.sendEmail(emailDestino, asunto, cuerpoPlano, {
        name: "Archivo José Luis Gutiérrez",
        htmlBody: htmlCuerpo,
        inlineImages: inlineImages
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Obra y fotos registradas correctamente.",
      folderUrl: obraFolder.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Receptor del Archivo José Luis Gutiérrez activo y listo."
  })).setMimeType(ContentService.MimeType.JSON);
}
