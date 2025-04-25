module.exports = (req, res, next, apiMeta, logger) => {
    const { roles } = apiMeta;
    const userRole = req.headers["x-user-role"] || "user"; 
  
    if (roles && !roles.includes(userRole)) {
      logger.error(`Unauthorized access attempt by role: ${userRole}`);
      return res.status(403).json({ error: "Unauthorized: Role not permitted" });
    }
  
    next();
  };