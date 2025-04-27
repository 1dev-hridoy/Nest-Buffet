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

module.exports = {
  meta: {
    name: "Name Background Generator",
    method: "GET",
    path: "/name-background",
    category: "utility",
    params: [
      { name: "name", type: "string", required: true, description: "Name to display in the background" },
      { name: "imageUrl", type: "string", required: true, description: "URL of the PNG image to overlay (should have transparent background)" },
      { name: "backgroundColor", type: "string", required: false, description: "Background color in hex format (default: #F9CA24 - yellow)" },
      { name: "textColor", type: "string", required: false, description: "Text color in hex format (default: #FFFFFF - white)" },
    ],
  },
  onStart: async ({ req, res }) => {

    console.log('Incoming query parameters:', req.query);

    const { 
      name = '', 
      imageUrl = '',
      backgroundColor = '#F9CA24', 
      textColor = '#FFFFFF' 
    } = req.query || {};

    if (!name || !imageUrl) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameters: name and imageUrl are required.",
        received: { name, imageUrl },
      });
    }

    let filePath; 

    try {

      const canvas = createCanvas(1000, 1000);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 1000, 1000);

      const textStyles = [
        { font: 'bold 120px Arial', opacity: 0.2, y: 200 },
        { font: 'bold 150px Arial', opacity: 0.3, y: 400 },
        { font: 'bold 180px Arial', opacity: 0.4, y: 600 },
        { font: 'bold 120px Arial', opacity: 0.2, y: 800 }
      ];

      textStyles.forEach(style => {
        ctx.font = style.font;
        ctx.fillStyle = `rgba(${hexToRgb(textColor)}, ${style.opacity})`;
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), 500, style.y);
      });

      ctx.font = 'italic 60px cursive';
      ctx.fillStyle = `rgba(${hexToRgb(textColor)}, 0.5)`;
      ctx.textAlign = 'center';
      ctx.fillText(name, 500, 100);

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');
      const image = await loadImage(imageBuffer);

      const maxWidth = 800;
      const maxHeight = 800;
      let width = image.width;
      let height = image.height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }

      const x = (1000 - width) / 2;
      const y = (1000 - height) / 2;

      ctx.drawImage(image, x, y, width, height);

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
        message: 'Name background image generated and uploaded successfully!',
        imageUrl: imgbbData.data.url,
        name: name,
      });
    } catch (error) {
      console.error('Error generating or uploading image:', error.message);

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
        error: 'Failed to generate or upload image.',
        details: error.message,
      });
    }
  },
};

function hexToRgb(hex) {

  hex = hex.replace(/^#/, '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

async function testGenerator() {
  try {

    const canvas = createCanvas(1000, 1000);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#F9CA24'; 
    ctx.fillRect(0, 0, 1000, 1000);

    const name = 'ITACHI';
    ctx.font = 'bold 150px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    ctx.fillText(name, 500, 400);

    ctx.font = 'bold 180px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(name, 500, 600);

    const image = await loadImage('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Uchiha_Itachi-removebg-preview-pLkrRgpqXInvp8CZlquIZuqfllgTSA.png');
    const width = 600;
    const height = 600 * (image.height / image.width);
    ctx.drawImage(image, (1000 - width) / 2, (1000 - height) / 2, width, height);

    console.log('Test image generated successfully!');

    const out = fs.createWriteStream('test-output.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    out.on('finish', () => console.log('Test file saved as test-output.png'));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

