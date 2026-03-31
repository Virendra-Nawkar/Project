const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Rule-based transition phrase detection
const TRANSITION_PHRASES = [
  'next slide', 'moving on', 'let\'s look at', 'now let\'s', 'turning to',
  'the next topic', 'as you can see', 'on this slide', 'here we have',
  'let\'s move to', 'chapter', 'section', 'part two', 'part three',
  'in summary', 'to conclude', 'in conclusion', 'first', 'second', 'third',
  'finally', 'lastly', 'another', 'furthermore', 'additionally'
];

function detectTransitionsFromTranscript(transcript) {
  const lines = transcript.split('\n');
  const timestamps = [0];

  for (const line of lines) {
    const timeMatch = line.match(/\[(\d+):(\d+)\]/);
    if (timeMatch) {
      const seconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
      const lower = line.toLowerCase();
      if (TRANSITION_PHRASES.some(phrase => lower.includes(phrase))) {
        timestamps.push(seconds);
      }
    }
  }

  return [...new Set(timestamps)].sort((a, b) => a - b);
}

function generatePeriodicTimestamps(duration, interval = 40) {
  const timestamps = [];
  for (let t = 0; t < duration; t += interval) {
    timestamps.push(Math.round(t));
  }
  return timestamps;
}

function extractFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .size('1280x720')
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function extractSlides(videoPath, lectureId, aiTimestamps, transcript, duration, uploadsDir) {
  const framesDir = path.join(uploadsDir, `frames_${lectureId}`);
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  let timestamps = [];

  // Strategy 1: AI-detected timestamps
  if (aiTimestamps && aiTimestamps.length > 1) {
    console.log(`Strategy 1: Using ${aiTimestamps.length} AI-detected timestamps`);
    timestamps = aiTimestamps;
  }

  // Strategy 2: Rule-based detection from transcript
  if (timestamps.length <= 1 && transcript) {
    const ruleTimestamps = detectTransitionsFromTranscript(transcript);
    if (ruleTimestamps.length > 1) {
      console.log(`Strategy 2: Using ${ruleTimestamps.length} rule-based timestamps`);
      timestamps = ruleTimestamps;
    }
  }

  // Strategy 3: Periodic fallback
  if (timestamps.length <= 1) {
    console.log('Strategy 3: Using periodic timestamps (every 40s)');
    timestamps = generatePeriodicTimestamps(duration || 300, 40);
  }

  // Limit to reasonable number of slides
  if (timestamps.length > 20) {
    const step = Math.ceil(timestamps.length / 20);
    timestamps = timestamps.filter((_, i) => i % step === 0);
  }

  const slides = [];
  for (const ts of timestamps) {
    const safets = Math.min(ts, (duration || 300) - 1);
    const filename = `slide_${String(Math.round(safets)).padStart(6, '0')}.png`;
    const outputPath = path.join(framesDir, filename);

    try {
      await extractFrame(videoPath, safets, outputPath);
      slides.push({
        timestamp: safets,
        image: `/frames_${lectureId}/${filename}`
      });
    } catch (err) {
      console.error(`Failed to extract frame at ${safets}s:`, err.message);
    }
  }

  return slides;
}

module.exports = { extractSlides };
