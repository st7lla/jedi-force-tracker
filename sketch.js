let capture;
let handpose;
let hands = [];
let stars = [];
let forceparticles = [];
let lightningbolts = [];
let handtracker = { x: 0, y: 0, detected: false, prevx: 0, prevy: 0 };
let forcelevel = 0;
let handgesture = "neutral";
let ismodelready = false;
let preferredhand = "Right"; 
let textglitchoffset = 0;
const sith_lightning_blue = [100, 150, 255];
const sith_lightning_cyan = [0, 255, 255];
const sith_dark_purple = [75, 0, 130];
const sith_energy_purple = [138, 43, 226];
const sith_red = [220, 20, 60];
const dark_space = [5, 5, 15];

function setup() {
  createCanvas(1280, 1024);
  console.log("Starting Sith Dark Force Lightning Tracker...");
  
  
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      z: random(2000),
      speed: random(0.5, 3),
      twinkle: random(TWO_PI),
      brightness: random(150, 255)
    });
  }
  
  
  for (let i = 0; i < 50; i++) {
    forceparticles.push(new forceparticle());
  }
  
  
  initializecamera();
}

function initializecamera() {
  try {
    capture = createCapture(VIDEO, videoready);
    capture.size(640, 480);
    capture.hide();
    console.log("Camera initialization started...");
  } catch (error) {
    console.log("Error initializing camera:", error);
  }
}

function videoready() {
  console.log("Video ready, initializing handpose...");
  
  
  const options = {
    flipHorizontal: false,
    maxNumHands: 2, 
    scoreThreshold: 0.7, 
    iouThreshold: 0.3
  };
  
  handpose = ml5.handPose(capture, options, modelready);
}

function modelready() {
  console.log("HandPose model ready!");
  ismodelready = true;
  
  detecthands();
}

function detecthands() {
  if (handpose && capture) {
    handpose.detect(capture, gothands);
  }
}

function gothands(predictions) {
  hands = predictions;
  if (predictions.length > 0) {
    console.log("Hand detected! Confidence:", predictions[0].confidence);
  }
  
  if (ismodelready) {
    detecthands();
  }
}

function draw() {
  
  drawspacebackground();
  
  
  drawstarfield();
  
  
  drawvideofeed();
  
  
  processhandtracking();
  
  
  processforcegestures();
  
  
  if (handtracker.detected) {
    drawforceeffects();
  }
  
  
  updateforceparticles();
  
  
  updatelightning();
  
  
  drawdeathstar();
  
  
  drawforceui();
}

function processhandtracking() {
  if (!ismodelready || hands.length === 0) {
    handtracker.detected = false;
    forcelevel *= 0.95;
    return;
  }
  
  
  let hand = null;
  let righthand = hands.find(h => h.handedness === "Right");
  let lefthand = hands.find(h => h.handedness === "Left");
  
  if (righthand && righthand.confidence > 0.5) {
    hand = righthand;
    preferredhand = "Right";
  } else if (lefthand && lefthand.confidence > 0.5) {
    hand = lefthand;
    preferredhand = "Left";
  } else if (hands.length > 0 && hands[0].confidence > 0.5) {
    hand = hands[0];
    preferredhand = hand.handedness || "Right";
  }
  
  if (hand && hand.confidence > 0.5) {
    handtracker.prevx = handtracker.x;
    handtracker.prevy = handtracker.y;
    
    
    let wrist = hand.keypoints.find(kp => kp.name === "wrist");
    if (!wrist) {
      
      let centerx = 0;
      let centery = 0;
      for (let keypoint of hand.keypoints) {
        centerx += keypoint.x;
        centery += keypoint.y;
      }
      centerx /= hand.keypoints.length;
      centery /= hand.keypoints.length;
      wrist = { x: centerx, y: centery };
    }
    
    
    handtracker.x = width - map(wrist.x, 0, capture.width, 0, width);
    handtracker.y = map(wrist.y, 0, capture.height, 0, height);
    handtracker.detected = true;
    
    let movement = dist(handtracker.x, handtracker.prevx, handtracker.y, handtracker.prevy);
    forcelevel = map(movement, 0, 50, 100, 255);
    forcelevel = constrain(forcelevel, 100, 255);
    
    handtracker.keypoints = hand.keypoints;
    handtracker.handedness = hand.handedness;
    
  } else {
    handtracker.detected = false;
    forcelevel *= 0.9;
  }
}

