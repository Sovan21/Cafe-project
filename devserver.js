const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

function getActiveIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = '0.0.0.0';
  const candidates = [];
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const nameLower = name.toLowerCase();
        const isVirtual = nameLower.includes('virtual') || 
                          nameLower.includes('vbox') || 
                          nameLower.includes('host-only') ||
                          nameLower.includes('loopback');
        if (!isVirtual) {
          candidates.push({ name: nameLower, address: iface.address });
        }
        fallbackIp = iface.address;
      }
    }
  }
  
  if (candidates.length > 0) {
    // Prioritize Wi-Fi / Wireless adapters
    const wifiCandidate = candidates.find(c => c.name.includes('wi-fi') || 
                                               c.name.includes('wifi') || 
                                               c.name.includes('wireless') || 
                                               c.name.includes('wlan'));
    if (wifiCandidate) {
      return wifiCandidate.address;
    }
    return candidates[0].address;
  }
  
  return fallbackIp;
}

const activeIp = getActiveIp();

const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn('node', [nextBin, 'dev', '--hostname', '0.0.0.0'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  env: { ...process.env, FORCE_COLOR: '1' }
});

child.stdout.on('data', (data) => {
  const str = data.toString();
  // Replace Next.js default 0.0.0.0 network output with the active Wi-Fi IP address
  const replacedStr = str.replace(/0\.0\.0\.0:(\d+)/g, `${activeIp}:$1`).replace(/0\.0\.0\.0/g, activeIp);
  process.stdout.write(replacedStr);
});

child.on('close', (code) => {
  process.exit(code);
});
