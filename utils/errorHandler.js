module.exports = (err, req, res, next, logger) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  };