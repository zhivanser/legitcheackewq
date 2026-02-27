export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Нужен POST запрос' });

    try {
        const { image } = req.body;
        const base64Data = image.split(',')[1];

        // ОБНОВЛЕННЫЙ АДРЕС (router вместо api-inference)
        const modelUrl = "https://router.huggingface.co/models/dandelin/vilt-b32-finetuned-vqa";

        const response = await fetch(modelUrl, {
            headers: { 
                Authorization: `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({
                inputs: {
                    image: base64Data,
                    question: "Is this clothing tag authentic or fake? Answer strictly one word: authentic or fake."
                },
                options: { wait_for_model: true } 
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Проверяем ответ модели
            const answer = result[0]?.answer;
            const verdict = answer === 'authentic' ? "ОРИГИНАЛ ✅" : "ПОДДЕЛКА ❌";
            res.status(200).json({ result: verdict });
        } else {
            // Если Hugging Face вернул ошибку, выводим её
            res.status(500).json({ error: result.error || "Ошибка нейросети" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
