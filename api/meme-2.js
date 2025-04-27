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


const fontPath = path.join(__dirname, 'assets', 'fonts', 'Impact.ttf');
if (fs.existsSync(fontPath)) {
  registerFont(fontPath, { family: 'Impact' });
}


const MEME_TEMPLATES = {
  'drake': 'https://i.imgflip.com/30b1gx.jpg',
  'distracted': 'https://i.imgflip.com/1ur9b0.jpg',
  'change-my-mind': 'https://i.imgflip.com/24y43o.jpg',
  'two-buttons': 'https://i.imgflip.com/1g8my4.jpg',
  'expanding-brain': 'https://i.imgflip.com/1jwhww.jpg',
  'doge': 'https://i.imgflip.com/4t0m5.jpg',
  'surprised-pikachu': 'https://i.imgflip.com/2kbn1e.jpg',
  'one-does-not-simply': 'https://i.imgflip.com/1bij.jpg',
  'success-kid': 'https://i.imgflip.com/1bhk.jpg',
  'thinking': 'https://i.imgflip.com/1h7in3.jpg'
};


const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
if (!IMGBB_API_KEY) {
  throw new Error('IMGBB_API_KEY is not defined in the .env file');
}

module.exports = {
  meta: {
    name: "Meme Generator",
    method: "GET",
    path: "/generate-meme",
    category: "entertainment",
    params: [
      { name: "template example- drake, distracted, change-my-mind, two-buttons, expanding-brain, doge, surprised-pikachu, one-does-not-simply, success-kid, thinking", type: "string", required: false, description: "Meme template name or custom image URL" },
      { name: "topText", type: "string", required: false, description: "Text to display at the top of the meme" },
      { name: "bottomText", type: "string", required: false, description: "Text to display at the bottom of the meme" },
      { name: "textColor", type: "string", required: false, description: "Text color in hex format (default: #FFFFFF)" },
      { name: "strokeColor", type: "string", required: false, description: "Text stroke color in hex format (default: #000000)" },
      { name: "fontSize", type: "number", required: false, description: "Font size for the meme text (default: 48)" },
      { name: "filter", type: "string", required: false, description: "Image filter to apply (options: none, grayscale, sepia, invert)" },
      { name: "watermark", type: "string", required: false, description: "Optional watermark text" },
    ],
  },
  onStart: async ({ req, res }) => {
    console.log('Incoming meme generation request:', req.query);

    const { 
      template = 'drake', 
      topText = '', 
      bottomText = '',
      textColor = '#FFFFFF',
      strokeColor = '#000000',
      fontSize = 48,
      filter = 'none',
      watermark = ''
    } = req.query || {};

    let templateUrl = template;
    
    
    if (MEME_TEMPLATES[template.toLowerCase()]) {
      templateUrl = MEME_TEMPLATES[template.toLowerCase()];
    } else if (!template.startsWith('http')) {
      return res.status(400).json({
        status: 'failed',
        error: "Invalid template. Please provide a valid template name or image URL.",
        availableTemplates: Object.keys(MEME_TEMPLATES),
      });
    }

    let filePath;

    try {
     
      const imageResponse = await axios.get(templateUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');
      const image = await loadImage(imageBuffer);


      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');

     
      ctx.drawImage(image, 0, 0, image.width, image.height);

 
      if (filter !== 'none') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (filter === 'grayscale') {
            const gray = 0.3 * r + 0.59 * g + 0.11 * b;
            data[i] = data[i + 1] = data[i + 2] = gray;
          } else if (filter === 'sepia') {
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          } else if (filter === 'invert') {
            data[i] = 255 - r;
            data[i + 1] = 255 - g;
            data[i + 2] = 255 - b;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }

     
      const actualFontSize = parseInt(fontSize);
      ctx.font = `bold ${actualFontSize}px Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = actualFontSize / 15;
      ctx.lineJoin = 'round';

     
      const drawText = (text, y) => {
        const maxWidth = canvas.width * 0.9;
        const words = text.split(' ');
        let line = '';
        const lines = [];
        
       
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            lines.push(line);
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        
       
        const lineHeight = actualFontSize * 1.2;
        let yPos = y;
        
        if (y < canvas.height / 2) { 
          yPos = actualFontSize + (lines.length - 1) * lineHeight;
        } else { 
          yPos = canvas.height - (lines.length - 1) * lineHeight - 20;
        }
        
      
        for (let i = 0; i < lines.length; i++) {
          const lineY = y < canvas.height / 2 
            ? yPos - (lines.length - 1 - i) * lineHeight 
            : yPos - (lines.length - 1) * lineHeight + i * lineHeight;
          
          ctx.strokeText(lines[i], canvas.width / 2, lineY);
          ctx.fillText(lines[i], canvas.width / 2, lineY);
        }
      };

   
      if (topText) {
        drawText(topText.toUpperCase(), actualFontSize);
      }
      
      if (bottomText) {
        drawText(bottomText.toUpperCase(), canvas.height - actualFontSize);
      }

   
      if (watermark) {
        ctx.font = `${actualFontSize / 3}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.textAlign = 'right';
        ctx.strokeText(watermark, canvas.width - 10, canvas.height - 10);
        ctx.fillText(watermark, canvas.width - 10, canvas.height - 10);
      }


      const fileName = `meme-${uuidv4()}.png`;
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
        message: 'Meme generated successfully!',
        memeUrl: imgbbData.data.url,
        template: template,
        topText: topText,
        bottomText: bottomText,
        filter: filter
      });
      
    } catch (error) {
      console.error('Error generating or uploading meme:', error.message);
      
     
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
        error: 'Failed to generate or upload meme.',
        details: error.message,
      });
    }
  },
};


async function testMemeGenerator() {
  try {
    const template = 'drake';
    const topText = 'USING REGULAR IMAGES';
    const bottomText = 'USING MEME GENERATOR API';
    
    const templateUrl = MEME_TEMPLATES[template];
    const image = await loadImage(templateUrl);
    
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0, image.width, image.height);
    
    ctx.font = 'bold 40px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    ctx.strokeText(topText, image.width / 2, 80);
    ctx.fillText(topText, image.width / 2, 80);
    
    ctx.strokeText(bottomText, image.width / 2, image.height - 40);
    ctx.fillText(bottomText, image.width / 2, image.height - 40);
    
    const out = fs.createWriteStream('test-meme.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    
    out.on('finish', () => console.log('Test meme saved as test-meme.png'));
  } catch (error) {
    console.error('Test failed:', error);
  }
}


// testMemeGenerator();