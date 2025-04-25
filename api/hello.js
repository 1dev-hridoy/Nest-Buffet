module.exports = {
  meta: {
    name: "Hello World",
    method: "GET",
    path: "/hellos",
    category: "test",
    params: [
      { name: "name", type: "string", required: true, description: "The name to greet" },
      { name: "lang", type: "string", required: false, description: "Language for the greeting (e.g., 'en', 'bn')" },
    ],
  },
  onStart: ({ req, res }) => {
    const { name = "World", lang = "en" } = req.query;
    const greetings = {
      en: `Hello, ${name}!`,
      bn: `ki re, ${name}!`,
    };
    res.json({ message: greetings[lang] || greetings.en });
  },
};