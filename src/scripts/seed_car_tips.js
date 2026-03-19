/**
 * seed_car_tips.js
 * Run once to populate the `car_tips` collection in Firestore.
 * Usage: node src/scripts/seed_car_tips.js
 */
require('dotenv').config();
require('../config/firebase'); // initialises Firebase Admin
const { db } = require('../config/firebase');

const tips = [
  { emoji: '🔋', category: 'Battery',    tip: 'If your battery is more than 3 years old, have it tested before cold weather arrives — cold temperatures can cut battery capacity by up to 50%.' },
  { emoji: '🛞', category: 'Tires',      tip: 'Rotate your tires every 5,000–8,000 miles to ensure even wear and extend their life by up to 20%.' },
  { emoji: '🌡️', category: 'Cooling',    tip: 'Check your coolant level when the engine is cold. Low coolant is one of the top causes of engine overheating.' },
  { emoji: '💧', category: 'Fluids',     tip: 'Top up your windshield washer fluid regularly — visibility is critical for safe driving, especially in rain or dust.' },
  { emoji: '🔧', category: 'Engine',     tip: 'Change your engine oil every 5,000–10,000 km depending on your car model. Clean oil keeps your engine running smoothly.' },
  { emoji: '💨', category: 'Tires',      tip: 'Keep your tires inflated to the recommended PSI. Under-inflated tires reduce fuel efficiency by up to 3% and wear out faster.' },
  { emoji: '🚗', category: 'General',    tip: "Warm up your car for 30 seconds before driving in cold weather — modern engines don't need long warm-ups, but a brief idle helps." },
  { emoji: '🛑', category: 'Brakes',     tip: 'Brake pads should be replaced when they reach 3 mm thickness. Squeaking or grinding sounds are a clear warning sign.' },
  { emoji: '🔦', category: 'Lighting',   tip: 'Check all your lights monthly — headlights, taillights, and indicators. A faulty light can lead to accidents and fines.' },
  { emoji: '🧴', category: 'Engine',     tip: 'Use the correct grade of engine oil for your car. Using the wrong viscosity can reduce efficiency and damage the engine over time.' },
  { emoji: '🪟', category: 'Visibility', tip: 'Clean your windshield inside and out regularly. Interior fogging is often caused by a film of grime on the inside of the glass.' },
  { emoji: '⚙️', category: 'General',    tip: "If your check engine light comes on, don't ignore it. Even if the car seems fine, it could be an early warning of a serious issue." },
  { emoji: '🧯', category: 'Safety',     tip: 'Keep a basic emergency kit in your car: a torch, jumper cables, a first aid kit, and a reflective triangle.' },
  { emoji: '🌬️', category: 'Filters',    tip: "Replace your cabin air filter every 15,000–25,000 km. A clogged filter reduces airflow and can affect your AC's performance." },
  { emoji: '⛽', category: 'Fuel',       tip: "Avoid running your fuel tank below a quarter full. The fuel pump uses fuel to stay cool — running low can shorten its life." },
  { emoji: '🔩', category: 'Alignment',  tip: 'Have your wheel alignment checked once a year or after hitting a major pothole. Misalignment causes uneven tire wear and poor handling.' },
  { emoji: '🏁', category: 'Driving',    tip: 'Smooth acceleration and braking can improve your fuel economy by up to 15%. Avoid aggressive driving habits.' },
  { emoji: '🌧️', category: 'Visibility', tip: 'Replace windshield wipers every 6–12 months. Worn blades leave streaks and reduce visibility in heavy rain.' },
  { emoji: '🔑', category: 'General',    tip: 'If your key fob battery is weak, your car may not detect it reliably. Replace the battery as soon as the range decreases.' },
  { emoji: '🚿', category: 'Body',       tip: 'Wash the underside of your car after driving on salty or muddy roads to prevent rust from developing on the chassis.' },
  { emoji: '📅', category: 'Servicing',  tip: 'Schedule a full service at least once a year even if nothing seems wrong. Prevention is always cheaper than repairs.' },
  { emoji: '🧲', category: 'Safety',     tip: 'Loose or missing wheel nuts are a serious safety risk. Have the torque checked after any tire change or rotation.' },
  { emoji: '🌞', category: 'General',    tip: 'Park in the shade when possible. UV rays fade your interior and excessive heat can crack your dashboard and degrade your battery.' },
  { emoji: '📡', category: 'Tires',      tip: "If your car has a TPMS warning light, check all four tires immediately — one may be significantly low without looking flat." },
  { emoji: '🛢️', category: 'Fluids',     tip: 'Check your transmission fluid level and colour. Dark or burnt-smelling fluid is a sign it needs to be replaced.' },
  { emoji: '🔊', category: 'General',    tip: "Unusual noises like clicking, knocking, or squealing are your car's way of asking for help — don't wait to get them checked." },
  { emoji: '🧹', category: 'Engine',     tip: 'Keep your engine bay clean. A build-up of oil, dirt, and debris can hide leaks and make it harder to spot problems early.' },
  { emoji: '🏔️', category: 'Safety',     tip: 'Before a long trip, check your tires, oil, coolant, and brakes. A pre-trip inspection takes 10 minutes and can prevent breakdowns.' },
  { emoji: '🔐', category: 'Security',   tip: 'Never leave your car running and unattended, even for a minute. It is not only a theft risk but illegal in many areas.' },
  { emoji: '🌿', category: 'Eco',        tip: "Reducing idling saves fuel and reduces emissions. If you're stopped for more than 60 seconds, it's more efficient to switch off the engine." },
];

async function seed() {
  const col = db.collection('car_tips');

  // Check if already seeded
  const existing = await col.limit(1).get();
  if (!existing.empty) {
    console.log('⚠️  car_tips collection already has data. Skipping seed.');
    console.log('   To re-seed, delete the collection in Firebase Console first.');
    process.exit(0);
  }

  console.log(`Seeding ${tips.length} car tips into Firestore...`);

  const batch = db.batch();
  tips.forEach((t, i) => {
    const ref = col.doc(); // auto-ID
    batch.set(ref, {
      ...t,
      dayIndex: i,        // 0-based order used for daily rotation
      active: true,
      createdAt: new Date().toISOString(),
    });
  });

  await batch.commit();
  console.log(`✅  Seeded ${tips.length} tips successfully!`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});