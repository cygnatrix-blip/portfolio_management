// server/scripts/updateNseSymbols.js
const { updateNseSymbols } = require('../services/updateNseSymbolsService');

async function main() {
  console.log('Manually running NSE Symbol Master update...\n');
  
  try {
    await updateNseSymbols();
    console.log('\n✅ Symbol update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Symbol update failed:', error.message);
    process.exit(1);
  }
}

main();
