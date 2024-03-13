const express = require('express');
const cors = require('cors');
const { chromium } = require("playwright");
const fs = require('fs');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
    methods: 'GET',
    allowedHeaders: '*',
};
app.use(cors(corsOptions));
app.use(express.json());
app.options('/process-url', cors(corsOptions));

app.get('/process-url', async (req, res) => {
    // Obtener la URL completa desde req.url
    const fullUrl = req.url;
    // Parsear la URL
    const parsedUrl = new URL(fullUrl, `https://${req.headers.host}`);
    // Obtener el parámetro 'url' y decodificarlo
    const decodedUrl = decodeURIComponent(parsedUrl.searchParams.get('url'));

    ( async () => {
        const browser = await chromium.launch({
            executablePath: 'C:\Users\gsoria1\OneDrive - Lenovo\Desktop\files\personal-projects\optiMorph\backend\node_modules\playwright-core\lib\server\chromium',
            headless: true
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(decodedUrl);
        await page.waitForLoadState('domcontentloaded');
    
        const imagesUrls = await page.evaluate(() => {
            const images = [];
            const items = document.querySelectorAll('img');
    
            for (const item of items) {
                images.push({'url': item.src});
            }
    
            return images;
        })

        console.log(imagesUrls);
        
    
        fs.writeFileSync('images.json', JSON.stringify(imagesUrls, null, 2))
    
        const jsonPath = './images.json';
        await jsonProcess(jsonPath);
    
        await browser.close();
        res.sendFile(jsonPath, { root: __dirname });

        setTimeout(() => {
            fs.closeSync(fs.openSync(jsonPath, 'w'));
            fs.unlink(jsonPath, (err) => {
                if (err) {
                    console.error(`Error al eliminar el archivo JSON: ${err.message}`);
                } else {
                    console.log('Archivo JSON eliminado con éxito.');
                }
            });
        }, 10000)
        
    })();
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

async function getImageWeight(url) {
    try {
        const response = await axios.head(url);
        const bytesWeight = response.headers['content-length'];
        const kbWeight = bytesWeight / 1024;
        const mbWeight = (kbWeight / 1024).toFixed(3);
        return mbWeight;
    } catch (error) {
        console.error(`Error al obtener el weight de la image ${url}: ${error.message}`);
        return null;
    }
}

async function jsonProcess(path) {
    try {
        const jsonContent = fs.readFileSync(path, 'utf-8');
        const data = JSON.parse(jsonContent);
        for (const image of data) {
            if (image.url) {
                const weight = await getImageWeight(image.url);
                if (weight !== null) {
                    image.mbWeight = weight;
                }
            } else {
                console.error('La propiedad "url" no está definida en un objeto de image.');
            }
        }

        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');

        console.log('Proceso completado con éxito.');
    } catch (error) {
        console.error(`Error al procesar el archivo JSON: ${error.message}`);
    }
}