function processforcegestures() {
  if (!handtracker.detected || !handtracker.keypoints) return;
  
  let keypoints = handtracker.keypoints;
  
  
  if (keypoints.length < 9) return;
  
  let thumbtip = keypoints[4];
  let indextip = keypoints[8];
  
  let thumbx = width - map(thumbtip.x, 0, capture.width, 0, width);
  let thumby = map(thumbtip.y, 0, capture.height, 0, height);
  let indexx = width - map(indextip.x, 0, capture.width, 0, width);
  let indexy = map(indextip.y, 0, capture.height, 0, height);
  
  let velx = handtracker.x - handtracker.prevx;
  let vely = handtracker.y - handtracker.prevy;
  let velocity = sqrt(velx * velx + vely * vely);
  
  let thumbindexdistance = dist(thumbx, thumby, indexx, indexy);
  
  
  if (thumbindexdistance < 80) {  
    handgesture = "force_lightning";
    forcelevel = max(forcelevel, 200);
    console.log("FORCE LIGHTNING DETECTED! Distance:", thumbindexdistance);
  } else if (velocity > 10 && velx > abs(vely) && velx > 0) {
    handgesture = "force_push";
  } else if (velocity > 10 && velx < -abs(vely)) {
    handgesture = "force_pull";
  } else if (velocity > 10 && vely < -abs(velx)) {
    handgesture = "force_lift";
  } else if (velocity > 10 && vely > abs(velx)) {
    handgesture = "force_slam";
  } else {
    handgesture = "neutral";
  }
}

function drawspacebackground() {
  
  for (let i = 0; i <= height; i++) {
    let inter = map(i, 0, height, 0, 1);
    let baser = lerp(5, 0, inter);
    let baseg = lerp(8, 2, inter);
    let baseb = lerp(25, 10, inter);
    
    
    let wave1 = sin(frameCount * 0.03 + i * 0.015) * 4;
    let wave2 = sin(frameCount * 0.02 + i * 0.01 + PI) * 3;
    let energypulse = wave1 + wave2;
    
    let r = baser + energypulse * 0.5;
    let g = baseg + energypulse;
    let b = baseb + energypulse * 2;
    
    
    if (forcelevel > 100) {
      let forceglow = map(forcelevel, 100, 255, 0, 8);
      g += forceglow;
      b += forceglow * 1.5;
    }
    
    stroke(r, g, b);
    line(0, i, width, i);
  }
  
  
  push();
  stroke(0, 150, 255, 15);
  strokeWeight(0.5);
  for (let x = 0; x < width; x += 50) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += 50) {
    line(0, y, width, y);
  }
  pop();
}

function drawstarfield() {
  noStroke();
  
  for (let star of stars) {
    star.z -= star.speed;
    star.twinkle += 0.05;
    
    if (star.z <= 0) {
      star.x = random(width);
      star.y = random(height);
      star.z = 2000;
      star.brightness = random(180, 255);
    }
    
    let x = map(star.x / star.z, 0, 1, 0, width);
    let y = map(star.y / star.z, 0, 1, 0, height);
    let size = map(star.z, 0, 2000, 5, 0);
    let twinkle = sin(star.twinkle) * 0.4 + 0.6;
    let alpha = star.brightness * twinkle;
    
    
    if (star.speed > 2) {
      fill(100, 200, 255, alpha * 0.2);
      circle(x, y, size * 3);
    }
    
    
    if (random() > 0.6) {
      fill(150, 240, 255, alpha * 0.8);
      circle(x, y, size * 1.3);
    }
    
    
    fill(255, 255, 255, alpha);
    circle(x, y, size);
    
    
    fill(255, 255, 255, alpha * 1.2);
    circle(x, y, size * 0.4);
  }
}

