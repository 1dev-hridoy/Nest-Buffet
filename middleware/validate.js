module.exports = (req, res, next, meta, logger) => {
  const params = meta.params || [];
  const errors = [];


  logger.info(`Validating request body: ${JSON.stringify(req.body)}`);

  params.forEach(param => {
    const value = req.method === "GET" ? req.query[param.name] : req.body[param.name];
    if (param.required && (value === undefined || value === null)) {
      errors.push(`Missing required parameter: ${param.name}`);
    } else if (param.required && typeof value === "string" && value.trim() === "") {
      errors.push(`Parameter ${param.name} cannot be an empty string`);
    }
  });

  if (errors.length > 0) {
    logger.error(`Validation failed: ${errors.join(", ")}`);
    return res.status(400).json({ error: errors.join(", ") });
  }

  next();
};