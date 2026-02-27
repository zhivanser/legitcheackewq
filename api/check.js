import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Проверяем, что запрос правильный (только POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Доступны только POST-запросы' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Изображение не найдено' });
    }

    // Делаем фокус с парсингом картинки формата base64
    // image выглядит как: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    const parts = image.split(',');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }
    
    // Достаем тип (mimeType) и чистую строку с картинкой (base64)
    const mimeTypePrefix = parts[0];
    const mimeType = mimeTypePrefix.match(/:(.*?);/)[1];
    const base64Data = parts[1];

    // Инициализируем API (берет ключ из переменных Vercel)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Используем быструю и точную модель, работающую с картинками
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Ты — суровый эксперт по аутентификации брендовой одежды (Legit Checker). 
    Посмотри на это фото бирки. 
    1. Внимательно прочитай весь текст на бирке. 
    2. Обрати внимание на шрифты, межбуквенные интервалы, качество печати, швы и типичные ошибки (typos), которые делают на подделках. 
    3. Сделай вывод: это оригинал или подделка? 
    Твой ответ должен начинаться со слов: 'ОРИГИНАЛ', 'ПОДДЕЛКА' или 'НЕ УВЕРЕН'. 
    После этого дай краткое объяснение, почему ты сделал такой вывод (2-3 предложения).`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ];

    // Отправляем промпт и картинку нейросети
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    // Возвращаем результат обратно на сайт
    res.status(200).json({ result: responseText });
    
  } catch (error) {
    console.error("Ошибка API: ", error);
    res.status(500).json({ error: 'Ошибка при анализе бирки. Попробуйте еще раз.' });
  }
}