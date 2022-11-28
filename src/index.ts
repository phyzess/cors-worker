export interface Env {}

const handleRequest = async (request: Request) => {
  try {
    const url = new URL(request.url);

    if (url.pathname === "/")
      return new Response(`
        Usage:\n
          ${url.origin}/<url>
      `);

    let response = await fetch(request.url.slice(url.origin.length + 1), {
        method: request.method,
        headers: request.headers,
        redirect: "follow",
        body: request.body
    });
    response = new Response(response.body, response)
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } catch (e) {
    return new Response((e as any).stack || e, {status: 500});
  }
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		return handleRequest(request)
	},
};