function drawvideofeed() {
  if (capture && capture.loadedmetadata) {
    
    let camx = 400; 
    let camy = height/2 - 240;
    let camw = 640;
    let camh = 480;
    
    push();
    translate(width, 0);
    scale(-1, 1);
    
    
    let scanlinealpha = 70;
    
    
    tint(100, 200, 255, scanlinealpha);
    image(capture, width - camx - camw, camy, camw, camh);
    
    
    if (handtracker.detected) {
      tint(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 40);
      image(capture, width - camx - camw, camy, camw, camh);
    }
    
    pop();
    
    
    push();
    noFill();
    stroke(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 150);
    strokeWeight(2);
    rect(camx, camy, camw, camh);
    
    
    let cornersize = 20;
    let x1 = camx;
    let y1 = camy;
    let x2 = camx + camw;
    let y2 = camy + camh;
    
    stroke(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 200);
    strokeWeight(3);
    
    
    line(x1, y1, x1 + cornersize, y1);
    line(x1, y1, x1, y1 + cornersize);
    
    line(x2, y1, x2 - cornersize, y1);
    line(x2, y1, x2, y1 + cornersize);
    
    line(x1, y2, x1 + cornersize, y2);
    line(x1, y2, x1, y2 - cornersize);
    
    line(x2, y2, x2 - cornersize, y2);
    line(x2, y2, x2, y2 - cornersize);
    
    pop();
  }
}

function drawforceeffects() {
  let x = handtracker.x;
  let y = handtracker.y;
  
  drawforceaura(x, y);
  
  switch (handgesture) {
    case "force_push":
      drawforcepush(x, y);
      break;
    case "force_pull":
      drawforcepull(x, y);
      break;
    case "force_lightning":
      drawforcelightning(x, y);  
      createlightning(x, y);
      break;
    case "force_lift":
      drawforcelift(x, y);
      break;
    case "force_slam":
      drawforceslam(x, y);
      break;
  }
}

function drawforceaura(x, y) {
  
  let coresize = 15 + sin(frameCount * 0.2) * 5;
  let outerglow = coresize * 3;
  
  
  fill(sith_energy_purple[0], sith_energy_purple[1], sith_energy_purple[2], forcelevel * 0.15);
  noStroke();
  circle(x, y, outerglow);
  
  
  fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], forcelevel * 0.3);
  circle(x, y, coresize * 2);
  
  
  fill(255, 255, 255, forcelevel * 0.9);
  circle(x, y, coresize);
  
  
  stroke(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], forcelevel * 0.6);
  strokeWeight(2);
  
  for (let i = 0; i < 8; i++) {
    let angle = (i / 8) * TWO_PI + frameCount * 0.15;
    let radius = 25 + sin(frameCount * 0.4 + i) * 10;
    
    let segments = 3;
    let prevx = x;
    let prevy = y;
    
    for (let j = 1; j <= segments; j++) {
      let t = j / segments;
      let targetx = x + cos(angle) * radius * t;
      let targety = y + sin(angle) * radius * t;
      
      targetx += random(-5, 5);
      targety += random(-5, 5);
      
      line(prevx, prevy, targetx, targety);
      prevx = targetx;
      prevy = targety;
    }
  }
}

function drawforcepush(x, y) {
  let wavesize = (frameCount * 10) % 300;
  
  for (let i = 0; i < 3; i++) {
    stroke(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 200 - wavesize);
    strokeWeight(5 - i);
    noFill();
    circle(x, y, wavesize + i * 20);
  }
}

function drawforcepull(x, y) {
  stroke(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 150);
  strokeWeight(2);
  noFill();
  
  for (let i = 0; i < 50; i++) {
    let angle = frameCount * 0.1 + i * 0.3;
    let radius = 100 - i * 2;
    let px = x + cos(angle) * radius;
    let py = y + sin(angle) * radius;
    
    if (radius > 0) {
      point(px, py);
    }
  }
}

function drawforcelift(x, y) {
  stroke(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 200);
  
  for (let i = 0; i < 10; i++) {
    let offsetX = sin(frameCount * 0.1 + i) * 30;
    strokeWeight(3 - i * 0.2);
    line(x + offsetX, y, x + offsetX, y - 150 - i * 10);
  }
}

