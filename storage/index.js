// Registry of providers. Add new providers here.
const googleDrive = require('./googleDrive');

const providers = {
  google: googleDrive
  // tomorrow: 'onedrive': require('./oneDrive')
};

function getProvider(name) {
  if (!name) return null;
  return providers[name];
}

module.exports = { getProvider };
