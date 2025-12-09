import OpenAI from "openai";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Get assistant ID from environment
    const assistantId = process.env.ASSISTANT_ID;
    
    if (assistantId) {
      // Use Assistant API
      const thread = await openai.beta.threads.create();
      
      await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: message
        }
      );

      const run = await openai.beta.threads.runs.create(
        thread.id,
        { 
          assistant_id: assistantId
        }
      );

      // Wait for completion (simple polling)
      let runStatus;
      let attempts = 0;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      } while (runStatus.status === 'in_progress' && attempts < 10);

      // Get messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      // Find assistant's response
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      const reply = assistantMessages[0]?.content[0]?.text?.value || 
                    "I couldn't generate a response. Try again! 🌿";
      
      return res.json({ reply });
      
    } else {
      // Fallback: Direct chat completion
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are GreenLazy, an eco-friendly AI assistant. Be helpful, relaxed, and care about the environment. Use leaf emojis 🌿"
          },
          { role: "user", content: message }
        ],
      });

      const reply = completion.choices[0].message.content;
      return res.json({ reply });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'GreenLazy is currently unavailable. Please try again later. 🌿' 
    });
  }
}