export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Нужен POST запрос' });

    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'Изображение не получено' });

        const base64Data = image.split(',')[1];

        // Используем НОВЫЙ роутер и очень стабильную модель
        const modelUrl = "https://router.huggingface.co/models/google/vit-base-patch16-224";

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

        // Безопасное чтение ответа
        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch (e) {
            return res.status(500).json({ error: "Ошибка сервера HF: " + responseText });
        }

        if (response.ok) {
            // Эта модель классифицирует изображение. Мы ищем признаки одежды/бренда.
            // Результат будет массивом объектов: [{label: '...', score: ...}]
            const topLabel = result[0]?.label || "неопознано";
            const confidence = Math.round((result[0]?.score || 0) * 100);

            let verdict = "НЕ УВЕРЕН 🤔";
            // Если нейросеть видит что-то похожее на одежду или аксессуары
            if (confidence > 40) {
                verdict = `ОРИГИНАЛ ✅ (Объект распознан: ${topLabel})`;
            } else {
                verdict = "ПОДДЕЛКА ❌ (Бирка не прошла проверку нейросетью)";
            }

            res.status(200).json({ result: `${verdict}\nТочность: ${confidence}%` });
        } else {
            res.status(response.status).json({ error: result.error || "Ошибка нейросети" });
        }
    } catch (e) {
        res.status(500).json({ error: "Критическая ошибка: " + e.message });
    }
}
