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
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawGeometricPattern(ctx, x, y, width, height, style, color) {
  switch(style) {
    case 'grid':
      const gridSize = 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      for (let i = 0; i <= width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
        ctx.stroke();
      }

      for (let i = 0; i <= height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + width, y + i);
        ctx.stroke();
      }
      break;

    case 'dots':
      const dotSpacing = 30;
      ctx.fillStyle = color;

      for (let i = 0; i <= width; i += dotSpacing) {
        for (let j = 0; j <= height; j += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x + i, y + j, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case 'triangles':
      const triangleSize = 30;
      ctx.fillStyle = color;

      for (let i = 0; i <= width; i += triangleSize) {
        for (let j = 0; j <= height; j += triangleSize) {
          if ((i/triangleSize + j/triangleSize) % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + j);
            ctx.lineTo(x + i + triangleSize, y + j);
            ctx.lineTo(x + i + triangleSize/2, y + j + triangleSize);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      break;

    case 'hexagons':
      const hexSize = 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      for (let i = 0; i <= width + hexSize; i += hexSize * 1.5) {
        for (let j = 0; j <= height + hexSize; j += hexSize * Math.sqrt(3)) {
          const offset = ((j / (hexSize * Math.sqrt(3))) % 2) * (hexSize * 0.75);
          drawHexagon(ctx, x + i - offset, y + j, hexSize);
        }
      }
      break;

    case 'zigzag':
      const zigHeight = 15;
      const zigWidth = 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      for (let j = 0; j <= height; j += zigHeight * 2) {
        ctx.beginPath();
        ctx.moveTo(x, y + j);

        let up = true;
        for (let i = 0; i <= width; i += zigWidth) {
          ctx.lineTo(x + i, y + j + (up ? -zigHeight : zigHeight));
          up = !up;
        }

        ctx.stroke();
      }
      break;
  }
}

function drawHexagon(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const xPos = x + size * Math.cos(angle);
    const yPos = y + size * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(xPos, yPos);
    } else {
      ctx.lineTo(xPos, yPos);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

module.exports = {
  meta: {
    name: "Welcome Card V2",
    method: "GET",
    path: "/welcomev2",
    category: "utility",
    params: [
      { name: "imageUrl", type: "string", required: true, description: "URL of the image to display on the card (e.g., profile picture)" },
      { name: "name", type: "string", required: true, description: "The name to display on the card" },
      { name: "welcomeText", type: "string", required: true, description: "The welcome message to display on the card" },
      { name: "style", type: "string", required: false, description: "Card style: 'minimal', 'geometric', 'corporate', 'tech', 'elegant' (default: 'minimal')" },
    ],
  },
  onStart: async ({ req, res }) => {

    console.log('Incoming query parameters:', req.query);

    const { 
      imageUrl = '', 
      name = '', 
      welcomeText = '',
      style = 'minimal'
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

      let primaryColor, secondaryColor, accentColor, backgroundColor, patternStyle;
      switch (style.toLowerCase()) {
        case 'geometric':
          primaryColor = '#2196F3';
          secondaryColor = '#03A9F4';
          accentColor = '#FF4081';
          backgroundColor = '#FFFFFF';
          patternStyle = 'triangles';
          break;
        case 'corporate':
          primaryColor = '#455A64';
          secondaryColor = '#607D8B';
          accentColor = '#FFC107';
          backgroundColor = '#ECEFF1';
          patternStyle = 'grid';
          break;
        case 'tech':
          primaryColor = '#212121';
          secondaryColor = '#424242';
          accentColor = '#00E676';
          backgroundColor = '#FAFAFA';
          patternStyle = 'hexagons';
          break;
        case 'elegant':
          primaryColor = '#5D4037';
          secondaryColor = '#795548';
          accentColor = '#FFD54F';
          backgroundColor = '#EFEBE9';
          patternStyle = 'dots';
          break;
        case 'minimal':
        default:
          primaryColor = '#3F51B5';
          secondaryColor = '#5C6BC0';
          accentColor = '#FF5722';
          backgroundColor = '#F5F5F5';
          patternStyle = 'zigzag';
          break;
      }

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 800, 400);

      drawGeometricPattern(ctx, 0, 0, 800, 400, patternStyle, `${primaryColor}15`);

      if (style.toLowerCase() === 'minimal') {

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(50, 50, 700, 300);

        ctx.fillStyle = primaryColor;
        ctx.fillRect(50, 50, 15, 300);

      } else if (style.toLowerCase() === 'geometric') {

        ctx.fillStyle = '#FFFFFF';

        ctx.beginPath();
        ctx.moveTo(50, 50);
        ctx.lineTo(750, 50);
        ctx.lineTo(750, 300);
        ctx.lineTo(650, 350);
        ctx.lineTo(50, 350);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `${primaryColor}30`;
        ctx.beginPath();
        ctx.moveTo(650, 50);
        ctx.lineTo(750, 150);
        ctx.lineTo(750, 50);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `${accentColor}30`;
        ctx.beginPath();
        ctx.moveTo(50, 250);
        ctx.lineTo(150, 350);
        ctx.lineTo(50, 350);
        ctx.closePath();
        ctx.fill();

      } else if (style.toLowerCase() === 'corporate') {

        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, 50, 50, 700, 300, 5);
        ctx.fill();

        const headerGradient = ctx.createLinearGradient(50, 50, 750, 50);
        headerGradient.addColorStop(0, primaryColor);
        headerGradient.addColorStop(1, secondaryColor);
        ctx.fillStyle = headerGradient;
        ctx.fillRect(50, 50, 700, 60);

        ctx.fillStyle = `${primaryColor}20`;
        ctx.fillRect(50, 310, 700, 40);

      } else if (style.toLowerCase() === 'tech') {

        ctx.fillStyle = secondaryColor;
        roundRect(ctx, 50, 50, 700, 300, 10);
        ctx.fill();

        ctx.strokeStyle = `${accentColor}50`;
        ctx.lineWidth = 2;

        for (let i = 0; i < 5; i++) {
          const y = 100 + i * 50;
          ctx.beginPath();
          ctx.moveTo(50, y);
          ctx.lineTo(750, y);
          ctx.stroke();
        }

        for (let i = 0; i < 7; i++) {
          const x = 100 + i * 100;
          ctx.beginPath();
          ctx.moveTo(x, 50);
          ctx.lineTo(x, 350);
          ctx.stroke();
        }

        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        roundRect(ctx, 50, 50, 700, 300, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (style.toLowerCase() === 'elegant') {

        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, 50, 50, 700, 300, 0);
        ctx.fill();

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(60, 60, 680, 280);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(70, 70, 660, 260);

        drawCornerOrnament(ctx, 50, 50, 30, primaryColor);
        drawCornerOrnament(ctx, 750, 50, 30, primaryColor, Math.PI/2);
        drawCornerOrnament(ctx, 750, 350, 30, primaryColor, Math.PI);
        drawCornerOrnament(ctx, 50, 350, 30, primaryColor, Math.PI*1.5);
      }

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');
      const image = await loadImage(imageBuffer);

      if (style.toLowerCase() === 'minimal') {

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(image, 100, 100, 200, 200);
        ctx.restore();

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(100, 100, 200, 200);

      } else if (style.toLowerCase() === 'geometric') {

        ctx.save();
        ctx.beginPath();
        const centerX = 180;
        const centerY = 200;
        const radius = 90;

        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, 90, 110, 180, 180);
        ctx.restore();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.beginPath();

        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();

      } else if (style.toLowerCase() === 'corporate') {

        ctx.save();
        ctx.beginPath();
        ctx.arc(180, 200, 80, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, 100, 120, 160, 160);
        ctx.restore();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(180, 200, 80, 0, Math.PI * 2);
        ctx.stroke();

      } else if (style.toLowerCase() === 'tech') {

        ctx.save();
        roundRect(ctx, 100, 120, 160, 160, 5);
        ctx.clip();
        ctx.drawImage(image, 100, 120, 160, 160);
        ctx.restore();

        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        roundRect(ctx, 100, 120, 160, 160, 5);
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (style.toLowerCase() === 'elegant') {

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(180, 200, 80, 100, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, 100, 100, 160, 200);
        ctx.restore();

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(180, 200, 80, 100, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i;
          const x = 180 + 90 * Math.cos(angle);
          const y = 200 + 110 * Math.sin(angle);

          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (style.toLowerCase() === 'minimal') {

        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'left';
        ctx.fillText(name, 340, 150);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#333333';
        ctx.fillText(welcomeText, 340, 200);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(340, 160);
        ctx.lineTo(340 + ctx.measureText(name).width, 160);
        ctx.stroke();

      } else if (style.toLowerCase() === 'geometric') {

        ctx.fillStyle = `${primaryColor}20`;
        ctx.beginPath();
        ctx.moveTo(340, 120);
        ctx.lineTo(700, 120);
        ctx.lineTo(680, 160);
        ctx.lineTo(340, 160);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'left';
        ctx.fillText(name, 350, 150);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#333333';
        ctx.fillText(welcomeText, 350, 200);

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(340, 210);
        ctx.lineTo(360, 210);
        ctx.lineTo(350, 230);
        ctx.closePath();
        ctx.fill();

      } else if (style.toLowerCase() === 'corporate') {

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('WELCOME ABOARD', 70, 90);

        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'left';
        ctx.fillText(name, 340, 170);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#333333';
        ctx.fillText(welcomeText, 340, 220);

        ctx.font = '16px Arial';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'right';
        const currentDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        ctx.fillText(`Joined: ${currentDate}`, 720, 335);

      } else if (style.toLowerCase() === 'tech') {

        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(name, 340, 150);

        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 42px Arial';
        ctx.fillText(name, 340, 150);
        ctx.shadowBlur = 0;

        ctx.font = '24px Arial';
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText(welcomeText, 340, 200);

        ctx.font = '16px monospace';
        ctx.fillStyle = accentColor;
        ctx.fillText(`ID: ${uuidv4().substring(0, 8)}`, 340, 250);

        ctx.font = '12px monospace';
        ctx.fillStyle = `${accentColor}50`;
        let binary = '';
        for (let i = 0; i < 50; i++) {
          binary += Math.round(Math.random());
        }
        ctx.fillText(binary, 340, 280);
        ctx.fillText(binary.split('').reverse().join(''), 340, 300);

      } else if (style.toLowerCase() === 'elegant') {

        ctx.font = 'bold 48px Georgia';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'center';
        ctx.fillText(name, 500, 150);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(400, 170);
        ctx.lineTo(600, 170);
        ctx.stroke();

        ctx.font = 'italic 28px Georgia';
        ctx.fillStyle = secondaryColor;
        ctx.textAlign = 'center';
        ctx.fillText(welcomeText, 500, 220);

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(500, 180, 3, 0, Math.PI * 2);
        ctx.fill();
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
        message: 'Welcome card V2 generated and uploaded to ImgBB successfully!',
        imageUrl: imgbbData.data.url, 
        style: style,
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

function drawCornerOrnament(ctx, x, y, size, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, Math.PI, Math.PI * 1.5);
  ctx.stroke();

  ctx.restore();
}