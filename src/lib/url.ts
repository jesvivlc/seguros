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
 *
 * Y se valida también la salida: al resolver se eliminan los segmentos "..", así
 * que "/..//evil.com" se queda dentro de la base pero sale como "//evil.com".
 */
export function rutaInternaSegura(
  destino: string | string[] | null | undefined
): string {
  // Un parámetro repetido ("?redirect=/a&redirect=/b") llega como array, y
  // entonces `destino.startsWith` no existe: sin esta comprobación es un
  // TypeError sin capturar al renderizar /login, o sea un 500 en una página
  // pública. No es una fuga de origen, pero es trivial de provocar.
  if (typeof destino !== "string" || !destino.startsWith("/")) return "/"

  let url: URL
  try {
    url = new URL(destino, BASE_INTERNA)
  } catch {
    return "/"
  }

  if (url.origin !== BASE_INTERNA) return "/"

  const ruta = `${url.pathname}${url.search}${url.hash}`
  return ruta.startsWith("//") ? "/" : ruta
}
