# ▶ Unframe — reproductor limpio, sin anuncios

Extensión de navegador que encuentra el reproductor de vídeo incrustado (`<iframe>`) en webs llenas de anuncios y lo abre **directamente en una pestaña limpia**, sin publicidad ni pop-ups.

Browser extension that pulls the embedded video player out of ad-heavy pages and opens it in a clean tab.

## Características

- **Un clic**: abre el popup y pulsa **▶ Abrir el mejor vídeo**.
- Detecta todos los servidores de la página (Streamtape, Streamwish, VOE, Filemoon, Mixdrop, Mp4upload, Doodstream, Mega…), incluso los que aún no se han cargado, leyendo los datos de la página (texto plano o base64).
- Por cada resultado: **Abrir**, **Copiar enlace** y **Copiar iframe** (`<iframe ... src="...">`).
- Decodifica enlaces en base64 incluidos como parámetro de la URL.
- Los enlaces que no parecen vídeo (anuncios, comentarios…) quedan ocultos tras «Mostrar otros enlaces».
- Tema claro/oscuro automático. Sin servidores externos, sin telemetría: todo ocurre en tu navegador.

## Instalación

### Opera GX / Chrome / Edge / Brave (Chromium)
1. Abre `opera://extensions` (en Chrome: `chrome://extensions`).
2. Activa **Modo desarrollador** (arriba a la derecha).
3. Pulsa **Cargar descomprimida** y elige la carpeta del proyecto (la que contiene `manifest.json`).
4. Pulsa el icono del puzle de la barra y fija Unframe con el pin para tenerlo a mano.

> No borres ni muevas la carpeta: Opera la lee desde ahí.

### Firefox (temporal, para probar)
1. Copia `manifest.firefox.json` sobre `manifest.json` (o cárgalo renombrado).
2. Abre `about:debugging#/runtime/this-firefox` → **Cargar complemento temporal…** y elige `manifest.json`.

## Uso

1. Entra en la página del episodio/vídeo.
2. Pulsa el icono de la extensión.
3. Pulsa **Abrir el mejor vídeo**, o elige otro servidor de la lista.
4. Si cambias de servidor dentro de la página, pulsa **⟳** para volver a buscar.

## Añadir más servidores

Edita la lista `VIDEO_HOSTS` en `popup.js` y añade un fragmento del dominio.

## Permisos

- `activeTab` + `scripting`: solo se analiza la pestaña activa cuando pulsas el icono.

## Aviso

Úsala solo para ver contenido al que tengas derecho a acceder. No elude pagos ni DRM: solo abre un reproductor que la página ya incrusta.

## Licencia

MIT
