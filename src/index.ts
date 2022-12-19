export interface Env {}

const CORS_WORKER_URL = "https://cors-worker.phyzess.workers.dev";

// Cloudflare supports the GET, POST, HEAD, and OPTIONS methods from any origin,
// and allow any header on requests. These headers must be present
// on all responses to all CORS preflight requests. In practice, this means
// all responses to OPTIONS requests.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// The URL for the remote third party API you want to fetch from
// but does not implement CORS
const API_URL = "https://examples.cloudflareworkers.com/demos/demoapi";

// The endpoint you want the CORS reverse proxy to be on
const PROXY_ENDPOINT = "/corsproxy/";

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  let apiUrl = url.searchParams.get("apiurl");

  if (apiUrl == null) {
    apiUrl = API_URL;
  }

  // Rewrite request to point to API URL. This also makes the request mutable
  // so you can add the correct Origin header to make the API server think
  // that this request is not cross-site.
  request = new Request(apiUrl, request);

  request.headers.set("Origin", new URL(apiUrl).origin);

  let response = await fetch(request);

  // Recreate the response so you can modify the headers
  response = new Response(response.body, response);

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", url.origin);

  // Append to/Add Vary header so browser will cache response correctly
  response.headers.append("Vary", "Origin");

  return response;
}

function handleOptions(request: Request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers;
  if (
    headers.get("Origin") !== null
    && headers.get("Access-Control-Request-Method") !== null
    && headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.
    let respHeaders = {
      ...corsHeaders,
      // Allow all future content Request headers to go back to browser
      // such as Authorization (Bearer) or X-Client-Name-Version
      "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),
    };

    return new Response(null, {
      // @ts-ignore
      headers: respHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    });
  }
}

addEventListener("fetch", async (event) => {
  const request = event.request;

  const url = new URL(request.url);
  if (url.pathname.startsWith(PROXY_ENDPOINT)) {
    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      event.respondWith(handleOptions(request));
    } else if (request.method === "GET" || request.method === "HEAD" || request.method === "POST") {
      // Handle requests to the API server
      event.respondWith(handleRequest(request));
    } else {
      event.respondWith(
        new Response(null, {
          status: 405,
          statusText: "Method Not Allowed",
        }),
      );
    }
  } else {
    event.respondWith(
      new Response(null, {
        status: 400,
        statusText: `Request url should be like: "${CORS_WORKER_URL}${PROXY_ENDPOINT}?apiurl={your target url}"`,
      }),
    );
  }
});
