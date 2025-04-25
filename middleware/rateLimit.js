const rateLimit = require("express-rate-limit");

module.exports = (apiMeta) => {
  const { rate_limit } = apiMeta;
  const requestsPerMinute = rate_limit?.requests_per_minute || 60;

  return rateLimit({
    windowMs: 60 * 1000, 
    max: requestsPerMinute,
    message: { error: "Too many requests, please try again later" }
  });
};