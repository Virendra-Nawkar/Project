const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
  timestamp: Number,
  image: String
});

const quizSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String
});

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoPath: String,
  youtubeUrl: String,
  duration: Number,
  transcriptMd: String,
  transcriptHtml: String,
  summaryMd: String,
  summaryHtml: String,
  slides: [slideSchema],
  quizzes: [quizSchema],
  uploadDate: { type: Date, default: Date.now },
  processingError: String,
  source: { type: String, enum: ['file', 'youtube'], default: 'file' },
  processingStage: {
    type: String,
    enum: ['uploaded', 'downloading', 'extracting_audio', 'transcribing', 'summarizing', 'extracting_slides', 'complete', 'failed'],
    default: 'uploaded'
  }
});

module.exports = mongoose.model('Lecture', lectureSchema);
