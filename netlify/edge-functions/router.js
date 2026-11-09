// Netlify Edge Function: roteia por host (subdomínio) para a página correta.
// Roda no edge (Deno) antes dos redirects estáticos.

export default async (request, context) => {
  const host = (request.headers.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  const url = new URL(request.url);

  // Subdomínio painel → painel.html
  if (host === "painel.padocadiskpizza.com.br") {
    if (url.pathname === "/" || url.pathname === "") {
      return context.rewrite("/painel.html");
    }
  }

  // Subdomínio clientes → clientes.html
  if (host === "clientes.padocadiskpizza.com.br") {
    if (url.pathname === "/" || url.pathname === "") {
      return context.rewrite("/clientes.html");
    }
  }

  // Paths curtos no domínio principal
  if (host === "padocadiskpizza.com.br" || host === "www.padocadiskpizza.com.br") {
    if (url.pathname === "/painel") {
      return context.rewrite("/painel.html");
    }
    if (url.pathname === "/clientes") {
      return context.rewrite("/clientes.html");
    }
  }

  return context.next();
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/.netlify/*", "/img/*", "/manifest.json", "/sw.js", "/config.js"],
};