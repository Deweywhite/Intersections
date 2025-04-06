fetch('https://intersections-tau.vercel.app/api/valid-words')
  .then(response => response.json())
  .then(validWords => {
    console.log('Valid Words:', validWords);
    // Add your logic here (e.g., display words)
  })
  .catch(error => console.error('Error:', error));

fetch('https://intersections-tau.vercel.app/api/related-pairs')
  .then(response => response.json())
  .then(relatedPairs => {
    console.log('Related Pairs:', relatedPairs);
    // Add your logic here (e.g., use pairs)
  })
  .catch(error => console.error('Error:', error));