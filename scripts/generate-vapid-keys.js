#!/usr/bin/env node

/**
 * VAPID Key Generator Script
 * 
 * Run this script to generate VAPID keys for web push notifications
 * Usage: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('========================================');
console.log('VAPID Key Generation');
console.log('========================================\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('Public Key:');
  console.log(vapidKeys.publicKey);
  console.log('\nPrivate Key:');
  console.log(vapidKeys.privateKey);
  console.log('\n========================================');
  console.log('Add these to your Render environment variables:');
  console.log('========================================');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log('VAPID_SUBJECT=mailto:hello@verve.app');
  console.log('========================================\n');
  
  console.log('⚠️  SECURITY NOTE:');
  console.log('- Keep the PRIVATE_KEY secret');
  console.log('- The PUBLIC_KEY can be shared with your frontend');
  console.log('- Store these securely in your environment variables');
  console.log('- Rotate keys if they are ever compromised\n');
  
} catch (error) {
  console.error('Error generating VAPID keys:', error);
  process.exit(1);
}
