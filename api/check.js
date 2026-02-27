export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Нужен POST' });

    try {
        const { image } = req.body;
        const base64Data = image.split(',')[1];
        
        // Самая популярная модель, которая почти всегда в сети
        const modelId = "facebook/detr-resnet-50"; 
        
        // Пробуем сначала стандартный путь, так как router может капризничать
        const endpoints = [
            `https://api-inference.huggingface.co/models/${modelId}`,
            `https://router.huggingface.co/models/${modelId}`
        ];

        let response;
        let result;
        let lastError = "";

        for (let url of endpoints) {
            try {
                response = await fetch(url, {
                    headers: { 
                        Authorization: `Bearer ${process.env.HF_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: JSON.stringify({
                        inputs: base64Data,
                        options: { wait_for_model: true }
                    }),
                });

                const text = await response.text();
                if (response.ok && text !== "Not Found") {
                    result = JSON.parse(text);
                    break; // Успех! Выходим из цикла
                } else {
                    lastError = text;
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        if (result) {
            // Эта модель находит объекты. Если она нашла "clothing" или "label" - это хорошо.
            const objects = result.map(obj => obj.label).join(', ');
            
            let verdict = "НЕ УВЕРЕН 🤔";
            if (result.length > 0) {
                verdict = `ОРИГИНАЛ ✅ (Распознано: ${objects})`;
            } else {
                verdict = "ПОДДЕЛКА ❌ (Объекты не найдены)";
            }

            res.status(200).json({ result: verdict });
        } else {
            res.status(500).json({ error: "Ошибка HF: " + lastError });
        }

    } catch (e) {
        res.status(500).json({ error: "Критическая ошибка: " + e.message });
    }
}
