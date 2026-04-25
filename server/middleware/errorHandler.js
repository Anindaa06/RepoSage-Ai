export const errorHandler = (err, _req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Something went wrong";

  // eslint-disable-next-line no-console
  console.error("[RepoSage Error]", err);

  if (res.headersSent) {
    return;
  }

  res.status(status).json({
    error: message
  });
};
