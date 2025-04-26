const ytdl = require('ytdl-core');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}


const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
if (!IMGBB_API_KEY) {
  throw new Error('IMGBB_API_KEY is not defined in the .env file');
}


function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
}


function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'Unknown';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


function getQualityLabel(format) {
  if (format.qualityLabel) {
    return format.qualityLabel;
  }
  
  if (format.audioBitrate) {
    return `${format.audioBitrate}kbps Audio`;
  }
  
  return 'Unknown Quality';
}

module.exports = {
  meta: {
    name: "YouTube Video Info",
    method: "GET",
    path: "/youtube-info",
    category: "utility",
    params: [
      { name: "url", type: "string", required: true, description: "YouTube video URL" },
    ],
  },
  onStart: async ({ req, res }) => {
 
    console.log('Incoming query parameters:', req.query);

    
    const { url } = req.query || {};


    if (!url) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameter: url is required.",
        received: { url },
      });
    }

  
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({
        status: 'failed',
        error: "Invalid YouTube URL provided.",
        received: { url },
      });
    }

    let filePath; 
    try {
     
      const videoId = ytdl.getVideoID(url);
      console.log(`Extracted video ID: ${videoId}`);
      

      const options = {
        requestOptions: {
          headers: {
    
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          
            'Referer': 'https://www.youtube.com/'
          }
        }
      };
      
      console.log(`Fetching info for YouTube video: ${url}`);
      
 
      const basicInfo = await ytdl.getBasicInfo(url, options);
      

      const {
        videoDetails: {
          title,
          description,
          lengthSeconds,
          viewCount,
          author,
          publishDate,
          thumbnails,
          likes,
          category,
          isPrivate,
          isLiveContent
        }
      } = basicInfo;
      
 
      const highestQualityThumbnail = thumbnails.reduce((prev, current) => {
        return (prev.width > current.width) ? prev : current;
      });
      
      
      const thumbnailResponse = await axios.get(highestQualityThumbnail.url, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const thumbnailBuffer = Buffer.from(thumbnailResponse.data, 'binary');
  
      const fileName = `${uuidv4()}.jpg`;
      filePath = path.join(tempDir, fileName);
      
     
      fs.writeFileSync(filePath, thumbnailBuffer);
      

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
        filePath = null;
      } catch (deleteError) {
        console.error(`Error deleting local file ${filePath}:`, deleteError.message);
      }
      

      let formats = [];
      try {
        formats = basicInfo.formats || [];
      } catch (formatError) {
        console.error('Error extracting formats:', formatError.message);
      }
      
    
      if (formats.length === 0) {
        console.log('No formats found in basicInfo, using alternative approach');
        

        try {
          const oEmbedResponse = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          console.log('Successfully fetched oEmbed data');
        } catch (oEmbedError) {
          console.error('Error fetching oEmbed data:', oEmbedError.message);
        }
      }
      
  
      const videoFormats = formats
        .filter(format => format.hasVideo && format.hasAudio)
        .map(format => ({
          quality: getQualityLabel(format),
          mimeType: format.mimeType ? format.mimeType.split(';')[0] : 'Unknown',
          container: format.container || 'Unknown',
          codecs: format.codecs || 'Unknown',
          fps: format.fps || 'Unknown',
          size: format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'Unknown',
          url: format.url || 'Unavailable'
        }))
        .sort((a, b) => {
          
          const getResNumber = (quality) => {
            const match = quality.match(/(\d+)p/);
            return match ? parseInt(match[1]) : 0;
          };
          return getResNumber(b.quality) - getResNumber(a.quality);
        });
      
      const audioFormats = formats
        .filter(format => !format.hasVideo && format.hasAudio)
        .map(format => ({
          quality: format.audioBitrate ? `${format.audioBitrate}kbps Audio` : 'Unknown Quality',
          mimeType: format.mimeType ? format.mimeType.split(';')[0] : 'Unknown',
          container: format.container || 'Unknown',
          codecs: format.codecs || 'Unknown',
          size: format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'Unknown',
          url: format.url || 'Unavailable'
        }))
        .sort((a, b) => {

          const getBitrateNumber = (quality) => {
            const match = quality.match(/(\d+)kbps/);
            return match ? parseInt(match[1]) : 0;
          };
          return getBitrateNumber(b.quality) - getBitrateNumber(a.quality);
        });
      

      const videoData = {
        title,
        description: description ? description.substring(0, 500) + (description.length > 500 ? '...' : '') : 'No description',
        duration: formatDuration(parseInt(lengthSeconds)),
        views: parseInt(viewCount).toLocaleString(),
        author: author.name,
        authorUrl: author.channel_url,
        publishDate,
        category,
        likes: likes ? parseInt(likes).toLocaleString() : 'Hidden',
        isPrivate,
        isLiveContent,
        thumbnailUrl: imgbbData.data.url,
        originalThumbnailUrl: highestQualityThumbnail.url,
        videoId,
        youtubeUrl: url,
        videoFormats: videoFormats.slice(0, 10), 
        audioFormats: audioFormats.slice(0, 5),   
        formatCount: {
          video: videoFormats.length,
          audio: audioFormats.length,
          total: formats.length
        }
      };
      
 
      videoData.alternativeDownloadLinks = {

        y2mate: `https://www.y2mate.com/youtube/${videoId}`,
        savefrom: `https://en.savefrom.net/#url=${encodeURIComponent(url)}`,
        ytmp3: `https://ytmp3.cc/youtube-to-mp3/?url=${encodeURIComponent(url)}`
      };
      
    
      res.json({
        status: 'success',
        message: 'YouTube video information retrieved successfully!',
        videoData
      });
      
    } catch (error) {
      console.error('Error fetching YouTube video info:', error.message);
      

      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted local file ${filePath} after error`);
        } catch (deleteError) {
          console.error(`Error deleting local file ${filePath} after error:`, deleteError.message);
        }
      }
      

      if (error.message.includes('Video unavailable')) {
        return res.status(404).json({
          status: 'failed',
          error: 'Video unavailable. It might be private, deleted, or region-restricted.',
          details: error.message
        });
      }
      
      if (error.message.includes('age-restricted')) {
        return res.status(403).json({
          status: 'failed',
          error: 'This video is age-restricted and cannot be accessed without authentication.',
          details: error.message
        });
      }
      
      if (error.message.includes('Could not extract functions')) {
        return res.status(500).json({
          status: 'failed',
          error: 'YouTube API changes detected.',
          details: 'The YouTube page structure has changed, making it difficult to extract video information. Try using the alternative download links provided.',
          alternativeLinks: {
            y2mate: `https://www.y2mate.com/youtube/${ytdl.getVideoID(url)}`,
            savefrom: `https://en.savefrom.net/#url=${encodeURIComponent(url)}`,
            ytmp3: `https://ytmp3.cc/youtube-to-mp3/?url=${encodeURIComponent(url)}`
          }
        });
      }
      
      res.status(500).json({
        status: 'failed',
        error: 'Failed to fetch YouTube video information.',
        details: error.message,
        alternativeLinks: {
          y2mate: `https://www.y2mate.com/youtube/${ytdl.getVideoID(url)}`,
          savefrom: `https://en.savefrom.net/#url=${encodeURIComponent(url)}`,
          ytmp3: `https://ytmp3.cc/youtube-to-mp3/?url=${encodeURIComponent(url)}`
        }
      });
    }
  },
};