function drawforceslam(x, y) {
  let impactsize = 50 + sin(frameCount * 0.3) * 20;
  
  stroke(sith_red[0], sith_red[1], sith_red[2], 150);
  strokeWeight(3);
  
  for (let i = 0; i < 8; i++) {
    let angle = i * PI / 4;
    let len = impactsize + random(20);
    line(x, y, x + cos(angle) * len, y + sin(angle) * len);
  }
}
function drawforcelightning(x, y) {
  
  let pulse = sin(frameCount * 0.5) * 0.3 + 0.7;
  
  
  fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 100 * pulse);
  noStroke();
  circle(x, y, 30 * pulse);
  
  
  fill(255, 255, 255, 200 * pulse);
  circle(x, y, 12 * pulse);
  
  
  stroke(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 220);
  strokeWeight(2);
  
  for (let i = 0; i < 10; i++) {
    let angle = (i / 10) * TWO_PI + frameCount * 0.2;
    let len = random(30, 70);
    let endx = x + cos(angle) * len;
    let endy = y + sin(angle) * len;
    
    let segments = 5;
    let prevx = x;
    let prevy = y;
    
    for (let j = 1; j <= segments; j++) {
      let t = j / segments;
      let nextx = lerp(x, endx, t) + random(-10, 10);
      let nexty = lerp(y, endy, t) + random(-10, 10);
      
      line(prevx, prevy, nextx, nexty);
      prevx = nextx;
      prevy = nexty;
    }
  }
}

function createlightning(x, y) {
  
  if (frameCount % 2 === 0) {
    for (let i = 0; i < 6; i++) {
      let angle = random(TWO_PI);
      let distance = random(100, 300);
      let targetx = x + cos(angle) * distance;
      let targety = y + sin(angle) * distance;
      lightningbolts.push(new lightningbolt(x, y, targetx, targety));
    }
  }
}

function updateforceparticles() {
  for (let i = forceparticles.length - 1; i >= 0; i--) {
    forceparticles[i].update();
    forceparticles[i].display();
    
    if (forceparticles[i].isDead()) {
      forceparticles.splice(i, 1);
    }
  }
  
  while (forceparticles.length < 30) {
    forceparticles.push(new forceparticle());
  }
}

function updatelightning() {
  for (let i = lightningbolts.length - 1; i >= 0; i--) {
    lightningbolts[i].update();
    lightningbolts[i].display();
    
    if (lightningbolts[i].isDead()) {
      lightningbolts.splice(i, 1);
    }
  }
}

function drawdeathstar() {
  push();
  
  translate(width - 100, 200);
  
  
  if (forcelevel > 50) {
    let glowpulse = sin(frameCount * 0.1) * 0.2 + 0.8;
    
    fill(sith_red[0], sith_red[1], sith_red[2], forcelevel * 0.3 * glowpulse);
    noStroke();
    circle(0, 0, 160);
    
    fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], forcelevel * 0.2 * glowpulse);
    circle(0, 0, 140);
  }
  
  
  fill(50, 50, 60);
  stroke(30, 30, 40);
  strokeWeight(2);
  circle(0, 0, 100);
  
  
  fill(80, 80, 90, 100);
  noStroke();
  arc(0, 0, 100, 100, PI, TWO_PI);
  
  
  fill(40, 40, 50);
  noStroke();
  circle(-15, -15, 20);
  circle(20, 8, 12);
  circle(-8, 25, 18);
  circle(12, -20, 10);
  circle(-25, 10, 8);
  circle(10, 25, 6);
  
  
  let laserintensity = map(forcelevel, 0, 255, 0.3, 1);
  let laserpulse = sin(frameCount * 0.3) * 0.3 + 0.7;
  
  
  fill(255, 150, 50, 150 * laserintensity * laserpulse);
  circle(15, -20, 30);
  
  
  fill(255, 200, 100, 200 * laserintensity * laserpulse);
  circle(15, -20, 25);
  
  
  fill(255, 255, 255, 255 * laserintensity);
  circle(15, -20, 10);
  
  
  if (forcelevel > 100) {
    for (let i = 0; i < 6; i++) {
      let angle = (i / 6) * TWO_PI + frameCount * 0.2;
      let dist = 20 + sin(frameCount * 0.3 + i) * 5;
      fill(255, 255, 200, 150 * laserintensity);
      circle(15 + cos(angle) * dist, -20 + sin(angle) * dist, 3);
    }
  }
  
  pop();
}

