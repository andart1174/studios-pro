const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', async msg => {
        const values = [];
        for (const arg of msg.args()) {
            try {
                values.push(await arg.jsonValue());
            } catch (e) {
                values.push(arg.toString());
            }
        }
        console.log(`[Browser]:`, ...values);
    });

    try {
        await page.goto('http://localhost:5501');
        await page.evaluate(async () => {
            console.log("Starting eval...");
            const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers');
            const inferencer = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small');
            const file = await fetch('http://localhost:5501/test.jpg').then(r => r.blob());
            const url = URL.createObjectURL(file);
            const result = await inferencer(url);

            console.log("Predicted depth keys:", Object.keys(result.predicted_depth));
            if (result.predicted_depth.ort_tensor) {
                console.log("ORT tensor dims:", result.predicted_depth.ort_tensor.dims);
            }
            if (result.predicted_depth.dims) {
                console.log("Direct dims:", result.predicted_depth.dims);
            }
            console.log("Data length:", result.predicted_depth.data ? result.predicted_depth.data.length : 'no data');
            console.log("Constructor:", result.predicted_depth.constructor.name);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
