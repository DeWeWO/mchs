const url = "http://localhost:5000/api/geocoding/search?q=London";

try {
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        console.error('Body:', text);
    } else {
        const data = await response.json();
        console.log("Success! Features count:", data.features?.length);
    }
} catch (error) {
    console.error('Fetch error:', error);
}