function drawforceui() {
  
  push();
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, 380, height);
  
  
  stroke(0, 255, 255, 15);
  strokeWeight(1);
  for (let i = 0; i < height; i += 4) {
    line(0, i + (frameCount * 2) % 4, 380, i + (frameCount * 2) % 4);
  }
  
  
  stroke(0, 150, 255, 20);
  strokeWeight(0.5);
  for (let x = 0; x < 380; x += 30) {
    line(x, 0, x, height);
  }
  pop();
  
  
  push();
  textAlign(LEFT);
  textFont("Orbitron");
  
  
  fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 240);
  textSize(32);
  textStyle(BOLD);
  text("DARK FORCE", 25, 50);
  
  fill(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 240);
  textSize(28);
  text("LIGHTNING", 25, 80);
  
  
  textFont("Rajdhani");
  fill(150, 200, 255, 180);
  textSize(12);
  textStyle(NORMAL);
  text("SITH POWER INTERFACE v2.0", 25, 105);
  
  
  stroke(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 100);
  strokeWeight(1);
  line(25, 120, 355, 120);
  pop();
  
  if (!ismodelready) {
    push();
    textFont("Rajdhani");
    fill(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 220);
    textSize(15);
    textAlign(LEFT);
    textStyle(BOLD);
    let loadingdots = ".".repeat((frameCount / 10) % 4);
    let loadingpulse = sin(frameCount * 0.2) * 0.2 + 0.8;
    fill(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 220 * loadingpulse);
    text(`INITIALIZING${loadingdots}`, 25, 160);
    pop();
    return;
  }
  
  if (handtracker.detected) {
    
    push();
    let statuspulse = sin(frameCount * 0.5) * 0.3 + 0.7;
    fill(0, 255, 100, 255 * statuspulse);
    noStroke();
    circle(25, 180, 10);
    fill(0, 255, 100, 80 * statuspulse);
    circle(25, 180, 20);
    fill(0, 255, 100, 40 * statuspulse);
    circle(25, 180, 30);
    pop();
    
    
    let forcepercent = int(map(forcelevel, 0, 255, 0, 100));
    push();
    textFont("Rajdhani");
    
    
    fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 200);
    textSize(14);
    textStyle(BOLD);
    text("FORCE LEVEL", 45, 185);
    
    
    let percentpulse = sin(frameCount * 0.3) * 0.15 + 0.85;
    fill(255, 255, 255, 255 * percentpulse);
    textSize(42);
    textStyle(BOLD);
    
    for (let i = 2; i > 0; i--) {
      fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 30 * i);
      textSize(42 + i * 2);
      text(`${forcepercent}%`, 25, 230);
    }
    fill(255, 255, 255, 255);
    textSize(42);
    text(`${forcepercent}%`, 25, 230);
    pop();
    
    
    let techniquename = handgesture.toUpperCase().replace('_', ' ');
    if (handgesture === "force_lightning") {
      techniquename = "FORCE LIGHTNING";
      push();
      textFont("Rajdhani");
      
      
      let lightningpulse = sin(frameCount * 0.4) * 0.3 + 0.7;
      fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 255 * lightningpulse);
      textSize(13);
      textStyle(BOLD);
      text("ACTIVE TECHNIQUE", 25, 265);
      
      
      for (let i = 3; i > 0; i--) {
        fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 40 * i);
        textSize(24 + i);
        text(techniquename, 25, 295);
      }
      fill(255, 255, 255, 255);
      textSize(24);
      textStyle(BOLD);
      text(techniquename, 25, 295);
      pop();
    } else {
      push();
      textFont("Rajdhani");
      fill(180, 200, 220, 200);
      textSize(13);
      textStyle(BOLD);
      text("ACTIVE TECHNIQUE", 25, 265);
      textSize(20);
      fill(200, 220, 240, 220);
      text(techniquename, 25, 290);
      pop();
    }
    
    
    push();
    textFont("Rajdhani");
    let activepulse = sin(frameCount * 0.3) * 0.2 + 0.8;
    fill(100, 255, 100, 255 * activepulse);
    textSize(12);
    textStyle(BOLD);
    text("● SYSTEM ACTIVE", 25, 315);
    pop();
    
  } else {
    
    push();
    let standbypulse = sin(frameCount * 0.3) * 0.3 + 0.7;
    fill(255, 200, 0, 255 * standbypulse);
    noStroke();
    circle(25, 180, 10);
    fill(255, 200, 0, 100 * standbypulse);
    circle(25, 180, 20);
    pop();
    
    push();
    textFont("Rajdhani");
    fill(200, 220, 240, 220);
    textSize(15);
    textStyle(BOLD);
    text("AWAITING INPUT", 45, 185);
    textSize(13);
    fill(150, 170, 190, 200);
    textStyle(NORMAL);
    text("Position hand in view", 25, 210);
    text("Pinch for Lightning", 25, 235);
    pop();
  }
  
  
  let barx = width - 300;
  let bary = 40;
  let barw = 260;
  let barh = 32;
  
  push();
  
  noFill();
  let frameglow = sin(frameCount * 0.2) * 0.2 + 0.8;
  stroke(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 180 * frameglow);
  strokeWeight(2);
  rect(barx, bary, barw, barh, 2);
  
  
  fill(10, 10, 20, 240);
  noStroke();
  rect(barx + 3, bary + 3, barw - 6, barh - 6, 2);
  
  
  let fillw = map(forcelevel, 0, 255, 0, barw - 6);
  fillw = constrain(fillw, 0, barw - 6); 
  
  if (fillw > 0) {
    
    fill(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], 220);
    rect(barx + 3, bary + 3, fillw, barh - 6, 2);
    
    
    let maxscanpos = max(0, fillw - 18);
    let scanpos = (frameCount * 4) % max(maxscanpos + 1, 1);
    scanpos = constrain(scanpos, 0, maxscanpos);
    
    
    if (scanpos + 18 <= fillw) {
      fill(255, 255, 255, 200);
      rect(barx + 3 + scanpos, bary + 3, 18, barh - 6, 1);
    }
    
    
    fill(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 180);
    rect(barx + 3, bary + 3, fillw * 0.75, barh - 6, 2);
    
    
    for (let i = 0; i < 3; i++) {
      let basex = barx + 3 + (fillw * (0.2 + i * 0.3));
      let particlex = basex + sin(frameCount * 0.3 + i) * 5;
      
      particlex = constrain(particlex, barx + 3, barx + 3 + fillw);
      fill(255, 255, 255, 150);
      circle(particlex, bary + barh/2, 2);
    }
  }
  
  
  textFont("Rajdhani");
  fill(200, 220, 255, 240);
  textSize(11);
  textStyle(BOLD);
  textAlign(RIGHT);
  text("POWER LEVEL", barx + barw - 5, bary - 8);
  textAlign(LEFT);
  pop();
  
  
  if (handtracker.detected) {
    push();
    translate(width/2, height/2);
    
    stroke(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], 120);
    strokeWeight(1.5);
    noFill();
    
    let reticlesize = 40;
    let pulse = sin(frameCount * 0.2) * 0.2 + 0.8;
    
    
    circle(0, 0, reticlesize * 2 * pulse);
    
    
    line(-reticlesize * pulse, 0, reticlesize * pulse, 0);
    line(0, -reticlesize * pulse, 0, reticlesize * pulse);
    
    
    let bracketsize = 15;
    line(-reticlesize * pulse, -reticlesize * pulse, -reticlesize * pulse + bracketsize, -reticlesize * pulse);
    line(-reticlesize * pulse, -reticlesize * pulse, -reticlesize * pulse, -reticlesize * pulse + bracketsize);
    
    line(reticlesize * pulse, -reticlesize * pulse, reticlesize * pulse - bracketsize, -reticlesize * pulse);
    line(reticlesize * pulse, -reticlesize * pulse, reticlesize * pulse, -reticlesize * pulse + bracketsize);
    
    line(-reticlesize * pulse, reticlesize * pulse, -reticlesize * pulse + bracketsize, reticlesize * pulse);
    line(-reticlesize * pulse, reticlesize * pulse, -reticlesize * pulse, reticlesize * pulse - bracketsize);
    
    line(reticlesize * pulse, reticlesize * pulse, reticlesize * pulse - bracketsize, reticlesize * pulse);
    line(reticlesize * pulse, reticlesize * pulse, reticlesize * pulse, reticlesize * pulse - bracketsize);
    
    pop();
  }
  
  
  push();
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, height - 70, width, 70);
  
  
  stroke(0, 255, 255, 10);
  strokeWeight(1);
  for (let i = height - 70; i < height; i += 3) {
    line(0, i + (frameCount * 1.5) % 3, width, i + (frameCount * 1.5) % 3);
  }
  
  textFont("Rajdhani");
  fill(150, 220, 255, 200);
  textSize(11);
  textStyle(BOLD);
  textAlign(LEFT);
  
  if (handtracker.detected) {
    let infopulse = sin(frameCount * 0.2) * 0.1 + 0.9;
    fill(100, 255, 150, 220 * infopulse);
    text(`HAND TRACKING: ACTIVE`, 20, height - 45);
    fill(150, 220, 255, 200);
    text(`X:${int(handtracker.x)} Y:${int(handtracker.y)} | GESTURE: ${handgesture.toUpperCase()}`, 20, height - 30);
  } else {
    fill(255, 200, 100, 200);
    text("HAND TRACKING: STANDBY | AWAITING HAND DETECTION", 20, height - 45);
  }
  
  fill(120, 180, 220, 180);
  textStyle(NORMAL);
  text(`FRAME: ${frameCount} | FPS: ${int(frameRate())}`, 20, height - 15);
  pop();
}

