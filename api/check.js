export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        // Извлекаем чистый base64
        const base64Data = image.split(',')[1];

        // Используем модель VQA (Visual Question Answering) от Microsoft или Salesforce
        // Она лучше всего подходит для ответов на вопросы по фото
        const modelUrl = "https://api-inference.huggingface.co/models/dandelin/vilt-b32-finetuned-vqa";

        const response = await fetch(modelUrl, {
            headers: { 
                Authorization: `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({
                inputs: {
                    image: base64Data,
                    question: "Is this clothing tag authentic or fake? Answer with one word: authentic or fake."
                }
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Модель вернет массив с ответами и их вероятностью
            // Берем самый вероятный ответ
            const topAnswer = result[0]?.answer || "Не удалось определить";
            const confidence = Math.round((result[0]?.score || 0) * 100);

            let verdict = topAnswer === 'authentic' ? "ОРИГИНАЛ ✅" : "ПОДДЕЛКА ❌";
            if (confidence < 30) verdict = "НЕ УВЕРЕН 🤔";

            res.status(200).json({ 
                result: `${verdict}\n(Уверенность нейросети: ${confidence}%)` 
            });
        } else {
            throw new Error(result.error || "Ошибка API Hugging Face");
        }

    } catch (error) {
        console.error("Ошибка:", error);
        res.status(500).json({ error: "Ошибка анализа: " + error.message });
    }
}