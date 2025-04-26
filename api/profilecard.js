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


function drawSocialIcon(ctx, platform, x, y, size) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Arial';
  

  switch(platform.toLowerCase()) {
    case 'twitter':
      ctx.fillText('@', x, y + size/2 + 5);
      break;
    case 'github':
      ctx.font = 'bold 18px Arial';
      ctx.fillText('{ }', x, y + size/2 + 5);
      break;
    case 'linkedin':
      ctx.font = 'bold 18px Arial';
      ctx.fillText('in', x, y + size/2 + 5);
      break;
    case 'instagram':
      roundRect(ctx, x, y, size, size, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      ctx.fillText(platform.charAt(0).toUpperCase(), x, y + size/2 + 5);
  }
  ctx.restore();
}

module.exports = {
  meta: {
    name: "Profile Card Generator",
    method: "GET",
    path: "/profile-card",
    category: "utility",
    params: [
      { name: "avatarUrl", type: "string", required: true, description: "URL of the user's avatar image" },
      { name: "name", type: "string", required: true, description: "User's name to display on the card" },
      { name: "bio", type: "string", required: true, description: "A short bio or description" },
      { name: "socialLinks", type: "string", required: false, description: "JSON string of social media links (e.g., {\"twitter\": \"https://twitter.com/user\", \"github\": \"https://github.com/user\"})" },
      { name: "theme", type: "string", required: false, description: "Card theme: 'gradient', 'dark', 'light', or 'neon'" },
    ],
  },
  onStart: async ({ req, res }) => {
 
    console.log('Incoming query parameters:', req.query);

    
    const { 
      avatarUrl = '', 
      name = '', 
      bio = '', 
      socialLinks = '',
      theme = 'gradient' 
    } = req.query || {};

   
    if (!avatarUrl || !name || !bio) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameters: avatarUrl, name, and bio are required.",
        received: { avatarUrl, name, bio, socialLinks, theme },
      });
    }


    let parsedSocialLinks = {};
    if (socialLinks) {
      try {
        parsedSocialLinks = JSON.parse(socialLinks);
        if (typeof parsedSocialLinks !== 'object' || parsedSocialLinks === null) {
          throw new Error('socialLinks must be a valid JSON object');
        }
      } catch (error) {
        return res.status(400).json({
          status: 'failed',
          error: "Invalid socialLinks parameter: must be a valid JSON string.",
          details: error.message,
        });
      }
    }

    let filePath; 

    try {

      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');


      let primaryColor, secondaryColor, textColor, accentColor;
      
      switch(theme) {
        case 'dark':

          ctx.fillStyle = '#121212';
          ctx.fillRect(0, 0, 800, 400);
          primaryColor = '#121212';
          secondaryColor = '#1E1E1E';
          textColor = '#FFFFFF';
          accentColor = '#BB86FC';
          break;
        
        case 'light':
        
          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(0, 0, 800, 400);
          primaryColor = '#F5F5F5';
          secondaryColor = '#E0E0E0';
          textColor = '#121212';
          accentColor = '#6200EE';
          break;
          
        case 'neon':
      
          ctx.fillStyle = '#0F0F2D';
          ctx.fillRect(0, 0, 800, 400);
          
     
          const neonGradient = ctx.createRadialGradient(400, 200, 10, 400, 200, 400);
          neonGradient.addColorStop(0, 'rgba(255, 0, 255, 0.3)');
          neonGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
          neonGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = neonGradient;
          ctx.fillRect(0, 0, 800, 400);
          
          primaryColor = '#0F0F2D';
          secondaryColor = '#1A1A3A';
          textColor = '#FFFFFF';
          accentColor = '#FF00FF';
          break;
          
        default:
      
          const gradient = ctx.createLinearGradient(0, 0, 800, 400);
          gradient.addColorStop(0, '#4158D0');
          gradient.addColorStop(0.46, '#C850C0');
          gradient.addColorStop(1, '#FFCC70');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 800, 400);
          primaryColor = '#4158D0';
          secondaryColor = '#C850C0';
          textColor = '#FFFFFF';
          accentColor = '#FFCC70';
      }

     
      if (theme === 'gradient' || theme === 'neon') {
     
        for (let i = 0; i < 15; i++) {
          const x = Math.random() * 800;
          const y = Math.random() * 400;
          const radius = Math.random() * 20 + 5;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
          ctx.fill();
        }
      }

    
      ctx.save();
      roundRect(ctx, 40, 40, 720, 320, 20);
      
      if (theme === 'neon') {
     
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
      
        ctx.fillStyle = 'rgba(10, 10, 40, 0.7)';
      } else {
   
        ctx.fillStyle = theme === 'gradient' ? 'rgba(0, 0, 0, 0.2)' : secondaryColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
      }
      
      ctx.fill();
      ctx.restore();

      const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
      const avatarBuffer = Buffer.from(avatarResponse.data, 'binary');
      const avatar = await loadImage(avatarBuffer);


      const avatarX = 120;
      const avatarY = 200;  
      const avatarRadius = 80;
      
      const imgWidth = avatar.width;
      const imgHeight = avatar.height;
      
