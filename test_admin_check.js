// Use dynamic import for node-fetch
import('node-fetch').then(({ default: fetch }) => {
  async function testAdminCheck() {
    try {
      const response = await fetch('http://localhost:3001/api/admin/check');
      const data = await response.json();

      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error testing admin check:', error);
    }
  }

  testAdminCheck();
}).catch(err => {
  console.error('Error importing node-fetch:', err);
});
