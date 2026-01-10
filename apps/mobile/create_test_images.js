const { createCanvas } = require('canvas');
const fs = require('fs');

// Create front card image
function createFrontCard() {
  const canvas = createCanvas(350, 490);
  const ctx = canvas.getContext('2d');
  
  // Yellow background (Pokemon card style)
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, 350, 490);
  
  // Border
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 330, 470);
  
  // Inner frame
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(25, 60, 300, 200);
  
  // Pokemon name area
  ctx.fillStyle = '#333';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('PIKACHU', 25, 45);
  
  // HP
  ctx.fillStyle = '#FF0000';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('HP 60', 260, 45);
  
  // Pokemon silhouette (simple circle for test)
  ctx.fillStyle = '#FFE55C';
  ctx.beginPath();
  ctx.arc(175, 160, 70, 0, Math.PI * 2);
  ctx.fill();
  
  // Attack info area
  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(25, 280, 300, 80);
  ctx.fillRect(25, 370, 300, 80);
  
  // Attack text
  ctx.fillStyle = '#333';
  ctx.font = '16px Arial';
  ctx.fillText('Thunder Shock    20', 35, 320);
  ctx.fillText('Thunderbolt      50', 35, 410);
  
  // Weakness/Resistance
  ctx.font = '12px Arial';
  ctx.fillText('Weakness: Ground', 25, 465);
  ctx.fillText('Retreat Cost: 1', 220, 465);
  
  return canvas.toBuffer('image/png');
}

// Create back card image  
function createBackCard() {
  const canvas = createCanvas(350, 490);
  const ctx = canvas.getContext('2d');
  
  // Blue background
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(0, 0, 350, 490);
  
  // Border pattern
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 4;
  ctx.strokeRect(15, 15, 320, 460);
  
  // Pokeball design
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(175, 245, 100, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.arc(175, 245, 100, Math.PI, 0);
  ctx.fill();
  
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(75, 240, 200, 10);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(175, 245, 30, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(175, 245, 30, 0, Math.PI * 2);
  ctx.stroke();
  
  // Pokemon TCG text
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('POKEMON', 175, 400);
  ctx.font = '14px Arial';
  ctx.fillText('TRADING CARD GAME', 175, 420);
  
  return canvas.toBuffer('image/png');
}

// Check if canvas is available
try {
  fs.writeFileSync('assets/test-card-front.png', createFrontCard());
  fs.writeFileSync('assets/test-card-back.png', createBackCard());
  console.log('Test images created successfully!');
} catch (error) {
  console.log('Canvas not available, creating placeholder images...');
  // Fallback: output error for alternative approach
  process.exit(1);
}
