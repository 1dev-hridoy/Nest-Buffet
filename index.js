const express = require("express");
const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");
const errorHandler = require("./utils/errorHandler");
const authMiddleware = require("./middleware/auth");
const rateLimitMiddleware = require("./middleware/rateLimit");
const validateMiddleware = require("./middleware/validate");
const figlet = require("figlet");

const app = express();
const PORT = process.env.PORT || 3000;

const settings = require("./public/server/settings.json");


const apiCalls = {
  totalCallsToday: 0,
  peakCallsPerMinute: 0,
  callsByMinute: {},
};


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  console.log('Incoming Request:');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);


  if (!req.url.startsWith("/api/metadata")) {
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;
    apiCalls.callsByMinute[minuteKey] = (apiCalls.callsByMinute[minuteKey] || 0) + 1;
    apiCalls.totalCallsToday += 1;
    const currentPeak = Object.values(apiCalls.callsByMinute).reduce((max, calls) => Math.max(max, calls), 0);
    apiCalls.peakCallsPerMinute = currentPeak;
  }

  next();
});


app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error('Invalid JSON payload:', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});


app.use(express.static("public"));


const apiDir = path.join(__dirname, "api");
const API_PREFIX = "/api";
const loadedApis = [];

const loadApis = (directory, prefix = "") => {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      loadApis(fullPath, `${prefix}/${file}`);
    } else if (file.endsWith(".js")) {
      const api = require(fullPath);
      const { meta, onStart } = api;
      const method = meta.method.toLowerCase();
      const [basePath] = meta.path.split("?");
      const endpoint = `${API_PREFIX}${prefix}${basePath}`;

      app[method](
        endpoint,
        rateLimitMiddleware(meta),
        (req, res, next) => authMiddleware(req, res, next, meta, logger),
        (req, res, next) => {
          console.log("Body before validation:", req.body); 
          next();
        },
        (req, res, next) => validateMiddleware(req, res, next, meta, logger),
        (req, res) => onStart({ req, res, logger })
      );

      loadedApis.push({ 
        name: meta.name, 
        method: method.toUpperCase(), 
        endpoint, 
        category: meta.category || "uncategorized", 
        params: meta.params || [] 
      });
      logger.info(`Loaded API: ${method.toUpperCase()} ${endpoint}`);
    }
  });
};

loadApis(apiDir);


app.get("/api/metadata", (req, res) => {
  const categorizedApis = {};

  loadedApis.forEach(api => {
    const category = api.category || "uncategorized";
    if (!categorizedApis[category]) {
      categorizedApis[category] = [];
    }
    categorizedApis[category].push(api);
  });

  const stats = {
    totalApis: loadedApis.length,
    getApis: loadedApis.filter(api => api.method === "GET").length,
    postApis: loadedApis.filter(api => api.method === "POST").length,
    apiCalls: {
      totalCallsToday: apiCalls.totalCallsToday,
      peakCallsPerMinute: apiCalls.peakCallsPerMinute,
    },
  };

  res.json({
    categories: categorizedApis,
    stats,
  });
});


app.use((err, req, res, next) => errorHandler(err, req, res, next, logger));


app.listen(PORT, async () => {
  const gradient = (await import("gradient-string")).default;
  const chalk = (await import("chalk")).default;

  figlet.text(settings.name, { font: "Standard" }, (err, data) => {
    if (err) {
      console.log("Error generating ASCII art:", err);
      return;
    }

    const gradientColors = gradient("cyan", "magenta", "yellow");
    console.log(gradientColors(data));

    console.log(chalk.bold.cyan(`Version: ${settings.version}`));
    console.log(chalk.bold.magenta(`Operator: ${settings.apiSettings.operator}`));
    console.log(chalk.bold.yellow(`Port: ${PORT}`));

    console.log(chalk.bold.green("\nLoaded APIs:"));
    loadedApis.forEach(api => {
      console.log(
        chalk.green(`- ${api.name} (${api.method} ${api.endpoint})`)
      );
    });
  });

  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Name: ${settings.name}, Version: ${settings.version}`);
});