// api/prep-dashboard/checklists/[...path].js
// Catch-all route for checklist sub-paths

import handler from './index.js';

export default async function catchAllHandler(req, res) {
  // Pass the path segments to the main handler
  req.query.path = req.query.path || [];
  return handler(req, res);
}
