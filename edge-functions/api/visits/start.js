import { errorResponse, handleCors, json, startVisit } from "../../lib/visitAnalytics.js";
export async function onRequest(context) {
  const cors = await handleCors(context.request, context.env);
  if (cors instanceof Response) return cors;
  try { return json({ succeeded: true, record: await startVisit(context.request, context.env) }, 201, cors); }
  catch (error) { return errorResponse(error, cors); }
}
