const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const PptxGenJS = require('pptxgenjs');
const { remark } = require('remark');
const remarkHtml = require('remark-html');

const Lecture = require('../models/Lecture');
const { extractAudio, getVideoDuration, transcribeWithWhisper } = require('../services/transcription');
const { formatTranscript, generateSummary, generateQuiz, detectSlideTimestamps, chatWithLecture } = require('../services/aiService');
const { extractSlides } = require('../services/slideExtractor');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  }
});

async function mdToHtml(markdown) {
  if (!markdown) return '';
  const result = await remark().use(remarkHtml).process(markdown);
  return result.toString();
}

async function processLecture(lectureId) {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return;

  const videoPath = path.join(UPLOADS_DIR, path.basename(lecture.videoPath));

  try {
    // Stage: extracting_audio
    lecture.processingStage = 'extracting_audio';
    await lecture.save();

    const audioPath = videoPath.replace(/\.[^.]+$/, '.wav');
    await extractAudio(videoPath, audioPath);

    const duration = await getVideoDuration(videoPath);
    lecture.duration = duration;
    await lecture.save();

    // Stage: transcribing
    lecture.processingStage = 'transcribing';
    await lecture.save();

    const rawTranscript = await transcribeWithWhisper(audioPath, UPLOADS_DIR);

    // Stage: summarizing
    lecture.processingStage = 'summarizing';
    await lecture.save();

    let transcriptMd = rawTranscript;
    try {
      transcriptMd = await formatTranscript(rawTranscript);
    } catch (err) {
      console.error('Transcript formatting failed, using raw:', err.message);
    }

    lecture.transcriptMd = transcriptMd;
    lecture.transcriptHtml = await mdToHtml(transcriptMd);
    await lecture.save();

    const summaryMd = await generateSummary(transcriptMd);
    lecture.summaryMd = summaryMd;
    lecture.summaryHtml = await mdToHtml(summaryMd);
    await lecture.save();

    try {
      const quizzes = await generateQuiz(transcriptMd);
      lecture.quizzes = quizzes;
      await lecture.save();
    } catch (err) {
      console.error('Quiz generation failed:', err.message);
    }

    // Stage: extracting_slides
    lecture.processingStage = 'extracting_slides';
    await lecture.save();

    let aiTimestamps = null;
    try {
      aiTimestamps = await detectSlideTimestamps(transcriptMd);
    } catch (err) {
      console.error('AI slide detection failed:', err.message);
    }

    const slides = await extractSlides(
      videoPath,
      lectureId,
      aiTimestamps,
      transcriptMd,
      duration,
      UPLOADS_DIR
    );
    lecture.slides = slides;

    // Cleanup files to save space
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }

    lecture.processingStage = 'complete';
    await lecture.save();
    console.log(`Lecture ${lectureId} processing complete`);

  } catch (err) {
    console.error(`Processing error for ${lectureId}:`, err);
    lecture.processingStage = 'failed';
    lecture.processingError = err.message;
    await lecture.save();
  }
}

// POST /api/upload
router.post('/upload', (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    try {
      const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));

      const lecture = await Lecture.create({
        title,
        videoPath: `/uploads/${req.file.filename}`,
        source: 'file',
        processingStage: 'uploaded'
      });

      // Process in background
      processLecture(lecture._id.toString()).catch(err => {
        console.error('Background processing error:', err);
      });

      res.json({ lectureId: lecture._id, message: 'Upload successful, processing started' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// POST /api/upload-youtube
router.post('/upload-youtube', (req, res) => {
  return res.status(400).json({
    error: 'Direct YouTube download is not supported on this server (cloud IPs are blocked by YouTube).',
    instructions: [
      '1. Go to https://cobalt.tools',
      '2. Paste your YouTube URL and download as MP4',
      '3. Come back and use the "Upload MP4 File" tab to upload the downloaded video'
    ]
  });
});

// GET /api/lectures
router.get('/lectures', async (req, res) => {
  try {
    const lectures = await Lecture.find().sort({ uploadDate: -1 }).select('-transcriptMd -transcriptHtml -summaryMd -summaryHtml -slides -quizzes');
    res.json(lectures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lectures/:id
router.get('/lectures/:id', async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
    res.json(lecture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/status/:lectureId
router.get('/status/:lectureId', async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId).select('processingStage processingError title');
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
    res.json({
      stage: lecture.processingStage,
      error: lecture.processingError,
      title: lecture.title
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lectures/:id/download-ppt
router.get('/lectures/:id/download-ppt', async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
    if (!lecture.slides || lecture.slides.length === 0) {
      return res.status(400).json({ error: 'No slides available for this lecture' });
    }

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'LAYOUT_WIDE';

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '2575fc' };
    titleSlide.addText(lecture.title, {
      x: 0.5, y: 2.5, w: 12.33, h: 1.5,
      fontSize: 32, bold: true, color: 'FFFFFF',
      align: 'center'
    });
    titleSlide.addText(`Generated by Study Tree | ${new Date(lecture.uploadDate).toLocaleDateString()}`, {
      x: 0.5, y: 4.5, w: 12.33, h: 0.5,
      fontSize: 14, color: 'DDDDFF',
      align: 'center'
    });

    // Slide for each frame
    for (const slide of lecture.slides) {
      const imagePath = path.join(UPLOADS_DIR, '..', 'uploads', slide.image.replace('/uploads/', ''));
      const frameDir = path.join(UPLOADS_DIR, slide.image.replace('/uploads/', '').replace(/\/[^/]+$/, ''));
      const imageFullPath = path.join(UPLOADS_DIR, slide.image.split('/').slice(2).join('/'));

      // Build correct path: slide.image = /frames_id/slide_xxx.png
      const relPath = slide.image.replace(/^\//, '');
      const fullPath = path.join(UPLOADS_DIR, relPath);

      if (!fs.existsSync(fullPath)) continue;

      const s = pptx.addSlide();
      s.addImage({ path: fullPath, x: 0, y: 0, w: 13.33, h: 7.5 });

      const minutes = Math.floor(slide.timestamp / 60);
      const seconds = Math.round(slide.timestamp % 60);
      s.addText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, {
        x: 0.1, y: 0.1, w: 1.2, h: 0.35,
        fontSize: 10, color: 'FFFFFF',
        fill: { color: '000000', transparency: 40 }
      });
    }

    const tmpPath = path.join(UPLOADS_DIR, `${lecture._id}_slides.pptx`);
    await pptx.writeFile({ fileName: tmpPath });

    res.download(tmpPath, `${lecture.title.replace(/[^a-zA-Z0-9]/g, '_')}_slides.pptx`, () => {
      fs.unlink(tmpPath, () => {});
    });
  } catch (err) {
    console.error('PPT generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/:lectureId
router.post('/chat/:lectureId', async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId).select('transcriptMd title');
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
    if (!lecture.transcriptMd) return res.status(400).json({ error: 'Transcript not available yet' });

    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const reply = await chatWithLecture(lecture.transcriptMd, history, message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
