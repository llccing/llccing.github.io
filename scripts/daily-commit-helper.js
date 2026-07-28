#!/usr/bin/env node

/**
 * Local Daily Commit Helper
 * 
 * This script helps you create and commit daily blog posts locally.
 * Run this manually or schedule it with a local cron job.
 * 
 * Usage:
 *   npm run daily-post -- "Your Topic Here"
 *   npm run daily-post -- --type=daily-english-reading "AI Trends"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
let topic = 'Daily Tech Insights';
let contentType = 'technical-note';

args.forEach(arg => {
  if (arg.startsWith('--type=')) {
    contentType = arg.split('=')[1];
  } else if (!arg.startsWith('--')) {
    topic = arg;
  }
});

console.log('📝 Daily Blog Post Creator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Topic: ${topic}`);
console.log(`Type: ${contentType}`);
console.log('');

// Step 1: Generate the post
console.log('Step 1: Generating blog post...');
try {
  process.env.TOPIC = topic;
  process.env.CONTENT_TYPE = contentType;
  execSync('node scripts/generate-daily-post.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to generate post');
  process.exit(1);
}

console.log('');
console.log('Step 2: Review the generated file');
console.log('Edit the file in src/content/blog/ before committing.');
console.log('');

// Step 3: Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Ready to commit? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    try {
      // Step 4: Add files
      console.log('\nStep 3: Adding files to git...');
      execSync('git add src/content/blog/*.md', { stdio: 'inherit' });

      // Step 5: Check for changes
      const status = execSync('git status --porcelain').toString();
      if (!status) {
        console.log('⚠️  No changes to commit');
        rl.close();
        return;
      }

      // Step 6: Commit with conventional commit format
      console.log('Step 4: Creating commit...');
      const commitMessage = `feat(blog): add daily post about ${topic}`;
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

      // Step 7: Ask about pushing
      rl.question('\nPush to remote repository? (yes/no): ', (pushAnswer) => {
        if (pushAnswer.toLowerCase() === 'yes' || pushAnswer.toLowerCase() === 'y') {
          console.log('Step 5: Pushing to remote...');
          try {
            execSync('git push', { stdio: 'inherit' });
            console.log('\n✅ Successfully pushed!');
            console.log('🚀 Deployment will be triggered automatically.');
          } catch (error) {
            console.error('❌ Failed to push:', error.message);
          }
        } else {
          console.log('\n💾 Changes committed locally. Push manually when ready.');
          console.log('   Run: git push');
        }
        rl.close();
      });

    } catch (error) {
      console.error('❌ Git operation failed:', error.message);
      rl.close();
      process.exit(1);
    }
  } else {
    console.log('\n💾 File created but not committed.');
    console.log('You can commit it later manually.');
    rl.close();
  }
});
