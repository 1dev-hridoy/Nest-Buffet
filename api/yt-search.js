const yts = require('yt-search');

module.exports = {
  meta: {
    name: "YouTube Video Search",
    method: "GET",
    path: "/youtube-video-search",
    category: "utility",
    params: [
      { name: "query", type: "string", required: true, description: "The video name or search term to look up" },
    ],
  },
  onStart: async ({ req, res }) => {
   
    console.log('Incoming query parameters:', req.query);


    const { query = '' } = req.query || {};


    if (!query) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameter: query is required.",
        received: { query },
      });
    }

    try {
  
      const searchResults = await yts(query);


      const videos = searchResults.videos.slice(0, 5);

    
      const formattedVideos = videos.map(video => ({
        title: video.title,
        duration: video.timestamp,
        views: video.views,
        author: video.author.name,
        url: video.url,
        thumbnail: video.thumbnail,
      }));

   
      res.json({
        status: 'success',
        message: 'YouTube video search completed successfully!',
        data: formattedVideos,
      });
    } catch (error) {
      console.error('Error searching for YouTube videos:', error.message);
      res.status(500).json({
        status: 'failed',
        error: 'Failed to search for YouTube videos.',
        details: error.message,
      });
    }
  },
};