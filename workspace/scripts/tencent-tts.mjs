#!/usr/bin/env node
/**
 * 腾讯云语音合成 (TTS) 脚本
 * 文档: https://cloud.tencent.com/document/product/1093/52554
 */

import crypto from 'crypto';
import https from 'https';
import fs from 'fs';

const SECRET_ID = process.env.TENCENT_TTS_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_TTS_SECRET_KEY;
const REGION = process.env.TENCENT_TTS_REGION || 'ap-guangzhou';

if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: Missing credentials. Set TENCENT_TTS_SECRET_ID and TENCENT_TTS_SECRET_KEY');
  process.exit(1);
}

function sha256(message, secret = '') {
  return crypto.createHmac('sha256', secret).update(message).digest();
}

function getSignature(secretKey, date, service, stringToSign) {
  const dateKey = sha256(date, 'TC3' + secretKey);
  const serviceKey = sha256(service, dateKey);
  const signKey = sha256('tc3_request', serviceKey);
  return sha256(stringToSign, signKey).toString('hex');
}

async function createTtsTask(text, options = {}) {
  const endpoint = 'tts.tencentcloudapi.com';
  const service = 'tts';
  const action = 'CreateTtsTask';
  const version = '2019-08-23';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  const payload = {
    Text: text,
    ModelType: options.modelType || 1,
    VoiceType: options.voiceType || 1002, // 英文女声
    Codec: options.codec || 'mp3',
    SampleRate: options.sampleRate || 16000,
    Volume: options.volume || 0,
    Speed: options.speed || 0,
    ...options
  };

  const payloadStr = JSON.stringify(payload);
  const hashedPayload = crypto.createHash('sha256').update(payloadStr).digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'Host': endpoint,
    'X-TC-Action': action,
    'X-TC-Version': version,
    'X-TC-Timestamp': timestamp,
    'X-TC-Region': REGION
  };

  const canonicalHeaders = 'content-type:application/json\n' +
    `host:${endpoint}\n` +
    'x-tc-action:' + action.toLowerCase() + '\n';
  
  const signedHeaders = 'content-type;host;x-tc-action';
  
  const canonicalRequest = 
    'POST\n' +
    '/\n' +
    '\n' +
    canonicalHeaders +
    '\n' +
    signedHeaders + '\n' +
    hashedPayload;

  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = 
    'TC3-HMAC-SHA256\n' +
    timestamp + '\n' +
    credentialScope + '\n' +
    hashedCanonicalRequest;

  const signature = getSignature(SECRET_KEY, date, service, stringToSign);
  
  const authorization = 
    'TC3-HMAC-SHA256 ' +
    `Credential=${SECRET_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  headers['Authorization'] = authorization;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: endpoint,
      path: '/',
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.Response.Error) {
            reject(new Error(result.Response.Error.Message));
          } else {
            resolve(result.Response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payloadStr);
    req.end();
  });
}

async function describeTtsTask(taskId) {
  const endpoint = 'tts.tencentcloudapi.com';
  const service = 'tts';
  const action = 'DescribeTtsTaskStatus';
  const version = '2019-08-23';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  const payload = { TaskId: taskId };
  const payloadStr = JSON.stringify(payload);
  const hashedPayload = crypto.createHash('sha256').update(payloadStr).digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'Host': endpoint,
    'X-TC-Action': action,
    'X-TC-Version': version,
    'X-TC-Timestamp': timestamp,
    'X-TC-Region': REGION
  };

  const canonicalHeaders = 'content-type:application/json\n' +
    `host:${endpoint}\n` +
    'x-tc-action:' + action.toLowerCase() + '\n';
  
  const signedHeaders = 'content-type;host;x-tc-action';
  
  const canonicalRequest = 
    'POST\n' +
    '/\n' +
    '\n' +
    canonicalHeaders +
    '\n' +
    signedHeaders + '\n' +
    hashedPayload;

  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = 
    'TC3-HMAC-SHA256\n' +
    timestamp + '\n' +
    credentialScope + '\n' +
    hashedCanonicalRequest;

  const signature = getSignature(SECRET_KEY, date, service, stringToSign);
  
  const authorization = 
    'TC3-HMAC-SHA256 ' +
    `Credential=${SECRET_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  headers['Authorization'] = authorization;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: endpoint,
      path: '/',
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.Response.Error) {
            reject(new Error(result.Response.Error.Message));
          } else {
            resolve(result.Response.Data);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payloadStr);
    req.end();
  });
}

async function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', reject);
  });
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'create') {
  const textFile = args[1];
  const outputPath = args[2];
  
  if (!textFile || !outputPath) {
    console.error('Usage: tencent-tts.mjs create <text-file> <output-path>');
    process.exit(1);
  }

  const text = fs.readFileSync(textFile, 'utf-8');
  
  console.log('Creating TTS task...');
  const result = await createTtsTask(text);
  console.log('TaskId:', result.Data.TaskId);
  
  // Poll for completion
  let status = 0;
  while (status !== 2) {
    await new Promise(r => setTimeout(r, 2000));
    const taskStatus = await describeTtsTask(result.Data.TaskId);
    status = taskStatus.Status;
    console.log('Status:', status === 0 ? 'Processing' : status === 1 ? 'Success' : 'Failed');
    
    if (status === 2) {
      console.log('Audio URL:', taskStatus.ResultUrl);
      await downloadAudio(taskStatus.ResultUrl, outputPath);
      console.log('Downloaded to:', outputPath);
    }
  }
} else {
  console.log('Usage: tencent-tts.mjs create <text-file> <output-path>');
  process.exit(1);
}