e
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
        ctx.shadowBlur = 20;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.clip();
      
 
      ctx.drawImage(avatar, imgX, imgY, scaledWidth, scaledHeight);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2, true);
      
      if (theme === 'neon') {
 
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 15;
      } else {

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 5;
      }
      
      ctx.stroke();
      ctx.restore();

   
      if (theme !== 'light') {
        ctx.save();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const x = avatarX + Math.cos(angle) * (avatarRadius + 20);
          const y = avatarY + Math.sin(angle) * (avatarRadius + 20);
          const size = 5;
          
          ctx.beginPath();
          if (i % 2 === 0) {
            ctx.arc(x, y, size, 0, Math.PI * 2);
          } else {
            ctx.rect(x - size/2, y - size/2, size, size);
          }
          
          ctx.fillStyle = accentColor;
          ctx.fill();
        }
        ctx.restore();
      }

      
      ctx.save();
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      
      if (theme === 'neon') {
 
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.fillText(name, 250, 120);
        
  
        ctx.shadowBlur = 20;
        ctx.fillText(name, 250, 120);
      } else {
       
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(name, 250, 120);
      }
      ctx.restore();

  
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(250, 135);
      ctx.lineTo(700, 135);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      
      if (theme === 'neon') {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
      }
      
      ctx.stroke();
      ctx.restore();


      ctx.save();
      ctx.font = '20px Arial';
      ctx.fillStyle = textColor;
      

      const maxWidth = 450;
      const lineHeight = 28;
      let words = bio.split(' ');
      let line = '';
      let y = 170;
      
      for (let i = 0; i < words.length; i++) {
        let testLine = line + words[i] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), 250, y);
          line = words[i] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 250, y);
      ctx.restore();


      if (Object.keys(parsedSocialLinks).length > 0) {
        y += 40; 
        
        ctx.save();
        ctx.font = '18px Arial';
        
 
        roundRect(ctx, 250, y - 10, 450, 80, 10);
        ctx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        
  
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = textColor;
        ctx.fillText('Connect with me:', 270, y + 20);
  
        let iconX = 270;
        const iconY = y + 40;
        const iconSize = 24;
        const iconSpacing = 100;
        
        Object.entries(parsedSocialLinks).forEach(([platform, url], index) => {
    
          drawSocialIcon(ctx, platform, iconX, iconY - iconSize/2, iconSize);
          

          ctx.fillStyle = theme === 'neon' ? accentColor : textColor;
          ctx.font = '16px Arial';
          ctx.fillText(platform, iconX + 30, iconY + 5);
          
          iconX += iconSpacing;
     
          if (iconX > 600) {
            iconX = 270;
            y += 40;
          }
        });
        
        ctx.restore();
      }

     
      if (theme !== 'neon') {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.05;
        
     
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
      ctx.font = '12px Arial';
      ctx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'right';
      ctx.fillText('Generated with Profile Card Generator', 760, 380);
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
        message: 'Profile card generated and uploaded to ImgBB successfully!',
        imageUrl: imgbbData.data.url, 
        theme: theme
      });
    } catch (error) {
      console.error('Error generating or uploading profile card:', error.message);

 
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
        error: 'Failed to generate or upload profile card.',
        details: error.message,
      });
    }
  },
};