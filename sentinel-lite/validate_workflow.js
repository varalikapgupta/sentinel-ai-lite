const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'sentinel_lite.json');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  console.log('✅ JSON Syntax: VALID\n');

  const nodeMap = new Map();
  data.nodes.forEach(n => {
    nodeMap.set(n.name, n);
  });

  console.log(`📋 Found ${data.nodes.length} nodes:`);
  data.nodes.forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.type}] "${n.name}" (ID: ${n.id})`);
  });

  console.log('\n🔗 Checking connections...');
  let hasErrors = false;

  for (const [sourceName, outputs] of Object.entries(data.connections)) {
    if (!nodeMap.has(sourceName)) {
      console.error(`  ❌ Source node "${sourceName}" does not exist in nodes array!`);
      hasErrors = true;
    } else {
      console.log(`  ✔️ Source "${sourceName}"`);
    }

    for (const [type, branches] of Object.entries(outputs)) {
      branches.forEach((branch, branchIdx) => {
        branch.forEach(conn => {
          if (!nodeMap.has(conn.node)) {
            console.error(`     ❌ Target node "${conn.node}" does not exist!`);
            hasErrors = true;
          } else {
            console.log(`     └── Output branch ${branchIdx} -> Target "${conn.node}" [OK]`);
          }
        });
      });
    }
  }

  if (!hasErrors) {
    console.log('\n🎉 ALL connections validly reference existing nodes!');
  } else {
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Validation failed:', e.message);
  process.exit(1);
}
