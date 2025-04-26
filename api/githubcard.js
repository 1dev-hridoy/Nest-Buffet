const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');
require('dotenv').config();


const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}


const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
if (!IMGBB_API_KEY) {
  throw new Error('IMGBB_API_KEY is not defined in the .env file');
}


function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  return ctx;
}


function drawStat(ctx, icon, label, value, x, y, textColor, accentColor) {
  ctx.save();
  

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = accentColor;
  ctx.fillText(icon, x, y);
  

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = textColor;
  ctx.fillText(value.toString(), x + 25, y);
  

  ctx.font = '14px Arial';
  ctx.fillStyle = textColor;
  ctx.fillText(label, x + 25 + ctx.measureText(value.toString()).width + 5, y);
  
  ctx.restore();
}


function abbreviateNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num;
}


function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  
  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  
  return truncated + '...';
}

module.exports = {
  meta: {
    name: "GitHub Card Generator",
    method: "GET",
    path: "/github-card",
    category: "utility",
    params: [
      { name: "username", type: "string", required: true, description: "GitHub username" },
      { name: "theme", type: "string", required: false, description: "Card theme: 'dark', 'light', 'github-dark', 'github-light', or 'neon'" },
    ],
  },
  onStart: async ({ req, res }) => {

    console.log('Incoming query parameters:', req.query);


    const { 
      username = '', 
      theme = 'github-dark'
    } = req.query || {};


    if (!username) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameter: username is required.",
        received: { username, theme },
      });
    }

    let filePath; 

    try {

      console.log(`Fetching GitHub data for user: ${username}`);
      const userResponse = await axios.get(`https://api.github.com/users/${username}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Card-Generator'
        }
      });
      
      const userData = userResponse.data;
      
 
      const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Card-Generator'
        }
      });
      
      const reposData = reposResponse.data;
      
   
      const totalStars = reposData.reduce((acc, repo) => acc + repo.stargazers_count, 0);
      
   
      const languages = {};
      reposData.forEach(repo => {
        if (repo.language && !repo.fork) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });
      

      const topLanguages = Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lang]) => lang);
      

      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');


      let primaryColor, secondaryColor, textColor, accentColor, bgColor;
      
      switch(theme) {
        case 'dark':
          bgColor = '#121212';
          primaryColor = '#1E1E1E';
          secondaryColor = '#2D2D2D';
          textColor = '#FFFFFF';
          accentColor = '#58A6FF';
          break;
        
        case 'light':
          bgColor = '#F5F5F5';
          primaryColor = '#FFFFFF';
          secondaryColor = '#E0E0E0';
          textColor = '#24292E';
          accentColor = '#0366D6';
          break;
          
        case 'github-light':
          bgColor = '#FFFFFF';
          primaryColor = '#F6F8FA';
          secondaryColor = '#E1E4E8';
          textColor = '#24292E';
          accentColor = '#0366D6';
          break;
          
        case 'neon':
          bgColor = '#0F0F2D';
          primaryColor = '#1A1A3A';
          secondaryColor = '#252550';
          textColor = '#FFFFFF';
          accentColor = '#00FFFF';
          break;
          
        case 'github-dark':
        default:
          bgColor = '#0D1117';
          primaryColor = '#161B22';
          secondaryColor = '#21262D';
          textColor = '#C9D1D9';
          accentColor = '#58A6FF';
      }

 
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 800, 400);

     
      if (theme !== 'neon') {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.03;
        
        for (let x = 0; x < 800; x += 20) {
          for (let y = 0; y < 400; y += 20) {
            if ((x + y) % 40 === 0) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(x, y, 10, 10);
            }
          }
        }
        
        ctx.restore();
      }


      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.font = '180px Arial';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('{ }', 400, 200);
      ctx.restore();


      ctx.save();
      roundRect(ctx, 40, 40, 720, 320, 16);
      
      if (theme === 'neon') {
   
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
    
        ctx.fillStyle = primaryColor;
      } else {
   
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;
      }
      
      ctx.fill();
      ctx.restore();

   
      const avatarResponse = await axios.get(userData.avatar_url, { responseType: 'arraybuffer' });
      const avatarBuffer = Buffer.from(avatarResponse.data, 'binary');
      const avatar = await loadImage(avatarBuffer);

    
      const avatarX = 120;
      const avatarY = 140;
      const avatarRadius = 70;
      
      const imgWidth = avatar.width;
      const imgHeight = avatar.height;
      
  
      const scale = (avatarRadius * 2) / Math.min(imgWidth, imgHeight);
      

      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
  
      const imgX = avatarX - (scaledWidth / 2);
      const imgY = avatarY - (scaledHeight / 2);

   
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
      ctx.closePath();
      

      if (theme === 'neon') {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.clip();
      

      ctx.drawImage(avatar, imgX, imgY, scaledWidth, scaledHeight);
      ctx.restore();

     
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2, true);
      
      if (theme === 'neon') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
      }
      
      ctx.stroke();
      ctx.restore();

   
      ctx.save();
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = theme === 'neon' ? accentColor : textColor;
      ctx.textAlign = 'center';
      ctx.fillText('{ }', avatarX, avatarY + avatarRadius + 30);
      ctx.restore();

   
      ctx.save();
      
     
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      
    
      const displayName = userData.name ? truncateText(ctx, userData.name, 300) : username;
      
      if (theme === 'neon') {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.fillText(displayName, 220, 110);
      } else {
        ctx.fillText(displayName, 220, 110);
      }
      
  
      ctx.font = '18px Arial';
      ctx.fillStyle = theme === 'neon' ? accentColor : (theme.includes('light') ? '#6A737D' : '#8B949E');
      ctx.fillText(`@${username}`, 220, 140);
      
      ctx.restore();

      if (userData.bio) {
        ctx.save();
        ctx.font = '16px Arial';
        ctx.fillStyle = textColor;
        

        const maxWidth = 500;
        const lineHeight = 22;
        let words = userData.bio.split(' ');
        let line = '';
        let y = 180;
        
        for (let i = 0; i < words.length; i++) {
          let testLine = line + words[i] + ' ';
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line.trim(), 220, y);
            line = words[i] + ' ';
            y += lineHeight;
            
         
            if (y > 180 + lineHeight) {
              if (i < words.length - 1) {
                ctx.fillText(truncateText(ctx, line.trim() + '...', maxWidth), 220, y);
                break;
              } else {
                ctx.fillText(line.trim(), 220, y);
              }
              break;
            }
          } else {
            line = testLine;
          }
        }
        
        if (y <= 180 + lineHeight) {
          ctx.fillText(line.trim(), 220, y);
        }
        
        ctx.restore();
      }

    
      ctx.save();
      
  
      roundRect(ctx, 220, 230, 500, 100, 10);
      ctx.fillStyle = secondaryColor;
      ctx.fill();
      
     
      const statsY = 270;
      const statsSpacing = 165;
      
   
      drawStat(ctx, '📦', 'Repos', userData.public_repos, 250, statsY, textColor, accentColor);
      
  
      drawStat(ctx, '👥', 'Followers', abbreviateNumber(userData.followers), 250 + statsSpacing, statsY, textColor, accentColor);
      
     
      drawStat(ctx, '⭐', 'Stars', abbreviateNumber(totalStars), 250 + statsSpacing * 2, statsY, textColor, accentColor);
      
      ctx.restore();

      if (topLanguages.length > 0) {
        ctx.save();
        
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = textColor;
        ctx.fillText('Top Languages:', 80, 240);
        
  
        const langY = 270;
        const langSpacing = 30;
  
        const langColors = {
          'JavaScript': '#F1E05A',
          'TypeScript': '#3178C6',
          'Python': '#3572A5',
          'Java': '#B07219',
          'C#': '#178600',
          'PHP': '#4F5D95',
          'C++': '#F34B7D',
          'Ruby': '#701516',
          'Go': '#00ADD8',
          'Swift': '#F05138',
          'Kotlin': '#A97BFF',
          'Rust': '#DEA584',
          'Dart': '#00B4AB',
          'HTML': '#E34C26',
          'CSS': '#563D7C',
          'Shell': '#89E051'
        };
        
        topLanguages.forEach((lang, index) => {
       
          const badgeWidth = ctx.measureText(lang).width + 20;
          const badgeX = 80;
          const badgeY = langY + (index * langSpacing);
      
          roundRect(ctx, badgeX, badgeY - 15, badgeWidth, 20, 10);
          ctx.fillStyle = langColors[lang] || '#858585';
          ctx.fill();
          
          
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '14px Arial';
          ctx.fillText(lang, badgeX + 10, badgeY);
        });
        
        ctx.restore();
      }

   
      ctx.save();
      ctx.font = '14px Arial';
      ctx.fillStyle = theme === 'neon' ? textColor : (theme.includes('light') ? '#6A737D' : '#8B949E');
      
      let infoY = 340;
      const infoSpacing = 20;
      
      if (userData.location) {
        ctx.fillText(`📍 ${userData.location}`, 220, infoY);
        infoY += infoSpacing;
      }
      
      if (userData.company) {
        ctx.fillText(`🏢 ${userData.company}`, 220, infoY);
        infoY += infoSpacing;
      }
      
      if (userData.blog) {
        const blog = userData.blog.startsWith('http') ? userData.blog : `https://${userData.blog}`;
        ctx.fillStyle = accentColor;
        ctx.fillText(`🔗 ${truncateText(ctx, userData.blog, 300)}`, 220, infoY);
      }
      
      ctx.restore();

    
      ctx.save();
      ctx.font = '14px Arial';
      ctx.fillStyle = theme === 'neon' ? textColor : (theme.includes('light') ? '#6A737D' : '#8B949E');
      ctx.textAlign = 'right';
      
      const joinDate = new Date(userData.created_at);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
      
      ctx.fillText(`Joined GitHub: ${joinMonth} ${joinYear}`, 720, 340);
      ctx.restore();

 
      ctx.save();
      ctx.font = '12px Arial';
      ctx.fillStyle = theme === 'light' || theme === 'github-light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'right';
      ctx.fillText('Generated with GitHub Card Generator', 720, 370);
      ctx.restore();


      const fileName = `${uuidv4()}.png`;
      filePath = path.join(tempDir, fileName);

     
      const stream = canvas.createPNGStream();
      const out = fs.createWriteStream(filePath);
      stream.pipe(out);

   
      await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
      });

 
      const imageData = fs.readFileSync(filePath);
      const base64Image = imageData.toString('base64');

 
      const formData = new FormData();
      formData.append('image', base64Image);
      formData.append('key', IMGBB_API_KEY);


      const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      const imgbbData = imgbbResponse.data;

    
      if (!imgbbData.success || !imgbbData.data || !imgbbData.data.url) {
        throw new Error(`ImgBB upload failed: ${imgbbData.error?.message || 'Unknown error'}`);
      }

     
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted local file ${filePath}`);
      } catch (deleteError) {
        console.error(`Error deleting local file ${filePath}:`, deleteError.message);

      }

   
      res.json({
        status: 'success',
        message: 'GitHub card generated and uploaded to ImgBB successfully!',
        imageUrl: imgbbData.data.url,
        githubData: {
          username: userData.login,
          name: userData.name,
          followers: userData.followers,
          following: userData.following,
          publicRepos: userData.public_repos,
          totalStars: totalStars,
          topLanguages: topLanguages
        }
      });
    } catch (error) {
      console.error('Error generating or uploading GitHub card:', error.message);

 
      if (error.response && error.response.status === 404) {
        return res.status(404).json({
          status: 'failed',
          error: 'GitHub user not found.',
          details: `The username "${req.query.username}" does not exist on GitHub.`
        });
      }

     
      if (error.response && error.response.status === 403) {
        return res.status(403).json({
          status: 'failed',
          error: 'GitHub API rate limit exceeded.',
          details: 'Please try again later.'
        });
      }

      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted local file ${filePath} after error`);
        } catch (deleteError) {
          console.error(`Error deleting local file ${filePath} after error:`, deleteError.message);
        }
      }

      res.status(500).json({
        status: 'failed',
        error: 'Failed to generate or upload GitHub card.',
        details: error.message,
      });
    }
  },
};