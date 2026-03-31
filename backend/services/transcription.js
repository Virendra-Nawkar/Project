const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

function transcribeWithWhisper(audioPath, outputDir) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PYTHONUTF8: '1' };
    const proc = spawn('whisper', [
      audioPath,
      '--model', 'base',
      '--output_format', 'txt',
      '--output_dir', outputDir,
      '--language', 'en'
    ], { env });

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.stdout.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
      }

      // Find the output txt file
      const audioBasename = path.basename(audioPath, path.extname(audioPath));
      const txtPath = path.join(outputDir, `${audioBasename}.txt`);

      if (!fs.existsSync(txtPath)) {
        // Try to find any txt file in outputDir
        const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.txt'));
        if (files.length === 0) return reject(new Error('Whisper output not found'));
        const content = fs.readFileSync(path.join(outputDir, files[0]), 'utf-8');
        return resolve(content.trim());
      }

      const content = fs.readFileSync(txtPath, 'utf-8');
      resolve(content.trim());
    });

    proc.on('error', err => reject(new Error(`Failed to start whisper: ${err.message}`)));
  });
}

module.exports = { extractAudio, getVideoDuration, transcribeWithWhisper };
