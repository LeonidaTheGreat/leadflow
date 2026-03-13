// Test the extractInfo function
function extractInfo(message) {
  const info = {};
  const msg = message.toLowerCase();
  
  // Extract name - strict patterns to avoid false matches
  const commonWords = /\b(looking|searching|interested|already|just|trying|thinking|wondering|here|there|back|sorry|confused|ready|excited|happy|sad|tired|busy|available)\b/i;
  
  const explicitNameMatch = message.match(/my name is\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
  if (explicitNameMatch && !commonWords.test(explicitNameMatch[1])) {
    info.name = explicitNameMatch[1].trim();
  } else {
    const imMatch = message.match(/i['']?m\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)(?:\s|$|[,.])/i);
    if (imMatch && !commonWords.test(imMatch[1]) && imMatch[1].length > 2) {
      info.name = imMatch[1].trim();
    }
  }
  
  // Extract phone and normalize to E.164 format
  const phoneMatch = message.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) {
    let phone = phoneMatch[1].replace(/[\s\-\.\(\)]/g, '');
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('1') ? '+' + phone : '+1' + phone;
    }
    info.phone = phone;
  }
  
  // Extract property interest
  const interestPatterns = [
    /(?:house|condo|apartment|property|home)[^.]*?(?:in|at|near)\s+([^.]+)/i,
    /(\d+\s*(?:bed|br|bedroom)[^.]*(?:house|condo|apartment))/i,
    /((?:house|condo|apartment|property|home)[^.]{3,100})/i
  ];
  for (const pattern of interestPatterns) {
    const propMatch = message.match(pattern);
    if (propMatch) {
      info.propertyInterest = propMatch[0].trim();
      break;
    }
  }
  
  // Extract bedrooms
  const bedMatch = message.match(/(\d+)\s*(?:bed|bedroom|br)/i);
  if (bedMatch) info.bedrooms = parseInt(bedMatch[1]);
  
  // Extract bathrooms
  const bathMatch = message.match(/(\d+)\s*(?:bath|bathroom|ba)/i);
  if (bathMatch) info.bathrooms = parseInt(bathMatch[1]);
  
  // Extract budget
  const budgetPatterns = [
    /(?:budget|price|up to|around|about)\s*(?:\$)?([\d,]+(?:k|K)?)/i,
    /([\d,]+(?:k|K)?)\s*(?:budget|price|range)/i,
    /\$([\d,]+(?:k|K)?)/i
  ];
  for (const pattern of budgetPatterns) {
    const budgetMatch = message.match(pattern);
    if (budgetMatch) {
      info.budget = budgetMatch[1];
      break;
    }
  }
  
  // Extract pre-approval status
  if ((msg.includes('pre-approved') || msg.includes('pre approved') || msg.includes('preapproval') || msg.includes('pre-approval')) && 
      (msg.includes('yes') || msg.includes('yeah') || msg.includes('got') || msg.includes('have') || msg.includes('already'))) {
    info.preApproved = 'yes';
  } else if ((msg.includes('pre-approved') || msg.includes('pre approved') || msg.includes('preapproval')) && 
             (msg.includes('no') || msg.includes('not') || msg.includes("haven't") || msg.includes('dont'))) {
    info.preApproved = 'no';
  }
  
  // Extract timeline
  if (/\d+\s*(?:month|week|day|year)/i.test(message)) {
    const match = message.match(/(\d+\s*(?:month|week|day|year)s?)/i);
    if (match) info.timeline = match[1];
  } else if (/(?:asap|immediately|soon|right away)/i.test(message)) {
    info.timeline = 'ASAP';
  } else if (/(?:next|this)\s+(?:month|week|spring|summer|fall|winter)/i.test(message)) {
    const match = message.match(/((?:next|this)\s+(?:month|week|spring|summer|fall|winter))/i);
    if (match) info.timeline = match[1];
  }
  
  return info;
}

function classifyLead(info) {
  if (info.preApproved === 'yes' && info.timeline && !info.timeline.includes('year')) {
    return 'HOT';
  } else if (info.budget && info.propertyInterest && (info.preApproved === 'yes' || info.timeline)) {
    return 'WARM';
  }
  return 'COLD';
}

// Test with the message
const message = "Hi, my name is Jennifer Wilson. I'm looking for a 4 bedroom 3 bathroom house in Miami. My budget is $750k and I'm pre-approved. I want to move in 1 month. My number is 305-555-7777";

console.log('Testing extraction...\n');
const info = extractInfo(message);
console.log('Extracted info:', info);
console.log('\nClassification:', classifyLead(info));

// Build background
const backgroundParts = [];
if (info.propertyInterest) backgroundParts.push(`Looking for: ${info.propertyInterest}`);
if (info.bedrooms) backgroundParts.push(`Bedrooms: ${info.bedrooms}`);
if (info.bathrooms) backgroundParts.push(`Bathrooms: ${info.bathrooms}`);
if (info.budget) backgroundParts.push(`Budget: $${info.budget}`);
if (info.preApproved) backgroundParts.push(`Pre-approved: ${info.preApproved}`);
if (info.timeline) backgroundParts.push(`Timeline: ${info.timeline}`);
backgroundParts.push(`Lead Classification: ${classifyLead(info)}`);

console.log('\nBackground that will be sent:');
console.log(backgroundParts.join('\n'));
