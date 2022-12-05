export const errorHandler = (e, req, res, next) => {
  res.status(e.status || 500);
  res.send({
    error: {
      status: e.status || 500,
      message: e.message,
    },
  });
};
