const BASE_INTERNA = "https://interno.invalid"

/**
 * Normaliza un destino de redirección que viene de fuera (query string o campo
 * de formulario) a una ruta interna segura. Devuelve "/" si no lo es.
 *
 * No basta con exigir que empiece por "/": "//evil.com" lo cumple y es una URL
 * protocol-relative, que el navegador resuelve como https://evil.com. Y al
 * resolver, la barra invertida cuenta como barra, así que "/\evil.com" hace lo
 * mismo. En vez de ir tapando formas una a una, se resuelve el destino contra
 * una base propia y se comprueba que no se haya salido de ella.
 */
export function rutaInternaSegura(destino: string | null | undefined): string {
  if (!destino || !destino.startsWith("/")) return "/"

  let url: URL
  try {
    url = new URL(destino, BASE_INTERNA)
  } catch {
    return "/"
  }

  if (url.origin !== BASE_INTERNA) return "/"
  return `${url.pathname}${url.search}${url.hash}`
}
