export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Нужен POST' });

    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'Изображение не получено' });

        const base64Data = image.split(',')[1];

        // Используем самую стабильную модель для описания изображений
        const modelUrl = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base";

        const response = await fetch(modelUrl, {
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

        // СНАЧАЛА получаем ответ как текст, чтобы не было ошибки "Unexpected token N"
        const responseText = await response.text();
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            return res.status(500).json({ error: `Сервер прислал текст вместо JSON: ${responseText}` });
        }

        if (response.ok) {
            // Модель вернет описание, например: "a close up of a clothing tag with nike logo"
            const description = result[0]?.generated_text || "";
            
            // Простая логика проверки на основе описания
            let verdict = "НЕ УВЕРЕН 🤔";
            
            // Если в описании есть слова, указывающие на бренд, считаем оригиналом (для теста)
            // В реальности сюда можно добавить список брендов
            const keywords = ['brand', 'logo', 'tag', 'label', 'authentic', 'made in'];
            const isLikelyReal = keywords.some(word => description.toLowerCase().includes(word));

            if (isLikelyReal) {
                verdict = "ОРИГИНАЛ ✅ (Вижу четкую бирку)";
            } else {
                verdict = "ПОДДЕЛКА ❌ (Бирка не опознана)";
            }

            res.status(200).json({ result: `${verdict}\n\nОписание от ИИ: ${description}` });
        } else {
            res.status(response.status).json({ error: result.error || "Ошибка API" });
        }
    } catch (e) {
        res.status(500).json({ error: "Критическая ошибка: " + e.message });
    }
}
