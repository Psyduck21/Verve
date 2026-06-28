const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--force-device-scale-factor=2'] // Retina display quality
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: {
      dir: path.join(__dirname, 'public'),
      size: { width: 1400, height: 900 }
    }
  });

  const page = await context.newPage();
  
  console.log('Navigating to demo page...');
  await page.goto('http://localhost:3000/video-demo');
  
  console.log('Recording for 38 seconds...');
  await page.waitForTimeout(38000); // 38 seconds

  console.log('Closing and saving video...');
  await context.close();
  await browser.close();
  
  // Find the generated webm and rename it
  const fs = require('fs');
  const files = fs.readdirSync(path.join(__dirname, 'public'));
  const videoFile = files.find(f => f.endsWith('.webm') && f !== 'verve-demo.webm');
  if (videoFile) {
    fs.renameSync(
      path.join(__dirname, 'public', videoFile),
      path.join(__dirname, 'public', 'verve-demo.webm')
    );
    console.log('Successfully saved to public/verve-demo.webm');
  } else {
    console.log('Video file not found!');
  }
})();
