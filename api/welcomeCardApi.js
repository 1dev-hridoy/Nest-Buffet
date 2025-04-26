const { createCanvas, loadImage, registerFont } = require('canvas');
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
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawConfetti(ctx, width, height, count) {
  const colors = ['#FF5252', '#FFD740', '#64FFDA', '#448AFF', '#E040FB', '#69F0AE'];

  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 10 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const rotation = Math.random() * Math.PI * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;

    const shape = Math.floor(Math.random() * 3);
    if (shape === 0) {

      ctx.fillRect(-size/2, -size/4, size, size/2);
    } else if (shape === 1) {

      ctx.beginPath();
      ctx.arc(0, 0, size/2, 0, Math.PI * 2);
      ctx.fill();
    } else {

      ctx.beginPath();
      ctx.moveTo(0, -size/2);
      ctx.lineTo(size/2, size/2);
      ctx.lineTo(-size/2, size/2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

module.exports = {
  meta: {
    name: "Welcome Card",
    method: "GET",
    path: "/welcome-card",
    category: "utility",
    params: [
      { name: "imageUrl", type: "string", required: true, description: "URL of the image to display on the card (e.g., profile picture)" },
      { name: "name", type: "string", required: true, description: "The name to display on the card" },
      { name: "welcomeText", type: "string", required: true, description: "The welcome message to display on the card" },
      { name: "theme", type: "string", required: false, description: "Card theme: 'cosmic', 'ocean', 'sunset', 'forest' (default: 'cosmic')" },
    ],
  },
  onStart: async ({ req, res }) => {

    console.log('Incoming query parameters:', req.query);

    const { 
      imageUrl = '', 
      name = '', 
      welcomeText = '',
      theme = 'cosmic'
    } = req.query || {};

    if (!imageUrl || !name || !welcomeText) {
      return res.status(400).json({
        error: "Missing required parameters: imageUrl, name, and welcomeText are required.",
        received: { imageUrl, name, welcomeText },
      });
    }

    let filePath; 

    try {

      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');

      let primaryColor, secondaryColor, accentColor, bgPattern;
      switch (theme.toLowerCase()) {
        case 'ocean':
          primaryColor = '#1A237E';
          secondaryColor = '#0277BD';
          accentColor = '#00BCD4';
          bgPattern = 'waves';
          break;
        case 'sunset':
          primaryColor = '#BF360C';
          secondaryColor = '#FF9800';
          accentColor = '#FFEB3B';
          bgPattern = 'rays';
          break;
        case 'forest':
          primaryColor = '#1B5E20';
          secondaryColor = '#388E3C';
          accentColor = '#8BC34A';
          bgPattern = 'leaves';
          break;
        case 'cosmic':
        default:
          primaryColor = '#311B92';
          secondaryColor = '#6A1B9A';
          accentColor = '#E040FB';
          bgPattern = 'stars';
          break;
      }

      ctx.fillStyle = primaryColor;
      ctx.fillRect(0, 0, 800, 400);

      if (bgPattern === 'stars') {

        for (let i = 0; i < 50; i++) {
          const x = Math.random() * 800;
          const y = Math.random() * 400;
          const size = Math.random() * 2 + 1;
          drawStar(ctx, x, y, 5, size * 2, size, `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`);
        }

        for (let i = 0; i < 10; i++) {
          const x = Math.random() * 800;
          const y = Math.random() * 400;
          const size = Math.random() * 4 + 3;
          drawStar(ctx, x, y, 5, size * 2, size, accentColor);
        }

        const gradient = ctx.createRadialGradient(400, 200, 50, 400, 200, 400);
        gradient.addColorStop(0, 'rgba(106, 27, 154, 0.8)');
        gradient.addColorStop(0.5, 'rgba(106, 27, 154, 0.3)');
        gradient.addColorStop(1, 'rgba(106, 27, 154, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 400);
      } else if (bgPattern === 'waves') {

        for (let y = 0; y < 400; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);

          for (let x = 0; x < 800; x += 20) {
            const amplitude = 5;
            const yOffset = Math.sin(x / 40) * amplitude;
            ctx.lineTo(x, y + yOffset);
          }

          ctx.strokeStyle = `rgba(0, 188, 212, ${Math.random() * 0.3 + 0.1})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (bgPattern === 'rays') {

        const centerX = 400;
        const centerY = 200;

        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
          const startX = centerX + Math.cos(angle) * 50;
          const startY = centerY + Math.sin(angle) * 50;
          const endX = centerX + Math.cos(angle) * 500;
          const endY = centerY + Math.sin(angle) * 500;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(255, 152, 0, ${Math.random() * 0.3 + 0.1})`;
          ctx.lineWidth = 5;
          ctx.stroke();
        }

        const sunGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150);
        sunGradient.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
        sunGradient.addColorStop(0.7, 'rgba(255, 152, 0, 0.3)');
        sunGradient.addColorStop(1, 'rgba(255, 152, 0, 0)');
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
        ctx.fill();
      } else if (bgPattern === 'leaves') {

        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 800;
          const y = Math.random() * 400;
          const size = Math.random() * 20 + 10;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.random() * Math.PI * 2);

          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.bezierCurveTo(size, -size/2, size, size/2, 0, size);
          ctx.bezierCurveTo(-size, size/2, -size, -size/2, 0, -size);
          ctx.fillStyle = `rgba(139, 195, 74, ${Math.random() * 0.3 + 0.1})`;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(0, size);
          ctx.strokeStyle = `rgba(27, 94, 32, ${Math.random() * 0.5 + 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        }
      }

      ctx.save();
      roundRect(ctx, 50, 50, 700, 300, 20);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      roundRect(ctx, 50, 50, 700, 60, 20);
      const headerGradient = ctx.createLinearGradient(50, 50, 750, 110);
      headerGradient.addColorStop(0, primaryColor);
      headerGradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = headerGradient;
      ctx.fill();
      ctx.restore();

      if (theme.toLowerCase() === 'cosmic') {

        drawConfetti(ctx, 800, 400, 100);
      }

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');
      const image = await loadImage(imageBuffer);

      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 200, 90, 0, Math.PI * 2);
      const avatarGradient = ctx.createRadialGradient(180, 200, 0, 180, 200, 90);
      avatarGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      avatarGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      ctx.fillStyle = avatarGradient;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 200, 80, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, 100, 120, 160, 160);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 200, 80, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      const borderGradient = ctx.createLinearGradient(100, 120, 260, 280);
      borderGradient.addColorStop(0, primaryColor);
      borderGradient.addColorStop(0.5, accentColor);
      borderGradient.addColorStop(1, secondaryColor);
      ctx.strokeStyle = borderGradient;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 200, 90, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = accentColor;
      ctx.stroke();
      ctx.restore();

      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(name, 303, 153);

      const nameGradient = ctx.createLinearGradient(300, 120, 300, 170);
      nameGradient.addColorStop(0, primaryColor);
      nameGradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = nameGradient;
      ctx.fillText(name, 300, 150);

      ctx.font = 'italic 28px Arial';
      ctx.fillStyle = '#333333';
      ctx.fillText(welcomeText, 300, 200);

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      ctx.font = '18px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Joined on ${currentDate}`, 300, 240);

      ctx.beginPath();
      ctx.moveTo(300, 260);
      ctx.lineTo(700, 260);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let x = 60; x < 740; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 330);
        ctx.lineTo(x + 10, 340);
        ctx.strokeStyle = `rgba(0, 0, 0, 0.1)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

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
        message: 'Welcome card generated and uploaded to ImgBB successfully!',
        imageUrl: imgbbData.data.url, 
        theme: theme,
      });
    } catch (error) {
      console.error('Error generating or uploading welcome card:', error.message);

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
        error: 'Failed to generate or upload welcome card.',
        details: error.message,
      });
    }
  },
};