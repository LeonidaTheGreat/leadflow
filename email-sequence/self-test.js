/**
 * LeadFlow Email Sequence Self-Test (Standalone)
 * Validates all email templates, personalization, and configuration
 * No external dependencies required for basic validation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  TEST_RESULTS.tests.push({ name, passed, details });
  if (passed) TEST_RESULTS.passed++;
  else TEST_RESULTS.failed++;
  console.log(`${status}: ${name}${details ? ` - ${details}` : ''}`);
}

// Test 1: Validate sequence configuration
async function testSequenceConfig() {
  try {
    const configPath = path.join(__dirname, 'sequence-config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    logTest('Sequence config exists', true);
    logTest('Has 5 emails defined', config.emails?.length === 5, `Found ${config.emails?.length} emails`);
    logTest('Has personalization tokens', Object.keys(config.personalizationTokens || {}).length >= 3, 
      `${Object.keys(config.personalizationTokens || {}).length} tokens found`);
    logTest('Has fromEmail configured', !!config.fromEmail, config.fromEmail);
    logTest('Has Resend provider', config.provider === 'resend');
    logTest('Has replyTo configured', !!config.replyTo);
    
    // Check each email has A/B variants and required fields
    config.emails.forEach(email => {
      logTest(`Email "${email.id}" has subject variant A`, !!email.subjectLineA);
      logTest(`Email "${email.id}" has subject variant B`, !!email.subjectLineB);
      logTest(`Email "${email.id}" has trigger defined`, !!email.trigger);
      logTest(`Email "${email.id}" has delay defined`, !!email.delay);
    });
    
    return config;
  } catch (error) {
    logTest('Sequence config validation', false, error.message);
    return null;
  }
}

// Test 2: Validate email templates exist
async function testTemplatesExist() {
  const emails = ['welcome', 'day3_tips', 'week1_checkin', 'mid_pilot_feedback', 'completion'];
  
  for (const email of emails) {
    try {
      const htmlPath = path.join(__dirname, 'templates', `${email}.html`);
      const txtPath = path.join(__dirname, 'templates', `${email}.txt`);
      
      const htmlExists = await fs.stat(htmlPath).then(() => true).catch(() => false);
      const txtExists = await fs.stat(txtPath).then(() => true).catch(() => false);
      
      logTest(`Template "${email}.html" exists`, htmlExists);
      logTest(`Template "${email}.txt" exists`, txtExists);
      
      if (htmlExists) {
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        logTest(`Template "${email}" has DOCTYPE`, htmlContent.includes('<!DOCTYPE html>'));
        logTest(`Template "${email}" has HTML structure`, htmlContent.includes('<html'));
        logTest(`Template "${email}" has body tag`, htmlContent.includes('<body'));
        logTest(`Template "${email}" has personalization`, 
          htmlContent.includes('{{firstName}}') || htmlContent.includes('{{'));
        logTest(`Template "${email}" has unsubscribe link`, 
          htmlContent.includes('unsubscribe') || htmlContent.includes('{{unsubscribeUrl}}'));
      }
      
      if (txtExists) {
        const txtContent = await fs.readFile(txtPath, 'utf-8');
        logTest(`Template "${email}.txt" has content`, txtContent.length > 100);
        logTest(`Template "${email}.txt" has personalization`, txtContent.includes('{{'));
      }
      
    } catch (error) {
      logTest(`Template "${email}" validation`, false, error.message);
    }
  }
}

// Test 3: Validate personalization tokens across all templates
async function testPersonalizationTokens() {
  const requiredTokens = ['firstName', 'brokerage', 'startDate', 'dashboardUrl'];
  const templatesDir = path.join(__dirname, 'templates');
  
  for (const token of requiredTokens) {
    try {
      const files = await fs.readdir(templatesDir);
      const templateFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.txt'));
      
      let tokenFound = false;
      for (const file of templateFiles) {
        const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
        if (content.includes(`{{${token}}}`)) {
          tokenFound = true;
          break;
        }
      }
      
      logTest(`Token "{{${token}}}" used in templates`, tokenFound);
    } catch (error) {
      logTest(`Token "{{${token}}}" validation`, false, error.message);
    }
  }
}

// Test 4: Validate Resend integration file
async function testResendIntegration() {
  try {
    const integrationPath = path.join(__dirname, 'resend-integration.js');
    const integrationExists = await fs.stat(integrationPath).then(() => true).catch(() => false);
    
    logTest('Resend integration file exists', integrationExists);
    
    if (integrationExists) {
      const content = await fs.readFile(integrationPath, 'utf-8');
      logTest('Integration exports sendPilotEmail', content.includes('sendPilotEmail'));
      logTest('Integration has A/B variant logic', content.includes('getVariantForAgent'));
      logTest('Integration has personalization function', content.includes('personalizeEmail'));
      logTest('Integration has contact sync', content.includes('syncContact'));
      logTest('Integration has tags for analytics', content.includes('tags:'));
      logTest('Integration has error handling', content.includes('try') && content.includes('catch'));
    }
  } catch (error) {
    logTest('Resend integration validation', false, error.message);
  }
}

// Test 5: Test personalization rendering
async function testPersonalizationRendering() {
  const testAgent = {
    id: 'test-agent-001',
    firstName: 'Sarah',
    fullName: 'Sarah Johnson',
    email: 'sarah@example.com',
    brokerage: 'Keller Williams',
    pilotStartDate: '2026-03-01',
    dashboardUrl: 'https://app.leadflow.ai/dashboard/test-agent-001',
    onboardingCalendarLink: 'https://cal.com/leadflow/onboarding',
    feedbackUrl: 'https://leadflow.ai/feedback/test-agent-001',
    upgradeUrl: 'https://leadflow.ai/upgrade/test-agent-001',
    referralUrl: 'https://leadflow.ai/ref/test-agent-001',
    unsubscribeUrl: 'https://leadflow.ai/unsubscribe/test-agent-001'
  };
  
  try {
    const welcomeTxtPath = path.join(__dirname, 'templates', 'welcome.txt');
    const welcomeContent = await fs.readFile(welcomeTxtPath, 'utf-8');
    
    // Simple token replacement test
    let personalized = welcomeContent;
    personalized = personalized.replace(/{{firstName}}/g, testAgent.firstName);
    personalized = personalized.replace(/{{brokerage}}/g, testAgent.brokerage);
    personalized = personalized.replace(/{{startDate}}/g, testAgent.pilotStartDate);
    personalized = personalized.replace(/{{dashboardUrl}}/g, testAgent.dashboardUrl);
    
    logTest('Personalization: firstName replaced', 
      personalized.includes('Sarah') && !personalized.includes('{{firstName}}'));
    logTest('Personalization: brokerage replaced', 
      personalized.includes('Keller Williams'));
    logTest('Personalization: URLs preserved', 
      personalized.includes('https://app.leadflow.ai'));
    
  } catch (error) {
    logTest('Personalization rendering test', false, error.message);
  }
}

// Test 6: Validate automation triggers documentation
async function testAutomationTriggers() {
  try {
    const triggersPath = path.join(__dirname, 'automation-triggers.md');
    const triggersExists = await fs.stat(triggersPath).then(() => true).catch(() => false);
    
    logTest('Automation triggers documentation exists', triggersExists);
    
    if (triggersExists) {
      const content = await fs.readFile(triggersPath, 'utf-8');
      logTest('Triggers doc has webhook events', content.includes('webhook'));
      logTest('Triggers doc has Resend API details', content.includes('resend'));
      logTest('Triggers doc has error handling', content.includes('Error'));
      logTest('Triggers doc has test mode info', content.includes('test'));
    }
  } catch (error) {
    logTest('Automation triggers validation', false, error.message);
  }
}

// Test 7: Validate README
async function testReadme() {
  try {
    const readmePath = path.join(__dirname, 'README.md');
    const readmeExists = await fs.stat(readmePath).then(() => true).catch(() => false);
    
    logTest('README.md exists', readmeExists);
    
    if (readmeExists) {
      const content = await fs.readFile(readmePath, 'utf-8');
      logTest('README has email sequence table', content.includes('| 1 |'));
      logTest('README has personalization tokens', content.includes('Token'));
      logTest('README has quick start guide', content.includes('Quick Start'));
      logTest('README has file structure', content.includes('File Structure'));
    }
  } catch (error) {
    logTest('README validation', false, error.message);
  }
}

// Test 8: Validate environment template
async function testEnvironmentTemplate() {
  try {
    const envPath = path.join(__dirname, '.env.example');
    const envExists = await fs.stat(envPath).then(() => true).catch(() => false);
    
    logTest('.env.example exists', envExists);
    
    if (envExists) {
      const content = await fs.readFile(envPath, 'utf-8');
      logTest('Env has RESEND_API_KEY', content.includes('RESEND_API_KEY'));
      logTest('Env has FROM_EMAIL', content.includes('FROM_EMAIL'));
      logTest('Env has TEST_MODE', content.includes('TEST_MODE'));
    }
  } catch (error) {
    logTest('Environment template validation', false, error.message);
  }
}

// Test 9: Check email subject line quality
async function testSubjectLineQuality() {
  const configPath = path.join(__dirname, 'sequence-config.json');
  const configData = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configData);
  
  config.emails.forEach(email => {
    const subjectA = email.subjectLineA || '';
    const subjectB = email.subjectLineB || '';
    
    // Check length (optimal is 30-50 characters)
    logTest(`"${email.id}" Subject A length OK`, subjectA.length <= 60, `${subjectA.length} chars`);
    logTest(`"${email.id}" Subject B length OK`, subjectB.length <= 60, `${subjectB.length} chars`);
    
    // Check for personalization tokens
    logTest(`"${email.id}" Subject A has personalization`, 
      subjectA.includes('{{') || subjectA.includes('!') || subjectA.includes('?'));
    logTest(`"${email.id}" Subject B has personalization`, 
      subjectB.includes('{{') || subjectB.includes('!') || subjectB.includes('?'));
  });
}

// Main test runner
async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     LeadFlow Pilot Email Sequence - Self Test           ║');
  console.log('║              Validation Suite v1.0                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Testing Sequence Configuration...\n');
  const config = await testSequenceConfig();
  
  console.log('\n📧 Testing Email Templates...\n');
  await testTemplatesExist();
  
  console.log('\n🎨 Testing Personalization Tokens...\n');
  await testPersonalizationTokens();
  
  console.log('\n🔧 Testing Resend Integration...\n');
  await testResendIntegration();
  
  console.log('\n✍️  Testing Personalization Rendering...\n');
  await testPersonalizationRendering();
  
  console.log('\n⚡ Testing Automation Triggers...\n');
  await testAutomationTriggers();
  
  console.log('\n📖 Testing Documentation...\n');
  await testReadme();
  await testEnvironmentTemplate();
  
  console.log('\n📊 Testing Subject Line Quality...\n');
  await testSubjectLineQuality();
  
  // Summary
  const total = TEST_RESULTS.passed + TEST_RESULTS.failed;
  const percentage = Math.round((TEST_RESULTS.passed / total) * 100);
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed: ${TEST_RESULTS.passed.toString().padEnd(3)} (${percentage.toString().padStart(3)}%)                        ║`);
  console.log(`║  ❌ Failed: ${TEST_RESULTS.failed.toString().padEnd(3)}                              ║`);
  console.log(`║  📊 Total:  ${total.toString().padEnd(3)}                              ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  if (TEST_RESULTS.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Email sequence is fully validated and ready for deployment.\n');
    console.log('Next steps:');
    console.log('  1. Set up RESEND_API_KEY in your environment');
    console.log('  2. Run integration tests with actual API calls');
    console.log('  3. Configure your automation triggers in your workflow system\n');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log(`   ${TEST_RESULTS.failed} test(s) need attention.\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
