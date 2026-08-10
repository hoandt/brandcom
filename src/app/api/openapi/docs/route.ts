const swaggerPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Auria Orders API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; background: #faf8f7; }
      .swagger-ui .topbar { background: #b51f30; padding: 12px 0; }
      .swagger-ui .topbar-wrapper::before { content: "AURIA"; color: white; font: 700 22px Georgia, serif; letter-spacing: .16em; }
      .swagger-ui .topbar-wrapper img, .swagger-ui .topbar-wrapper .link span { display: none; }
      .swagger-ui .info .title, .swagger-ui .opblock-tag { font-family: Georgia, serif; }
      .swagger-ui .btn.authorize { border-color: #b51f30; color: #b51f30; }
      .swagger-ui .btn.authorize svg { fill: #b51f30; }
      .swagger-ui .opblock.opblock-post { border-color: #b51f30; background: rgba(181, 31, 48, .05); }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #b51f30; }
      .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #b51f30; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.addEventListener("load", function () {
        SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          filter: true,
          persistAuthorization: false,
          tryItOutEnabled: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: "StandaloneLayout"
        });
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(swaggerPage, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'",
    },
  });
}