class forceparticle {
  constructor(x = random(width), y = random(height), vx = 0, vy = 0, color = sith_lightning_blue) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx + random(-2, 2), vy + random(-2, 2));
    this.acc = createVector(0, 0);
    this.life = 255;
    this.maxLife = 255;
    this.size = random(2, 5);
    this.color = color;
  }
  
  update() {
    if (handtracker.detected) {
      let target = createVector(handtracker.x, handtracker.y);
      let force = p5.Vector.sub(target, this.pos);
      let distance = force.mag();
      
      if (distance > 0) {
        force.normalize();
        force.mult(map(distance, 0, 200, 0.5, 0.1));
        this.acc.add(force);
      }
    }
    
    this.vel.add(this.acc);
    this.vel.mult(0.98);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.life -= 1;
    
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }
  
  display() {
    let alpha = map(this.life, 0, this.maxLife, 0, 255);
    
    
    fill(this.color[0], this.color[1], this.color[2], alpha * 0.2);
    noStroke();
    circle(this.pos.x, this.pos.y, this.size * 4);
    
    
    fill(this.color[0], this.color[1], this.color[2], alpha * 0.5);
    circle(this.pos.x, this.pos.y, this.size * 2);
    
    
    fill(this.color[0], this.color[1], this.color[2], alpha);
    circle(this.pos.x, this.pos.y, this.size);
    
    
    fill(255, 255, 255, alpha * 0.9);
    circle(this.pos.x, this.pos.y, this.size * 0.4);
  }
  
  isDead() {
    return this.life <= 0;
  }
}

