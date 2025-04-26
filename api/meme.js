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


const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}


const defaultImagePath = path.join(imagesDir, 'default-meme.jpg');


const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
if (!IMGBB_API_KEY) {
  throw new Error('IMGBB_API_KEY is not defined in the .env file');
}


const defaultCaptions = [
  "When life gives you lemons... trade them for coffee! ☕",
  "I’m not lazy, I’m on energy-saving mode! ⚡",
  "When your boss calls you... but you’re already on two other calls! 📞",
  "Me: I’ll do it tomorrow... Tomorrow: I’m here! 😱",
  "When you realize the weekend is over... and Monday is coming! 😭",
];

module.exports = {
  meta: {
    name: "Meme Generator",
    method: "GET",
    path: "/meme-generator",
    category: "utility",
    params: [
      { name: "caption", type: "string", required: false, description: "The caption to overlay on the meme image (optional; a random caption will be used if not provided)" },
    ],
  },
  onStart: async ({ req, res }) => {

    console.log('Incoming query parameters:', req.query);

    const { caption = '' } = req.query || {};

  
    const finalCaption = caption || defaultCaptions[Math.floor(Math.random() * defaultCaptions.length)];

    let filePath; 
    let image; 

    try {
     
      let imageBuffer;
      try {
        const memeResponse = await axios.get('https://meme-api.com/gimme');
        const memeData = memeResponse.data;


        if (!memeData.url || !memeData.url.startsWith('http')) {
          throw new Error('Invalid or missing image URL from meme-api.com');
        }

        console.log('Fetched meme image URL:', memeData.url);

  
        const imageResponse = await axios.get(memeData.url, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(imageResponse.data, 'binary');
      } catch (fetchError) {
        console.error('Failed to fetch meme image from meme-api.com:', fetchError.message);

        if (!fs.existsSync(defaultImagePath)) {
          throw new Error('Default meme image not found at ' + defaultImagePath);
        }
        imageBuffer = fs.readFileSync(defaultImagePath);
      }

      
      image = await loadImage(imageBuffer);

      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');

      
      ctx.drawImage(image, 0, 0, image.width, image.height);

      const captionHeight = 100;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, image.height - captionHeight, image.width, captionHeight);

     
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

    
      const maxWidth = image.width - 40;
      const lineHeight = 50;
      const words = finalCaption.split(' ');
      let line = '';
      let lines = [];
      for (let i = 0; i < words.length; i++) {
        let testLine = line + words[i] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          lines.push(line.trim());
          line = words[i] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

    
      const totalTextHeight = lines.length * lineHeight;
      let y = image.height - captionHeight + (captionHeight - totalTextHeight) / 2 + lineHeight / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], image.width / 2, y);
        y += lineHeight;
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
        message: 'Meme generated and uploaded to ImgBB successfully!',
        imageUrl: imgbbData.data.url, 
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