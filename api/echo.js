module.exports = {
    meta: {
      name: "Query Processor",
      method: "POST",
      path: "/query",
      category: "utils",
      params: [
        { name: "api", type: "string", required: true, description: "The API endpoint identifier" },
        { name: "question", type: "string", required: true, description: "The question to process" },
        { name: "language", type: "string", required: true, description: "The language code (e.g., 'bn')" },
      ],
    },
    onStart: ({ req, res, logger }) => {
      const { api, question, language } = req.body;

      if (!api || !question || !language) {
        const missingFields = [];
        if (!api) missingFields.push("api");
        if (!question) missingFields.push("question");
        if (!language) missingFields.push("language");
        logger.error(`Missing required fields: ${missingFields.join(", ")}`);
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
      }
  
      const timestamp = new Date().toISOString();
      res.json({
        received: { api, question, language },
        timestamp,
      });
    },
  };