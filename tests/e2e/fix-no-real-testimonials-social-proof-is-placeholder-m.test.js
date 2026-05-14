'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PAGE_PATH = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/page.tsx'
);

function getTestimonialsSection(source) {
  const start = source.indexOf('<section id="testimonials"');
  const end = source.indexOf('</section>', start);
  if (start === -1 || end === -1) return '';
  return source.slice(start, end);
}

(function run() {
  const source = fs.readFileSync(PAGE_PATH, 'utf8');
  const section = getTestimonialsSection(source);

  assert(section.length > 0, 'Testimonials section must exist on landing page');

  assert(
    section.includes('What Early Agents Are Saying'),
    'Social proof heading must use quote-oriented testimonial language'
  );

  const testimonialCardUsage = (section.match(/<TestimonialCard/g) || []).length;
  assert(
    testimonialCardUsage >= 1,
    'Testimonials section must render TestimonialCard components'
  );

  const quoteMatches = source.match(/quote:\s*'"/g) || [];
  assert(
    quoteMatches.length >= 3,
    'At least 3 testimonial quotes must be present'
  );

  const hasAttribution =
    source.includes("role: 'Phoenix Buyer Agent'") &&
    source.includes("role: 'Tampa Team Lead'") &&
    source.includes("role: 'Austin Listing Agent'");

  assert(hasAttribution, 'Each testimonial must include agent role attribution');

  assert(
    !section.includes('label="Response Time"') &&
      !section.includes('label="Always-On Coverage"') &&
      !section.includes('label="More Appointments Booked"'),
    'Placeholder capability stat cards must not be used as social proof'
  );

  console.log('PASS fix-no-real-testimonials-social-proof-is-placeholder-m');
})();
