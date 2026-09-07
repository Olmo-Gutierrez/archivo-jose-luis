/**
 * ARCHIVO ARTÍSTICO JOSÉ LUIS GUTIÉRREZ
 * Backend Serverless para recepción de obras familiares,
 * guardado de fotografías en Google Drive, registro en Google Sheets
 * y notificación inmediata por correo electrónico a Olmo.
 * 
 * Instrucciones de instalación:
 * 1. Entra en https://script.google.com/
 * 2. Pulsa en "Nuevo proyecto"
 * 3. Pega todo este código reemplazando lo que haya
 * 4. Pulsa en "Implementar" (arriba a la derecha) > "Nueva implementación"
 * 5. Selecciona tipo: "Aplicación web"
 * 6. En "Ejecutar como": selecciona "Yo (tu cuenta de Google)"
 * 7. En "Quién tiene acceso": selecciona "Cualquier usuario" (Anyone)
 * 8. Pulsa "Implementar", autoriza los permisos y copia la URL de la aplicación web (termina en /exec)
 * 9. Pega esa URL en web/site.js en la variable GOOGLE_SCRIPT_WEB_APP_URL
 */

// Configuración básica
const CARPETA_RAIZ_DRIVE = "Archivo José Luis - Obras Familiares";
const HOJA_REGISTRO_SHEETS = "Registro Obras - Archivo José Luis";
// Si dejas NOTIFICAR_EMAIL vacío (""), se enviará a la cuenta de Google con la que crees el script
const NOTIFICAR_EMAIL = ""; 

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

    // 3. Guardar las fotografías enviadas dentro de la subcarpeta
    const fotosUrls = [];
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i];
      if (f.base64) {
        const decoded = Utilities.base64Decode(f.base64);
        const fileName = f.name || `foto_${i + 1}.jpg`;
        const contentType = f.type || "image/jpeg";
        const blob = Utilities.newBlob(decoded, contentType, fileName);
        const savedFile = obraFolder.createFile(blob);
        fotosUrls.push(savedFile.getUrl());
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

    // 5. Enviar notificación por correo a Olmo
    const emailDestino = (NOTIFICAR_EMAIL || Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail()).trim();
    if (emailDestino) {
      const asunto = `🎨 Nueva obra recibida: "${titulo}" (${nombre})`;
      const cuerpoTexto = `¡Hola Olmo!\n\n` +
        `Se ha recibido una nueva aportación en la web del Archivo de José Luis Gutiérrez:\n\n` +
        `• Subido por: ${nombre}\n` +
        `• Título de la obra: ${titulo}\n` +
        `• Ubicación: ${ubicacion}\n` +
        `• Medidas: ${dimensiones}\n` +
        `• Detalles / Recuerdos: ${historia}\n` +
        `• Fotografías subidas: ${fotos.length} archivo(s)\n\n` +
        `📁 Ver las fotos en Google Drive:\n` +
        `${obraFolder.getUrl()}\n\n` +
        `📊 Ver la hoja de registro en Google Sheets:\n` +
        `${spreadsheet.getUrl()}\n\n` +
        `---\nArchivo Artístico José Luis Gutiérrez`;

      GmailApp.sendEmail(emailDestino, asunto, cuerpoTexto);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Obra y fotos registradas correctamente.",
      folderUrl: obraFolder.getUrl(),
      notificadoA: emailDestino || "ninguno"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para probar el envío de correo directamente desde el editor
function probarEnvioCorreo() {
  const emailDestino = (NOTIFICAR_EMAIL || Session.getEffectiveUser().getEmail()).trim();
  Logger.log("Destinatario: " + emailDestino);
  if (!emailDestino) {
    throw new Error("El correo está vacío. Por favor, escribe tu dirección en NOTIFICAR_EMAIL en la línea 20.");
  }
  GmailApp.sendEmail(
    emailDestino,
    "🎨 Prueba directa de notificación - Archivo José Luis",
    "¡Hola Olmo!\n\nSi estás leyendo esto, la notificación por correo funciona perfectamente."
  );
  Logger.log("¡Correo enviado con éxito a " + emailDestino + "!");
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Receptor del Archivo José Luis Gutiérrez activo y listo."
  })).setMimeType(ContentService.MimeType.JSON);
}
