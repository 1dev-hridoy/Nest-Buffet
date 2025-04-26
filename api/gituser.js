const axios = require('axios');

module.exports = {
  meta: {
    name: "GitHub User Info",
    method: "GET",
    path: "/github-user-info",
    category: "utility",
    params: [
      { name: "username", type: "string", required: true, description: "The GitHub username to fetch information for" },
    ],
  },
  onStart: async ({ req, res }) => {

    console.log('Incoming query parameters:', req.query);

  
    const { username = '' } = req.query || {};

    
    if (!username) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameter: username is required.",
        received: { username },
      });
    }

    try {
      
      const githubResponse = await axios.get(`https://api.github.com/users/${username}`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const userData = githubResponse.data;


      const userInfo = {
        username: userData.login,
        name: userData.name || 'N/A',
        bio: userData.bio || 'N/A',
        avatarUrl: userData.avatar_url,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        profileUrl: userData.html_url,
      };


      res.json({
        status: 'success',
        message: 'GitHub user info retrieved successfully!',
        data: userInfo,
      });
    } catch (error) {
      console.error('Error fetching GitHub user info:', error.message);
      res.status(error.response?.status || 500).json({
        status: 'failed',
        error: 'Failed to fetch GitHub user info.',
        details: error.response?.data?.message || error.message,
      });
    }
  },
};