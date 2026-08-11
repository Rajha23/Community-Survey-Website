const apiKey = 'YOUR_API_KEY_HERE';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
.then(r => r.json())
.then(data => {
  if (data.models) {
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
})
.catch(err => console.error(err));
