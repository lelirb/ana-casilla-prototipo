# Casilla Electrónica · ANA · Prototipo HTML

Prototipo navegable de la Casilla Electrónica v3 (Autoridad Nacional del Agua, DSNIRH).
Sirve de referencia para estimar y construir. No se conecta a ningún servicio: todos los datos son ficticios.

## Cómo verlo

Abre `prototipo.html` en el navegador. Es la portada y enlaza todos los flujos.
No necesita instalar nada.

## Qué hay en cada archivo

| Archivo | Qué es |
|---|---|
| `ingreso.html` | Ingreso con documento y contraseña |
| `registro.html` | Crear tu cuenta: 6 pasos, términos y cuenta creada |
| `bandeja.html` | Mis trámites (bandeja única), con filtro por procedimiento. En celular, los filtros van en su propia vista |
| `detalle.html` | Detalle de un trámite (VER) |
| `nuevo-documento.html` | Nuevo documento: los 46 procedimientos TUPA y los 5 NO TUPA (con Congreso). Los TUPA sin flujo propio siguen el del TUPA 2 |
| `subsanar.html` | Subsanación de un trámite observado |
| `perfil.html` | Mi perfil: persona natural y persona jurídica |
| `error-*.html`, `sesion-expirada.html`, `servicio-no-disponible.html` | Estados de error |
| `ana.css` | Todos los estilos. Arriba están los tokens: colores, tipografía y espacios |
| `app.js` | Todo el comportamiento de las pantallas |
| `iconos.svg` | Todos los íconos, uno por símbolo, con su nombre |
| `img/` | Logo y fondo del ingreso |

## Accesibilidad

Construido para cumplir WCAG 2.2 nivel AA (Resolución 001-2025-PCM/SGTD).

## Historial

Cada cambio queda guardado con una frase que explica qué cambió. Para ver lo último, revisa la lista de commits.