class lightningbolt {
  constructor(startX, startY, endx, endy) {
    this.start = createVector(startX, startY);
    this.end = createVector(endx, endy);
    this.points = [];
    this.life = 30;  
    this.maxLife = 30;
    
    let segments = 10;
    for (let i = 0; i <= segments; i++) {
      let t = i / segments;
      let x = lerp(this.start.x, this.end.x, t) + random(-15, 15);
      let y = lerp(this.start.y, this.end.y, t) + random(-15, 15);
      this.points.push(createVector(x, y));
    }
  }
  
  update() {
    this.life--;
    
    
    for (let point of this.points) {
      point.add(random(-5, 5), random(-5, 5));
    }
  }
  
  display() {
    let alpha = map(this.life, 0, this.maxLife, 0, 255);
    
    
    stroke(sith_energy_purple[0], sith_energy_purple[1], sith_energy_purple[2], alpha * 0.4);
    strokeWeight(6);
    noFill();
    
    beginShape();
    for (let point of this.points) {
      vertex(point.x, point.y);
    }
    endShape();
    
    
    stroke(sith_lightning_blue[0], sith_lightning_blue[1], sith_lightning_blue[2], alpha);
    strokeWeight(3);
    
    beginShape();
    for (let point of this.points) {
      vertex(point.x, point.y);
    }
    endShape();
    
    
    stroke(sith_lightning_cyan[0], sith_lightning_cyan[1], sith_lightning_cyan[2], alpha * 0.8);
    strokeWeight(2);
    
    beginShape();
    for (let point of this.points) {
      vertex(point.x, point.y);
    }
    endShape();
    
    
    stroke(255, 255, 255, alpha);
    strokeWeight(1);
    
    beginShape();
    for (let point of this.points) {
      vertex(point.x, point.y);
    }
    endShape();
  }
  
  isDead() {
    return this.life <= 0;
  }
}
