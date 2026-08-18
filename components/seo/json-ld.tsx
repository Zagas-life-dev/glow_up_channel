import type { JsonLdObject } from "@/lib/seo/structured-data"

/**
 * Serialize for embedding in a <script> block.
 *
 * Content is operator-supplied and may contain `</script>` or HTML comment
 * markers, either of which would break out of the script element. Escaping the
 * `<` and `&` bytes keeps the payload valid JSON while making breakout
 * impossible.
 */
function serialize(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}

/**
 * Emits schema.org JSON-LD into the server-rendered HTML.
 *
 * This is a server component on purpose: the payload must exist in the initial
 * response so crawlers and AI answer engines see it without executing JS.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const payload = Array.isArray(data) ? data : [data]
  return (
    <>
      {payload.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Serialized above; not user-controlled markup.
          dangerouslySetInnerHTML={{ __html: serialize(entry) }}
        />
      ))}
    </>
  )
}

export default JsonLd
